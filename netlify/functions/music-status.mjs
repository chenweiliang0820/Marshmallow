export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({
      ok: true,
      provider: 'netlify-functions',
      generator: 'node-wav-synth',
    }),
  }
}
