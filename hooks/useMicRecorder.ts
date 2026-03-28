import { useRef, useState, useCallback } from 'react'

interface UseMicRecorderReturn {
  isRecording: boolean
  startRecording: (onChunk: (chunk: ArrayBuffer) => void) => Promise<void>
  stopRecording: () => void
  error: string | null
}

export function useMicRecorder(): UseMicRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = useCallback(
    async (onChunk: (chunk: ArrayBuffer) => void) => {
      try {
        setError(null)

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })

        streamRef.current = stream

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        })

        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            const arrayBuffer = await event.data.arrayBuffer()
            onChunk(arrayBuffer)
          }
        }

        mediaRecorder.onerror = () => {
          setError('MediaRecorder error occurred')
          stopRecording()
        }

        // Fire ondataavailable every 250ms for smooth streaming
        mediaRecorder.start(250)
        setIsRecording(true)
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setError('Microphone permission denied. Please allow mic access.')
          } else if (err.name === 'NotFoundError') {
            setError('No microphone found on this device.')
          } else {
            setError(err.message)
          }
        }
      }
    },
    []
  )

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
  }, [isRecording])

  return { isRecording, startRecording, stopRecording, error }
}