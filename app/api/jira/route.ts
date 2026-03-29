import { NextRequest, NextResponse } from 'next/server'
import {
  fetchJiraIssues,
  createJiraIssue,
  createJiraMeetingSummary,
  getJiraEnv,
  jiraClient,
} from '@/lib/integrations/jira'

/** Jira REST + Buffer auth require Node (not Edge). */
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isDiagnostic = searchParams.get('diagnostic') === 'true'

  try {
    if (isDiagnostic) {
      const { email, token, baseUrl } = getJiraEnv()
      const projectKey = process.env.JIRA_PROJECT_KEY?.trim()

      if (!email || !token) {
        return NextResponse.json(
          {
            error: 'Jira credentials missing',
            hint: 'Set JIRA_EMAIL and JIRA_API_TOKEN in .env.local.',
          },
          { status: 400 }
        )
      }

      // Check current user identity
      const myselfRes = await jiraClient.get('/myself')
      const myself = {
        accountId: myselfRes.data.accountId,
        displayName: myselfRes.data.displayName,
        emailAddress: myselfRes.data.emailAddress,
        active: myselfRes.data.active,
        envEmail: email ? `${email.substring(0, 3)}...` : 'not-set'
      }

      // Try to fetch all projects to see what's actually available
      let projects = []
      try {
        const allProjectsRes = await jiraClient.get('/project')
        projects = allProjectsRes.data.map((p: any) => ({
          id: p.id,
          key: p.key,
          name: p.name
        }))
      } catch {}

      let projectFound = null
      try {
        const projectRes = await jiraClient.get(`/project/${projectKey}`)
        projectFound = projectRes.data
      } catch {}

      let jqlSearch = null
      let singleIssueTest = null
      try {
        // Try POST search which is often more robust
        const jqlRes = await jiraClient.post('/search/jql', {
          jql: `project = "${projectKey}"`,
          maxResults: 5,
          fields: ['summary', 'status', 'priority', 'assignee', 'project', 'key']
        })
        
        jqlSearch = {
          method: 'POST /search',
          total: jqlRes.data.total,
          ids: jqlRes.data.issues?.map((i: any) => i.id) || [],
          keys: jqlRes.data.issues?.map((i: any) => i.key) || [],
          raw: jqlRes.data
        }

        if (jqlSearch.ids.length > 0) {
          const issueId = jqlSearch.ids[0]
          const issueRes = await jiraClient.get(`/issue/${issueId}`)
          singleIssueTest = {
            id: issueId,
            key: issueRes.data.key,
            summary: issueRes.data.fields?.summary,
            status: issueRes.data.fields?.status?.name
          }
        }
      } catch (e: any) {
        jqlSearch = { 
          error: e.message, 
          url: e.config?.url,
          response: e.response?.data 
        }
      }

      let issueTypes = []
      try {
        const issueTypesRes = await jiraClient.get(`/issuetype`)
        issueTypes = issueTypesRes.data
      } catch {}
      
      return NextResponse.json({
        myself,
        projectKey,
        projectFound,
        allVisibleProjects: projects,
        availableIssueTypes: issueTypes,
        jqlSearch,
        singleIssueTest
      })
    }

    const issues = await fetchJiraIssues()
    return NextResponse.json({ issues })
  } catch (error: unknown) {
    const apiError = error as { 
      response?: { 
        data: unknown; 
        status: number; 
      }; 
      message: string;
    };
    
    console.error('Fetch Jira API error:', apiError.response?.data || apiError.message)
    
    const status = apiError.response?.status || 500;
    const errorData = apiError.response?.data || apiError.message;
    
    const hint401 =
      status === 401
        ? {
            hint401:
              'Atlassian rejected email+API token. Create a new token at id.atlassian.com → Security → API tokens. JIRA_EMAIL must be the exact Atlassian account email for that token. Put the token in double quotes in .env.local if it contains =.',
          }
        : {}

    return NextResponse.json(
      {
        error: errorData,
        status,
        details:
          typeof errorData === 'string' ? errorData : JSON.stringify(errorData),
        ...hint401,
      },
      { status }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Check if it's a meeting summary upload
    if (body.type === 'summary') {
      const { transcript, tasks } = body
      const result = await createJiraMeetingSummary(transcript, tasks)
      if (!result) throw new Error('Failed to create meeting summary issue')
      return NextResponse.json({ success: true, issue: result })
    }

    // Default to task push
    const { tasks } = body
    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array is required' }, { status: 400 })
    }

    const createdIssues = []
    const errors = []
    for (const task of tasks) {
      try {
        const issue = await createJiraIssue(task.title, task.description, task.priority)
        if (issue) {
          createdIssues.push(issue)
        } else {
          errors.push(`Failed to create task: ${task.title}`)
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'Unknown error')
      }
    }

    if (createdIssues.length === 0 && tasks.length > 0) {
      return NextResponse.json({ 
        error: 'No issues were created.', 
        details: errors,
        hint: 'Jira says "valid project is required". Please double check that JIRA_PROJECT_KEY in .env.local matches your Jira Project Key (usually 3-4 uppercase letters like "CORT") exactly.' 
      }, { status: 400 })
    }

    return NextResponse.json({ success: true, count: createdIssues.length, issues: createdIssues })
  } catch (error) {
    console.error('Push Jira tasks API error:', error)
    return NextResponse.json({ error: 'Failed to push tasks to Jira' }, { status: 500 })
  }
}
