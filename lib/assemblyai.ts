/** Temporary token for Universal Streaming v3 (browser WebSocket cannot send auth headers). */
export async function getAssemblyAIToken(): Promise<string> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is not defined')
  }

  const params = new URLSearchParams({
    // v3 allows 1–600s for token lifetime
    expires_in_seconds: '600',
    max_session_duration_seconds: '10800',
  })

  const response = await fetch(
    `https://streaming.assemblyai.com/v3/token?${params}`,
    {
      method: 'GET',
      headers: { Authorization: apiKey },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('AssemblyAI Error:', response.status, errorText)
    throw new Error(`Failed to get AssemblyAI token: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.token
}