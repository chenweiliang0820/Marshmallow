import { useEffect, useState } from 'react'
import { getApiUrl, getMusicUrl } from '@/lib/api'

interface StatusResp {
  installed: boolean
  downloading: boolean
  message?: string
}

interface MusicItem {
  key: string
  url: string
  name: string
  created_at?: string
}

const defaultStatus: StatusResp = {
  installed: false,
  downloading: false,
}

export default function ToolGameMusic() {
  const [status, setStatus] = useState<StatusResp>(defaultStatus)
  const [mood, setMood] = useState<'calm' | 'tense'>('calm')
  const [tempo, setTempo] = useState(90)
  const [duration, setDuration] = useState(20)
  const [wavUrl, setWavUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<MusicItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const resp = await fetch(getApiUrl('/api/music/status'))
      const ct = resp.headers.get('content-type') || ''
      if (!resp.ok) {
        const text = await resp.text()
        setStatus({ installed: false, downloading: false, message: `status 失敗(${resp.status}): ${text}` })
        return
      }
      if (!ct.includes('application/json')) {
        const text = await resp.text()
        setStatus({ installed: false, downloading: false, message: `status 回傳非 JSON: ${text}` })
        return
      }
      const data = await resp.json()
      setStatus(data)
    } catch (e: any) {
      setStatus({ installed: false, downloading: false, message: `status 例外: ${e?.message || String(e)}` })
    }
  }

  const fetchLibrary = async () => {
    setLibraryLoading(true)
    try {
      const resp = await fetch(getApiUrl('/api/music/list?limit=30&prefix=music/'))
      const ct = resp.headers.get('content-type') || ''
      if (!resp.ok) {
        const text = await resp.text()
        setStatus((s) => ({ ...s, message: `list 失敗(${resp.status}): ${text}` }))
        return
      }
      if (!ct.includes('application/json')) {
        const text = await resp.text()
        setStatus((s) => ({ ...s, message: `list 回傳非 JSON: ${text}` }))
        return
      }
      const data = await resp.json()
      const list = Array.isArray(data.items) ? data.items : []
      setItems(
        list
          .filter((it: any) => typeof it?.key === 'string' && typeof it?.url === 'string')
          .map((it: any) => ({
            key: it.key,
            url: getMusicUrl(it.url),
            name: typeof it.name === 'string' ? it.name : it.key.split('/').pop() || it.key,
            created_at: it.created_at,
          }))
      )
    } catch (e: any) {
      setStatus((s) => ({ ...s, message: `list 例外: ${e?.message || String(e)}` }))
    } finally {
      setLibraryLoading(false)
    }
  }

  const handleDelete = async (key: string) => {
    if (!key) return
    setLibraryLoading(true)
    try {
      const resp = await fetch(getApiUrl('/api/music/delete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: [key] }),
      })
      const ct = resp.headers.get('content-type') || ''
      if (!resp.ok) {
        const text = await resp.text()
        setStatus((s) => ({ ...s, message: `delete 失敗(${resp.status}): ${text}` }))
        return
      }
      if (!ct.includes('application/json')) {
        const text = await resp.text()
        setStatus((s) => ({ ...s, message: `delete 回傳非 JSON: ${text}` }))
        return
      }
      setItems((xs) => xs.filter((x) => x.key !== key))
      if (wavUrl && wavUrl.includes(key)) setWavUrl(null)
    } catch (e: any) {
      setStatus((s) => ({ ...s, message: `delete 例外: ${e?.message || String(e)}` }))
    } finally {
      setLibraryLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchLibrary()
  }, [])

  const handleSetup = async () => {
    setLoading(true)
    try {
      const resp = await fetch(getApiUrl('/api/music/setup'), { method: 'POST' })
      const ct = resp.headers.get('content-type') || ''
      if (!resp.ok) {
        const text = await resp.text()
        setStatus({ installed: false, downloading: false, message: `setup 失敗(${resp.status}): ${text}` })
      } else if (!ct.includes('application/json')) {
        const text = await resp.text()
        setStatus({ installed: false, downloading: false, message: `setup 回傳非 JSON: ${text}` })
      }
      await fetchStatus()
    } catch (e: any) {
      setStatus({ installed: false, downloading: false, message: `setup 例外: ${e?.message || String(e)}` })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setWavUrl(null)
    try {
      const resp = await fetch(getApiUrl('/api/music/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, tempo, duration }),
      })
      const ct = resp.headers.get('content-type') || ''
      if (!resp.ok) {
        const text = await resp.text()
        setStatus((s) => ({ ...s, message: `generate 失敗(${resp.status}): ${text}` }))
        return
      }
      if (!ct.includes('application/json')) {
        const text = await resp.text()
        setStatus((s) => ({ ...s, message: `generate 回傳非 JSON: ${text}` }))
        return
      }
      const data = await resp.json()
      if (data?.wav?.url) {
        const nextUrl = getMusicUrl(data.wav.url) + `?t=${Date.now()}`
        setWavUrl(nextUrl)
        setItems((xs) => {
          const key = String(data?.wav?.key || '')
          const name = key ? key.split('/').pop() || key : 'output.wav'
          const item: MusicItem = { key, url: getMusicUrl(data.wav.url), name }
          return key ? [item, ...xs.filter((x) => x.key !== key)] : xs
        })
      } else {
        setStatus((s) => ({ ...s, message: data?.message || 'generate 失敗：沒有回傳 wav.url' }))
      }
    } catch (e: any) {
      setStatus((s) => ({ ...s, message: `generate 例外: ${e?.message || String(e)}` }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      {!status.installed && (
        <div className="bg-yellow-900/40 p-4 rounded-lg">
          <p className="text-yellow-300 mb-2">尚未安裝必要資源（fluidsynth / SoundFont）</p>
          <button
            disabled={loading || status.downloading}
            onClick={handleSetup}
            className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-500 disabled:opacity-50"
          >
            {status.downloading || loading ? '下載中...' : '一鍵下載並安裝'}
          </button>
          {status.message && <p className="text-xs text-yellow-400 mt-2">{status.message}</p>}
        </div>
      )}

      {status.installed && (
        <div className="bg-green-900/40 p-4 rounded-lg text-green-300">已完成安裝，路徑：{status.message}</div>
      )}

      {/* Form */}
      <div className="space-y-4 bg-white/5 p-4 rounded-lg">
        <div className="flex gap-4 items-center">
          <label className="w-20">Mood</label>
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value as 'calm' | 'tense')}
            className="flex-1 bg-gray-800 text-white p-2 rounded"
          >
            <option value="calm">Calm</option>
            <option value="tense">Tense</option>
          </select>
        </div>
        <div className="flex gap-4 items-center">
          <label className="w-20">Tempo</label>
          <input
            type="number"
            value={tempo}
            min={60}
            max={200}
            onChange={(e) => {
              const raw = e.target.value
              const n = raw === '' ? NaN : Number(raw)
              if (!Number.isFinite(n)) return
              setTempo(Math.max(60, Math.min(200, n)))
            }}
            className="flex-1 bg-gray-800 text-white p-2 rounded"
          />
        </div>
        <div className="flex gap-4 items-center">
          <label className="w-20">Duration</label>
          <input
            type="number"
            value={duration}
            min={3}
            max={20}
            onChange={(e) => {
              const raw = e.target.value
              const n = raw === '' ? NaN : Number(raw)
              if (!Number.isFinite(n)) return
              setDuration(Math.max(3, Math.min(20, n)))
            }}
            className="flex-1 bg-gray-800 text-white p-2 rounded"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !status.installed}
          className="px-4 py-2 bg-neon-cyan rounded hover:bg-neon-cyan/80 disabled:opacity-50"
        >
          {loading ? '生成中...' : status.installed ? '生成音樂' : '請先安裝資源'}
        </button>
      </div>

      {/* Result */}
      {wavUrl && (
        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
          <audio src={wavUrl} controls className="w-full" />
          <a href={wavUrl} download className="text-neon-cyan underline">
            下載 WAV
          </a>
        </div>
      )}

      {/* Library */}
      <div className="bg-white/5 p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-white/90 font-semibold">我的生成檔案</div>
          <button
            onClick={fetchLibrary}
            disabled={libraryLoading}
            className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            {libraryLoading ? '更新中...' : '重新整理'}
          </button>
        </div>

        {items.length === 0 && <div className="text-sm text-white/60">目前沒有檔案</div>}

        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.key} className="bg-gray-800/70 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white/90 truncate">{it.name}</div>
                  <div className="text-xs text-white/50 truncate">{it.key}</div>
                </div>
                <button
                  onClick={() => handleDelete(it.key)}
                  disabled={libraryLoading}
                  className="px-3 py-1.5 bg-red-700 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  刪除
                </button>
              </div>

              <audio src={getMusicUrl(it.url)} controls className="w-full" />
              <div className="flex gap-3">
                <a href={getMusicUrl(it.url)} download className="text-neon-cyan underline text-sm">
                  下載
                </a>
                <button
                  className="text-sm text-white/70 hover:text-white"
                  onClick={() => setWavUrl(getMusicUrl(it.url) + `?t=${Date.now()}`)}
                >
                  設為目前播放
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
