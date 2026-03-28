'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAssemblyAI } from '@/hooks/useAssemblyAI'
import { useCortexStore } from '@/store/cortexStore'

interface MeetingStatusProps {
  onAutoExtract?: (transcript: string) => void
  onManualExtract?: (transcript: string) => void
}

export function MeetingStatus({ onAutoExtract, onManualExtract }: MeetingStatusProps) {
  const {
    liveTranscript,
    isProcessing,
    error,
    setError,
  } = useCortexStore()

  const [includeMeetingShareAudio, setIncludeMeetingShareAudio] = useState(false)
  const [manualTranscript, setManualTranscript] = useState('')

  const handleAutoExtractInternal = useCallback(async (transcript: string) => {
    if (onAutoExtract) onAutoExtract(transcript)
  }, [onAutoExtract])

  const { startTranscription, stopTranscription, isRecording } = useAssemblyAI(
    handleAutoExtractInternal,
    includeMeetingShareAudio
  )

  const wasRecordingRef = useRef(false)
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      setManualTranscript(useCortexStore.getState().liveTranscript)
    }
    wasRecordingRef.current = isRecording
  }, [isRecording])

  const testToken = async () => {
    try {
      const res = await fetch('/api/assemblyai-token')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      console.log('✓ AssemblyAI token received')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token fetch failed'
      setError(msg)
    }
  }

  const btnStyle = (bg: string, fg: string) => ({
    padding: '8px 16px',
    background: bg,
    color: fg,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: 1,
    transition: 'opacity 0.2s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Live Recording */}
      <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: 20 }}>
        <h3 style={{ fontSize: 12, color: '#3b82f6', marginBottom: 16, letterSpacing: 1 }}>01 — LIVE RECORDING</h3>
        
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: '#94a3b8',
            marginBottom: 10,
            cursor: isRecording ? 'default' : 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={includeMeetingShareAudio}
            disabled={isRecording}
            onChange={e => setIncludeMeetingShareAudio(e.target.checked)}
          />
          Also capture meeting / tab audio (share the Meet, Zoom in browser, or screen with audio — then allow the mic)
        </label>
        
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px', lineHeight: 1.5 }}>
          Web: share the <strong style={{ color: '#94a3b8' }}>tab</strong> that has the call and enable <strong style={{ color: '#94a3b8' }}>Share tab audio</strong>.
          Desktop apps on Windows: try sharing <strong style={{ color: '#94a3b8' }}>Entire screen</strong> with system audio. Mac: often need a virtual audio device for system sound.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <button onClick={testToken} style={btnStyle('#1e293b', '#94a3b8')}>
            Test Token
          </button>
          <button
            onClick={isRecording ? stopTranscription : startTranscription}
            style={btnStyle(isRecording ? '#ef4444' : '#10b981', '#fff')}
          >
            {isRecording ? '■ Stop Recording' : '● Start Recording'}
          </button>
          {isRecording && onManualExtract && (
            <button
              onClick={() => onManualExtract(liveTranscript)}
              disabled={isProcessing}
              style={btnStyle('#3b82f6', '#fff')}
            >
              Extract Now
            </button>
          )}
        </div>

        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 11, color: '#ef4444' }}>LIVE — auto-extracting every 60s</span>
          </div>
        )}

        <div style={{
          background: '#0a0f1e',
          border: '1px solid #1e293b',
          borderRadius: 8,
          padding: 12,
          minHeight: 80,
          fontSize: 13,
          color: '#94a3b8',
          lineHeight: 1.6,
        }}>
          {liveTranscript || <span style={{ color: '#334155' }}>Live transcript will appear here...</span>}
        </div>
      </div>

      {/* Manual Input */}
      <div style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 8, padding: 20 }}>
        <h3 style={{ fontSize: 12, color: '#3b82f6', marginBottom: 16, letterSpacing: 1 }}>02 — MANUAL TRANSCRIPT</h3>
        <textarea
          value={isRecording ? liveTranscript : manualTranscript}
          onChange={e => {
            if (!isRecording) setManualTranscript(e.target.value)
          }}
          readOnly={isRecording}
          placeholder="Paste a meeting transcript here to test extraction..."
          style={{
            width: '100%',
            background: '#0a0f1e',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: 12,
            color: '#e2e8f0',
            fontSize: 13,
            fontFamily: 'monospace',
            minHeight: 120,
            resize: 'vertical',
            outline: 'none',
            opacity: isRecording ? 0.95 : 1,
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => onManualExtract?.(isRecording ? liveTranscript : manualTranscript)}
            disabled={isProcessing || (!isRecording && !manualTranscript.trim())}
            style={btnStyle('#3b82f6', '#fff')}
          >
            Extract Tasks
          </button>
          <button
            onClick={() => setManualTranscript("Aryan fix the JWT refresh token bug causing random logouts, high priority. Rahul the Razorpay webhook is failing for international cards investigate by Thursday. Priya dashboard is slow on mobile do a performance audit. Sneha retrain the recommendation model accuracy dropped. Karan set up staging on Kubernetes before Friday. Aisha users not getting password reset emails fix today. Team decision: all new APIs will use GraphQL from next sprint.")}
            style={btnStyle('#1e293b', '#94a3b8')}
          >
            Insert Demo
          </button>
        </div>
      </div>
    </div>
  )
}
