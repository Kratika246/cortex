import axios from 'axios'

const RECALL_API_KEY = process.env.RECALL_API_KEY!
const RECALL_BASE_URL = 'https://us-east-1.recall.ai/api/v1'

export async function createMeetingBot(meetingUrl: string): Promise<string> {
  const response = await axios.post(
    `${RECALL_BASE_URL}/bot`,
    {
      meeting_url: meetingUrl,
      bot_name: 'Cortex Notetaker',
      transcription_options: {
        provider: 'default',
      },
      real_time_transcription: {
        destination_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
        partial_results: false,
      },
    },
    {
      headers: {
        Authorization: `Token ${RECALL_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data.id
}

export async function getBotStatus(botId: string) {
  const response = await axios.get(`${RECALL_BASE_URL}/bot/${botId}`, {
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
    },
  })

  return response.data
}