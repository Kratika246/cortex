'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useAssemblyAI } from '@/hooks/useAssemblyAI'
import { useCortexStore } from '@/store/cortexStore'
import type { Task, Assignment, CodeReview } from '@/types'

export default function TestDashboard() {
  const {
    liveTranscript,
    developers,
    setDevelopers,
    tasks,
    setTasks,
    assignments,
    setAssignments,
    isProcessing,
    setIsProcessing,
    error,
    setError,
    currentReview,
    setCurrentReview,
  } = useCortexStore()

  const [manualTranscript, setManualTranscript] = useState('')
  const [diff, setDiff] = useState('')
  const [moduleName, setModuleName] = useState('auth')
  const [activeTab, setActiveTab] = useState<'meeting' | 'tasks' | 'review' | 'graph' | 'hr'>('meeting')
  const [logs, setLogs] = useState<string[]>([])
  /** When true, Start Recording asks to share a tab/window and mixes that audio with the mic (browser meetings + tab audio). */
  const [includeMeetingShareAudio, setIncludeMeetingShareAudio] = useState(false)

  const fetchDevs = useCallback(async () => {
    try {
      const res = await fetch('/api/developers')
      const data = await res.json()
      if (res.ok) setDevelopers(data.developers)
    } catch (err) {
      console.error('Fetch devs error:', err)
    }
  }, [setDevelopers])

  useEffect(() => {
    fetchDevs()
  }, [fetchDevs])

  const log = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)])
  }

  // ── Auto extract every 60s during live recording ──
  const handleAutoExtract = useCallback(async (transcript: string) => {
    log('Auto-extracting tasks from live transcript...')
    await extractTasks(transcript)
  }, [])

  const { startTranscription, stopTranscription, isRecording } = useAssemblyAI(
    handleAutoExtract,
    includeMeetingShareAudio
  )

  const transcriptForExtract = isRecording ? liveTranscript : manualTranscript

  const wasRecordingRef = useRef(false)
  useEffect(() => {
    if (wasRecordingRef.current && !isRecording) {
      setManualTranscript(useCortexStore.getState().liveTranscript)
    }
    wasRecordingRef.current = isRecording
  }, [isRecording])

  // ── Extract Tasks ──
  const extractTasks = async (transcript: string) => {
    if (!transcript.trim()) {
      setError('Transcript is empty')
      return
    }
    try {
      setIsProcessing(true)
      log('Calling /api/extract-tasks...')
      const res = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTasks(data.tasks)
      log(`✓ Extracted ${data.tasks.length} tasks`)
      setActiveTab('tasks')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extract failed'
      setError(msg)
      log(`✗ ${msg}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Assign Tasks ──
  const assignTasks = async () => {
    if (tasks.length === 0) {
      setError('No tasks to assign. Extract tasks first.')
      return
    }
    try {
      setIsProcessing(true)
      log('Calling /api/assign-tasks...')
      const res = await fetch('/api/assign-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAssignments(data.assignments)
      log(`✓ Assigned ${data.assignments.length} tasks to developers`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assign failed'
      setError(msg)
      log(`✗ ${msg}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Review Code ──
  const reviewCode = async () => {
    if (!diff.trim()) {
      setError('Paste a PR diff first')
      return
    }
    try {
      setIsProcessing(true)
      log(`Calling /api/review-code for module: ${moduleName}...`)
      const res = await fetch('/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff, moduleName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentReview(data.review)
      log(`✓ Code review complete — verdict: ${data.review.verdict}`)
      setActiveTab('review')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Review failed'
      setError(msg)
      log(`✗ ${msg}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Test AssemblyAI Token ──
  const testToken = async () => {
    try {
      log('Testing AssemblyAI token endpoint...')
      const res = await fetch('/api/assemblyai-token')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      log(`✓ AssemblyAI token received: ${data.token.slice(0, 20)}...`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token fetch failed'
      setError(msg)
      log(`✗ ${msg}`)
    }
  }

  const verdictColor = (verdict: string) => {
    if (verdict === 'approved') return '#10b981'
    if (verdict === 'changes-requested') return '#ef4444'
    return '#f59e0b'
  }

  const priorityColor = (priority: string) => {
    if (priority === 'high') return '#ef4444'
    if (priority === 'medium') return '#f59e0b'
    return '#10b981'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0', fontFamily: 'monospace' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>CORTEX</span>
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>TEST DASHBOARD</span>
        </div>
        {isProcessing && (
          <span style={{ fontSize: 12, color: '#3b82f6' }}>● Processing...</span>
        )}
        {error && (
          <span style={{ fontSize: 12, color: '#ef4444' }}>✗ {error}</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 0, height: 'calc(100vh - 57px)' }}>

        {/* Main Panel */}
        <div style={{ overflow: 'auto', padding: 24 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
            {(['meeting', 'tasks', 'review', 'graph', 'hr'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'monospace',
                  fontWeight: activeTab === tab ? 700 : 400,
                  background: activeTab === tab ? '#3b82f6' : '#1e293b',
                  color: activeTab === tab ? '#fff' : '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── MEETING TAB ── */}
          {activeTab === 'meeting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Live Recording */}
              <Section title="01 — LIVE RECORDING">
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
                    Test AssemblyAI Token
                  </button>
                  <button
                    onClick={isRecording ? stopTranscription : startTranscription}
                    style={btnStyle(isRecording ? '#ef4444' : '#10b981', '#fff')}
                  >
                    {isRecording ? '■ Stop Recording' : '● Start Recording'}
                  </button>
                  {isRecording && (
                    <button
                      onClick={() => extractTasks(liveTranscript)}
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
                  background: '#111827',
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
              </Section>

              {/* Manual Input */}
              <Section title="02 — MANUAL TRANSCRIPT (live while recording, or paste)">
                <textarea
                  value={isRecording ? liveTranscript : manualTranscript}
                  onChange={e => {
                    if (!isRecording) setManualTranscript(e.target.value)
                  }}
                  readOnly={isRecording}
                  placeholder="Paste a meeting transcript here to test extraction..."
                  style={{
                    width: '100%',
                    background: '#111827',
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
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => setManualTranscript("Aryan fix the JWT refresh token bug causing random logouts, high priority. Rahul the Razorpay webhook is failing for international cards investigate by Thursday. Priya dashboard is slow on mobile do a performance audit. Sneha retrain the recommendation model accuracy dropped. Karan set up staging on Kubernetes before Friday. Aisha users not getting password reset emails fix today. Team decision: all new APIs will use GraphQL from next sprint.")}
                    style={btnStyle('#1e293b', '#94a3b8')}
                  >
                    Load Sample
                  </button>
                  <button
                    onClick={() => extractTasks(transcriptForExtract)}
                    disabled={isProcessing || !transcriptForExtract.trim()}
                    style={btnStyle('#3b82f6', '#fff')}
                  >
                    {isProcessing ? 'Extracting...' : 'Extract Tasks →'}
                  </button>
                </div>
              </Section>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Section title={`03 — EXTRACTED TASKS (${tasks.length})`}>
                {tasks.length === 0 ? (
                  <Empty text="No tasks yet. Go to Meeting tab and extract." />
                ) : (
                  <>
                    <button
                      onClick={assignTasks}
                      disabled={isProcessing}
                      style={{ ...btnStyle('#3b82f6', '#fff'), marginBottom: 12 }}
                    >
                      {isProcessing ? 'Assigning...' : `Auto Assign All ${tasks.length} Tasks →`}
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tasks.map((task: Task) => (
                        <TaskRow key={task.id} task={task} priorityColor={priorityColor} />
                      ))}
                    </div>
                  </>
                )}
              </Section>

              {assignments.length > 0 && (
                <Section title={`04 — ASSIGNMENTS (${assignments.length})`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assignments.map((a: Assignment, i: number) => (
                      <AssignmentRow key={i} assignment={a} priorityColor={priorityColor} />
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* ── REVIEW TAB ── */}
          {activeTab === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Section title="05 — CODE REVIEW">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select
                    value={moduleName}
                    onChange={e => setModuleName(e.target.value)}
                    style={{
                      background: '#111827',
                      border: '1px solid #1e293b',
                      borderRadius: 6,
                      padding: '6px 10px',
                      color: '#e2e8f0',
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  >
                    {['auth', 'user-service', 'dashboard', 'payments', 'ml-pipeline', 'infra', 'notifications'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setDiff(`--- a/auth/jwt.ts
+++ b/auth/jwt.ts
@@ -12,7 +12,7 @@
 import jwt from 'jsonwebtoken'
 
 export function generateToken(userId: string) {
-  return jwt.sign({ userId }, process.env.SECRET, { expiresIn: '1h' })
+  return jwt.sign({ userId }, process.env.SECRET, { expiresIn: '7d' })
 }
 
 export function verifyToken(token: string) {
-  return jwt.verify(token, process.env.SECRET)
+  const decoded = jwt.verify(token, process.env.SECRET)
+  if (!decoded) throw new Error('Invalid token')
+  return decoded
 }`)}
                    style={btnStyle('#1e293b', '#94a3b8')}
                  >
                    Load Sample Diff
                  </button>
                </div>
                <textarea
                  value={diff}
                  onChange={e => setDiff(e.target.value)}
                  placeholder="Paste your PR diff here..."
                  style={{
                    width: '100%',
                    background: '#111827',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    padding: 12,
                    color: '#e2e8f0',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    minHeight: 160,
                    resize: 'vertical',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={reviewCode}
                  disabled={isProcessing || !diff.trim()}
                  style={{ ...btnStyle('#3b82f6', '#fff'), marginTop: 8 }}
                >
                  {isProcessing ? 'Reviewing...' : 'Review Code →'}
                </button>
              </Section>

              {currentReview && (
                <Section title="06 — REVIEW RESULT">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: verdictColor(currentReview.verdict) + '22',
                      color: verdictColor(currentReview.verdict),
                      border: `1px solid ${verdictColor(currentReview.verdict)}44`,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}>
                      {currentReview.verdict}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 }}>
                    {currentReview.summary}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {currentReview.comments.map((c, i) => (
                      <div key={i} style={{
                        background: '#111827',
                        border: '1px solid #1e293b',
                        borderLeft: `3px solid ${
                          c.type === 'critical' ? '#ef4444' :
                          c.type === 'warning' ? '#f59e0b' :
                          c.type === 'praise' ? '#10b981' : '#3b82f6'
                        }`,
                        borderRadius: 6,
                        padding: '8px 12px',
                      }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>{c.type}</span>
                          {c.lineNumber && <span style={{ fontSize: 10, color: '#64748b' }}>line {c.lineNumber}</span>}
                        </div>
                        <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0 }}>{c.message}</p>
                      </div>
                    ))}
                  </div>
                  {currentReview.contextUsed.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Context Used</p>
                      {currentReview.contextUsed.map((c, i) => (
                        <p key={i} style={{ fontSize: 11, color: '#475569', margin: '2px 0' }}>→ {c}</p>
                      ))}
                    </div>
                  )}
                </Section>
              )}
            </div>
          )}

          {/* ── GRAPH TAB ── */}
          {activeTab === 'graph' && (
            <Section title="07 — DEVELOPER KNOWLEDGE GRAPH (RAW DATA)">
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                This shows the developer graph data fetched directly from the database.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {developers.length === 0 ? (
                  <Empty text="No developers found in database." />
                ) : (
                  developers.map(dev => {
                    const primaryExpertise = dev.expertise[0] || 'backend'
                    const devColor = 
                      primaryExpertise === 'backend' ? '#3b82f6' :
                      primaryExpertise === 'frontend' ? '#8b5cf6' :
                      primaryExpertise === 'machine learning' ? '#10b981' :
                      primaryExpertise === 'DevOps' ? '#f59e0b' :
                      primaryExpertise === 'real-time systems' ? '#ef4444' :
                      primaryExpertise === 'payments' ? '#06b6d4' : '#6b7280'

                    return (
                      <div key={dev.id} style={{
                        background: '#111827',
                        border: `1px solid ${devColor}33`,
                        borderTop: `3px solid ${devColor}`,
                        borderRadius: 8,
                        padding: 12,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: devColor }}>{dev.name}</p>
                          <span style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>{primaryExpertise}</span>
                        </div>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px', minHeight: '2.4em' }}>
                          {dev.modules.join(', ')}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, color: '#475569' }}>WORKLOAD</span>
                          <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2 }}>
                            <div style={{ width: `${Math.min(dev.workload * 10, 100)}%`, height: '100%', background: devColor, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#64748b' }}>{dev.workload}/10</span>
                        </div>
                        {assignments.filter(a => a.developer.id === dev.id).length > 0 && (
                          <p style={{ fontSize: 10, color: '#10b981', marginTop: 8, fontWeight: 600 }}>
                            ● {assignments.filter(a => a.developer.id === dev.id).length} new tasks assigned
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </Section>
          )}

          {/* ── HR TAB ── */}
          {activeTab === 'hr' && (
            <Section title="08 — HR / DEVELOPER MANAGEMENT">
              <div style={{ padding: '20px', textAlign: 'center', background: '#0a0f1e', borderRadius: 12, border: '1px solid #1e293b' }}>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>
                  The HR Dashboard allows you to add new developers by their GitHub username. 
                  Cortex will automatically fetch their profile and generate a skill set.
                </p>
                <a 
                  href="/hr" 
                  style={{ 
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '1px',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  OPEN HR DASHBOARD →
                </a>
              </div>
            </Section>
          )}
        </div>

        {/* Log Panel */}
        <div style={{
          borderLeft: '1px solid #1e293b',
          padding: 16,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            System Logs
          </p>
          {logs.length === 0 ? (
            <p style={{ fontSize: 11, color: '#334155' }}>Logs will appear here...</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} style={{
                fontSize: 11,
                color: log.includes('✓') ? '#10b981' : log.includes('✗') ? '#ef4444' : '#64748b',
                margin: 0,
                lineHeight: 1.5,
                wordBreak: 'break-all',
              }}>
                {log}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helper Components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1e293b',
      borderRadius: 10,
      padding: 16,
    }}>
      <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ fontSize: 12, color: '#334155', textAlign: 'center', padding: '24px 0' }}>{text}</p>
}

function TaskRow({ task, priorityColor }: { task: Task; priorityColor: (p: string) => string }) {
  return (
    <div style={{
      background: '#0a0f1e',
      border: '1px solid #1e293b',
      borderRadius: 6,
      padding: '10px 12px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: 9,
        padding: '2px 6px',
        borderRadius: 4,
        background: priorityColor(task.priority) + '22',
        color: priorityColor(task.priority),
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 2,
        whiteSpace: 'nowrap',
      }}>
        {task.priority}
      </span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{task.title}</p>
        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{task.description}</p>
        {task.owner && <p style={{ fontSize: 10, color: '#3b82f6', margin: '4px 0 0' }}>→ {task.owner}</p>}
      </div>
    </div>
  )
}

function AssignmentRow({ assignment, priorityColor }: { assignment: Assignment; priorityColor: (p: string) => string }) {
  return (
    <div style={{
      background: '#0a0f1e',
      border: '1px solid #1e293b',
      borderLeft: '3px solid #3b82f6',
      borderRadius: 6,
      padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{assignment.task.title}</p>
        <span style={{
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 4,
          background: priorityColor(assignment.task.priority) + '22',
          color: priorityColor(assignment.task.priority),
          fontWeight: 700,
          textTransform: 'uppercase',
        }}>
          {assignment.task.priority}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#1e293b',
          border: '1px solid #3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          color: '#3b82f6',
        }}>
          {assignment.developer.name.split(' ').map(n => n[0]).join('')}
        </div>
        <span style={{ fontSize: 12, color: '#e2e8f0' }}>{assignment.developer.name}</span>
        <span style={{ fontSize: 10, color: '#10b981', marginLeft: 'auto' }}>{assignment.confidenceScore}% match</span>
      </div>
      <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontStyle: 'italic' }}>{assignment.reason}</p>
    </div>
  )
}

function btnStyle(bg: string, color: string) {
  return {
    background: bg,
    color,
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    fontWeight: 600,
  } as React.CSSProperties
}