import { NextResponse } from 'next/server'
import { getAssemblyAIToken } from '@/lib/assemblyai'

export async function GET() {
  try {
    const token = await getAssemblyAIToken()
    return NextResponse.json({ token }, { status: 200 })
  } catch (error) {
    console.error('AssemblyAI token error:', error)
    return NextResponse.json(
      { error: 'Failed to get transcription token' },
      { status: 500 }
    )
  }
}