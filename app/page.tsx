'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useCortexStore } from '@/store/cortexStore'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'

export default function Dashboard() {
  const { 
    developers, 
    setDevelopers, 
    tasks, 
    assignments, 
    currentReview 
  } = useCortexStore()

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

  const stats = [
    { name: 'Active Developers', value: developers.length, icon: '👥', color: 'blue', href: '/hr' },
    { name: 'Extracted Tasks', value: tasks.length, icon: '✅', color: 'emerald', href: '/tasks' },
    { name: 'Total Assignments', value: assignments.length, icon: '🚀', color: 'indigo', href: '/tasks' },
    { name: 'Code Reviews', value: currentReview ? 1 : 0, icon: '🔍', color: 'amber', href: '/review' },
  ]

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Welcome Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1e293b] pb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Welcome to Cortex AI</h1>
            <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
              Your intelligent command center for meeting intelligence, automated task distribution, and architectural code reviews.
            </p>
          </div>
          <Link 
            href="/meeting"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] text-sm uppercase tracking-widest"
          >
            Start New Meeting →
          </Link>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Link 
              key={stat.name}
              href={stat.href}
              className="bg-[#111827] border border-[#1e293b] p-6 rounded-2xl hover:border-blue-500/50 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest group-hover:text-blue-400 transition-colors">
                  View Details →
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{stat.name}</p>
            </Link>
          ))}
        </div>

        {/* Recent Activity / Next Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Team */}
          <section className="bg-[#111827] border border-[#1e293b] rounded-2xl p-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Active Team Intelligence
            </h3>
            <div className="space-y-4">
              {developers.slice(0, 3).map(dev => (
                <div key={dev.id} className="flex items-center justify-between p-4 bg-[#0a0f1e] border border-[#1e293b] rounded-xl hover:bg-slate-800/20 transition-colors cursor-pointer" onClick={() => window.location.href = '/graph'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/20">
                      {dev.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">{dev.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{dev.expertise[0]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase">Workload</p>
                      <p className="text-xs font-bold text-slate-300">{dev.workload}/10</p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              ))}
              <Link href="/graph" className="block text-center text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest mt-4">
                View All Knowledge Graph →
              </Link>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="bg-[#111827] border border-[#1e293b] rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Quick Operations
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <Link href="/review" className="p-4 bg-[#0a0f1e] border border-[#1e293b] rounded-xl flex items-center gap-4 hover:border-amber-500/50 transition-all group">
                  <span className="text-xl">🔍</span>
                  <div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-amber-400 transition-colors">Run AI Code Review</p>
                    <p className="text-[10px] text-slate-500 uppercase">Analyze PR diffs instantly</p>
                  </div>
                </Link>
                <Link href="/hr" className="p-4 bg-[#0a0f1e] border border-[#1e293b] rounded-xl flex items-center gap-4 hover:border-blue-500/50 transition-all group">
                  <span className="text-xl">👥</span>
                  <div>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">Onboard Developers</p>
                    <p className="text-[10px] text-slate-500 uppercase">Import from GitHub profile</p>
                  </div>
                </Link>
                <Link href="/history" className="p-4 bg-[#0a0f1e] border border-[#1e293b] rounded-xl flex items-center gap-4 hover:border-slate-500 transition-all group opacity-50">
                  <span className="text-xl">📜</span>
                  <div>
                    <p className="text-sm font-bold text-slate-200">View Archive</p>
                    <p className="text-[10px] text-slate-500 uppercase">Search past meeting intel</p>
                  </div>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageWrapper>
  )
}
