import { NextRequest, NextResponse } from 'next/server'
import { createMeetingBot } from '@/lib/recall'

export async function POST(req: NextRequest) {
  try {
    const { meetingUrl } = await req.json()

    if (!meetingUrl) {
      return NextResponse.json(
        { error: 'meetingUrl is required' },
        { status: 400 }
      )
    }

    const botId = await createMeetingBot(meetingUrl)
    return NextResponse.json({ botId })
  } catch (error) {
    console.error('Create bot error:', error)
    return NextResponse.json(
      { error: 'Failed to create meeting bot' },
      { status: 500 }
    )
  }
}