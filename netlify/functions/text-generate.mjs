/* global process */

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

function pickAuthHeaders() {
  const key = process.env.TBNX_API_KEY || process.env.TEXT_API_KEY || ''
  const headerName = (process.env.TBNX_API_KEY_HEADER || 'Authorization').trim()

  if (!key) return {}

  if (headerName.toLowerCase() === 'authorization') {
    return { Authorization: `Bearer ${key}` }
  }

  return { [headerName]: key }
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, message: 'Method Not Allowed' })
    }

    const baseUrl = (process.env.TBNX_BASE_URL || 'https://tbnx.plus7.plus/').replace(/\/+$/, '')
    const model = process.env.TBNX_TEXT_MODEL || 'gemini-1.5-pro'

    const body = event.body ? JSON.parse(event.body) : {}
    const prompt = typeof body.prompt === 'string' ? body.prompt : ''

    if (!prompt) {
      return json(400, { ok: false, message: 'Missing prompt' })
    }

    // NOTE: 嘗試用 OpenAI 相容 chat/completions 轉送。
    // 若你的服務不是此格式，改這支 function 即可。
    const upstreamPayload = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
    }

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...pickAuthHeaders(),
      },
      body: JSON.stringify(upstreamPayload),
    })

    const text = await res.text().catch(() => '')

    if (!res.ok) {
      return json(res.status, {
        ok: false,
        message: `Upstream error: ${res.status} ${res.statusText}`,
        upstream: text,
      })
    }

    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }

    const content = data?.choices?.[0]?.message?.content || data?.text || null

    return json(200, {
      ok: true,
      content,
      raw: data,
    })
  } catch (e) {
    return json(500, { ok: false, message: e?.stack || e?.message || String(e) })
  }
}
