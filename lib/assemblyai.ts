export async function getAssemblyAIToken(): Promise<string> {
  const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
    method: 'POST',
    headers: {
      authorization: process.env.ASSEMBLYAI_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ expires_in: 3600 }),
  })

  if (!response.ok) {
    throw new Error('Failed to get AssemblyAI token')
  }

  const data = await response.json()
  return data.token
}