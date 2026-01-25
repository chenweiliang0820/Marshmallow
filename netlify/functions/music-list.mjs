import { createClient } from '@supabase/supabase-js'

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

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, { ok: false, message: 'Method Not Allowed' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = process.env.SUPABASE_MUSIC_BUCKET || 'game-music'

    if (!supabaseUrl || !serviceKey) {
      return json(500, {
        ok: false,
        message: '缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（請在 Netlify 環境變數設定）',
      })
    }

    const q = event.queryStringParameters || {}
    const limit = Math.max(1, Math.min(100, Number(q.limit) || 30))
    const prefix = String(q.prefix || 'music/')

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      return json(500, { ok: false, message: `Supabase list 失敗: ${error.message}` })
    }

    const items = (data || []).map((it) => {
      const key = `${prefix}${it.name}`
      const { data: pub } = client.storage.from(bucket).getPublicUrl(key)
      return {
        name: it.name,
        key,
        url: pub.publicUrl,
        created_at: it.created_at,
        updated_at: it.updated_at,
        metadata: it.metadata,
      }
    })

    return json(200, { ok: true, bucket, prefix, items })
  } catch (e) {
    return json(500, { ok: false, message: e?.stack || e?.message || String(e) })
  }
}
