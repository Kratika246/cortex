'use client'

import React, { useState } from 'react'
import { useCortexStore } from '@/store/cortexStore'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function ReviewPage() {
  const { currentReview, isProcessing, setError, setCurrentReview, setIsProcessing } = useCortexStore()
  const [diff, setDiff] = useState('')
  const [moduleName, setModuleName] = useState('auth')

  const handleReview = async () => {
    if (!diff.trim()) {
      setError('Paste a PR diff first')
      return
    }
    try {
      setIsProcessing(true)
      const res = await fetch('/api/review-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diff, moduleName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrentReview(data.review)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Review failed'
      setError(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const verdictColor = (verdict: string) => {
    if (verdict === 'approved') return '#10b981'
    if (verdict === 'changes-requested') return '#ef4444'
    return '#f59e0b'
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">AI CODE REVIEW</h1>
          <p className="text-slate-400 text-sm mt-1">Submit your diffs for instant architectural and logic review.</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Input Section */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6">
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Module Name</label>
                <select 
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="auth">auth</option>
                  <option value="user-service">user-service</option>
                  <option value="payments">payments</option>
                  <option value="billing">billing</option>
                  <option value="notifications">notifications</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">PR Diff</label>
                <textarea
                  value={diff}
                  onChange={(e) => setDiff(e.target.value)}
                  placeholder="Paste your git diff here..."
                  className="w-full h-48 bg-[#0a0f1e] border border-[#1e293b] rounded-lg px-4 py-3 text-xs font-mono text-slate-300 outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
              <button
                onClick={handleReview}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all text-sm tracking-wide"
              >
                {isProcessing ? 'ANALYZING CODE...' : 'START REVIEW'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          {currentReview && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Review Result</h2>
                <span 
                  style={{ color: verdictColor(currentReview.verdict), borderColor: `${verdictColor(currentReview.verdict)}44` }}
                  className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border bg-white/5"
                >
                  {currentReview.verdict.replace('-', ' ')}
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Summary</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{currentReview.summary}</p>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Detailed Comments</h3>
                  <div className="space-y-3">
                    {currentReview.comments.map((comment, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[#0a0f1e] border border-[#1e293b] flex gap-3">
                        <span className={`text-sm mt-0.5 ${
                          comment.type === 'critical' ? 'text-red-500' :
                          comment.type === 'warning' ? 'text-amber-500' :
                          comment.type === 'suggestion' ? 'text-blue-500' : 'text-emerald-500'
                        }`}>
                          {comment.type === 'critical' ? '🔴' :
                           comment.type === 'warning' ? '⚠️' :
                           comment.type === 'suggestion' ? '💡' : '✅'}
                        </span>
                        <div>
                          <p className="text-sm text-slate-300 leading-relaxed">{comment.message}</p>
                          {comment.lineNumber && (
                            <span className="text-[10px] text-slate-600 font-mono mt-1 block uppercase tracking-tighter">Line {comment.lineNumber}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
