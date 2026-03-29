import { NextRequest, NextResponse } from 'next/server'
import { fetchTestRailCases, addTestRailCase } from '@/lib/integrations/testrail'

export async function GET() {
  try {
    const cases = await fetchTestRailCases()
    return NextResponse.json({ cases })
  } catch (error) {
    console.error('Fetch TestRail cases API error:', error)
    return NextResponse.json({ error: 'Failed to fetch TestRail cases' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json()
    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array is required' }, { status: 400 })
    }

    const createdCases = []
    for (const task of tasks) {
      // Only push tasks that look like tests to TestRail
      if (task.title.toLowerCase().includes('test') || task.title.toLowerCase().includes('qa') || task.description.toLowerCase().includes('verify')) {
        const testCase = await addTestRailCase(task.title, task.description)
        if (testCase) createdCases.push(testCase)
      }
    }

    return NextResponse.json({ success: true, count: createdCases.length })
  } catch (error) {
    console.error('Push TestRail tasks API error:', error)
    return NextResponse.json({ error: 'Failed to push tasks to TestRail' }, { status: 500 })
  }
}
