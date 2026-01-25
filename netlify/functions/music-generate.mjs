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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12)
}

function adsrAmp(t, noteLen, attack, decay, sustain, release) {
  if (t < 0) return 0
  if (t < attack) return t / Math.max(attack, 1e-9)
  const t2 = t - attack
  if (t2 < decay) {
    if (decay <= 1e-9) return sustain
    return 1 - (1 - sustain) * (t2 / decay)
  }
  if (t < noteLen) return sustain
  const tr = t - noteLen
  if (tr < release) return sustain * (1 - tr / Math.max(release, 1e-9))
  return 0
}

function writeWavMono16(pcm16, sampleRate) {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = pcm16.byteLength

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  let o = 0
  const writeStr = (s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
    o += s.length
  }
  const writeU32 = (v) => {
    view.setUint32(o, v, true)
    o += 4
  }
  const writeU16 = (v) => {
    view.setUint16(o, v, true)
    o += 2
  }

  writeStr('RIFF')
  writeU32(36 + dataSize)
  writeStr('WAVE')
  writeStr('fmt ')
  writeU32(16)
  writeU16(1)
  writeU16(numChannels)
  writeU32(sampleRate)
  writeU32(byteRate)
  writeU16(blockAlign)
  writeU16(bitsPerSample)
  writeStr('data')
  writeU32(dataSize)

  new Uint8Array(buffer, 44).set(new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength))
  return Buffer.from(buffer)
}

function softClip(x) {
  return Math.tanh(x)
}

function synthNote({ buf, sampleRate, totalLen, freq, startS, durS, velocity, waveMix, detuneCents }) {
  const startI = Math.floor(startS * sampleRate)
  const endI = Math.min(totalLen, Math.floor((startS + durS) * sampleRate))
  if (endI <= startI) return

  const detuneRatio = Math.pow(2, detuneCents / 1200)
  const f2 = freq * detuneRatio

  const attack = 0.01
  const decay = 0.08
  const sustain = 0.6
  const release = 0.12

  for (let i = startI; i < endI; i++) {
    const t = (i - startI) / sampleRate
    const env = adsrAmp(t, durS, attack, decay, sustain, release)

    const phase1 = 2 * Math.PI * freq * t
    const phase2 = 2 * Math.PI * f2 * t

    const sSin = Math.sin(phase1)
    const sTri = (2 / Math.PI) * Math.asin(Math.sin(phase1))
    const sSaw = 2 * (phase1 / (2 * Math.PI) - Math.floor(0.5 + phase1 / (2 * Math.PI)))
    const sDetune = Math.sin(phase2)

    const mixed = waveMix[0] * sSin + waveMix[1] * sTri + waveMix[2] * sSaw + 0.25 * sDetune
    buf[i] += mixed * env * velocity
  }
}

function buildScale(mood) {
  return mood === 'calm' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
}

function buildProgression(mood) {
  return mood === 'calm' ? [0, 7, 9, 5] : [0, 8, 3, 10]
}

function generateWavBuffer({ mood, tempo, duration }) {
  const sampleRate = 44100
  const d = clamp(duration, 3, 20) // Netlify functions：控制運算時間，避免 timeout
  const t = clamp(tempo, 40, 240)
  const totalLen = Math.floor(d * sampleRate)
  const buf = new Float32Array(totalLen)

  const beat = 60 / t

  let keyRoot, chordRoot, waveMix, detune, melodyDensity, velRange, noteLens
  if (mood === 'calm') {
    keyRoot = 60
    chordRoot = 48
    waveMix = [0.7, 0.25, 0.05]
    detune = 4
    melodyDensity = 1
    velRange = [0.35, 0.65]
    noteLens = [1, 2]
  } else {
    keyRoot = 57
    chordRoot = 45
    waveMix = [0.35, 0.35, 0.3]
    detune = 8
    melodyDensity = 2
    velRange = [0.45, 0.8]
    noteLens = [0.25, 0.5]
  }

  const scale = buildScale(mood)
  const prog = buildProgression(mood)
  const barLen = 4 * beat

  // chords + bass
  let t0 = 0
  let bar = 0
  while (t0 < d) {
    const deg = prog[bar % prog.length]
    const root = chordRoot + deg
    const third = root + (mood === 'calm' ? 4 : 3)
    const fifth = root + 7

    const padVel = mood === 'calm' ? 0.18 : 0.22
    for (const n of [root, third, fifth]) {
      synthNote({
        buf,
        sampleRate,
        totalLen,
        freq: midiToFreq(n),
        startS: t0,
        durS: Math.min(barLen, d - t0),
        velocity: padVel,
        waveMix,
        detuneCents: detune,
      })
    }

    const bassVel = mood === 'calm' ? 0.28 : 0.35
    for (let b = 0; b < 4; b++) {
      const bt = t0 + b * beat
      if (bt >= d) break
      synthNote({
        buf,
        sampleRate,
        totalLen,
        freq: midiToFreq(root - 12),
        startS: bt,
        durS: beat * 0.95,
        velocity: bassVel,
        waveMix: [0.85, 0.1, 0.05],
        detuneCents: 0,
      })
    }

    t0 += barLen
    bar++
  }

  // melody
  const step = beat / melodyDensity
  const pitches = scale.flatMap((s) => [keyRoot + s, keyRoot + 12 + s])
  let tt = 0
  while (tt < d) {
    const pitch = pitches[Math.floor(Math.random() * pitches.length)]
    const vel = velRange[0] + Math.random() * (velRange[1] - velRange[0])
    const lenBeats = noteLens[Math.floor(Math.random() * noteLens.length)]
    const len = lenBeats * beat
    const start = tt
    const end = Math.min(d, tt + len)

    synthNote({
      buf,
      sampleRate,
      totalLen,
      freq: midiToFreq(pitch),
      startS: start,
      durS: end - start,
      velocity: vel,
      waveMix: [0.75, 0.2, 0.05],
      detuneCents: detune,
    })

    if (mood === 'calm') {
      tt += end - start + (Math.random() < 0.5 ? 0 : step)
    } else {
      tt += step
    }
  }

  // normalize
  let peak = 0
  for (let i = 0; i < totalLen; i++) {
    const a = Math.abs(buf[i])
    if (a > peak) peak = a
  }
  if (peak < 1e-9) peak = 1
  const gain = 0.9 / peak

  const pcm16 = new Int16Array(totalLen)
  for (let i = 0; i < totalLen; i++) {
    const y = softClip(buf[i] * gain)
    const s = Math.max(-1, Math.min(1, y))
    pcm16[i] = Math.round(s * 32767)
  }

  const wav = writeWavMono16(pcm16, sampleRate)
  return { wav, duration: d }
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, message: 'Method Not Allowed' })
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const mood = body.mood
    const tempo = Number(body.tempo)
    const duration = Number(body.duration)

    if (mood !== 'calm' && mood !== 'tense') {
      return json(400, { ok: false, message: `mood 參數錯誤: ${String(mood)}` })
    }
    if (!Number.isFinite(tempo)) {
      return json(400, { ok: false, message: `tempo 參數錯誤: ${String(body.tempo)}` })
    }
    if (!Number.isFinite(duration)) {
      return json(400, { ok: false, message: `duration 參數錯誤: ${String(body.duration)}` })
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

    const { wav, duration: actualDuration } = generateWavBuffer({ mood, tempo, duration })

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const folder = `music/${new Date().toISOString().slice(0, 10)}/`
    const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const wavKey = `${folder}${base}.wav`

    const { error: uploadError } = await client.storage.from(bucket).upload(wavKey, wav, {
      contentType: 'audio/wav',
      upsert: false,
    })

    if (uploadError) {
      return json(500, { ok: false, message: `Supabase 上傳失敗: ${uploadError.message}` })
    }

    const { data: pubWav } = client.storage.from(bucket).getPublicUrl(wavKey)

    return json(200, {
      ok: true,
      wav: { key: wavKey, url: pubWav.publicUrl },
      duration: actualDuration,
    })
  } catch (e) {
    return json(500, { ok: false, message: e?.stack || e?.message || String(e) })
  }
}
