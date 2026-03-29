import axios from 'axios'

const TESTRAIL_BASE_URL = process.env.TESTRAIL_BASE_URL
const TESTRAIL_USER = process.env.TESTRAIL_USER
const TESTRAIL_PASSWORD = process.env.TESTRAIL_PASSWORD
const TESTRAIL_PROJECT_ID = process.env.TESTRAIL_PROJECT_ID

const auth = TESTRAIL_USER && TESTRAIL_PASSWORD 
  ? Buffer.from(`${TESTRAIL_USER}:${TESTRAIL_PASSWORD}`).toString('base64')
  : null

const testrailClient = axios.create({
  baseURL: `${TESTRAIL_BASE_URL}/index.php?/api/v2`,
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  }
})

export async function addTestRailCase(title: string, custom_steps: string) {
  if (!auth || !TESTRAIL_PROJECT_ID) {
    console.warn('TestRail credentials not configured. Skipping test case creation.')
    return null
  }

  try {
    // We assume section_id 1 exists or is default. In a real app, you'd fetch section IDs.
    const response = await testrailClient.post(`/add_case/1`, {
      title,
      custom_steps
    })
    return response.data
  } catch (error) {
    console.error('Error creating TestRail case:', error)
    return null
  }
}

export async function fetchTestRailCases() {
  if (!auth || !TESTRAIL_PROJECT_ID) return []

  try {
    const response = await testrailClient.get(`/get_cases/${TESTRAIL_PROJECT_ID}`)
    return response.data.cases
  } catch (error) {
    console.error('Error fetching TestRail cases:', error)
    return []
  }
}
