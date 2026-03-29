import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { command, transcript } = await req.json()
    if (!command) return NextResponse.json({ error: 'Command is required' }, { status: 400 })

    const systemPrompt = `You are Cortex AI, a live meeting assistant. 
You are listening to a meeting transcript. A user has asked you a question or given you a command.
Provide a concise, helpful response that can be spoken aloud.
If the user asks to "define a task" or "extract a task", return a JSON object with the task details in a specific format, but also provide a verbal confirmation.

Context (Recent Transcript):
${transcript.slice(-2000)}`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command }
      ],
      model: 'llama-3.3-70b-versatile',
    })

    const responseText = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that."

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('Chatbot API error:', error)
    return NextResponse.json({ error: 'Failed to process chatbot request' }, { status: 500 })
  }
}
