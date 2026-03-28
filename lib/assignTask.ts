import { callGroq } from './groq'
import { Task, Developer, Assignment } from '@/types'

export async function assignTaskToDeveloper(
  task: Task,
  developers: Developer[]
): Promise<Assignment> {
  const systemPrompt = `You are Cortex, an AI that assigns software engineering tasks to the most suitable developer.
You analyze the task requirements against each developer's skills, module ownership, current workload, and past experience.
You must respond with ONLY a valid JSON object.
No markdown, no backticks, no explanation, no extra text. Just raw JSON.
The JSON must follow this exact shape:
{
  "developerId": "dev_001",
  "confidenceScore": 92,
  "reason": "Clear 1-2 sentence explanation of why this developer is the best match"
}
Choose the developer who best matches the task based on:
1. Module ownership (highest priority)
2. Relevant expertise and past tasks
3. Current workload (prefer lower workload when skills are equal)
4. Programming language match`

  const userMessage = `Assign this task to the best developer:

Task:
${JSON.stringify(task, null, 2)}

Available Developers:
${JSON.stringify(developers, null, 2)}`

  const raw = await callGroq(systemPrompt, userMessage)

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)
    const developer = developers.find(d => d.id === result.developerId)

    if (!developer) {
      throw new Error(`Developer ${result.developerId} not found`)
    }

    return {
      task: { ...task, status: 'assigned' },
      developer,
      confidenceScore: result.confidenceScore,
      reason: result.reason,
    }
  } catch (error) {
    console.error('Failed to parse assignment JSON:', raw)
    const fallbackDev = developers.reduce((prev, curr) =>
      curr.workload < prev.workload ? curr : prev
    )
    return {
      task: { ...task, status: 'assigned' },
      developer: fallbackDev,
      confidenceScore: 0,
      reason: 'Auto-assigned to least busy developer due to parsing error.',
    }
  }
}