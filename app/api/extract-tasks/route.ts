import { NextRequest, NextResponse } from 'next/server'
import { extractTasksFromTranscript } from '@/lib/extractTasks'

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json()

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'transcript is required and must be a string' },
        { status: 400 }
      )
    }

    const tasks = await extractTasksFromTranscript(transcript)
    return NextResponse.json({ tasks }, { status: 200 })
  } catch (error) {
    console.error('Extract tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to extract tasks' },
      { status: 500 }
    )
  }
}