'use client'

import React from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function HistoryPage() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">MEETING HISTORY</h1>
          <p className="text-slate-400 text-sm mt-1">Review past meeting transcripts and extracted intelligence.</p>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">📜</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No History Found</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">
            Your meeting history is currently empty. Start your first AI-powered meeting to begin building your knowledge base.
          </p>
          <button 
            onClick={() => window.location.href = '/meeting'}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all text-sm tracking-wide"
          >
            START NEW MEETING
          </button>
        </div>

        {/* Placeholder List */}
        <div className="mt-12 space-y-4 opacity-30 pointer-events-none grayscale">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2">Recent Archives</h3>
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-[#111827] border border-[#1e293b] rounded-xl flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xs">DOC</div>
                <div>
                  <div className="h-3 w-32 bg-slate-800 rounded mb-2" />
                  <div className="h-2 w-20 bg-slate-800/50 rounded" />
                </div>
              </div>
              <div className="h-4 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  )
}
