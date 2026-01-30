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
  const key = process.env.TBNX_API_KEY || process.env.IMAGE_API_KEY || ''
  const headerName = (process.env.TBNX_API_KEY_HEADER || 'Authorization').trim()

  if (!key) return {}

  // default: Authorization: Bearer <key>
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
    const model = process.env.TBNX_IMAGE_MODEL || 'gemini-3-pro-image-preview'

    const body = event.body ? JSON.parse(event.body) : {}

    const prompt = typeof body.prompt === 'string' ? body.prompt : ''
    const size = typeof body.size === 'string' ? body.size : '1024x1024'

    if (!prompt) {
      return json(400, { ok: false, message: 'Missing prompt' })
    }

    // NOTE: 這裡採用 OpenAI 相容 images/generations 格式。
    // 若你的 TBNX 服務回傳/路徑不同，只要改這支 function 即可。
    const upstreamPayload = {
      model,
      prompt,
      n: 1,
      size,
    }

    const res = await fetch(`${baseUrl}/v1/images/generations`, {
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

    // Try to normalize common shapes
    const imageUrl =
      data?.data?.[0]?.url ||
      data?.imageUrl ||
      data?.url ||
      null

    const imageBase64 =
      data?.data?.[0]?.b64_json ||
      data?.image_base64 ||
      data?.base64 ||
      null

    return json(200, {
      ok: true,
      imageUrl,
      imageBase64,
      raw: data,
    })
  } catch (e) {
    return json(500, { ok: false, message: e?.stack || e?.message || String(e) })
  }
}
