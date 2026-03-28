'use client'

import React, { useState, useEffect } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Developer } from '@/types'
import { useCortexStore } from '@/store/cortexStore'

export default function HRDashboard() {
  const [developers, setDevelopers] = useState<Developer[]>([])
  const [githubUsername, setGithubUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { setError, addDeveloper } = useCortexStore()

  const fetchDevs = async () => {
    try {
      const res = await fetch('/api/developers')
      const data = await res.json()
      if (res.ok) setDevelopers(data.developers)
    } catch (err) {
      console.error('Fetch devs error:', err)
    }
  }

  useEffect(() => {
    fetchDevs()
  }, [])

  const handleAddDeveloper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!githubUsername) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/developers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ githubUsername, email }),
      })

      const data = await res.json()
      if (res.ok) {
        setDevelopers(prev => [...prev, data.developer])
        addDeveloper(data.developer)
        setGithubUsername('')
        setEmail('')
      } else {
        setError(data.error || 'Failed to add developer')
      }
    } catch (err) {
      setError('An error occurred while adding the developer')
    } finally {
      setIsLoading(false)
    }
  }

  const btnStyle = (bg: string, fg: string) => ({
    padding: '10px 20px',
    background: bg,
    color: fg,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'monospace',
    letterSpacing: 1,
    transition: 'opacity 0.2s',
  })

  const inputStyle = {
    padding: '12px',
    background: '#0a0f1e',
    border: '1px solid #1e293b',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'monospace',
    outline: 'none',
    width: '100%',
    marginBottom: '16px',
  }

  return (
    <PageWrapper>
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '2px', color: '#3b82f6' }}>
            HR — DEVELOPER MANAGEMENT
          </h1>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            TOTAL DEVELOPERS: {developers.length}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
          
          {/* Developers List */}
          <div>
            <h2 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', letterSpacing: '1px' }}>
              01 — ADDED DEVELOPERS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {developers.length === 0 ? (
                <div style={{ padding: '40px', background: '#111827', borderRadius: 12, border: '1px solid #1e293b', textAlign: 'center', color: '#64748b' }}>
                  No developers added yet.
                </div>
              ) : (
                developers.map(dev => (
                  <div key={dev.id} style={{ padding: '20px', background: '#111827', borderRadius: 12, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 700, fontSize: '18px', color: '#3b82f6' }}>{dev.name}</div>
                      <div style={{ fontSize: '10px', padding: '2px 6px', background: '#1e293b', borderRadius: 4, color: '#94a3b8' }}>{dev.id}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{dev.email}</div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {dev.languages.map(lang => (
                        <span key={lang} style={{ fontSize: '10px', padding: '2px 8px', background: '#0a0f1e', border: '1px solid #3b82f6', borderRadius: 12, color: '#3b82f6' }}>
                          {lang}
                        </span>
                      ))}
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>EXPERTISE</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dev.expertise.map(exp => (
                          <span key={exp} style={{ fontSize: '10px', padding: '2px 8px', background: '#1e293b', borderRadius: 4, color: '#e2e8f0' }}>
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>MODULES</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {dev.modules.map(mod => (
                          <span key={mod} style={{ fontSize: '10px', padding: '2px 8px', background: '#0a0f1e', border: '1px solid #10b981', borderRadius: 4, color: '#10b981' }}>
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Developer Form */}
          <div>
            <h2 style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', letterSpacing: '1px' }}>
              02 — ADD NEW DEVELOPER
            </h2>
            <div style={{ padding: '24px', background: '#111827', borderRadius: 12, border: '1px solid #1e293b' }}>
              <form onSubmit={handleAddDeveloper}>
                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#94a3b8' }}>GITHUB USERNAME</div>
                <input 
                  type="text" 
                  placeholder="e.g. torvalds" 
                  value={githubUsername}
                  onChange={e => setGithubUsername(e.target.value)}
                  style={inputStyle}
                  required
                />

                <div style={{ marginBottom: '8px', fontSize: '12px', color: '#94a3b8' }}>EMAIL (OPTIONAL)</div>
                <input 
                  type="email" 
                  placeholder="dev@company.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />

                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{
                    ...btnStyle(isLoading ? '#1e293b' : '#3b82f6', '#fff'),
                    width: '100%',
                    marginTop: '16px',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? 'GENERATING PROFILE...' : 'ADD DEVELOPER'}
                </button>
              </form>

              <div style={{ marginTop: '24px', fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
                Adding a developer via GitHub will automatically fetch their public profile, analyze their repositories, and generate a skill profile using Cortex AI.
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  )
}
