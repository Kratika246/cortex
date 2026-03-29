import { NextRequest, NextResponse } from 'next/server'
import { fetchLinearIssues, createLinearIssue } from '@/lib/integrations/linear'

export async function GET() {
  try {
    const issues = await fetchLinearIssues()
    return NextResponse.json({ issues })
  } catch (error) {
    console.error('Fetch Linear issues API error:', error)
    return NextResponse.json({ error: 'Failed to fetch Linear issues' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json()
    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array is required' }, { status: 400 })
    }

    const createdIssues = []
    for (const task of tasks) {
      // Linear priorities: 1 (urgent), 2 (high), 3 (normal), 4 (low)
      const linearPriority = task.priority === 'high' ? 2 : task.priority === 'medium' ? 3 : 4
      const issue = await createLinearIssue(task.title, task.description, linearPriority)
      if (issue) createdIssues.push(issue)
    }

    return NextResponse.json({ success: true, count: createdIssues.length })
  } catch (error) {
    console.error('Push Linear tasks API error:', error)
    return NextResponse.json({ error: 'Failed to push tasks to Linear' }, { status: 500 })
  }
}
