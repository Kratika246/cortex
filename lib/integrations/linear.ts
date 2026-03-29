import axios from 'axios'
import { LinearIssue } from '@/types'

const LINEAR_API_KEY = process.env.LINEAR_API_KEY
const LINEAR_TEAM_ID = process.env.LINEAR_TEAM_ID

const linearClient = axios.create({
  baseURL: 'https://api.linear.app/graphql',
  headers: {
    'Authorization': LINEAR_API_KEY || '',
    'Content-Type': 'application/json'
  }
})

export async function createLinearIssue(title: string, description: string, priority: number) {
  if (!LINEAR_API_KEY || !LINEAR_TEAM_ID) {
    console.warn('Linear credentials not configured. Skipping issue creation.')
    return null
  }

  const query = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          title
          url
        }
      }
    }
  `

  const variables = {
    input: {
      title,
      description,
      teamId: LINEAR_TEAM_ID,
      priority: priority // 0-4 (0: no priority, 1: urgent, 2: high, 3: normal, 4: low)
    }
  }

  try {
    const response = await linearClient.post('', { query, variables })
    if (response.data.errors) {
      console.error('Linear GraphQL errors:', response.data.errors)
      return null
    }
    return response.data.data.issueCreate.issue
  } catch (error) {
    console.error('Error creating Linear issue:', error)
    return null
  }
}

export async function fetchLinearIssues(): Promise<LinearIssue[]> {
  if (!LINEAR_API_KEY || !LINEAR_TEAM_ID) return []

  const query = `
    query Issues($teamId: String!) {
      issues(first: 50, filter: { team: { id: { eq: $teamId } } }) {
        nodes {
          id
          title
          description
          priority
          status {
            name
          }
          assignee {
            name
          }
        }
      }
    }
  `

  try {
    const response = await linearClient.post('', { query, variables: { teamId: LINEAR_TEAM_ID } })
    return response.data.data.issues.nodes
  } catch (error) {
    console.error('Error fetching Linear issues:', error)
    return []
  }
}
