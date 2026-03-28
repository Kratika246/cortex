import { useRef, useCallback, useEffect } from 'react'
import { useCortexStore } from '@/store/cortexStore'
import { useMicRecorder } from './useMicRecorder'

const ASSEMBLYAI_WS_BASE = 'wss://streaming.assemblyai.com/v3/ws'
const SAMPLE_RATE = 16000
/** Required on v3; see https://www.assemblyai.com/docs/streaming/select-the-speech-model */
const SPEECH_MODEL = 'u3-rt-pro'
const AUTO_EXTRACT_INTERVAL = 60000 // 60 seconds

interface UseAssemblyAIReturn {
  startTranscription: () => Promise<void>
  stopTranscription: () => void
  isRecording: boolean
  error: string | null
}

function buildOrderedTranscript(turns: Record<number, string>): string {
  return Object.keys(turns)
    .sort((a, b) => Number(a) - Number(b))
    .map(k => turns[Number(k)])
    .filter(Boolean)
    .join(' ')
    .trim()
}

export function useAssemblyAI(
  onAutoExtract?: (transcript: string) => void
): UseAssemblyAIReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const autoExtractTimerRef = useRef<NodeJS.Timeout | null>(null)
  /** v3 Turn messages are keyed by turn_order; partials update the same slot. */
  const turnsRef = useRef<Record<number, string>>({})

  const { setLiveTranscript, startSession, endSession, setError, error } =
    useCortexStore()

  const { isRecording, startRecording, stopRecording, error: micError } =
    useMicRecorder()

  // Propagate mic errors to store
  useEffect(() => {
    if (micError) setError(micError)
  }, [micError, setError])

  const getToken = async (): Promise<string> => {
    const res = await fetch('/api/assemblyai-token')
    if (!res.ok) throw new Error('Failed to get AssemblyAI token')
    const data = await res.json()
    return data.token
  }

  const connectWebSocket = useCallback(
    async (token: string): Promise<WebSocket> => {
      return new Promise((resolve, reject) => {
        const qs = new URLSearchParams({
          speech_model: SPEECH_MODEL,
          sample_rate: String(SAMPLE_RATE),
          token,
          formatted_finals: 'true',
        })
        const ws = new WebSocket(`${ASSEMBLYAI_WS_BASE}?${qs}`)

        ws.onopen = () => {
          console.log('AssemblyAI WebSocket connected')
          resolve(ws)
        }

        ws.onerror = () => {
          reject(new Error('WebSocket connection failed'))
        }

        ws.onmessage = (event) => {
          if (typeof event.data !== 'string') return
          try {
            const message = JSON.parse(event.data)

            if (message.type === 'Error') {
              const detail =
                message.error ??
                message.message ??
                JSON.stringify(message)
              console.error('AssemblyAI streaming error:', detail)
              setError(String(detail))
              return
            }

            if (message.type === 'Turn') {
              const text = `${message.transcript ?? message.utterance ?? ''}`
              const order =
                typeof message.turn_order === 'number' ? message.turn_order : 0
              turnsRef.current[order] = text
              setLiveTranscript(
                buildOrderedTranscript(turnsRef.current)
              )
            }
          } catch {
            console.error('Failed to parse AssemblyAI message:', event.data)
          }
        }

        ws.onclose = (event) => {
          console.log('AssemblyAI WebSocket closed:', event.code, event.reason)
        }
      })
    },
    [setLiveTranscript, setError]
  )

  const startTranscription = useCallback(async () => {
    try {
      setError(null)
      startSession()
      turnsRef.current = {}

      const token = await getToken()
      const ws = await connectWebSocket(token)
      wsRef.current = ws

      // Start auto-extract timer
      if (onAutoExtract) {
        autoExtractTimerRef.current = setInterval(() => {
          const currentTranscript = useCortexStore.getState().liveTranscript
          if (currentTranscript.trim().length > 50) {
            onAutoExtract(currentTranscript)
          }
        }, AUTO_EXTRACT_INTERVAL)
      }

      // Start mic and stream chunks to AssemblyAI
      await startRecording((chunk: ArrayBuffer) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(chunk)
        }
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Transcription failed to start'
      setError(message)
      console.error('Start transcription error:', err)
    }
  }, [connectWebSocket, startRecording, startSession, setError, onAutoExtract])

  const stopTranscription = useCallback(() => {
    // Stop mic
    stopRecording()

    // Clear auto-extract timer
    if (autoExtractTimerRef.current) {
      clearInterval(autoExtractTimerRef.current)
      autoExtractTimerRef.current = null
    }

    // Send terminate message to AssemblyAI then close
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'Terminate' }))
      }
      wsRef.current.close()
      wsRef.current = null
    }

    endSession()
  }, [stopRecording, endSession])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription()
    }
  }, [])

  return {
    startTranscription,
    stopTranscription,
    isRecording,
    error,
  }
}
