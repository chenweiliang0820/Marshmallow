/* global Buffer, process */
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

function synthNote({ buf, sampleRate, totalLen, freq, startS, durS, velocity, waveMix, detuneCents, adsr }) {
  const startI = Math.floor(startS * sampleRate)
  const endI = Math.min(totalLen, Math.floor((startS + durS) * sampleRate))
  if (endI <= startI) return

  const detuneRatio = Math.pow(2, detuneCents / 1200)
  const f2 = freq * detuneRatio

  const attack = Number.isFinite(adsr?.attack) ? adsr.attack : 0.01
  const decay = Number.isFinite(adsr?.decay) ? adsr.decay : 0.08
  const sustain = Number.isFinite(adsr?.sustain) ? adsr.sustain : 0.6
  const release = Number.isFinite(adsr?.release) ? adsr.release : 0.12

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

function noteName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const n = ((midi % 12) + 12) % 12
  const oct = Math.floor(midi / 12) - 1
  return `${names[n]}${oct}`
}

function pitchClassName(midi) {
  return noteName(midi).replace(/\d+$/, '')
}

function degreeInScale(midi, keyRoot, scale) {
  const pc = ((midi - keyRoot) % 12 + 12) % 12
  const idx = scale.indexOf(pc)
  return idx >= 0 ? idx + 1 : null
}

function makeRng(seed) {
  let x = (seed >>> 0) || 1
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 4294967296
  }
}

function generateWavBuffer({ mood, tempo, duration, seed, prompt, scene, themes, atmospheres, styles, lead, loopable, avoid }) {
  void themes
  void atmospheres
  void loopable
  void avoid
  const rand = makeRng(seed)

  const sampleRate = 44100
  const d = clamp(duration, 3, 20) // Netlify functions：控制運算時間，避免 timeout
  const t = clamp(tempo, 40, 240)
  const totalLen = Math.floor(d * sampleRate)
  const buf = new Float32Array(totalLen)

  const beat = 60 / t

  const styleSet = new Set(Array.isArray(styles) ? styles.map((s) => String(s)) : [])
  const leadStr = typeof lead === 'string' ? lead : ''
  const is8bit = styleSet.has('8-bit chiptune') || /8-?bit/i.test(prompt || '')
  const isCinematic = styleSet.has('交響/電影感') || /cinematic|orchestral/i.test(prompt || '')
  const isElectronic = styleSet.has('合成器電子') || /synth/i.test(prompt || '')
  const isAmbient = styleSet.has('Ambient 氛圍音') || /ambient/i.test(prompt || '')
  const isRock = styleSet.has('Rock/metal') || /rock|metal/i.test(prompt || '')
  const isFolk = styleSet.has('民族風') || /民族|oriental|celtic|japan/i.test(prompt || '')

  const sceneStr = typeof scene === 'string' ? scene : ''
  const isBattleLike = ['battle', 'boss', 'stealth'].includes(sceneStr)
  const isTownLike = ['town', 'ui'].includes(sceneStr)
  const isPuzzleLike = ['puzzle'].includes(sceneStr)


  // 依 lead/style/scene 生成「可聽出差異」的音色 preset（仍是合成器，但差異會很明顯）
  const leadPreset = (() => {
    if (/電吉他/.test(leadStr) || isRock) return 'electric-guitar'
    if (/弦樂/.test(leadStr) || isCinematic) return 'strings'
    if (/木管/.test(leadStr) || isFolk) return 'flute'
    if (/銅管/.test(leadStr)) return 'brass'
    if (/合成/.test(leadStr) || isElectronic) return 'synth-lead'
    if (is8bit) return 'chiptune'
    return 'piano'
  })()

  let keyRoot, chordRoot, chordWaveMix, bassWaveMix, leadWaveMix, chordDetune, leadDetune, melodyDensity, velRange, noteLens, leadRange, chordAdsr, bassAdsr, leadAdsr
  const chordsInfo = []
  const melodyNotes = []

  if (mood === 'calm') {
    keyRoot = 60
    chordRoot = 48
    chordDetune = 4
    melodyDensity = 1
    velRange = [0.35, 0.65]
    noteLens = [1, 2]
    leadRange = [keyRoot + 7, keyRoot + 24]
  } else {
    keyRoot = 57
    chordRoot = 45
    chordDetune = 8
    melodyDensity = 2
    velRange = [0.45, 0.8]
    noteLens = [0.25, 0.5]
    leadRange = [keyRoot + 12, keyRoot + 31]
  }

  // scene 讓節奏/密度明顯不同
  if (isBattleLike) {
    melodyDensity = Math.max(melodyDensity, 2)
    noteLens = [0.25, 0.5]
    velRange = [Math.max(velRange[0], 0.5), Math.min(velRange[1] + 0.1, 0.9)]
  } else if (isTownLike) {
    melodyDensity = 1
    noteLens = [1, 2]
    velRange = [0.25, 0.55]
  } else if (isPuzzleLike) {
    melodyDensity = 1
    noteLens = [0.5, 1]
    velRange = [0.3, 0.6]
  }

  // style / lead preset 影響波形/包絡/失真感
  if (leadPreset === 'chiptune') {
    chordWaveMix = [0.2, 0.2, 0.6]
    bassWaveMix = [0.15, 0.15, 0.7]
    leadWaveMix = [0.1, 0.25, 0.65]
    leadDetune = 1
    chordAdsr = { attack: 0.005, decay: 0.05, sustain: 0.55, release: 0.04 }
    bassAdsr = { attack: 0.003, decay: 0.04, sustain: 0.7, release: 0.03 }
    leadAdsr = { attack: 0.003, decay: 0.06, sustain: 0.65, release: 0.05 }
  } else if (leadPreset === 'strings') {
    chordWaveMix = [0.6, 0.35, 0.05]
    bassWaveMix = [0.75, 0.2, 0.05]
    leadWaveMix = [0.55, 0.35, 0.1]
    leadDetune = 10
    chordAdsr = { attack: 0.06, decay: 0.18, sustain: 0.75, release: 0.25 }
    bassAdsr = { attack: 0.02, decay: 0.12, sustain: 0.65, release: 0.18 }
    leadAdsr = { attack: 0.05, decay: 0.16, sustain: 0.78, release: 0.28 }
  } else if (leadPreset === 'electric-guitar') {
    chordWaveMix = [0.25, 0.25, 0.5]
    bassWaveMix = [0.15, 0.15, 0.7]
    leadWaveMix = [0.15, 0.15, 0.7]
    leadDetune = 6
    chordAdsr = { attack: 0.01, decay: 0.09, sustain: 0.55, release: 0.12 }
    bassAdsr = { attack: 0.008, decay: 0.08, sustain: 0.65, release: 0.1 }
    leadAdsr = { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.14 }
  } else if (leadPreset === 'flute') {
    chordWaveMix = [0.8, 0.18, 0.02]
    bassWaveMix = [0.85, 0.12, 0.03]
    leadWaveMix = [0.92, 0.07, 0.01]
    leadDetune = 2
    chordAdsr = { attack: 0.03, decay: 0.1, sustain: 0.7, release: 0.18 }
    bassAdsr = { attack: 0.01, decay: 0.08, sustain: 0.65, release: 0.12 }
    leadAdsr = { attack: 0.02, decay: 0.08, sustain: 0.75, release: 0.16 }
  } else if (leadPreset === 'brass') {
    chordWaveMix = [0.45, 0.25, 0.3]
    bassWaveMix = [0.6, 0.2, 0.2]
    leadWaveMix = [0.35, 0.25, 0.4]
    leadDetune = 4
    chordAdsr = { attack: 0.02, decay: 0.1, sustain: 0.7, release: 0.16 }
    bassAdsr = { attack: 0.01, decay: 0.08, sustain: 0.7, release: 0.12 }
    leadAdsr = { attack: 0.015, decay: 0.09, sustain: 0.75, release: 0.14 }
  } else if (leadPreset === 'synth-lead') {
    chordWaveMix = [0.25, 0.25, 0.5]
    bassWaveMix = [0.3, 0.2, 0.5]
    leadWaveMix = [0.15, 0.25, 0.6]
    leadDetune = 12
    chordAdsr = { attack: 0.02, decay: 0.12, sustain: 0.65, release: 0.2 }
    bassAdsr = { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.18 }
    leadAdsr = { attack: 0.008, decay: 0.06, sustain: 0.75, release: 0.12 }
  } else {
    // piano-ish
    chordWaveMix = [0.75, 0.2, 0.05]
    bassWaveMix = [0.85, 0.1, 0.05]
    leadWaveMix = [0.7, 0.25, 0.05]
    leadDetune = 3
    chordAdsr = { attack: 0.008, decay: 0.1, sustain: 0.55, release: 0.12 }
    bassAdsr = { attack: 0.006, decay: 0.09, sustain: 0.6, release: 0.1 }
    leadAdsr = { attack: 0.006, decay: 0.12, sustain: 0.5, release: 0.14 }
  }

  // cinematic / ambient：加長 release、讓和弦更厚
  if (isCinematic || isAmbient) {
    chordAdsr = { ...chordAdsr, release: Math.max(chordAdsr.release, 0.22), sustain: Math.min(0.85, chordAdsr.sustain + 0.1) }
    leadAdsr = { ...leadAdsr, release: Math.max(leadAdsr.release, 0.22) }
    chordDetune = Math.max(chordDetune, 8)
  }

  // rock：更亮（更多 saw） + 更硬（後面 softClip 會吃掉峰值，但感覺會更兇）
  if (isRock) {
    leadWaveMix = [0.1, 0.1, 0.8]
    bassWaveMix = [0.1, 0.1, 0.8]
    leadDetune = Math.max(leadDetune, 10)
  }

  // ambient：旋律更少、音更長
  if (isAmbient) {
    melodyDensity = 1
    noteLens = [2, 4]
    velRange = [0.25, 0.55]
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

    chordsInfo.push({
      bar: bar + 1,
      rootMidi: root,
      notesMidi: [root, third, fifth],
      name: `${pitchClassName(root)}${mood === 'calm' ? 'maj' : 'min'}`,
      degrees: [
        degreeInScale(root + 12, keyRoot, scale),
        degreeInScale(third + 12, keyRoot, scale),
        degreeInScale(fifth + 12, keyRoot, scale),
      ],
    })

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
        waveMix: chordWaveMix,
        detuneCents: chordDetune,
        adsr: chordAdsr,
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
        waveMix: bassWaveMix,
        detuneCents: 0,
        adsr: bassAdsr,
      })
    }

    t0 += barLen
    bar++
  }

  // melody
  const step = beat / melodyDensity
  const pitches = scale.flatMap((s) => [keyRoot + s, keyRoot + 12 + s]).filter((p) => p >= leadRange[0] && p <= leadRange[1])
  let tt = 0
  let noteIndex = 0
  while (tt < d) {
    const pitch = pitches[Math.floor(rand() * pitches.length)]
    const vel = velRange[0] + rand() * (velRange[1] - velRange[0])
    const lenBeats = noteLens[Math.floor(rand() * noteLens.length)]
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
      waveMix: leadWaveMix,
      detuneCents: leadDetune,
      adsr: leadAdsr,
    })

    melodyNotes.push({
      index: noteIndex++,
      startS: Number(start.toFixed(3)),
      durS: Number((end - start).toFixed(3)),
      midi: pitch,
      name: noteName(pitch),
      degree: degreeInScale(pitch, keyRoot, scale),
    })

    if (mood === 'calm') {
      tt += end - start + (rand() < 0.5 ? 0 : step)
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

  const meta = {
    seed,
    mood,
    tempo: t,
    duration: d,
    synthPreset: {
      leadPreset,
      chordWaveMix,
      bassWaveMix,
      leadWaveMix,
      chordAdsr,
      bassAdsr,
      leadAdsr,
      chordDetune,
      leadDetune,
      melodyDensity,
      noteLens,
    },
    key: {
      rootMidi: keyRoot,
      name: noteName(keyRoot),
      pitchClass: pitchClassName(keyRoot),
    },
    scale: {
      pcs: scale,
      names: scale.map((pc) => pitchClassName(keyRoot + pc)),
    },
    progression: prog,
    chords: chordsInfo,
    melody: melodyNotes,
  }

  return { wav, duration: d, meta }
}

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, message: 'Method Not Allowed' })
    }

    const body = event.body ? JSON.parse(event.body) : {}

    // 新版：允許前端傳入更細節的 prompt 與選項（不影響既有 mood/tempo/duration）
    const prompt = typeof body.prompt === 'string' ? body.prompt : ''
    const scene = typeof body.scene === 'string' ? body.scene : ''
    const themes = Array.isArray(body.themes) ? body.themes : []
    const atmospheres = Array.isArray(body.atmospheres) ? body.atmospheres : []
    const styles = Array.isArray(body.styles) ? body.styles : []
    const lead = typeof body.lead === 'string' ? body.lead : ''
    const durationPreset = Number.isFinite(Number(body.durationPreset)) ? Number(body.durationPreset) : null
    const loopable = typeof body.loopable === 'boolean' ? body.loopable : null
    const avoid = Array.isArray(body.avoid) ? body.avoid : []

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

    const seed = Number.isFinite(Number(body.seed)) ? (Number(body.seed) >>> 0) : (Date.now() >>> 0)

    const { wav, duration: actualDuration, meta } = generateWavBuffer({ mood, tempo, duration, seed })

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
      meta: {
        ...meta,
        prompt,
        scene,
        themes,
        atmospheres,
        styles,
        lead,
        durationPreset,
        loopable,
        avoid,
      },
    })
  } catch (e) {
    return json(500, { ok: false, message: e?.stack || e?.message || String(e) })
  }
}
