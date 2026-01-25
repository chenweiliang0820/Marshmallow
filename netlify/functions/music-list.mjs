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

function isFolderEntry(it) {
  // Supabase Storage list(): 資料夾通常沒有 metadata 或 metadata 為 null
  return !it?.metadata
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

    // 1) 先列出 music/ 底下的日期資料夾（或其他子資料夾）
    const { data: top, error: topErr } = await client.storage.from(bucket).list(prefix, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (topErr) {
      return json(500, { ok: false, message: `Supabase list(top) 失敗: ${topErr.message}` })
    }

    const folders = (top || [])
      .filter((it) => it?.name && isFolderEntry(it))
      .map((it) => `${prefix}${it.name}/`)

    // 2) 再逐一列出每個子資料夾內的檔案（不做遞迴到更深層，符合我們的 key 結構 music/YYYY-MM-DD/*.wav）
    const allFiles = []
    for (const folderPrefix of folders) {
      const { data: inside, error: inErr } = await client.storage.from(bucket).list(folderPrefix, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (inErr) continue
      for (const it of inside || []) {
        if (!it?.name) continue
        if (!it.metadata) continue
        if (!isAudioFile(it.name)) continue
        allFiles.push({ folderPrefix, it })
      }
    }

    // 3) 排序 + 截斷
    allFiles.sort((a, b) => {
      const ac = a.it?.created_at || ''
      const bc = b.it?.created_at || ''
      return bc.localeCompare(ac)
    })

    const items = allFiles.slice(0, limit).map(({ folderPrefix, it }) => {
      const key = `${folderPrefix}${it.name}`
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
