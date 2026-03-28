import { NextRequest, NextResponse } from 'next/server'
import { getDevelopers, addDeveloper } from '@/lib/db'
import { callGroq } from '@/lib/groq'
import axios from 'axios'
import { Developer } from '@/types'

export async function GET() {
  try {
    const devs = await getDevelopers()
    return NextResponse.json({ developers: devs })
  } catch (_error) {
    console.error('GET /api/developers error:', _error)
    return NextResponse.json({ error: 'Failed to fetch developers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { githubUsername, email } = await req.json()

    if (!githubUsername) {
      return NextResponse.json({ error: 'githubUsername is required' }, { status: 400 })
    }

    // 1. Fetch data from GitHub
    interface GitHubUser {
      name?: string
      email?: string
      bio?: string
      [key: string]: unknown
    }
    
    interface GitHubRepo {
      name: string
      description: string
      language: string
    }

    let githubData: GitHubUser = {}
    let repos: GitHubRepo[] = []
    try {
      const userRes = await axios.get(`https://api.github.com/users/${githubUsername}`)
      githubData = userRes.data
      
      const reposRes = await axios.get(`https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=10`)
      repos = reposRes.data
    } catch (err) {
      console.error('GitHub fetch error:', err)
      return NextResponse.json({ error: 'Failed to fetch GitHub profile' }, { status: 404 })
    }

    // 2. Use AI to generate developer profile from GitHub data
    const systemPrompt = `You are Cortex AI. Generate a structured developer profile in JSON format based on GitHub data.
The JSON must follow this exact shape:
{
  "id": "dev_unique_id",
  "name": "Full Name",
  "email": "email@example.com",
  "languages": ["Lang1", "Lang2"],
  "modules": ["Suggested Module 1", "Suggested Module 2"],
  "workload": 0,
  "expertise": ["Skill 1", "Skill 2"],
  "pastTasks": ["Example task based on repos"]
}
Be creative but realistic based on their repositories and bio.
Suggested modules should be relevant to common web/software architectures.
Return ONLY raw JSON.`

    const userMessage = `GitHub Profile: ${JSON.stringify(githubData)}
Recent Repos: ${JSON.stringify(repos.map(r => ({ name: r.name, description: r.description, language: r.language })))}
Email: ${email || githubData.email || 'dev@cortex.dev'}`

    const aiResponse = await callGroq(systemPrompt, userMessage)
    
    let generatedDev: Developer | null = null
    try {
      // More robust JSON extraction
      let cleaned = aiResponse.trim()
      if (cleaned.includes('```')) {
        const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) {
          cleaned = match[1].trim()
        } else {
          cleaned = cleaned.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
        }
      }
      
      generatedDev = JSON.parse(cleaned) as Developer
      
      // Ensure ID is unique and name/email are set
      generatedDev.id = `dev_${Date.now()}`
      if (!generatedDev.email && email) generatedDev.email = email
    } catch (parseErr) {
      console.error('AI parsing error:', aiResponse, parseErr)
      return NextResponse.json({ 
        error: 'Failed to parse AI response',
        raw: aiResponse 
      }, { status: 500 })
    }

    try {
      if (generatedDev) {
        await addDeveloper(generatedDev)
        return NextResponse.json({ developer: generatedDev }, { status: 201 })
      }
    } catch (dbErr) {
      console.error('Database error adding developer:', dbErr)
      // If we reach here, even the memory fallback failed (unlikely) or something else went wrong
      return NextResponse.json({ error: 'Failed to save developer profile' }, { status: 500 })
    }

  } catch (error) {
    console.error('Create developer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
