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

function isAudioFile(name) {
  const n = String(name || '').toLowerCase()
  return n.endsWith('.wav') || n.endsWith('.mp3') || n.endsWith('.ogg') || n.endsWith('.m4a') || n.endsWith('.mid')
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

    // list() 會同時回傳資料夾 placeholder（例如 name: '2026-01-25'），那不是檔案
    // 如果把它當成 object key 產 publicUrl，會變成 .../music/2026-01-25（少了檔名/斜線），導致 400/404
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      return json(500, { ok: false, message: `Supabase list 失敗: ${error.message}` })
    }

    const files = (data || []).filter((it) => {
      if (!it || typeof it.name !== 'string') return false
      if (!isAudioFile(it.name)) return false
      // Supabase folder 物件通常會有 metadata: null 或 undefined；檔案會有 metadata
      if (!it.metadata) return false
      return true
    })

    const items = files.slice(0, limit).map((it) => {
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
