'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'New Meeting', href: '/meeting', icon: '🎙️' },
  { name: 'Tasks', href: '/tasks', icon: '✅' },
  { name: 'Code Review', href: '/review', icon: '🔍' },
  { name: 'Knowledge Graph', href: '/graph', icon: '🕸️' },
  { name: 'Developers (HR)', href: '/hr', icon: '👥' },
  { name: 'Meeting History', href: '/history', icon: '📜' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-[#1e293b] flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] flex items-center justify-center font-bold text-white text-lg">
          C
        </div>
        <span className="text-xl font-bold tracking-wider text-white">CORTEX</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-4">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span className={`text-lg transition-transform duration-200 group-hover:scale-110`}>
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.name}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-[#1e293b] bg-[#0a0f1e]/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold border border-white/10">
            JD
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-200 truncate">John Doe</span>
            <span className="text-[10px] text-slate-500 truncate uppercase tracking-tight">Admin Console</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
