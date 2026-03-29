'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MeetingStatus } from '@/components/meeting/MeetingStatus'
import { useCortexStore } from '@/store/cortexStore'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default function MeetingPage() {
  const router = useRouter()
  const { setTasks, setIsProcessing, setError, tasks, liveTranscript } = useCortexStore()
  const [isSyncingJira, setIsSyncingJira] = useState(false)

  const uploadProceedings = async () => {
    if (!liveTranscript && tasks.length === 0) {
      setError('Nothing to upload. Start a meeting first.')
      return
    }
    try {
      setIsSyncingJira(true)
      const res = await fetch('/api/jira', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'summary',
          transcript: liveTranscript,
          tasks: tasks
        }),
      })
      if (res.ok) {
        alert('Meeting proceedings uploaded to Jira!')
      } else {
        throw new Error('Upload failed')
      }
    } catch {
      setError('Failed to upload proceedings to Jira')
    } finally {
      setIsSyncingJira(false)
    }
  }

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
      
      // Redirect to tasks page
      router.push('/tasks')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extract failed'
      setError(msg)
    } finally {
      setIsProcessing(false)
    }
  }, [setTasks, setIsProcessing, setError, router])

  return (
    <PageWrapper>
      <div style={{ padding: '0', maxWidth: '1200px', margin: '0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', letterSpacing: '1px' }}>
          MEETING INTELLIGENCE
        </h1>
        <MeetingStatus 
          onAutoExtract={extractTasks}
          onManualExtract={extractTasks}
          onUploadToJira={uploadProceedings}
          isSyncingJira={isSyncingJira}
        />
      </div>
    </PageWrapper>
  )
}
