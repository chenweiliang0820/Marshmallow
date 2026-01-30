import { useMemo, useState } from 'react'
import { getImageProviderConfig } from '@/lib/aiProviders'

type ProxyImageResponse = {
  ok: boolean
  imageUrl: string | null
  imageBase64: string | null
  raw?: unknown
  message?: string
  upstream?: string
}

type AvatarParams = {
  characterName: string
  description: string
  pose: string
  background: string
  size: '256' | '512' | '1024'
}

type Result = {
  imageUrl: string
  meta: {
    params: AvatarParams
    createdAt: string
    provider: 'mock' | 'api'
    error?: string
  }
}

function buildMockImageUrl(params: AvatarParams) {
  const text = `${params.characterName}\n盒玩公仔（Mock）`
  const bg = params.background.replace('#', '') || 'ffffff'
  const size = `${params.size}x${params.size}`
  return `https://placehold.co/${size}/${bg}/111111?text=${encodeURIComponent(text)}`
}

// 檢查環境變數是否設定，決定是否啟用真實 API 模式
const isApiConfigured = () => {
  try {
    getImageProviderConfig()
    return true
  } catch (e) {
    return false
  }
}

export default function ToolAvatarGenerator() {
  const [params, setParams] = useState<AvatarParams>({
    characterName: '未命名角色',
    description: '盒玩公仔風格：圓潤比例、乾淨塗裝、PVC 質感、攝影棚打光、白底。角色特點：',
    pose: '站立',
    background: '#ffffff',
    size: '512',
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiEnabled = useMemo(isApiConfigured, [])
  const previewUrl = useMemo(() => buildMockImageUrl(params), [params])

  async function onGenerate() {
    setIsGenerating(true)
    setError(null)

    if (!apiEnabled) {
      // 維持 Mock 模式
      await new Promise((r) => setTimeout(r, 650))
      setResult({
        imageUrl: previewUrl,
        meta: { params, createdAt: new Date().toISOString(), provider: 'mock' },
      })
      setIsGenerating(false)
      return
    }

    // 真實 API 模式
    try {
      const { model } = getImageProviderConfig()
      const payload = {
        model: model || 'gemini-3-pro-image-preview', // 如果 env 沒設，用您指定的
        prompt: `${params.description} ${params.characterName}, ${params.pose} pose, in the style of a vinyl toy figure, product shot, studio lighting, white background`,
        n: 1,
        size: '1024x1024', // Gemini 常見尺寸
      }

      // 改走 Netlify Function 代理（同源 /api/image/generate）
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(`Proxy error: ${res.status} ${res.statusText}${t ? ` - ${t}` : ''}`)
      }

      const proxy = (await res.json()) as ProxyImageResponse

      if (!proxy.ok) {
        throw new Error(proxy.message || 'Proxy returned ok=false')
      }

      const imageUrl =
        proxy.imageUrl ||
        (proxy.imageBase64 ? `data:image/png;base64,${proxy.imageBase64}` : null)

      if (!imageUrl) {
        throw new Error('Proxy did not return imageUrl or imageBase64')
      }

      setResult({
        imageUrl,
        meta: { params, createdAt: new Date().toISOString(), provider: 'api' },
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(`API 呼叫失敗: ${message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-effect rounded-xl p-6">
        <div className="text-lg font-semibold text-gray-100 mb-4">角色設定（Mock）</div>

        <label className="block text-sm text-gray-300 mb-1">角色名稱</label>
        <input
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-gray-100 outline-none focus:border-neon-cyan/60"
          value={params.characterName}
          onChange={(e) => setParams((p) => ({ ...p, characterName: e.target.value }))}
        />

        <label className="block text-sm text-gray-300 mt-4 mb-1">角色描述（人物特點在這裡填）</label>
        <textarea
          className="w-full min-h-[120px] rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-gray-100 outline-none focus:border-neon-cyan/60"
          value={params.description}
          onChange={(e) => setParams((p) => ({ ...p, description: e.target.value }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">姿勢</label>
            <select
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-gray-100 outline-none focus:border-neon-cyan/60"
              value={params.pose}
              onChange={(e) => setParams((p) => ({ ...p, pose: e.target.value }))}
            >
              <option value="站立">站立</option>
              <option value="揮手">揮手</option>
              <option value="跑步">跑步</option>
              <option value="坐著">坐著</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">輸出尺寸</label>
            <select
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-gray-100 outline-none focus:border-neon-cyan/60"
              value={params.size}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  size: e.target.value as AvatarParams['size'],
                }))
              }
            >
              <option value="256">256 x 256</option>
              <option value="512">512 x 512</option>
              <option value="1024">1024 x 1024</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm text-gray-300 mb-1">背景顏色</label>
          <input
            className="h-10 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2"
            type="color"
            value={params.background}
            onChange={(e) => setParams((p) => ({ ...p, background: e.target.value }))}
          />
        </div>

        <button
          className="mt-6 w-full px-4 py-3 rounded-lg bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold hover:shadow-lg hover:shadow-neon-blue/30 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '生成中...' : '生成公仔圖像'}
        </button>

        <div className="mt-4 text-xs text-gray-400">
          目前為 Mock：會產生占位預覽圖與參數 JSON；下一階段會接雲端圖像生成（A）。
        </div>
      </div>

      <div className="glass-effect rounded-xl p-6">
        <div className="text-lg font-semibold text-gray-100 mb-4">預覽</div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-white/10 overflow-hidden bg-black/20">
          <img src={result?.imageUrl ?? previewUrl} alt="avatar preview" className="w-full h-auto" />
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-300 mb-2">輸出參數</div>
          <pre className="text-xs text-gray-200 bg-black/30 border border-white/10 rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(result?.meta ?? { params, createdAt: null }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
