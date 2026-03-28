'use client'

import React from 'react'

interface PageWrapperProps {
  children: React.ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0' }}>
      {children}
    </div>
  )
}
