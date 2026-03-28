import { useRef, useState, useCallback } from 'react'

const TARGET_SAMPLE_RATE = 16000

interface UseMicRecorderReturn {
  isRecording: boolean
  startRecording: (onChunk: (chunk: ArrayBuffer) => void) => Promise<void>
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
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect()
      } catch {
        /* ignore */
      }
      processorRef.current.onaudioprocess = null
      processorRef.current = null
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch {
        /* ignore */
      }
      sourceRef.current = null
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsRecording(false)
  }, [])

  const startRecording = useCallback(
    async (onChunk: (chunk: ArrayBuffer) => void) => {
      try {
        setError(null)

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })

        streamRef.current = stream

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
        const source = audioContext.createMediaStreamSource(stream)
        sourceRef.current = source

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

        source.connect(processor)
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
