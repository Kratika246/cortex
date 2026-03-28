import { useRef, useState, useCallback } from 'react'

const TARGET_SAMPLE_RATE = 16000

export interface StartRecordingOptions {
  /** Capture the shared tab/window/monitor (meeting app) and mix with the mic. User must allow "Share audio" where offered. */
  includeDisplayAudio?: boolean
}

interface UseMicRecorderReturn {
  isRecording: boolean
  startRecording: (
    onChunk: (chunk: ArrayBuffer) => void,
    options?: StartRecordingOptions
  ) => Promise<void>
  stopRecording: () => void
  error: string | null
}

function resampleToTargetRate(
  input: Float32Array,
  sourceRate: number,
  targetRate: number
): Float32Array {
  if (sourceRate === targetRate) return input
  const outLength = Math.round((input.length * targetRate) / sourceRate)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const srcPos = (i * sourceRate) / targetRate
    const j = Math.floor(srcPos)
    const f = srcPos - j
    const s0 = input[j] ?? 0
    const s1 = input[j + 1] ?? s0
    out[i] = s0 * (1 - f) + s1 * f
  }
  return out
}

function floatTo16BitLE(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

export function useMicRecorder(): UseMicRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const displaySourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const displayEndedCleanupRef = useRef<(() => void) | null>(null)

  const stopRecording = useCallback(() => {
    displayEndedCleanupRef.current?.()
    displayEndedCleanupRef.current = null

    if (processorRef.current) {
      try {
        processorRef.current.disconnect()
      } catch {
        /* ignore */
      }
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }
    if (micSourceRef.current) {
      try {
        micSourceRef.current.disconnect()
      } catch {
        /* ignore */
      }
      micSourceRef.current = null
    }
    if (displaySourceRef.current) {
      try {
        displaySourceRef.current.disconnect()
      } catch {
        /* ignore */
      }
      displaySourceRef.current = null
    }
    if (gainRef.current) {
      try {
        gainRef.current.disconnect()
      } catch {
        /* ignore */
      }
      gainRef.current = null
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(t => t.stop())
      displayStreamRef.current = null
    }
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(
    async (
      onChunk: (chunk: ArrayBuffer) => void,
      options?: StartRecordingOptions
    ) => {
      try {
        setError(null)
        const includeDisplayAudio = options?.includeDisplayAudio === true

        if (typeof window === 'undefined') {
          setError('Microphone is only available in the browser.')
          return
        }

        const mediaDevices = navigator.mediaDevices
        if (!mediaDevices?.getUserMedia) {
          setError(
            'Microphone is blocked: open the app at http://localhost:3000 (not a LAN IP like 10.x), or use HTTPS. Browsers only expose the mic in a secure context.'
          )
          return
        }

        if (includeDisplayAudio && !mediaDevices.getDisplayMedia) {
          setError('This browser does not support sharing tab/window audio.')
          return
        }

        let displayStream: MediaStream | null = null
        if (includeDisplayAudio) {
          try {
            displayStream = await mediaDevices.getDisplayMedia({
              video: true,
              audio: true,
            })
          } catch (err) {
            if (err instanceof Error && err.name === 'NotAllowedError') {
              setError('Screen/tab share was cancelled or denied.')
            } else if (err instanceof Error) {
              setError(err.message)
            }
            return
          }

          const hasAudio = displayStream.getAudioTracks().length > 0
          if (!hasAudio) {
            displayStream.getTracks().forEach(t => t.stop())
            setError(
              'No audio in the capture. When sharing, choose a browser tab with your meeting and turn ON “Share tab audio”. On Windows, “Entire screen” can include system audio.'
            )
            return
          }

          displayStreamRef.current = displayStream
        }

        let micStream: MediaStream
        try {
          micStream = await mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          })
        } catch (err) {
          if (displayStream) displayStream.getTracks().forEach(t => t.stop())
          displayStreamRef.current = null
          throw err
        }

        micStreamRef.current = micStream

        const Ctx =
          window.AudioContext ||
          (
            window as unknown as {
              webkitAudioContext: typeof AudioContext
            }
          ).webkitAudioContext
        const audioContext = new Ctx({ sampleRate: TARGET_SAMPLE_RATE })
        audioContextRef.current = audioContext

        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        const sourceRate = audioContext.sampleRate

        const micSource = audioContext.createMediaStreamSource(micStream)
        micSourceRef.current = micSource

        const mixer = audioContext.createGain()
        mixer.gain.value = 1.0

        micSource.connect(mixer)

        if (displayStream && displayStream.getAudioTracks().length > 0) {
          const displaySource =
            audioContext.createMediaStreamSource(displayStream)
          displaySourceRef.current = displaySource
          displaySource.connect(mixer)

          const onShareEnded = () => stopRecording()
          const videoTracks = displayStream.getVideoTracks()
          videoTracks.forEach(t => t.addEventListener('ended', onShareEnded))
          displayEndedCleanupRef.current = () => {
            videoTracks.forEach(t =>
              t.removeEventListener('ended', onShareEnded)
            )
          }
        }

        const bufferSize = 4096
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = e => {
          const input = e.inputBuffer.getChannelData(0)
          const resampled = resampleToTargetRate(
            input,
            sourceRate,
            TARGET_SAMPLE_RATE
          )
          onChunk(floatTo16BitLE(resampled))
        }

        const gain = audioContext.createGain()
        gain.gain.value = 0
        gainRef.current = gain

        mixer.connect(processor)
        processor.connect(gain)
        gain.connect(audioContext.destination)

        setIsRecording(true)
      } catch (err) {
        stopRecording()
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
    [stopRecording]
  )

  return { isRecording, startRecording, stopRecording, error }
}
