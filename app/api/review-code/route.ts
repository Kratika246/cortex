import { NextRequest, NextResponse } from 'next/server'
import { reviewPullRequest } from '@/lib/reviewCode'
import codebaseData from '@/data/codebase.json'
import { getDeveloperById } from '@/lib/graph'

interface ModuleData {
  owner: string
  files: string[]
  decisions: string[]
}

interface Codebase {
  modules: Record<string, ModuleData>
}

export async function POST(req: NextRequest) {
  try {
    const { diff, moduleName } = await req.json()

    if (!diff || !moduleName) {
      return NextResponse.json(
        { error: 'diff and moduleName are required' },
        { status: 400 }
      )
    }

    const codebase = codebaseData as Codebase
    const moduleData = codebase.modules[moduleName]

    if (!moduleData) {
      return NextResponse.json(
        { error: `Module "${moduleName}" not found in codebase` },
        { status: 404 }
      )
    }

    const owner = getDeveloperById(moduleData.owner)
    const pastDecisions = moduleData.decisions

    const review = await reviewPullRequest(
      diff,
      moduleName,
      owner?.name ?? 'Unknown',
      pastDecisions
    )

    return NextResponse.json({ review }, { status: 200 })
  } catch (error) {
    console.error('Review code error:', error)
    return NextResponse.json(
      { error: 'Failed to review code' },
      { status: 500 }
    )
  }
}