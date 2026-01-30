import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type AppliedBgm = {
  wavUrl: string
  meta?: any
  params?: any
  appliedAt: number
}

const STORAGE_KEY = 'mm.gameMusic.appliedBgm.v1'

function readAppliedBgm(): AppliedBgm | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.wavUrl !== 'string' || !parsed.wavUrl) return null
    if (typeof parsed.appliedAt !== 'number') return null
    return parsed as AppliedBgm
  } catch {
    return null
  }
}

export default function ToolStickmanGhost() {
  const [bgm, setBgm] = useState<AppliedBgm | null>(null)

  useEffect(() => {
    setBgm(readAppliedBgm())
  }, [])

  return (
    <div className="space-y-6">
      <div className="glass-effect p-6 rounded-xl space-y-3">
        <div className="text-gray-100 font-semibold">快速開始</div>
        <div className="text-sm text-gray-400">
          進入遊戲：躲避幽靈、在迷宮裡找到出口。支援從「遊戲音樂生成」一鍵套用 BGM。
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/game"
            className="px-4 py-2 bg-neon-cyan rounded hover:bg-neon-cyan/80 text-black font-semibold"
          >
            開始遊戲
          </Link>
          <Link
            to="/tools/game-music"
            className="px-4 py-2 bg-white/10 border border-white/10 rounded hover:bg-white/15 text-gray-100"
          >
            先去套用 BGM
          </Link>
        </div>
      </div>

      <div className="glass-effect p-6 rounded-xl space-y-3">
        <div className="text-gray-100 font-semibold">目前已套用的 BGM</div>
        {!bgm && <div className="text-sm text-gray-400">尚未套用。到「遊戲音樂生成」產生一首後按「一鍵套用到遊戲」。</div>}
        {bgm && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">套用時間：{new Date(bgm.appliedAt).toLocaleString()}</div>
            <audio src={bgm.wavUrl} controls className="w-full" />
          </div>
        )}
      </div>

      <div className="glass-effect p-6 rounded-xl space-y-2">
        <div className="text-gray-100 font-semibold">操作</div>
        <div className="text-sm text-gray-400">WASD / 方向鍵移動。碰到幽靈扣血。到達綠色出口即勝利。按 R 重開。</div>
      </div>
    </div>
  )
}
