import axios from 'axios'
import { JiraIssue } from '@/types'


export const jiraClient = axios.create()

/** Normalize .env token (quotes, trim). Tokens often contain `=` — quote the value in .env.local. */
export function getJiraEnv() {
  const email = process.env.JIRA_EMAIL?.trim()
  let token = process.env.JIRA_API_TOKEN?.trim()
  if (token) {
    token = token.replace(/^["']|["']$/g, '').trim()
  }
  const baseUrl = process.env.JIRA_BASE_URL?.trim().replace(/\/$/, '')
  return { email, token, baseUrl }
}

/** Utility to extract text from Jira ADF (Atlassian Document Format) */
function parseJiraDescription(description: any): string {
  if (!description || !description.content) return ''
  try {
    return description.content
      .map((block: any) => {
        if (block.type === 'paragraph' && block.content) {
          return block.content.map((c: any) => c.text || '').join('')
        }
        if (block.type === 'text') return block.text || ''
        return ''
      })
      .filter(Boolean)
      .join('\n')
      .trim()
  } catch (e) {
    console.warn('Error parsing Jira ADF description:', e)
    return ''
  }
}

// Add interceptor to use fresh env vars on every request
jiraClient.interceptors.request.use((config) => {
  const { email, token, baseUrl } = getJiraEnv()

  if (email && token) {
    const auth = Buffer.from(`${email}:${token}`, 'utf8').toString('base64')
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Basic ${auth}`
    console.log(`[Jira Request] Auth configured for: ${email.substring(0, 3)}...`)
    console.log(`[Jira Request] Base URL: ${baseUrl}`)
  } else {
    console.warn(
      '[Jira Request] Missing JIRA_EMAIL or JIRA_API_TOKEN — set both in .env.local'
    )
  }

  if (baseUrl) {
    config.baseURL = `${baseUrl}/rest/api/3`
  }

  config.headers.Accept = 'application/json'
  config.headers['Content-Type'] = 'application/json'
  return config
}, (error) => {
  console.error('[Jira Request Error]:', error.message)
  return Promise.reject(error)
})

// Add response interceptor for better error logging
jiraClient.interceptors.response.use((response) => {
  return response
}, (error) => {
  if (error.response) {
    console.error('[Jira API Response Error]:', {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
        headers: {
          ...error.config?.headers,
          Authorization: error.config?.headers?.Authorization ? '[REDACTED]' : 'NONE'
        }
      }
    })
  } else if (error.request) {
    console.error('[Jira API No Response Error]:', error.request)
  } else {
    console.error('[Jira API Error]:', error.message)
  }
  return Promise.reject(error)
})



export async function fetchJiraIssues(): Promise<JiraIssue[]> {
  const projectKey = process.env.JIRA_PROJECT_KEY?.trim()
  const { email, token } = getJiraEnv()

  if (!email || !token || !projectKey) {
    console.warn('Jira credentials not configured. Returning empty list.')
    return []
  }

  try {
    // Diagnostic: Check project metadata
    try {
      console.log(`[Jira Diagnostic] Attempting to fetch project: ${projectKey}`)
      const projMeta = await jiraClient.get(`/project/${projectKey}`)
      console.log('Jira Project Meta:', {
        id: projMeta.data.id,
        key: projMeta.data.key,
        name: projMeta.data.name,
        style: projMeta.data.style
      })
      
      // Also check issue types
      const issueTypes = await jiraClient.get(`/issuetype`)
      console.log('Available Issue Types:', issueTypes.data.map((t: { name: string }) => t.name))
      } catch {
        console.error('Failed to fetch project meta for:', projectKey)
      }

      console.log(`[Jira Fetch] Searching for issue IDs in project: ${projectKey}`)
    const searchResponse = await jiraClient.post('/search/jql', {
      jql: `project = "${projectKey}"`,
      maxResults: 15, // Limit for performance
      fields: ['id']
    })

    const issueIds = searchResponse.data.issues?.map((i: any) => i.id) || []
    console.log(`[Jira Fetch] Found ${issueIds.length} issue IDs. Fetching details...`)

    if (issueIds.length === 0) return []

    // Fetch details for each issue in parallel
    const issues = await Promise.all(issueIds.map(async (id: string) => {
      try {
        const res = await jiraClient.get(`/issue/${id}`)
        const issue = res.data
        return {
          id: issue.id,
          key: issue.key,
          summary: issue.fields.summary,
          description: parseJiraDescription(issue.fields.description),
          status: issue.fields.status.name,
          priority: issue.fields.priority?.name || 'Medium',
          assignee: issue.fields.assignee?.displayName
        }
      } catch (err) {
        console.error(`Failed to fetch details for issue ${id}:`, err)
        return null
      }
    }))

    return issues.filter((i): i is JiraIssue => i !== null)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching Jira issues:', error.response?.data || error.message)
    } else {
      console.error('Error fetching Jira issues:', error)
    }
    return []
  }
}


export async function createJiraIssue(summary: string, description: string, priority: 'low' | 'medium' | 'high') {
  const projectKey = process.env.JIRA_PROJECT_KEY?.trim()
  const { email, token } = getJiraEnv()

  if (!email || !token || !projectKey) {
    console.warn('Jira credentials not configured. Skipping issue creation.')
    return null
  }

  try {
    const payload = {
      fields: {
        project: { key: projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description || 'No description provided' }]
            }
          ]
        },
        issuetype: { name: 'Task' },
        priority: { name: priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low' }
      }
    }
    
    console.log('Sending Jira Payload:', JSON.stringify(payload, null, 2))
    const response = await jiraClient.post('/issue', payload)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error creating Jira issue:', error.response?.data || error.message)
    } else {
      console.error('Error creating Jira issue:', error)
    }
    return null
  }
}

export async function createJiraMeetingSummary(transcript: string, tasks: Array<{ title: string; description: string }>) {
  const projectKey = process.env.JIRA_PROJECT_KEY?.trim()
  const { email, token } = getJiraEnv()

  if (!email || !token || !projectKey) {
    console.warn('Jira credentials not configured. Skipping summary creation.')
    return null
  }

  try {
    const taskList = tasks.map(t => `* ${t.title}: ${t.description}`).join('\n')
    const fullSummary = `MEETING PROCEEDINGS\n\nTRANSCRIPT:\n${transcript.slice(0, 1000)}${transcript.length > 1000 ? '...' : ''}\n\nACTION ITEMS:\n${taskList}`

    const response = await jiraClient.post('/issue', {
      fields: {
        project: { key: projectKey },
        summary: `Meeting Proceedings - ${new Date().toLocaleDateString()}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: fullSummary }]
            }
          ]
        },
        issuetype: { name: 'Task' },
        priority: { name: 'Medium' }
      }
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error creating Jira meeting summary:', error.response?.data || error.message)
    } else {
      console.error('Error creating Jira meeting summary:', error)
    }
    return null
  }
}

export async function updateJiraAssignee(issueKey: string, accountId: string) {
  try {
    await jiraClient.put(`/issue/${issueKey}/assignee`, {
      accountId
    })
  } catch (error) {
    console.error('Error updating Jira assignee:', error)
  }
}
