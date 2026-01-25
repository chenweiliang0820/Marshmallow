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

  // 新版：用「主場景單選 + 次標籤多選 + 速度單選 + 主旋律可控」來生成更細節的 prompt
  const [scene, setScene] = useState(
    'exploration' as
      | 'exploration'
      | 'town'
      | 'dungeon'
      | 'battle'
      | 'boss'
      | 'stealth'
      | 'puzzle'
      | 'victory'
      | 'gameover'
      | 'ui'
  )
  const [themes, setThemes] = useState<string[]>([])
  const [atmospheres, setAtmospheres] = useState<string[]>([])
  const [styles, setStyles] = useState<string[]>([])
  const [tempoPreset, setTempoPreset] = useState<'slow' | 'mid' | 'fast'>('mid')
  const [lead, setLead] = useState<string>('鋼琴')
  const [durationPreset, setDurationPreset] = useState<30 | 60 | 90 | 120>(90)
  const [loopable, setLoopable] = useState(true)
  const [avoid, setAvoid] = useState<string[]>(['不要人聲'])

  // 舊 API 仍需要 mood/tempo/duration，因此用 prompt 推導回去
  const [mood, setMood] = useState<'calm' | 'tense'>('calm')
  const [tempo, setTempo] = useState(90)
  const [duration, setDuration] = useState(20)

  const [wavUrl, setWavUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<MusicItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [musicMeta, setMusicMeta] = useState<any>(null)

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

  const sceneLabelMap: Record<typeof scene, string> = {
    exploration: '探索/野外',
    town: '城鎮/安全區',
    dungeon: '地城/遺跡',
    battle: '一般戰鬥',
    boss: 'Boss 戰',
    stealth: '潛行/追逐',
    puzzle: '解謎/機關',
    victory: '勝利/結算',
    gameover: '失敗/Game Over',
    ui: 'UI/主選單/商店',
  }

  const themeOptions = ['像素風', '可愛療癒', '高奇幻', '暗黑奇幻', '科幻', '賽博龐克', '恐怖', '蒸汽龐克', '和風/武俠/中式']
  const atmosphereOptions = ['神秘', '溫暖', '孤獨', '壓迫', '宏偉', '霓虹', '荒涼']
  const styleOptions = ['8-bit chiptune', '交響/電影感', '合成器電子', 'Lo-fi', 'Ambient 氛圍音', 'Rock/metal', '民族風']
  const leadOptions = ['鋼琴', '弦樂(小提琴/弦樂群)', '木管(長笛/單簧管)', '銅管(號角/法國號)', '電吉他', '原聲吉他', '合成 lead', '民族樂器(笛/三味線/琵琶)']
  const avoidOptions = ['不要人聲', '不要太吵', '不要太多低頻', '不要太歡樂', '不要太多即興/jazz 感', '不要太尖銳高頻', '不要長時間停頓']

  const tempoPresetMap: Record<typeof tempoPreset, { label: string; bpm: number; bpmRange: string }> = {
    slow: { label: '慢', bpm: 80, bpmRange: 'BPM 70–90' },
    mid: { label: '中', bpm: 105, bpmRange: 'BPM 95–120' },
    fast: { label: '快', bpm: 150, bpmRange: 'BPM 130–170' },
  }

  const toggleInList = (xs: string[], v: string, max: number) => {
    if (xs.includes(v)) return xs.filter((x) => x !== v)
    if (xs.length >= max) return xs
    return [...xs, v]
  }

  const buildPrompt = () => {
    const sceneLabel = sceneLabelMap[scene] || scene
    const tempoInfo = tempoPresetMap[tempoPreset]

    const themeTxt = themes.length ? `世界觀/題材：${themes.join('、')}，` : ''
    const atmTxt = atmospheres.length ? `氛圍：${atmospheres.join('、')}。` : ''
    const styleTxt = styles.length ? `風格/配器走向：${styles.join('、')}，` : ''
    const leadTxt = lead ? `以${lead}擔任主旋律，` : ''
    const durTxt = `長度 ${durationPreset} 秒${loopable ? '；可無縫循環' : ''}。`
    const avoidTxt = avoid.length ? `避免：${avoid.join('、')}。` : ''

    return `${sceneLabel}遊戲配樂，${themeTxt}${atmTxt}速度：${tempoInfo.label}（${tempoInfo.bpmRange}），拍號 4/4。${styleTxt}${leadTxt}${durTxt}${avoidTxt}`
      .replace(/\s+/g, ' ')
      .trim()
  }

  useEffect(() => {
    const tempoInfo = tempoPresetMap[tempoPreset]
    setTempo(tempoInfo.bpm)

    const tenseScenes: Array<typeof scene> = ['battle', 'boss', 'stealth']
    const tenseAuras = new Set(['壓迫'])
    const isTense = tenseScenes.includes(scene) || atmospheres.some((a) => tenseAuras.has(a))
    setMood(isTense ? 'tense' : 'calm')

    // 後端目前限制 3~20 秒，先用比例映射（保持 UI 60/90/120 的語意）
    const mapped = Math.max(3, Math.min(20, Math.round(durationPreset / 6)))
    setDuration(mapped)
  }, [scene, atmospheres, tempoPreset, durationPreset])

  const handleGenerate = async () => {
    const prompt = buildPrompt()
    setLoading(true)
    setWavUrl(null)
    try {
      const resp = await fetch(getApiUrl('/api/music/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood, tempo, duration, prompt, scene, themes, atmospheres, styles, lead, durationPreset, loopable, avoid }),
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
      setMusicMeta(data?.meta || null)
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-white/80">主場景（單選）</div>
            <select
              value={scene}
              onChange={(e) => setScene(e.target.value as any)}
              className="w-full bg-gray-800 text-white p-2 rounded"
            >
              {Object.entries(sceneLabelMap).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/80">速度（單選）</div>
            <select
              value={tempoPreset}
              onChange={(e) => setTempoPreset(e.target.value as any)}
              className="w-full bg-gray-800 text-white p-2 rounded"
            >
              {Object.entries(tempoPresetMap).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}（{v.bpmRange}）
                </option>
              ))}
            </select>
            <div className="text-xs text-white/50">實際送出：{tempo} BPM（後端生成用）</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/80">主旋律樂器（可控）</div>
            <select value={lead} onChange={(e) => setLead(e.target.value)} className="w-full bg-gray-800 text-white p-2 rounded">
              {leadOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-white/80">長度（可選）</div>
            <select
              value={durationPreset}
              onChange={(e) => setDurationPreset(Number(e.target.value) as any)}
              className="w-full bg-gray-800 text-white p-2 rounded"
            >
              {[30, 60, 90, 120].map((s) => (
                <option key={s} value={s}>
                  {s} 秒
                </option>
              ))}
            </select>
            <div className="text-xs text-white/50">後端限制 3~20 秒，會自動映射成：{duration} 秒</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={loopable} onChange={(e) => setLoopable(e.target.checked)} />
            可無縫循環（Loop）
          </label>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-white/80">世界觀/題材（多選，最多 2）</div>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setThemes((s) => toggleInList(s, x, 2))}
                className={`px-3 py-1.5 rounded text-sm border ${themes.includes(x) ? 'bg-neon-cyan/20 border-neon-cyan text-white' : 'bg-black/20 border-white/10 text-white/70 hover:text-white'}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-white/80">氛圍（多選，最多 2）</div>
          <div className="flex flex-wrap gap-2">
            {atmosphereOptions.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setAtmospheres((s) => toggleInList(s, x, 2))}
                className={`px-3 py-1.5 rounded text-sm border ${atmospheres.includes(x) ? 'bg-purple-500/20 border-purple-300 text-white' : 'bg-black/20 border-white/10 text-white/70 hover:text-white'}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-white/80">曲風/配器走向（多選，最多 2）</div>
          <div className="flex flex-wrap gap-2">
            {styleOptions.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setStyles((s) => toggleInList(s, x, 2))}
                className={`px-3 py-1.5 rounded text-sm border ${styles.includes(x) ? 'bg-emerald-500/20 border-emerald-300 text-white' : 'bg-black/20 border-white/10 text-white/70 hover:text-white'}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-white/80">避免項（多選，最多 3）</div>
          <div className="flex flex-wrap gap-2">
            {avoidOptions.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setAvoid((s) => toggleInList(s, x, 3))}
                className={`px-3 py-1.5 rounded text-sm border ${avoid.includes(x) ? 'bg-red-500/20 border-red-300 text-white' : 'bg-black/20 border-white/10 text-white/70 hover:text-white'}`}
              >
                {x}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-white/80">Prompt 預覽（將一併送到後端）</div>
          <div className="bg-black/30 border border-white/10 rounded p-3 text-sm text-white/80 whitespace-pre-wrap">{buildPrompt()}</div>
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

      {/* Visual Meta */}
      {musicMeta && (
        <div className="rounded-lg p-4 border border-neon-cyan/30 bg-gradient-to-br from-neon-cyan/10 via-white/5 to-purple-500/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-white/90 font-semibold tracking-wide">音樂資訊</div>
            <div className="text-xs text-white/60">seed: {String(musicMeta?.seed ?? '')}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-md bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/60">Key / 調性</div>
              <div className="text-sm text-neon-cyan font-semibold">{String(musicMeta?.key?.pitchClass || '')}</div>
              <div className="text-xs text-white/60">{String(musicMeta?.mood || '')} · {String(musicMeta?.tempo || '')} BPM</div>
            </div>
            <div className="rounded-md bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/60">Scale / 音階</div>
              <div className="text-sm text-white/90 break-words">{Array.isArray(musicMeta?.scale?.names) ? musicMeta.scale.names.join(' ') : ''}</div>
              <div className="text-xs text-white/60">({Array.isArray(musicMeta?.scale?.pcs) ? musicMeta.scale.pcs.join(',') : ''})</div>
            </div>
            <div className="rounded-md bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/60">Chord Prog / 和弦進行</div>
              <div className="text-sm text-white/90 break-words">{Array.isArray(musicMeta?.chords) ? musicMeta.chords.map((c: any) => c?.name).filter(Boolean).join(' → ') : ''}</div>
              <div className="text-xs text-white/60">bars: {Array.isArray(musicMeta?.chords) ? musicMeta.chords.length : 0}</div>
            </div>

            <div className="rounded-md bg-black/30 border border-white/10 p-3">
              <div className="text-xs text-white/60">Synth Preset / 音色</div>
              <div className="text-sm text-neon-cyan font-semibold">{String(musicMeta?.synthPreset?.leadPreset || '')}</div>
              <div className="text-xs text-white/60 break-words">
                lead: {String(musicMeta?.lead || '')}
                {Array.isArray(musicMeta?.styles) && musicMeta.styles.length ? ` · styles: ${musicMeta.styles.join('、')}` : ''}
              </div>
            </div>
          </div>

          <div className="rounded-md bg-black/30 border border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-white/60">Melody / 主旋律（音名 + 數字簡譜）</div>
              <div className="text-xs text-white/50">顯示前 64 音</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(musicMeta?.melody) ? musicMeta.melody.slice(0, 64) : []).map((n: any) => (
                <span
                  key={String(n?.index)}
                  className="px-2 py-1 rounded border border-neon-cyan/20 bg-black/40 text-xs text-white/90"
                  title={`t=${n?.startS}s len=${n?.durS}s midi=${n?.midi}`}
                >
                  <span className="text-neon-cyan">{String(n?.degree ?? '?')}</span>
                  <span className="text-white/40">/</span>
                  <span>{String(n?.name ?? '')}</span>
                </span>
              ))}
            </div>
          </div>
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
