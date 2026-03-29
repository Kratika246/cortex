'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useCortexStore } from '@/store/cortexStore'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function GraphPage() {
  const { developers, setDevelopers, assignments } = useCortexStore()

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

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">KNOWLEDGE GRAPH</h1>
          <p className="text-slate-400 text-sm mt-1">Visualization of developer expertise and module ownership.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {developers.length === 0 ? (
            <div className="col-span-full p-12 border border-dashed border-[#1e293b] rounded-2xl text-center text-slate-500">
              No developer data available. Add developers in the HR section.
            </div>
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
                <div key={dev.id} className="bg-[#111827] border border-[#1e293b] rounded-2xl p-6 relative overflow-hidden group">
                  <div 
                    className="absolute top-0 left-0 w-full h-1" 
                    style={{ backgroundColor: devColor }} 
                  />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{dev.name}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{dev.id}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {primaryExpertise}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Core Modules</h4>
                      <div className="flex flex-wrap gap-2">
                        {dev.modules.map(mod => (
                          <span key={mod} className="text-[10px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Workload Density</h4>
                        <span className="text-[10px] font-bold text-slate-400">{dev.workload}/10</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${Math.min(dev.workload * 10, 100)}%`,
                            backgroundColor: devColor,
                            boxShadow: `0 0 10px ${devColor}66`
                          }}
                        />
                      </div>
                    </div>

                    {assignments.filter(a => a.developer.id === dev.id).length > 0 && (
                      <div className="pt-2 border-t border-[#1e293b]">
                        <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          {assignments.filter(a => a.developer.id === dev.id).length} ACTIVE ASSIGNMENTS
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
