import { NextRequest, NextResponse } from 'next/server'
import { extractTasksFromTranscript } from '@/lib/extractTasks'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const transcript = body?.data?.transcript?.sentences
      ?.map((s: { text: string }) => s.text)
      .join(' ') ?? ''

    if (!transcript) {
      return NextResponse.json({ received: true })
    }

    const tasks = await extractTasksFromTranscript(transcript)
    console.log('Live meeting tasks extracted:', tasks)

    // In production you'd push this to your store or database
    // For the hackathon demo, logging is enough

    return NextResponse.json({ received: true, tasks })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ received: true })
  }
}