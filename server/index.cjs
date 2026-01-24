const express = require('express')
const path = require('path')
const fs = require('fs')
const fsp = fs.promises
const https = require('https')
const { spawn } = require('child_process')

const app = express()

// Basic middleware
app.use(express.json())

// Request log (helps debug "white screen" / silent failures)
app.use((req, _res, next) => {
  // eslint-disable-next-line no-console
  console.log(`[music-api] ${req.method} ${req.url}`)
  next()
})

const PROJECT_ROOT = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(PROJECT_ROOT, '.cache', 'music')
const BIN_DIR = path.join(CACHE_DIR, 'bin')
const SOUNDFONT_DIR = path.join(CACHE_DIR, 'soundfonts')
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

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    ensureDirSync(path.dirname(dest))

    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlink(dest, () => {})
        return resolve(downloadFile(res.headers.location, dest, onProgress))
      }

      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(dest, () => {})
        return reject(new Error(`下載失敗: ${url} (${res.statusCode})`))
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0

      res.on('data', (chunk) => {
        downloaded += chunk.length
        if (onProgress) onProgress({ downloaded, total })
      })

      res.pipe(file)

      file.on('finish', () => {
        file.close(() => resolve())
      })
    }).on('error', (err) => {
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

async function ensureSetup() {
  ensureDirSync(CACHE_DIR)
  ensureDirSync(BIN_DIR)
  ensureDirSync(SOUNDFONT_DIR)
  ensureDirSync(PUBLIC_GEN_DIR)

  const fluidsynthOk = fs.existsSync(FLUIDSYNTH_EXE)
  const sfOk = fs.existsSync(SOUNDFONT_FILE)

  return { fluidsynthOk, sfOk }
}

app.get('/api/music/status', async (_req, res, next) => {
  try {
    const { fluidsynthOk, sfOk } = await ensureSetup()
    const installed = fluidsynthOk && sfOk
    res.json({
      installed,
      downloading: setupState.downloading,
      message: installed
        ? `fluidsynth=${FLUIDSYNTH_EXE}; soundfont=${SOUNDFONT_FILE}`
        : setupState.message || `缺少: ${!fluidsynthOk ? 'fluidsynth ' : ''}${!sfOk ? 'soundfont' : ''}`,
    })
  } catch (e) {
    next(e)
  }
})

app.post('/api/music/setup', async (_req, res) => {
  if (setupState.downloading) {
    return res.json({ ok: true, downloading: true, message: setupState.message })
  }

  setupState.downloading = true
  setupState.message = '開始下載...'

  try {
    await ensureSetup()

    const { fluidsynthOk, sfOk } = await ensureSetup()

    if (!fluidsynthOk) {
      setupState.message = '下載 fluidsynth...'
      const zipPath = path.join(CACHE_DIR, 'fluidsynth.zip')
      await downloadFile(FLUIDSYNTH_URL, zipPath)

      setupState.message = '解壓 fluidsynth...'
      await run('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force \"${zipPath}\" \"${CACHE_DIR}\"`])

      const findResult = await run('powershell', [
        '-NoProfile',
        '-Command',
        `Get-ChildItem -Path \"${CACHE_DIR}\" -Recurse -Filter fluidsynth.exe | Select-Object -First 1 -ExpandProperty FullName`,
      ])
      const found = findResult.stdout.trim()
      if (!found) throw new Error('解壓後找不到 fluidsynth.exe')

      await fsp.copyFile(found, FLUIDSYNTH_EXE)
    }

    if (!sfOk) {
      setupState.message = '下載 SoundFont...'
      await downloadFile(SOUNDFONT_URL, SOUNDFONT_FILE)
    }

    setupState.message = '完成'
    setupState.downloading = false

    const status = await ensureSetup()
    return res.json({ ok: true, ...status })
  } catch (e) {
    setupState.downloading = false
    setupState.message = `失敗: ${e && e.message ? e.message : String(e)}`
    return res.status(500).json({ ok: false, message: setupState.message })
  }
})

app.post('/api/music/generate', async (req, res) => {
  try {
    const { mood, tempo, duration } = req.body || {}
    const { fluidsynthOk, sfOk } = await ensureSetup()
    if (!fluidsynthOk || !sfOk) {
      return res.status(400).json({ ok: false, message: '尚未完成安裝，請先執行 setup' })
    }

    const outWav = path.join(PUBLIC_GEN_DIR, 'output.wav')

    const py = process.env.PYTHON || 'python'

    const args = [
      PY_SCRIPT,
      '--mood',
      String(mood),
      '--tempo',
      String(tempo),
      '--duration',
      String(duration),
      '--out',
      outWav,
      '--fluidsynth',
      FLUIDSYNTH_EXE,
      '--soundfont',
      SOUNDFONT_FILE,
    ]

    const result = await run(py, args, { cwd: PROJECT_ROOT })

    return res.json({ ok: true, url: '/generated/output.wav', stdout: result.stdout })
  } catch (e) {
    return res.status(500).json({ ok: false, message: e && e.message ? e.message : String(e) })
  }
})

// Global error handler: never return empty 500
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[music-api] error', err)
  if (res.headersSent) return
  res.status(500).type('text/plain').send(err && err.stack ? err.stack : String(err))
})

const PORT = process.env.MUSIC_SERVER_PORT ? parseInt(process.env.MUSIC_SERVER_PORT, 10) : 5174
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Music server listening on http://localhost:${PORT}`)
})
