async function test() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.error('Set ASSEMBLYAI_API_KEY');
    process.exit(1);
  }
  const params = new URLSearchParams({
    expires_in_seconds: '600',
    max_session_duration_seconds: '10800',
  });
  const response = await fetch(
    `https://streaming.assemblyai.com/v3/token?${params}`,
    {
      method: 'GET',
      headers: { Authorization: apiKey },
    }
  );
  console.log('Status:', response.status);
  console.log('Body:', await response.text());
}
test();
