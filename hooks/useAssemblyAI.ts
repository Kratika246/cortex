import { useRef, useCallback, useEffect } from 'react'
import { useCortexStore } from '@/store/cortexStore'
import { useMicRecorder } from './useMicRecorder'

const ASSEMBLYAI_WS_URL = 'wss://api.assemblyai.com/v2/realtime/ws'
const SAMPLE_RATE = 16000
const AUTO_EXTRACT_INTERVAL = 60000 // 60 seconds

interface UseAssemblyAIReturn {
  startTranscription: () => Promise<void>
  stopTranscription: () => void
  isRecording: boolean
  error: string | null
}

export function useAssemblyAI(
  onAutoExtract?: (transcript: string) => void
): UseAssemblyAIReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const autoExtractTimerRef = useRef<NodeJS.Timeout | null>(null)

  const {
    appendTranscript,
    liveTranscript,
    startSession,
    endSession,
    setError,
    error,
  } = useCortexStore()

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
        const ws = new WebSocket(
          `${ASSEMBLYAI_WS_URL}?sample_rate=${SAMPLE_RATE}&token=${token}`
        )

        ws.onopen = () => {
          console.log('AssemblyAI WebSocket connected')
          resolve(ws)
        }

        ws.onerror = () => {
          reject(new Error('WebSocket connection failed'))
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)

            // message_type: FinalTranscript = confirmed sentence
            // message_type: PartialTranscript = still speaking
            if (
              message.message_type === 'FinalTranscript' &&
              message.text &&
              message.text.trim() !== ''
            ) {
              appendTranscript(message.text)
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
    [appendTranscript]
  )

  const startTranscription = useCallback(async () => {
    try {
      setError(null)
      startSession()

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
        wsRef.current.send(JSON.stringify({ terminate_session: true }))
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
