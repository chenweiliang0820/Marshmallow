function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

export const handler = async () => {
  // Netlify 版本：音樂以 Node 直接合成 WAV 並上傳到 Supabase，不需要本機 fluidsynth / SoundFont 安裝。
  // 前端 UI 仍沿用 installed/downloading 判斷，因此這裡直接回報可用。
  return json(200, {
    installed: true,
    downloading: false,
    message: 'netlify-functions: node-wav-synth + supabase storage',
  })
}
