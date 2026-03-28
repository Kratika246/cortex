import { NextRequest, NextResponse } from 'next/server'
import { assignAllTasks } from '@/lib/graph'
import { Task } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { tasks } = await req.json()

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json(
        { error: 'tasks must be an array' },
        { status: 400 }
      )
    }

    const assignments = await assignAllTasks(tasks as Task[])
    return NextResponse.json({ assignments }, { status: 200 })
  } catch (error) {
    console.error('Assign tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to assign tasks' },
      { status: 500 }
    )
  }
}