import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import Phaser from 'phaser'

type Cell = 0 | 1 | 2 // 0 path, 1 wall, 2 exit

type Dir = 'left' | 'right' | 'up' | 'down'

const DIRS: Dir[] = ['left', 'right', 'up', 'down']

const DIR_V: Record<Dir, { dx: number; dy: number }> = {
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
}

function opposite(d: Dir): Dir {
  switch (d) {
    case 'left':
      return 'right'
    case 'right':
      return 'left'
    case 'up':
      return 'down'
    case 'down':
      return 'up'
  }
}

function isWalkable(c: Cell | undefined) {
  return c === 0 || c === 2
}

function bfsPath(grid: Cell[][], sx: number, sy: number, ex: number, ey: number): Array<[number, number]> | null {
  const h = grid.length
  const w = grid[0]?.length || 0
  const q: Array<[number, number]> = [[sx, sy]]
  const prev = new Map<string, string | null>()
  prev.set(`${sx},${sy}`, null)

  while (q.length) {
    const [x, y] = q.shift()!
    if (x === ex && y === ey) break

    for (const d of DIRS) {
      const v = DIR_V[d]
      const nx = x + v.dx
      const ny = y + v.dy
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
      if (!isWalkable(grid[ny]?.[nx])) continue
      const k = `${nx},${ny}`
      if (prev.has(k)) continue
      prev.set(k, `${x},${y}`)
      q.push([nx, ny])
    }
  }

  const endKey = `${ex},${ey}`
  if (!prev.has(endKey)) return null

  const out: Array<[number, number]> = []
  let cur: string | null = endKey
  while (cur) {
    const [x, y] = cur.split(',').map((n) => Number(n))
    out.push([x, y])
    cur = prev.get(cur) ?? null
  }
  out.reverse()
  return out
}

function generateMaze(w: number, h: number, loopRate: number): Cell[][] {
  const g: Cell[][] = Array.from({ length: h }, () => Array(w).fill(1 as Cell))

  const carve = (x: number, y: number) => {
    g[y][x] = 0
    const dirs: Array<[number, number]> = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]
    Phaser.Utils.Array.Shuffle(dirs)
    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) continue
      if (g[ny][nx] !== 1) continue
      g[y + dy / 2][x + dx / 2] = 0
      carve(nx, ny)
    }
  }

  carve(1, 1)

  // side tunnel row
  const mid = Math.floor(h / 2)
  g[mid][0] = 0
  g[mid][1] = 0
  g[mid][w - 2] = 0
  g[mid][w - 1] = 0

  // add loops by punching walls between two corridors
  const candidates: Array<[number, number]> = []
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (g[y][x] !== 1) continue
      const left = g[y][x - 1]
      const right = g[y][x + 1]
      const up = g[y - 1][x]
      const down = g[y + 1][x]
      const horiz = isWalkable(left) && isWalkable(right) && !isWalkable(up) && !isWalkable(down)
      const vert = isWalkable(up) && isWalkable(down) && !isWalkable(left) && !isWalkable(right)
      if (horiz || vert) candidates.push([x, y])
    }
  }

  Phaser.Utils.Array.Shuffle(candidates)
  const openN = Math.floor(candidates.length * loopRate)
  for (let i = 0; i < openN; i++) {
    const [x, y] = candidates[i]
    g[y][x] = 0
  }

  g[h - 2][w - 2] = 2
  return g
}

function generatePlayableMaze(w: number, h: number, loopRate: number): Cell[][] {
  const sx = 1
  const sy = 1
  const ex = w - 2
  const ey = h - 2

  for (let i = 0; i < 16; i++) {
    const grid = generateMaze(w, h, loopRate)
    grid[sy][sx] = 0
    grid[ey][ex] = 2
    const path = bfsPath(grid, sx, sy, ex, ey)
    if (path && path.length >= 2) return grid
  }

  const grid = generateMaze(w, h, Math.max(0.08, loopRate * 0.6))
  grid[sy][sx] = 0
  grid[h - 2][w - 2] = 2
  return grid
}

class Sfx {
  ctx: AudioContext | null = null

  ensure() {
    if (this.ctx) return this.ctx
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
    const Ctx = w.AudioContext || w.webkitAudioContext
    if (!Ctx) return null
    this.ctx = new Ctx()
    return this.ctx
  }

  async unlock() {
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // ignore
      }
    }
  }

  beep(freq: number, ms: number, gain = 0.05) {
    const ctx = this.ensure()
    if (!ctx) return false

    const osc = ctx.createOscillator()
    const g = ctx.createGain()

    const t0 = ctx.currentTime
    const t1 = t0 + ms / 1000

    osc.type = 'sine'
    osc.frequency.value = freq

    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t1)

    osc.connect(g)
    g.connect(ctx.destination)

    osc.start(t0)
    osc.stop(t1)
    return true
  }
}

class MainScene extends Phaser.Scene {
  // Level / difficulty
  level = 1

  // config
  mazeW = 27
  mazeH = 19
  tile = 56

  // movement is tile-to-tile
  moveMs = 120 // time per tile

  // story
  storyLine = '你是迷宮裡的火柴人探險者。收集能量球，驅散幽靈，逃到出口！'

  // state
  grid!: Cell[][]
  start = { x: 1, y: 1 }
  exit = { x: 0, y: 0 }

  playerDir: Dir = 'right'
  nextDir: Dir | null = 'right'
  moving = false
  stepT = 0
  stepFrom = { x: 0, y: 0 }
  stepTo = { x: 0, y: 0 }

  score = 0
  coinsLeft = 0
  powerLeft = 0
  powerUntil = 0

  // HP
  hpMax = 3
  hp = 3
  invulnUntil = 0

  // objects
  player!: Phaser.GameObjects.Container
  playerGfx!: Phaser.GameObjects.Graphics

  coins: Map<string, Phaser.GameObjects.Arc> = new Map()
  powers: Map<string, Phaser.GameObjects.Arc> = new Map()

  ghostSprites: Phaser.GameObjects.Arc[] = []
  ghostDirs: Dir[] = []
  ghostMoving: boolean[] = []
  ghostStepT: number[] = []
  ghostFrom: Array<{ x: number; y: number }> = []
  ghostTo: Array<{ x: number; y: number }> = []
  ghostBaseColor: number[] = []

  // ui
  statusText!: Phaser.GameObjects.Text
  hudText!: Phaser.GameObjects.Text

  // input
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }

  // dev/test toggles (default OFF)
  devMode = false
  testMode = false

  testFail: string | null = null
  testPass = false
  testStartedAt = 0
  testTimeoutMs = 25000

  botEnabled = false
  botPath: Array<[number, number]> | null = null
  botIdx = 0
  botGoal: 'collect' | 'exit' = 'collect'

  // sfx
  sfx = new Sfx()
  sfxCoinCount = 0
  sfxPowerCount = 0
  sfxBanishCount = 0
  sfxHurtCount = 0

  // restart guard
  scheduledRestart = false

  create() {
    this.cameras.main.setBackgroundColor('#0a0a0f')

    // dev enable: ?dev=1 (also enables bot+tests)
    try {
      const sp = new URLSearchParams(window.location.search)
      this.devMode = import.meta.env.DEV && (sp.get('dev') === '1' || sp.get('dev') === 'true')
    } catch {
      this.devMode = false
    }

    this.testMode = this.devMode
    this.botEnabled = this.devMode

    this.initLevel(this.level)

    this.cameras.main.setBounds(0, 0, this.mazeW * this.tile, this.mazeH * this.tile)
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18)
    this.cameras.main.setZoom(1.05)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as any

    this.input.keyboard!.on('keydown-R', () => {
      this.scene.restart()
    })

    this.input.once('pointerdown', () => {
      void this.sfx.unlock()
    })

    this.statusText.setText(this.storyLine)

    if (this.botEnabled) {
      this.recomputeBotPath()
    }

    if (this.testMode) {
      this.testStartedAt = this.time.now
    }
  }

  init(data: unknown) {
    const d = data as { level?: number } | null
    if (d && typeof d.level === 'number') {
      this.level = d.level
    }
  }

  initLevel(level: number) {
    this.children.removeAll()

    this.level = level

    const loopRate = Phaser.Math.Clamp(0.12 + level * 0.02, 0.12, 0.22)
    const ghostCount = Phaser.Math.Clamp(4 + Math.floor((level - 1) / 2), 4, 7)
    this.moveMs = Phaser.Math.Clamp(120 - level * 6, 80, 120)

    this.score = 0
    this.coinsLeft = 0
    this.powerLeft = 0
    this.powerUntil = 0

    this.hpMax = 3
    this.hp = 3
    this.invulnUntil = 0

    this.sfxCoinCount = 0
    this.sfxPowerCount = 0
    this.sfxBanishCount = 0
    this.sfxHurtCount = 0

    this.testFail = null
    this.testPass = false
    this.scheduledRestart = false

    this.grid = generatePlayableMaze(this.mazeW, this.mazeH, loopRate)
    this.exit = { x: this.mazeW - 2, y: this.mazeH - 2 }

    this.buildMap()
    this.buildCollectibles()
    this.buildPlayer()
    this.buildGhosts(ghostCount)
    this.buildUI()

    if (this.botEnabled) {
      this.recomputeBotPath()
    }

    if (this.testMode) {
      this.testStartedAt = this.time.now
    }
  }

  nowMs() {
    return this.time.now
  }

  worldCenter(tx: number, ty: number) {
    return { x: tx * this.tile + this.tile / 2, y: ty * this.tile + this.tile / 2 }
  }

  tileAtWorld(x: number, y: number) {
    return { tx: Math.floor(x / this.tile), ty: Math.floor(y / this.tile) }
  }

  canMove(tx: number, ty: number, d: Dir) {
    const v = DIR_V[d]
    const nx = tx + v.dx
    const ny = ty + v.dy
    const mid = Math.floor(this.mazeH / 2)
    if (ty === mid && (nx < 0 || nx >= this.mazeW)) return true
    if (nx < 0 || nx >= this.mazeW || ny < 0 || ny >= this.mazeH) return false
    return isWalkable(this.grid[ny]?.[nx])
  }

  stepTarget(tx: number, ty: number, d: Dir) {
    const v = DIR_V[d]
    let nx = tx + v.dx
    let ny = ty + v.dy

    const mid = Math.floor(this.mazeH / 2)
    if (ty === mid) {
      if (nx < 0) nx = this.mazeW - 1
      if (nx >= this.mazeW) nx = 0
    }

    return { x: nx, y: ny }
  }

  buildMap() {
    for (let y = 0; y < this.mazeH; y++) {
      for (let x = 0; x < this.mazeW; x++) {
        const c = this.grid[y][x]
        const wp = this.worldCenter(x, y)

        if (c === 1) {
          this.add.rectangle(wp.x, wp.y, this.tile, this.tile, 0x252540, 1)
        } else {
          this.add.rectangle(wp.x, wp.y, this.tile, this.tile, 0x11111f, 0.22).setDepth(-10)

          if (c === 2) {
            const g = this.add.graphics().setDepth(-5)
            g.fillStyle(0x00ff00, 0.25)
            g.fillRect(wp.x - this.tile / 2, wp.y - this.tile / 2, this.tile, this.tile)
            this.tweens.add({ targets: g, alpha: 0.7, duration: 800, yoyo: true, repeat: -1 })
          }
        }
      }
    }
  }

  buildCollectibles() {
    for (let y = 1; y < this.mazeH - 1; y++) {
      for (let x = 1; x < this.mazeW - 1; x++) {
        const c = this.grid[y][x]
        if (c === 1 || c === 2) continue
        if (x === this.start.x && y === this.start.y) continue

        const wp = this.worldCenter(x, y)
        const k = `${x},${y}`

        const neigh = DIRS.map((d) => {
          const v = DIR_V[d]
          return isWalkable(this.grid[y + v.dy]?.[x + v.dx])
        })
        const degree = neigh.filter(Boolean).length
        const isDeadEnd = degree === 1
        const isJunction = degree >= 3

        if ((isDeadEnd || isJunction) && Math.random() < 0.12 && this.powerLeft < 6) {
          const orb = this.add.circle(wp.x, wp.y, 9, 0xffe066, 0.9)
          this.powers.set(k, orb)
          this.powerLeft++
        } else if (Math.random() < 0.78) {
          const coin = this.add.circle(wp.x, wp.y, 4, 0x00ffff, 0.9)
          this.coins.set(k, coin)
          this.coinsLeft++
        }
      }
    }

    if (this.powerLeft === 0) {
      const candidates: Array<[number, number]> = []
      for (let y = 1; y < this.mazeH - 1; y++) {
        for (let x = 1; x < this.mazeW - 1; x++) {
          if (!isWalkable(this.grid[y]?.[x]) || this.grid[y][x] === 2) continue
          if (x === this.start.x && y === this.start.y) continue
          candidates.push([x, y])
        }
      }
      Phaser.Utils.Array.Shuffle(candidates)
      for (let i = 0; i < Math.min(4, candidates.length); i++) {
        const [x, y] = candidates[i]
        const wp = this.worldCenter(x, y)
        const k = `${x},${y}`
        if (!this.powers.has(k)) {
          const orb = this.add.circle(wp.x, wp.y, 9, 0xffe066, 0.9)
          this.powers.set(k, orb)
          this.powerLeft++
        }
      }
    }
  }

  buildPlayer() {
    const p = this.worldCenter(this.start.x, this.start.y)

    this.playerGfx = this.add.graphics()
    this.playerGfx.lineStyle(3, 0xffffff, 1)
    this.playerGfx.strokeCircle(0, -14, 8)
    this.playerGfx.lineBetween(0, -6, 0, 14)
    this.playerGfx.lineBetween(-10, 0, 10, 0)
    this.playerGfx.lineBetween(0, 14, -8, 26)
    this.playerGfx.lineBetween(0, 14, 8, 26)

    this.player = this.add.container(p.x, p.y, [this.playerGfx])

    this.playerDir = 'right'
    this.nextDir = 'right'
    this.moving = false
    this.stepT = 0
    this.stepFrom = { x: this.start.x, y: this.start.y }
    this.stepTo = { x: this.start.x, y: this.start.y }
  }

  buildGhosts(count: number) {
    const spawns: Array<[number, number]> = [
      [this.mazeW - 2, 1],
      [1, this.mazeH - 2],
      [this.mazeW - 2, this.mazeH - 2],
      [Math.floor(this.mazeW / 2), 1],
      [Math.floor(this.mazeW / 2), this.mazeH - 2],
      [2, Math.floor(this.mazeH / 2)],
      [this.mazeW - 3, Math.floor(this.mazeH / 2)],
    ]

    const colors = [0x00ffff, 0xff66ff, 0xffaa00, 0x66ff66, 0x22c55e, 0xa855f7, 0xf97316]

    this.ghostSprites = []
    this.ghostDirs = []
    this.ghostMoving = []
    this.ghostStepT = []
    this.ghostFrom = []
    this.ghostTo = []
    this.ghostBaseColor = []

    for (let i = 0; i < count; i++) {
      const [tx, ty] = spawns[i % spawns.length]
      const wp = this.worldCenter(tx, ty)
      const base = colors[i % colors.length]
      const arc = this.add.circle(wp.x, wp.y, 12, base, 0.75)

      this.ghostSprites.push(arc)
      this.ghostBaseColor.push(base)
      this.ghostDirs.push(DIRS[Phaser.Math.Between(0, 3)])
      this.ghostMoving.push(false)
      this.ghostStepT.push(0)
      this.ghostFrom.push({ x: tx, y: ty })
      this.ghostTo.push({ x: tx, y: ty })
    }
  }

  buildUI() {
    this.hudText = this.add
      .text(16, 16, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#fff' })
      .setScrollFactor(0)
      .setDepth(1000)

    this.statusText = this.add
      .text(16, 40, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#fff' })
      .setScrollFactor(0)
      .setDepth(1000)

    this.refreshHUD()
  }

  refreshHUD() {
    const powerS = this.nowMs() < this.powerUntil ? Math.ceil((this.powerUntil - this.nowMs()) / 1000) : 0
    const invS = this.nowMs() < this.invulnUntil ? Math.ceil((this.invulnUntil - this.nowMs()) / 1000) : 0

    const test = this.testMode
      ? this.testFail
        ? `TEST FAIL: ${this.testFail}`
        : this.testPass
          ? 'TEST PASS'
          : 'TEST RUNNING'
      : ''

    const suffix = this.testMode ? `  ${test}` : ''

    this.hudText.setText(
      `Lv${this.level}  HP:${this.hp}/${this.hpMax}  無敵:${invS}s  分數:${this.score}  金幣:${this.coinsLeft}  能量球:${this.powerLeft}  強化:${powerS}s${suffix}`
    )
  }

  readDir(): Dir | null {
    if (this.cursors.left?.isDown || this.wasd.A.isDown) return 'left'
    if (this.cursors.right?.isDown || this.wasd.D.isDown) return 'right'
    if (this.cursors.up?.isDown || this.wasd.W.isDown) return 'up'
    if (this.cursors.down?.isDown || this.wasd.S.isDown) return 'down'
    return null
  }

  startStep(d: Dir) {
    const { tx, ty } = this.tileAtWorld(this.player.x, this.player.y)
    if (!this.canMove(tx, ty, d)) return false

    const to = this.stepTarget(tx, ty, d)
    this.moving = true
    this.stepT = 0
    this.stepFrom = { x: tx, y: ty }
    this.stepTo = { x: to.x, y: to.y }
    this.playerDir = d

    return true
  }

  playCoinSfx() {
    const ok = this.sfx.beep(880, 60, 0.05)
    if (ok) this.sfxCoinCount++
  }

  playPowerSfx() {
    const ok = this.sfx.beep(440, 120, 0.06)
    if (ok) this.sfxPowerCount++
  }

  playBanishSfx() {
    const ok = this.sfx.beep(220, 140, 0.06)
    if (ok) this.sfxBanishCount++
  }

  playHurtSfx() {
    const ok = this.sfx.beep(160, 180, 0.07)
    if (ok) this.sfxHurtCount++
  }

  setFail(reason: string) {
    if (!this.testMode) return
    if (this.testFail || this.testPass) return
    this.testFail = reason
    this.refreshHUD()
  }

  setPass() {
    if (!this.testMode) return
    if (this.testFail) return
    this.testPass = true
    this.refreshHUD()
  }

  scheduleRestart(ms: number) {
    if (this.scheduledRestart) return
    this.scheduledRestart = true
    this.time.delayedCall(ms, () => this.scene.restart())
  }

  recomputeBotPath() {
    if (!this.botEnabled) return

    const pt = this.tileAtWorld(this.player?.x ?? this.worldCenter(this.start.x, this.start.y).x, this.player?.y ?? this.worldCenter(this.start.x, this.start.y).y)

    let target: { x: number; y: number } | null = null

    if (this.coinsLeft > 0) {
      let best = Infinity
      for (const k of this.coins.keys()) {
        const [x, y] = k.split(',').map((n) => Number(n))
        const d = Math.abs(x - pt.tx) + Math.abs(y - pt.ty)
        if (d < best) {
          best = d
          target = { x, y }
        }
      }
      this.botGoal = 'collect'
    }

    if (!target) {
      target = { x: this.exit.x, y: this.exit.y }
      this.botGoal = 'exit'
    }

    const p = bfsPath(this.grid, pt.tx, pt.ty, target.x, target.y)
    this.botPath = p
    this.botIdx = 0

    if (this.testMode && !p) this.setFail('bot_no_path')
  }

  checkCollect() {
    const pt = this.tileAtWorld(this.player.x, this.player.y)
    const k = `${pt.tx},${pt.ty}`

    const beforeScore = this.score

    const coin = this.coins.get(k)
    if (coin) {
      coin.destroy()
      this.coins.delete(k)
      this.coinsLeft = Math.max(0, this.coinsLeft - 1)
      this.score += 10
      this.playCoinSfx()

      if (this.testMode && this.score !== beforeScore + 10) this.setFail('coin_score_not_incremented')
      if (this.testMode && this.sfxCoinCount <= 0) this.setFail('coin_sfx_not_played')

      if (this.botEnabled) this.recomputeBotPath()

      this.refreshHUD()
      return
    }

    const pow = this.powers.get(k)
    if (pow) {
      pow.destroy()
      this.powers.delete(k)
      this.powerLeft = Math.max(0, this.powerLeft - 1)
      this.score += 50

      this.powerUntil = this.nowMs() + 8000
      this.playPowerSfx()

      if (this.testMode && this.score !== beforeScore + 50) this.setFail('power_score_not_incremented')
      if (this.testMode && this.powerUntil <= this.nowMs()) this.setFail('power_not_activated')
      if (this.testMode && this.sfxPowerCount <= 0) this.setFail('power_sfx_not_played')

      this.refreshHUD()
      this.statusText.setText('能量球啟動！8 秒內可驅散幽靈（碰到幽靈會把它送回出生點）。')
      return
    }
  }

  updatePlayer(dt: number) {
    if (this.hp <= 0) return

    if (this.botEnabled) {
      if (!this.botPath || this.botIdx >= (this.botPath?.length ?? 0) - 1) {
        this.recomputeBotPath()
      }

      if (this.botPath && this.botIdx < this.botPath.length - 1) {
        const [cx, cy] = this.botPath[this.botIdx]
        const [nx, ny] = this.botPath[this.botIdx + 1]
        const dx = nx - cx
        const dy = ny - cy

        const mid = Math.floor(this.mazeH / 2)
        let want: Dir | null = null
        if (dy === -1) want = 'up'
        else if (dy === 1) want = 'down'
        else {
          if (cy === mid && cx === 0 && nx === this.mazeW - 1) want = 'left'
          else if (cy === mid && cx === this.mazeW - 1 && nx === 0) want = 'right'
          else if (dx === -1) want = 'left'
          else if (dx === 1) want = 'right'
        }

        if (want) this.nextDir = want
      }
    } else {
      const input = this.readDir()
      if (input) this.nextDir = input
    }

    if (!this.moving) {
      if (this.nextDir && this.startStep(this.nextDir)) return
      this.startStep(this.playerDir)
      return
    }

    this.stepT += dt
    const t = Phaser.Math.Clamp(this.stepT / this.moveMs, 0, 1)

    const fromW = this.worldCenter(this.stepFrom.x, this.stepFrom.y)
    const toW = this.worldCenter(this.stepTo.x, this.stepTo.y)

    this.player.x = Phaser.Math.Linear(fromW.x, toW.x, t)
    this.player.y = Phaser.Math.Linear(fromW.y, toW.y, t)

    if (t >= 1) {
      this.moving = false

      const mid = Math.floor(this.mazeH / 2)
      if (this.stepTo.y === mid) {
        if (this.stepTo.x === 0) this.player.x = this.worldCenter(0, mid).x
        if (this.stepTo.x === this.mazeW - 1) this.player.x = this.worldCenter(this.mazeW - 1, mid).x
      }

      if (this.botEnabled && this.botPath) {
        this.botIdx = Math.min(this.botIdx + 1, this.botPath.length - 1)
      }

      this.checkCollect()
      this.refreshHUD()

      const pt = this.tileAtWorld(this.player.x, this.player.y)
      if (pt.tx === this.exit.x && pt.ty === this.exit.y) {
        if (this.coinsLeft > 0) {
          this.statusText.setText(`出口被封印！還差 ${this.coinsLeft} 枚金幣。`)
        } else {
          this.statusText.setText('你帶著能量逃出迷宮！')
        }
      }
    }
  }

  respawnGhost(i: number) {
    const spawns: Array<[number, number]> = [
      [this.mazeW - 2, 1],
      [1, this.mazeH - 2],
      [this.mazeW - 2, this.mazeH - 2],
      [Math.floor(this.mazeW / 2), 1],
      [Math.floor(this.mazeW / 2), this.mazeH - 2],
    ]
    const [tx, ty] = spawns[i % spawns.length]
    const wp = this.worldCenter(tx, ty)

    const arc = this.ghostSprites[i]
    arc.x = wp.x
    arc.y = wp.y
    this.ghostFrom[i] = { x: tx, y: ty }
    this.ghostTo[i] = { x: tx, y: ty }
    this.ghostMoving[i] = false
    this.ghostStepT[i] = 0
    this.ghostDirs[i] = DIRS[Phaser.Math.Between(0, 3)]

    arc.setFillStyle(this.ghostBaseColor[i], 0.75)
  }

  updateGhost(i: number, dt: number) {
    const arc = this.ghostSprites[i]
    const dir = this.ghostDirs[i]

    const atTile = this.tileAtWorld(arc.x, arc.y)

    const px = this.player.x
    const py = this.player.y

    if (!this.ghostMoving[i]) {
      const options = DIRS.filter((d) => this.canMove(atTile.tx, atTile.ty, d))
      if (options.length === 0) return

      const dist = Phaser.Math.Distance.Between(px, py, arc.x, arc.y)
      const chasing = dist < this.tile * 8
      const empowered = this.nowMs() < this.powerUntil

      let filtered = options.filter((d) => d !== opposite(dir))
      if (filtered.length === 0) filtered = options

      let next = filtered[0]

      if (chasing) {
        let best = empowered ? -Infinity : Infinity
        for (const d of filtered) {
          const to = this.stepTarget(atTile.tx, atTile.ty, d)
          const w = this.worldCenter(to.x, to.y)
          const s = Phaser.Math.Distance.Between(w.x, w.y, px, py)
          if (!empowered) {
            if (s < best) {
              best = s
              next = d
            }
          } else {
            if (s > best) {
              best = s
              next = d
            }
          }
        }
      } else {
        next = filtered[Phaser.Math.Between(0, filtered.length - 1)]
      }

      this.ghostDirs[i] = next
      const to = this.stepTarget(atTile.tx, atTile.ty, next)
      this.ghostMoving[i] = true
      this.ghostStepT[i] = 0
      this.ghostFrom[i] = { x: atTile.tx, y: atTile.ty }
      this.ghostTo[i] = { x: to.x, y: to.y }

      if (empowered) {
        arc.setFillStyle(0x3b82f6, 0.85)
      } else {
        arc.setFillStyle(chasing ? 0xff4444 : this.ghostBaseColor[i], 0.75)
      }

      return
    }

    this.ghostStepT[i] += dt
    const t = Phaser.Math.Clamp(this.ghostStepT[i] / this.moveMs, 0, 1)
    const fromW = this.worldCenter(this.ghostFrom[i].x, this.ghostFrom[i].y)
    const toW = this.worldCenter(this.ghostTo[i].x, this.ghostTo[i].y)
    arc.x = Phaser.Math.Linear(fromW.x, toW.x, t)
    arc.y = Phaser.Math.Linear(fromW.y, toW.y, t)

    if (t >= 1) {
      this.ghostMoving[i] = false
    }
  }

  takeDamage() {
    const now = this.nowMs()
    if (now < this.invulnUntil) return

    this.hp = Math.max(0, this.hp - 1)
    this.invulnUntil = now + 1200
    this.playHurtSfx()
    if (this.testMode && this.sfxHurtCount <= 0) this.setFail('hurt_sfx_not_played')

    this.statusText.setText(`受傷！HP ${this.hp}/${this.hpMax}`)
    this.refreshHUD()

    if (this.hp <= 0) {
      this.statusText.setText('Game Over！按 R 重開。')
      if (this.testMode) this.setFail('dead')
    }
  }

  update(_time: number, delta: number) {
    const dt = Math.min(50, delta)

    if (this.hp > 0) {
      this.updatePlayer(dt)

      for (let i = 0; i < this.ghostSprites.length; i++) {
        this.updateGhost(i, dt)
      }
    }

    const pt = this.tileAtWorld(this.player.x, this.player.y)

    for (let i = 0; i < this.ghostSprites.length; i++) {
      const gt = this.tileAtWorld(this.ghostSprites[i].x, this.ghostSprites[i].y)
      if (gt.tx === pt.tx && gt.ty === pt.ty) {
        const empowered = this.nowMs() < this.powerUntil
        if (empowered) {
          this.score += 100
          this.playBanishSfx()
          if (this.testMode && this.sfxBanishCount <= 0) this.setFail('banish_sfx_not_played')
          this.statusText.setText('驅散幽靈！+100')
          this.respawnGhost(i)
          this.refreshHUD()
        } else {
          this.takeDamage()
        }
      }
    }

    if (pt.tx === this.exit.x && pt.ty === this.exit.y && this.coinsLeft === 0 && this.hp > 0) {
      this.statusText.setText(`通關！Lv${this.level} 完成，3 秒後下一關…`)
      if (this.testMode) this.setPass()

      if (this.level > 0) {
        const nextLevel = this.level + 1
        this.level = -999 // lock
        this.time.delayedCall(3000, () => {
          this.scene.restart({ level: nextLevel })
        })
      }
    }

    if (this.testMode && !this.testFail && !this.testPass) {
      if (this.time.now - this.testStartedAt > this.testTimeoutMs) {
        this.setFail('timeout')
      }
    }

    if (this.testMode && this.testFail) {
      this.scheduleRestart(800)
    }

    this.refreshHUD()
  }
}

export default function Game() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  const cfg = useMemo(() => {
    return {
      type: Phaser.AUTO,
      parent: undefined as unknown as string | HTMLElement,
      backgroundColor: '#0a0a0f',
      width: 1280,
      height: 720,
      physics: { default: 'arcade' },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: MainScene,
    }
  }, [])

  useEffect(() => {
    if (!hostRef.current) return

    const game = new Phaser.Game({
      ...cfg,
      parent: hostRef.current,
    })

    gameRef.current = game

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [cfg])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 font-display">火柴人 vs 幽靈（Pac-Man 版）</h1>
          <p className="text-gray-400 mt-2">金幣（藍點）解鎖出口；能量球（黃球）讓你短時間驅散幽靈。DEV 會自動驗收加分/音效/扣血/通關。</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/tools/stickman-ghost" className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/15 text-gray-100">
            回工具箱入口
          </Link>
        </div>
      </div>

      <div className="glass-effect rounded-xl p-3">
        <div ref={hostRef} style={{ width: '100%', height: '80vh', minHeight: 600, borderRadius: '8px', overflow: 'hidden' }} />
      </div>

      <div className="text-sm text-gray-400">
        操作：WASD / 方向鍵。撞到幽靈會扣血並短暫無敵。收集金幣解除出口封印。吃能量球後 8 秒內可驅散幽靈。
      </div>
    </div>
  )
}
