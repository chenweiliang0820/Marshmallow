import { useEffect, useState } from 'react'

interface StatusResp {
  installed: boolean
  downloading: boolean
  message?: string
}

const defaultStatus: StatusResp = {
  installed: false,
  downloading: false,
}

export default function ToolGameMusic() {
  const [status, setStatus] = useState<StatusResp>(defaultStatus)
  const [mood, setMood] = useState<'calm' | 'tense'>('calm')
  const [tempo, setTempo] = useState(90)
  const [duration, setDuration] = useState(30)
  const [wavUrl, setWavUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const resp = await fetch('/api/music/status')
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

  useEffect(() => {
    fetchStatus()
  }, [])

  const handleSetup = async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/music/setup', { method: 'POST' })
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
      const resp = await fetch('/api/music/generate', {
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
      if (data.url) setWavUrl(data.url + `?t=${Date.now()}`)
      else setStatus((s) => ({ ...s, message: data?.message || 'generate 失敗：沒有回傳 url' }))
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
      {status.installed && (
        <div className="space-y-4 bg-white/5 p-4 rounded-lg">
          <div className="flex gap-4 items-center">
            <label className="w-20">Mood</label>
            <select value={mood} onChange={(e) => setMood(e.target.value as 'calm' | 'tense')}
              className="flex-1 bg-gray-800 text-white p-2 rounded">
              <option value="calm">Calm</option>
              <option value="tense">Tense</option>
            </select>
          </div>
          <div className="flex gap-4 items-center">
            <label className="w-20">Tempo</label>
            <input type="number" value={tempo} min={60} max={200} onChange={(e) => setTempo(Number(e.target.value))}
              className="flex-1 bg-gray-800 text-white p-2 rounded" />
          </div>
          <div className="flex gap-4 items-center">
            <label className="w-20">Duration</label>
            <input type="number" value={duration} min={30} max={60} onChange={(e) => setDuration(Number(e.target.value))}
              className="flex-1 bg-gray-800 text-white p-2 rounded" />
          </div>
          <button onClick={handleGenerate} disabled={loading}
            className="px-4 py-2 bg-neon-cyan rounded hover:bg-neon-cyan/80 disabled:opacity-50">
            {loading ? '生成中...' : '生成音樂'}
          </button>
        </div>
      )}

      {/* Result */}
      {wavUrl && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <audio src={wavUrl} controls className="w-full" />
          <a href={wavUrl} download className="text-neon-cyan underline">下載 WAV</a>
        </div>
      )}
    </div>
  )
}
