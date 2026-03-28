'use client'

import { useCallback } from 'react'
import { MeetingStatus } from '@/components/meeting/MeetingStatus'
import { useCortexStore } from '@/store/cortexStore'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function MeetingPage() {
  const { setTasks, setIsProcessing, setError } = useCortexStore()

  const extractTasks = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      setError('Transcript is empty')
      return
    }
    try {
      setIsProcessing(true)
      const res = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTasks(data.tasks)
      console.log(`✓ Extracted ${data.tasks.length} tasks`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extract failed'
      setError(msg)
    } finally {
      setIsProcessing(false)
    }
  }, [setTasks, setIsProcessing, setError])

  return (
    <PageWrapper>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', letterSpacing: '1px' }}>
          MEETING INTELLIGENCE
        </h1>
        <MeetingStatus 
          onAutoExtract={extractTasks}
          onManualExtract={extractTasks}
        />
      </div>
    </PageWrapper>
  )
}
