'use client'

import React, { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'

interface TestResult {
  type: string
  data: unknown
}

export default function JiraTestPage() {
  const [result, setResult] = useState<TestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFetch = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/jira')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fetch failed')
      setResult({ type: 'Fetch Issues', data: data.issues })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const testPush = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const mockTasks = [{
        title: 'Test Task from Cortex AI',
        description: 'This is a test task created to verify the Jira integration is working correctly.',
        priority: 'medium'
      }]
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: mockTasks }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Push failed')
      setResult({ type: 'Push Task', data: data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const testDiagnostics = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/jira?diagnostic=true')
      const data = await res.json()
      if (!res.ok) {
        const errorMsg = data.error?.errorMessages?.join(', ') || data.error?.message || data.error || 'Diagnostics failed'
        throw new Error(`${errorMsg} (Status: ${res.status})`)
      }
      setResult({ type: 'System Diagnostics', data: data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6 text-white">Jira Integration Tester</h1>
        
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Connection Tests</h2>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={testDiagnostics}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Run Full Diagnostics
            </button>
            <button 
              onClick={testFetch}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Test Fetch Issues
            </button>
            <button 
              onClick={testPush}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              Test Push Mock Task
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-blue-400 animate-pulse font-mono">
            Executing API Request...
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-8 font-mono text-sm">
            <strong>ERROR:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-[#0a0f1e] border border-[#1e293b] rounded-xl p-6 font-mono text-xs overflow-auto max-h-125">
            <h3 className="text-blue-400 font-bold mb-4 uppercase">{result.type} Result:</h3>
            <pre className="text-slate-300">{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
