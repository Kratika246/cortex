import { callGroq } from './groq'
import { Task } from '@/types'

export async function extractTasksFromTranscript(
  transcript: string
): Promise<Task[]> {
  const systemPrompt = `You are Cortex, an AI that analyzes meeting transcripts for software engineering teams.
Your job is to extract every task, action item, and decision from the transcript.
You must respond with ONLY a valid JSON array.
No markdown, no backticks, no explanation, no extra text. Just the raw JSON array.
Each item must follow this exact shape:
[
  {
    "id": "task_001",
    "title": "Short task title under 8 words",
    "description": "Full description of what needs to be done",
    "priority": "high",
    "owner": "First name of person responsible or null if unclear",
    "decidedIn": "Brief context of why this task was created",
    "status": "extracted"
  }
]
Priority must be one of: low, medium, high.
Status must always be: extracted.
Generate a unique id for each task like task_001, task_002 etc.`

  const userMessage = `Extract all tasks from this meeting transcript:\n\n${transcript}`

  const raw = await callGroq(systemPrompt, userMessage)

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return parsed as Task[]
  } catch (error) {
    console.error('Failed to parse tasks JSON:', raw)
    return []
  }
}