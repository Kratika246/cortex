import { callGroq } from './groq'
import { CodeReview } from '@/types'

export async function reviewPullRequest(
  diff: string,
  moduleName: string,
  moduleOwner: string,
  pastDecisions: string[]
): Promise<CodeReview> {
  const systemPrompt = `You are Cortex, an expert AI code reviewer with deep context of the codebase history.
You review pull requests with full awareness of past architectural decisions and module ownership.
You must respond with ONLY a valid JSON object.
No markdown, no backticks, no explanation. Just raw JSON.
The JSON must follow this exact shape:
{
  "verdict": "approved",
  "summary": "2-3 sentence summary of what this PR does and your overall assessment",
  "comments": [
    {
      "lineNumber": 12,
      "type": "suggestion",
      "message": "Your specific comment here"
    }
  ],
  "contextUsed": [
    "List of specific past decisions or ownership context that influenced your review"
  ]
}
verdict must be one of: approved, changes-requested, needs-discussion
comment type must be one of: suggestion, warning, critical, praise
If you cannot determine a line number, set lineNumber to null.
Give at least 3 comments and at most 8 comments.`

  const userMessage = `Review this pull request:

Module: ${moduleName}
Module Owner: ${moduleOwner}

Past architectural decisions for this module:
${pastDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}

PR Diff:
${diff}`

  const raw = await callGroq(systemPrompt, userMessage)

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(cleaned) as CodeReview
  } catch (error) {
    console.error('Failed to parse review JSON:', raw)
    return {
      verdict: 'needs-discussion',
      summary: 'Review could not be parsed. Please try again.',
      comments: [],
      contextUsed: [],
    }
  }
}