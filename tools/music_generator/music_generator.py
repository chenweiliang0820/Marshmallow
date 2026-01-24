import argparse
import math
import os
import random
import wave
from dataclasses import dataclass


@dataclass(frozen=True)
class GenerationConfig:
    mood: str
    tempo: int
    duration: int
    out_wav: str


def clamp_duration(duration: int) -> int:
    return max(30, min(60, duration))


def clamp_tempo(tempo: int) -> int:
    return max(40, min(240, tempo))


def _adsr_amp(t: float, note_len: float, attack: float, decay: float, sustain: float, release: float) -> float:
    """Simple ADSR envelope."""
    if t < 0:
        return 0.0
    if t < attack:
        return t / max(attack, 1e-9)

    t2 = t - attack
    if t2 < decay:
        # decay to sustain
        if decay <= 1e-9:
            return sustain
        return 1.0 - (1.0 - sustain) * (t2 / decay)

    # sustain until note end, then release
    if t < note_len:
        return sustain

    tr = t - note_len
    if tr < release:
        return sustain * (1.0 - (tr / max(release, 1e-9)))

    return 0.0


def synth_note(freq: float, start_s: float, dur_s: float, velocity: float, sr: int, total_len: int, buf: list[float],
               wave_mix: tuple[float, float, float], detune_cents: float = 0.0) -> None:
    """Add a note into mono buffer."""
    start_i = int(start_s * sr)
    end_i = min(total_len, int((start_s + dur_s) * sr))
    if end_i <= start_i:
        return

    # Detune a second oscillator
    detune_ratio = 2 ** (detune_cents / 1200.0)
    f2 = freq * detune_ratio

    attack, decay, sustain, release = 0.01, 0.08, 0.6, 0.12

    for i in range(start_i, end_i):
        t = (i - start_i) / sr
        env = _adsr_amp(t, dur_s, attack, decay, sustain, release)
        phase1 = 2.0 * math.pi * freq * t
        phase2 = 2.0 * math.pi * f2 * t

        s_sin = math.sin(phase1)
        s_tri = (2.0 / math.pi) * math.asin(math.sin(phase1))
        s_saw = 2.0 * (phase1 / (2.0 * math.pi) - math.floor(0.5 + phase1 / (2.0 * math.pi)))

        # detuned sine for thickness
        s_detune = math.sin(phase2)

        mixed = (
            wave_mix[0] * s_sin
            + wave_mix[1] * s_tri
            + wave_mix[2] * s_saw
            + 0.25 * s_detune
        )

        buf[i] += mixed * env * velocity


def build_progression(mood: str) -> list[int]:
    # scale degrees in semitones relative to key root
    if mood == "calm":
        # I - V - vi - IV (very common pop, calm)
        return [0, 7, 9, 5]
    # tense: i - VI - III - VII (minor loop)
    return [0, 8, 3, 10]


def build_scale(mood: str) -> list[int]:
    if mood == "calm":
        return [0, 2, 4, 5, 7, 9, 11]  # major
    return [0, 2, 3, 5, 7, 8, 10]  # minor


def midi_to_freq(midi_note: int) -> float:
    return 440.0 * (2 ** ((midi_note - 69) / 12.0))


def generate_wav(cfg: GenerationConfig) -> None:
    sr = 44100
    total_len = int(cfg.duration * sr)
    buf = [0.0] * total_len

    tempo = clamp_tempo(cfg.tempo)
    beat = 60.0 / float(tempo)

    if cfg.mood == "calm":
        key_root = 60  # C4
        scale = build_scale(cfg.mood)
        chord_root = 48  # C3
        wave_mix = (0.7, 0.25, 0.05)
        detune = 4.0
        melody_density = 1
        velocity_range = (0.35, 0.65)
        note_lens = [1.0, 2.0]
    else:
        key_root = 57  # A3-ish base for darker
        scale = build_scale(cfg.mood)
        chord_root = 45  # A2
        wave_mix = (0.35, 0.35, 0.3)
        detune = 8.0
        melody_density = 2
        velocity_range = (0.45, 0.8)
        note_lens = [0.25, 0.5]

    # Harmony progression: 1 bar per chord (4 beats)
    prog = build_progression(cfg.mood)
    bar_len = 4 * beat

    # Add chords + bass
    t0 = 0.0
    bar = 0
    while t0 < cfg.duration:
        deg = prog[bar % len(prog)]
        root = chord_root + deg

        # triad
        third = root + (4 if cfg.mood == "calm" else 3)
        fifth = root + 7

        # chord pad (long)
        pad_vel = 0.18 if cfg.mood == "calm" else 0.22
        for n in [root, third, fifth]:
            synth_note(midi_to_freq(n), t0, min(bar_len, cfg.duration - t0), pad_vel, sr, total_len, buf, wave_mix, detune_cents=detune)

        # bass (on beats)
        bass_vel = 0.28 if cfg.mood == "calm" else 0.35
        for b in range(4):
            bt = t0 + b * beat
            if bt >= cfg.duration:
                break
            synth_note(midi_to_freq(root - 12), bt, beat * 0.95, bass_vel, sr, total_len, buf, (0.85, 0.1, 0.05), detune_cents=0.0)

        t0 += bar_len
        bar += 1

    # Melody
    step = beat / melody_density
    t = 0.0
    pitch_choices = [key_root + s for s in scale] + [key_root + 12 + s for s in scale]

    while t < cfg.duration:
        pitch = random.choice(pitch_choices)
        vel = random.uniform(*velocity_range)
        length_beats = random.choice(note_lens)
        length = length_beats * beat

        start = t
        end = min(cfg.duration, t + length)
        synth_note(midi_to_freq(pitch), start, end - start, vel, sr, total_len, buf, (0.75, 0.2, 0.05), detune_cents=detune)

        # rests
        if cfg.mood == "calm":
            t += (end - start) + random.choice([0.0, step])
        else:
            t += step

    # Normalize + soft clip
    peak = max(abs(x) for x in buf) if buf else 1.0
    if peak < 1e-9:
        peak = 1.0

    target = 0.9
    gain = target / peak

    def soft_clip(x: float) -> float:
        # tanh soft clip
        return math.tanh(x)

    pcm = bytearray()
    for x in buf:
        y = soft_clip(x * gain)
        s = int(max(-1.0, min(1.0, y)) * 32767)
        pcm += int(s).to_bytes(2, byteorder="little", signed=True)

    os.makedirs(os.path.dirname(cfg.out_wav), exist_ok=True)
    with wave.open(cfg.out_wav, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm)


def parse_args() -> GenerationConfig:
    parser = argparse.ArgumentParser(description="最簡單但可擴充的遊戲背景音樂生成器（直接合成 WAV）")
    parser.add_argument("--mood", choices=["calm", "tense"], required=True)
    parser.add_argument("--tempo", type=int, required=True, help="BPM（整數）")
    parser.add_argument("--duration", type=int, required=True, help="秒數（30~60）")
    parser.add_argument("--out", type=str, required=True, help="輸出 WAV 完整路徑（必填）")

    # Backward compatible args (ignored)
    parser.add_argument("--soundfont", type=str, required=False)
    parser.add_argument("--fluidsynth", type=str, required=False)

    args = parser.parse_args()

    duration = clamp_duration(args.duration)
    out_wav = os.path.abspath(args.out)

    return GenerationConfig(
        mood=args.mood,
        tempo=int(args.tempo),
        duration=duration,
        out_wav=out_wav,
    )


def main() -> None:
    cfg = parse_args()
    generate_wav(cfg)
    print(f"已輸出：{cfg.out_wav}")


if __name__ == "__main__":
    main()
