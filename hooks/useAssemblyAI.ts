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
  onAutoExtract?: (transcript: string) => void,
  /** Mix in tab/window audio from getDisplayMedia (meeting in browser or shared desktop). */
  includeDisplayAudio = false
): UseAssemblyAIReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const autoExtractTimerRef = useRef<NodeJS.Timeout | null>(null)
  /** v3 Turn messages are keyed by turn_order; partials update the same slot. */
  const turnsRef = useRef<Record<number, string>>({})

  const { setLiveTranscript, appendTranscript, startSession, endSession, setError, error, setAiResponse, setIsAiThinking } =
    useCortexStore()

  const { isRecording, startRecording, stopRecording, error: micError } =
    useMicRecorder()

  // Track the most recent partial to append to the finalized turns
  const currentPartialRef = useRef<string>('')

  const updateUI = useCallback(() => {
    const finalized = buildOrderedTranscript(turnsRef.current)
    const partial = currentPartialRef.current
    const fullDisplay = partial 
      ? (finalized ? `${finalized} ${partial}` : partial)
      : finalized
    
    setLiveTranscript(fullDisplay)
  }, [setLiveTranscript])

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleChatbotCommand = async (command: string, transcript: string) => {
    try {
      setIsAiThinking(true)
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, transcript }),
      })
      const data = await res.json()
      if (res.ok) {
        setAiResponse(data.response)
        speak(data.response)
      }
    } catch (err) {
      console.error('Chatbot command failed:', err)
    } finally {
      setIsAiThinking(false)
    }
  }

  // Propagate mic errors to store
  useEffect(() => {
    if (micError) setError(micError)
  }, [micError, setError])

  const getToken = async (): Promise<string> => {
    const res = await fetch('/api/assemblyai-token')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Failed to get token: ${res.status}`)
    }
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
            
            // Log message types for debugging if needed
            if (message.message_type !== 'SessionBegins' && message.type !== 'SessionBegins') {
              console.log('[AssemblyAI Message]', message.message_type || message.type, message.text || message.transcript || '')
            }

            if (message.type === 'Error' || message.message_type === 'Error') {
              const detail =
                message.error ??
                message.message ??
                JSON.stringify(message)
              console.error('AssemblyAI streaming error:', detail)
              setError(String(detail))
              return
            }

            // Handle Transcripts (v3 typical messages)
            if (message.message_type === 'FinalTranscript' || message.message_type === 'PartialTranscript') {
              const text = message.text || ''
              
              if (message.message_type === 'PartialTranscript') {
                currentPartialRef.current = text
                updateUI()
              } else {
                // FinalTranscript
                currentPartialRef.current = ''
                // If it's a FinalTranscript but we aren't using Turns for this model
                // we should probably append it to a default turn (e.g. order 0) or handle it
                // But for u3-rt-pro, Turn messages usually follow. 
                // Let's rely on Turn messages if they exist, otherwise use Final.
                if (message.type !== 'Turn') {
                   // Fallback: append if not handled by Turn
                   // To avoid doubling, we skip this if the model is u3-rt-pro which uses Turns
                   if (SPEECH_MODEL !== 'u3-rt-pro') {
                     appendTranscript(text)
                   }
                }
              }

              // Check for trigger word "hey cortex"
              const lowerText = text.toLowerCase()
              if (lowerText.includes('hey cortex') || lowerText.includes('hey, cortex')) {
                const parts = lowerText.split(/hey,? cortex/i)
                const command = parts[parts.length - 1].trim()
                if (command.length > 3) {
                  // Use the accumulated transcript for context
                  handleChatbotCommand(command, useCortexStore.getState().liveTranscript)
                }
              }
              return
            }

            // Handle Turn messages (v3 universal streaming specific)
            if (message.type === 'Turn' || message.message_type === 'Turn') {
              const text = `${message.transcript ?? message.utterance ?? ''}`
              const order =
                typeof message.turn_order === 'number' ? message.turn_order : 0
              turnsRef.current[order] = text
              currentPartialRef.current = '' // Clear partial when a turn arrives
              updateUI()

              // Check for trigger word "hey cortex"
              const lowerText = text.toLowerCase()
              if (lowerText.includes('hey cortex') || lowerText.includes('hey, cortex')) {
                const parts = lowerText.split(/hey,? cortex/i)
                const command = parts[parts.length - 1].trim()
                if (command.length > 3) {
                  const finalized = buildOrderedTranscript(turnsRef.current)
                  handleChatbotCommand(command, finalized)
                }
              }
            }
          } catch (err) {
            console.error('Failed to parse AssemblyAI message:', event.data, err)
          }
        }

        ws.onclose = (event) => {
          console.log('AssemblyAI WebSocket closed:', event.code, event.reason)
        }
      })
    },
    [setLiveTranscript, appendTranscript, setError, handleChatbotCommand, updateUI]
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

      await startRecording(
        (chunk: ArrayBuffer) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(chunk)
          }
        },
        { includeDisplayAudio }
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Transcription failed to start'
      setError(message)
      console.error('Start transcription error:', err)
    }
  }, [
    connectWebSocket,
    startRecording,
    startSession,
    setError,
    onAutoExtract,
    includeDisplayAudio,
  ])

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
