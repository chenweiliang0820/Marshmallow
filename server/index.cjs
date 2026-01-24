const express = require('express')
const path = require('path')
const fs = require('fs')
const fsp = fs.promises
const https = require('https')
const os = require('os')
const { spawn } = require('child_process')

const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false }))

app.use((req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[music-api] ${req.method} ${req.url}`)
  next()
})

function safeJson(res, status, payload) {
  res.status(status).type('application/json').send(JSON.stringify(payload))
}

function errToString(e) {
  if (!e) return 'Unknown error'
  if (e.stack) return String(e.stack)
  if (e.message) return String(e.message)
  return String(e)
}

const PROJECT_ROOT = path.resolve(__dirname, '..')

// IMPORTANT: avoid non-ascii project paths on Windows.
// Default cache path is in user home (ASCII-friendly), can be overridden by env.
const CACHE_ROOT = process.env.MARSHMALLOW_CACHE_DIR || path.join(os.homedir(), '.marshmallow-cache')
const CACHE_DIR = path.join(CACHE_ROOT, 'music')

const BIN_DIR = path.join(CACHE_DIR, 'bin')
const SOUNDFONT_DIR = path.join(CACHE_DIR, 'soundfonts')

// Output stays in the project so the front-end can access it.
const PUBLIC_GEN_DIR = path.join(PROJECT_ROOT, 'public', 'generated')

const FLUIDSYNTH_EXE = path.join(BIN_DIR, 'fluidsynth.exe')
const SOUNDFONT_FILE = path.join(SOUNDFONT_DIR, 'GeneralUser-GS.sf2')
const PY_SCRIPT = path.join(PROJECT_ROOT, 'tools', 'music_generator', 'music_generator.py')

// NOTE: GitHub release asset names can change; this must point to a real file.
const FLUIDSYNTH_URL = 'https://github.com/FluidSynth/fluidsynth/releases/download/v2.5.2/fluidsynth-v2.5.2-win10-x86-cpp11.zip'
// GeneralUser GS SoundFont (public download mirror)
const SOUNDFONT_URL = 'https://github.com/urish/cinto/releases/download/v1.0.0/GeneralUser-GS.sf2'

let setupState = {
  downloading: false,
  message: ''
}

function ensureDirSync(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    ensureDirSync(path.dirname(dest))

    const file = fs.createWriteStream(dest)
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close()
          fs.unlink(dest, () => {})
          return resolve(downloadFile(res.headers.location, dest))
        }

        if (res.statusCode !== 200) {
          file.close()
          fs.unlink(dest, () => {})
          return reject(new Error(`下載失敗: ${url} (${res.statusCode})`))
        }

        res.pipe(file)

        file.on('finish', () => {
          file.close(() => resolve())
        })
      })
      .on('error', (err) => {
        file.close()
        fs.unlink(dest, () => {})
        reject(err)
      })
  })
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    p.stdout.on('data', (d) => (stdout += d.toString()))
    p.stderr.on('data', (d) => (stderr += d.toString()))
    p.on('close', (code) => {
      if (code === 0) return resolve({ stdout, stderr })
      reject(new Error(`${cmd} ${args.join(' ')} failed (code ${code})\n${stdout}\n${stderr}`))
    })
  })
}

async function ensureSetupDirs() {
  ensureDirSync(CACHE_DIR)
  ensureDirSync(BIN_DIR)
  ensureDirSync(SOUNDFONT_DIR)
  ensureDirSync(PUBLIC_GEN_DIR)
}

async function locateFluidsynthExe() {
  if (fs.existsSync(FLUIDSYNTH_EXE)) return FLUIDSYNTH_EXE

  const findResult = await run('powershell', [
    '-NoProfile',
    '-Command',
    `Get-ChildItem -Path \"${CACHE_DIR}\" -Recurse -Filter fluidsynth.exe | Select-Object -First 1 -ExpandProperty FullName`,
  ])

  const found = (findResult.stdout || '').trim()
  if (!found) throw new Error('解壓後找不到 fluidsynth.exe')

  if (!fs.existsSync(found)) {
    throw new Error(`找到 fluidsynth.exe 路徑但檔案不存在: ${found}`)
  }

  return found
}

async function getStatus() {
  await ensureSetupDirs()
  const fluidsynthOk = fs.existsSync(FLUIDSYNTH_EXE)
  const sfOk = fs.existsSync(SOUNDFONT_FILE)
  return { fluidsynthOk, sfOk }
}

app.get('/api/music/status', async (_req, res) => {
  try {
    const { fluidsynthOk, sfOk } = await getStatus()
    const installed = fluidsynthOk && sfOk

    safeJson(res, 200, {
      installed,
      downloading: setupState.downloading,
      cacheDir: CACHE_DIR,
      message: installed
        ? `fluidsynth=${FLUIDSYNTH_EXE}; soundfont=${SOUNDFONT_FILE}`
        : setupState.message || `缺少: ${!fluidsynthOk ? 'fluidsynth ' : ''}${!sfOk ? 'soundfont' : ''}`,
    })
  } catch (e) {
    safeJson(res, 500, { ok: false, message: errToString(e) })
  }
})

app.post('/api/music/setup', async (_req, res) => {
  if (setupState.downloading) {
    return safeJson(res, 200, { ok: true, downloading: true, message: setupState.message })
  }

  setupState.downloading = true
  setupState.message = '開始下載...'

  try {
    await ensureSetupDirs()

    const { fluidsynthOk, sfOk } = await getStatus()

    if (!fluidsynthOk) {
      setupState.message = '下載 fluidsynth...'
      const zipPath = path.join(CACHE_DIR, 'fluidsynth.zip')
      await downloadFile(FLUIDSYNTH_URL, zipPath)

      setupState.message = '解壓 fluidsynth...'
      await run('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force \"${zipPath}\" \"${CACHE_DIR}\"`])

      setupState.message = '定位 fluidsynth.exe...'
      const found = await locateFluidsynthExe()

      setupState.message = `複製 fluidsynth.exe... (${found})`
      await fsp.copyFile(found, FLUIDSYNTH_EXE)
    }

    if (!sfOk) {
      setupState.message = '下載 SoundFont...'
      await downloadFile(SOUNDFONT_URL, SOUNDFONT_FILE)
    }

    setupState.message = '完成'
    setupState.downloading = false

    const status = await getStatus()
    return safeJson(res, 200, { ok: true, ...status, cacheDir: CACHE_DIR })
  } catch (e) {
    setupState.downloading = false
    setupState.message = `失敗: ${e && e.message ? e.message : String(e)}`
    return safeJson(res, 500, { ok: false, message: setupState.message, cacheDir: CACHE_DIR })
  }
})

app.post('/api/music/generate', async (req, res) => {
  try {
    const { mood, tempo, duration } = req.body || {}

    // Python 版本改為純合成 WAV（不再依賴 fluidsynth/soundfont），所以這裡不需要阻擋 generate。
    // 仍保留 status/setup 讓需要者可安裝資源，但 generate 會直接嘗試輸出。
    await ensureSetupDirs()

    if (mood !== 'calm' && mood !== 'tense') {
      return safeJson(res, 400, { ok: false, message: `mood 參數錯誤: ${String(mood)}` })
    }

    const t = Number(tempo)
    const d = Number(duration)
    if (!Number.isFinite(t) || t < 40 || t > 240) {
      return safeJson(res, 400, { ok: false, message: `tempo 參數錯誤: ${String(tempo)}` })
    }
    if (!Number.isFinite(d) || d < 1 || d > 3600) {
      return safeJson(res, 400, { ok: false, message: `duration 參數錯誤: ${String(duration)}` })
    }

    const baseName = `output-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const outWav = path.join(PUBLIC_GEN_DIR, `${baseName}.wav`)

    const py = process.env.PYTHON || 'python'

    const args = [
      PY_SCRIPT,
      '--mood',
      mood,
      '--tempo',
      String(t),
      '--duration',
      String(d),
      '--out',
      outWav,
    ]

    const result = await run(py, args, { cwd: PROJECT_ROOT })

    if (!fs.existsSync(outWav)) {
      return safeJson(res, 500, {
        ok: false,
        message: `生成完成但找不到輸出檔案: ${outWav}`,
        stdout: result.stdout,
      })
    }

    return safeJson(res, 200, { ok: true, url: `/generated/${baseName}.wav`, stdout: result.stdout })
  } catch (e) {
    return safeJson(res, 500, { ok: false, message: errToString(e) })
  }
})

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[music-api] error', err)
  if (res.headersSent) return
  safeJson(res, 500, { ok: false, message: errToString(err) })
})

const PORT = process.env.MUSIC_SERVER_PORT ? parseInt(process.env.MUSIC_SERVER_PORT, 10) : 5174
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Music server listening on http://localhost:${PORT}`)
  // eslint-disable-next-line no-console
  console.log(`Music cache dir: ${CACHE_DIR}`)
})
