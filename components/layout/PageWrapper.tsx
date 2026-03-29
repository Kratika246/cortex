'use client'

import React from 'react'
import { Sidebar } from './Sidebar'

interface PageWrapperProps {
  children: React.ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="flex min-h-screen bg-[#0a0f1e] text-slate-200 font-mono">
      {/* Sidebar - fixed width */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar / Header */}
        <header className="h-16 border-b border-[#1e293b] bg-[#0f172a]/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <h2 className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
              System Operations / Live
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Server Status</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase">Operational</span>
            </div>
            <div className="w-px h-8 bg-[#1e293b]" />
            <button className="text-slate-400 hover:text-white transition-colors">
              🔔
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  )
}
