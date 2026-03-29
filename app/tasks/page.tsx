'use client'

import React, { useState, useEffect } from 'react'
import { useCortexStore } from '@/store/cortexStore'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { JiraIssue, LinearIssue, TestRailCase } from '@/types'

export default function TasksPage() {
  const { tasks, assignments, setAssignments, isProcessing, setIsProcessing, setError, liveTranscript } = useCortexStore()
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([])
  const [linearIssues, setLinearIssues] = useState<LinearIssue[]>([])
  const [testRailCases, setTestRailCases] = useState<TestRailCase[]>([])
  const [isSyncingJira, setIsSyncingJira] = useState(false)
  const [isSyncingLinear, setIsSyncingLinear] = useState(false)
  const [isSyncingTestRail, setIsSyncingTestRail] = useState(false)

  const fetchJiraIssues = async () => {
    try {
      setIsSyncingJira(true)
      const res = await fetch('/api/jira')
      const data = await res.json()
      if (res.ok) setJiraIssues(data.issues)
    } catch (err) {
      console.error('Failed to fetch Jira issues:', err)
    } finally {
      setIsSyncingJira(false)
    }
  }

  const fetchLinearIssues = async () => {
    try {
      setIsSyncingLinear(true)
      const res = await fetch('/api/linear')
      const data = await res.json()
      if (res.ok) setLinearIssues(data.issues)
    } catch (err) {
      console.error('Failed to fetch Linear issues:', err)
    } finally {
      setIsSyncingLinear(false)
    }
  }

  const fetchTestRailCases = async () => {
    try {
      setIsSyncingTestRail(true)
      const res = await fetch('/api/testrail')
      const data = await res.json()
      if (res.ok) setTestRailCases(data.cases || [])
    } catch (err) {
      console.error('Failed to fetch TestRail cases:', err)
    } finally {
      setIsSyncingTestRail(false)
    }
  }

  const pushToJira = async () => {
    if (tasks.length === 0) return
    try {
      setIsSyncingJira(true)
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Successfully pushed ${data.count} tasks to Jira!`)
        fetchJiraIssues()
      } else {
        setError(data.error || 'Failed to push to Jira')
      }
    } catch {
      setError('Failed to push to Jira')
    } finally {
      setIsSyncingJira(false)
    }
  }

  const pushToLinear = async () => {
    if (tasks.length === 0) return
    try {
      setIsSyncingLinear(true)
      const res = await fetch('/api/linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      if (res.ok) {
        alert('Successfully pushed tasks to Linear!')
        fetchLinearIssues()
      }
    } catch {
      setError('Failed to push to Linear')
    } finally {
      setIsSyncingLinear(false)
    }
  }

  const pushToTestRail = async () => {
    if (tasks.length === 0) return
    try {
      setIsSyncingTestRail(true)
      const res = await fetch('/api/testrail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      if (res.ok) {
        alert('Successfully pushed test tasks to TestRail!')
        fetchTestRailCases()
      }
    } catch {
      setError('Failed to push to TestRail')
    } finally {
      setIsSyncingTestRail(false)
    }
  }

  const uploadProceedings = async () => {
    if (!liveTranscript && tasks.length === 0) return
    try {
      setIsSyncingJira(true)
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'summary',
          transcript: liveTranscript,
          tasks: tasks
        }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`Meeting proceedings uploaded! (Key: ${data.issue.key})`)
        fetchJiraIssues()
      } else {
        setError(data.error || 'Failed to upload proceedings')
      }
    } catch {
      setError('Failed to upload proceedings')
    } finally {
      setIsSyncingJira(false)
    }
  }

  useEffect(() => {
    fetchJiraIssues()
    fetchLinearIssues()
    fetchTestRailCases()
  }, [])

  const assignTasks = async () => {
    if (tasks.length === 0) return
    try {
      setIsProcessing(true)
      const res = await fetch('/api/assign-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAssignments(data.assignments)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assign failed'
      setError(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const priorityColor = (priority: string) => {
    if (priority === 'high') return '#ef4444'
    if (priority === 'medium') return '#f59e0b'
    return '#10b981'
  }

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TASKS & ASSIGNMENTS</h1>
            <p className="text-slate-400 text-sm mt-1">Manage and track AI-extracted tasks from your meetings.</p>
          </div>
          <div className="flex gap-3">
            {(tasks.length > 0 || liveTranscript) && (
              <button 
                onClick={uploadProceedings}
                disabled={isSyncingJira}
                className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
              >
                {isSyncingJira ? 'UPLOADING...' : 'UPLOAD PROCEEDINGS 📑'}
              </button>
            )}
            {tasks.length > 0 && (
              <button 
                onClick={pushToTestRail}
                disabled={isSyncingTestRail}
                className="bg-[#2a772b] hover:bg-[#215a22] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                {isSyncingTestRail ? 'SYNCING...' : 'PUSH TO TESTRAIL ↗'}
              </button>
            )}
            {tasks.length > 0 && (
              <button 
                onClick={pushToLinear}
                disabled={isSyncingLinear}
                className="bg-[#5E6AD2] hover:bg-[#4E59B3] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                {isSyncingLinear ? 'SYNCING...' : 'PUSH TO LINEAR ↗'}
              </button>
            )}
            {tasks.length > 0 && (
              <button 
                onClick={pushToJira}
                disabled={isSyncingJira}
                className="bg-[#0052CC] hover:bg-[#0747A6] text-white text-[10px] font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                {isSyncingJira ? 'SYNCING...' : 'PUSH TO JIRA ↗'}
              </button>
            )}
            {tasks.length > 0 && assignments.length === 0 && (
              <button 
                onClick={assignTasks}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                {isProcessing ? 'ASSIGNING...' : 'ASSIGN TO DEVELOPERS →'}
              </button>
            )}
            <div className="px-4 py-2 bg-[#111827] border border-[#1e293b] rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase block leading-none mb-1">Total Tasks</span>
              <span className="text-xl font-bold text-blue-500 leading-none">{tasks.length}</span>
            </div>
            <div className="px-4 py-2 bg-[#111827] border border-[#1e293b] rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase block leading-none mb-1">Assigned</span>
              <span className="text-xl font-bold text-emerald-500 leading-none">{assignments.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Extracted Tasks */}
          <section>
            <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              01 — Extracted Tasks
            </h2>
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="p-8 border border-dashed border-[#1e293b] rounded-xl text-center text-slate-500 text-sm">
                  No tasks extracted yet. Start a meeting to generate tasks.
                </div>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="p-4 bg-[#111827] border border-[#1e293b] rounded-xl hover:border-blue-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span style={{ color: priorityColor(task.priority) }} className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-current">
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">{task.id}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">{task.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{task.description}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Current Assignments */}
          <section>
            <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              02 — Active Assignments
            </h2>
            <div className="space-y-3">
              {assignments.length === 0 ? (
                <div className="p-8 border border-dashed border-[#1e293b] rounded-xl text-center text-slate-500 text-sm">
                  No assignments active. Use the assignment engine to distribute tasks.
                </div>
              ) : (
                assignments.map((asgn, idx) => (
                  <div key={idx} className="p-4 bg-[#111827] border border-[#1e293b] border-l-4 border-l-blue-500 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                          {asgn.developer.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-200">{asgn.developer.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {asgn.confidenceScore}% MATCH
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">{asgn.task.title}</h3>
                    <p className="text-[11px] text-slate-500 italic">&quot;{asgn.reason}&quot;</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Jira Integration */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold tracking-widest text-[#0052CC] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC]" />
                03 — Jira Sync Status
              </h2>
              <button onClick={fetchJiraIssues} className="text-[10px] text-slate-500 hover:text-white underline">Refresh</button>
            </div>
            <div className="space-y-3">
              {isSyncingJira ? (
                <div className="p-8 bg-[#111827] border border-[#1e293b] rounded-xl text-center animate-pulse">
                  <span className="text-xs text-slate-500">Syncing with Jira...</span>
                </div>
              ) : jiraIssues.length === 0 ? (
                <div className="p-8 border border-dashed border-[#1e293b] rounded-xl text-center text-slate-500 text-sm">
                  No active Jira issues found for project.
                </div>
              ) : (
                jiraIssues.map(issue => (
                  <div key={issue.key} className="p-4 bg-[#111827] border border-[#1e293b] border-r-4 border-r-[#0052CC] rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#0052CC] bg-[#0052CC]/10 px-2 py-0.5 rounded">{issue.key}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{issue.status}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 mb-1">{issue.summary}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-500 italic">{issue.assignee || 'Unassigned'}</span>
                      <span className="text-[9px] text-slate-600 uppercase font-bold">{issue.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Linear Integration */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-bold tracking-widest text-[#5E6AD2] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2]" />
                04 — Linear Sync Status
              </h2>
              <button onClick={fetchLinearIssues} className="text-[10px] text-slate-500 hover:text-white underline">Refresh</button>
            </div>
            <div className="space-y-3">
              {isSyncingLinear ? (
                <div className="p-8 bg-[#111827] border border-[#1e293b] rounded-xl text-center animate-pulse">
                  <span className="text-xs text-slate-500">Syncing with Linear...</span>
                </div>
              ) : linearIssues.length === 0 ? (
                <div className="p-8 border border-dashed border-[#1e293b] rounded-xl text-center text-slate-500 text-sm">
                  No active Linear issues found.
                </div>
              ) : (
                linearIssues.map(issue => (
                  <div key={issue.id} className="p-4 bg-[#111827] border border-[#1e293b] border-r-4 border-r-[#5E6AD2] rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#5E6AD2] bg-[#5E6AD2]/10 px-2 py-0.5 rounded">Issue</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">{issue.status.name}</span>
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 mb-1">{issue.title}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-500 italic">{issue.assignee?.name || 'Unassigned'}</span>
                      <span className="text-[9px] text-slate-600 uppercase font-bold">P{issue.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
           </section>

           {/* TestRail Integration */}
           <section>
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xs font-bold tracking-widest text-[#2a772b] uppercase flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#2a772b]" />
                 05 — TestRail Sync Status
               </h2>
               <button onClick={fetchTestRailCases} className="text-[10px] text-slate-500 hover:text-white underline">Refresh</button>
             </div>
             <div className="space-y-3">
               {isSyncingTestRail ? (
                 <div className="p-8 bg-[#111827] border border-[#1e293b] rounded-xl text-center animate-pulse">
                   <span className="text-xs text-slate-500">Syncing with TestRail...</span>
                 </div>
               ) : testRailCases.length === 0 ? (
                 <div className="p-8 border border-dashed border-[#1e293b] rounded-xl text-center text-slate-500 text-sm">
                   No active TestRail cases found.
                 </div>
               ) : (
                 testRailCases.map(tc => (
                   <div key={tc.id} className="p-4 bg-[#111827] border border-[#1e293b] border-r-4 border-r-[#2a772b] rounded-xl">
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-bold text-[#2a772b] bg-[#2a772b]/10 px-2 py-0.5 rounded">C{tc.id}</span>
                       <span className="text-[10px] text-slate-500 uppercase font-bold">Priority {tc.priority_id}</span>
                     </div>
                     <h3 className="text-xs font-bold text-slate-200 mb-1">{tc.title}</h3>
                   </div>
                 ))
               )}
             </div>
           </section>
          </div>
      </div>
    </PageWrapper>
  )
}
