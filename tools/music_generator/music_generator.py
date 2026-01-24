import argparse
import os
import random
import shutil
import subprocess
from dataclasses import dataclass


def _disable_pretty_midi_fluidsynth_on_windows() -> None:
    """避免 pretty_midi 內建的 fluidsynth wrapper 在 Windows 上硬找 C:\\tools\\fluidsynth\\bin。

    我們此工具的 MIDI->WAV 轉檔是直接呼叫 fluidsynth.exe，不需要 pretty_midi 的 fluidsynth 模組。
    """

    try:
        import sys

        if sys.platform.startswith("win"):
            import types

            sys.modules.setdefault("fluidsynth", types.ModuleType("fluidsynth"))
    except Exception:
        # 防禦性處理：即使失敗也不要阻止程式啟動，後續會由實際轉檔步驟報錯。
        return


_disable_pretty_midi_fluidsynth_on_windows()

import pretty_midi


@dataclass(frozen=True)
class GenerationConfig:
    mood: str
    tempo: int
    duration: int
    out_wav: str
    out_midi: str
    soundfont: str
    fluidsynth: str
    disable_pretty_midi_fluidsynth: bool


SCALES = {
    # Natural major
    "major": [0, 2, 4, 5, 7, 9, 11],
    # Natural minor
    "minor": [0, 2, 3, 5, 7, 8, 10],
}


def clamp_duration(duration: int) -> int:
    return max(30, min(60, duration))


def build_melody_notes(cfg: GenerationConfig):
    # Beat length in seconds
    beat = 60.0 / float(cfg.tempo)

    if cfg.mood == "calm":
        key_root = 60  # C4
        scale = SCALES["major"]
        steps_per_beat = 1  # sparser
        pitch_choices = [key_root + s for s in scale] + [key_root + 12 + s for s in scale]
        velocity_range = (55, 85)
        note_len_beats = [1.0, 2.0]
    else:  # tense
        key_root = 69  # A4
        scale = SCALES["minor"]
        steps_per_beat = 2  # denser
        pitch_choices = [key_root + s for s in scale] + [key_root + 12 + s for s in scale]
        velocity_range = (70, 110)
        note_len_beats = [0.25, 0.5]

    step = beat / steps_per_beat
    t = 0.0
    notes = []

    while t < cfg.duration:
        pitch = random.choice(pitch_choices)
        vel = random.randint(*velocity_range)
        length_beats = random.choice(note_len_beats)
        length = length_beats * beat

        start = t
        end = min(cfg.duration, t + length)
        notes.append((pitch, vel, start, end))

        # small rests
        if cfg.mood == "calm":
            t += length + random.choice([0.0, step])
        else:
            t += step

    return notes


def generate_midi(cfg: GenerationConfig) -> None:
    pm = pretty_midi.PrettyMIDI(initial_tempo=cfg.tempo)

    # Program 0 = Acoustic Grand Piano
    instr = pretty_midi.Instrument(program=0)

    melody = build_melody_notes(cfg)
    for pitch, vel, start, end in melody:
        instr.notes.append(pretty_midi.Note(velocity=vel, pitch=pitch, start=start, end=end))

    pm.instruments.append(instr)
    pm.write(cfg.out_midi)


def resolve_fluidsynth_exe(cfg: GenerationConfig) -> str:
    if cfg.fluidsynth:
        return cfg.fluidsynth

    exe = shutil.which("fluidsynth")
    if exe:
        return exe

    raise FileNotFoundError(
        "找不到 fluidsynth。請把 fluidsynth 加入 PATH，或用 --fluidsynth 指定 fluidsynth.exe 完整路徑。"
    )


def midi_to_wav(cfg: GenerationConfig) -> None:
    fluidsynth_exe = resolve_fluidsynth_exe(cfg)

    if not os.path.isfile(cfg.soundfont):
        raise FileNotFoundError(f"找不到 SoundFont 檔案：{cfg.soundfont}")

    cmd = [
        fluidsynth_exe,
        "-ni",
        cfg.soundfont,
        cfg.out_midi,
        "-F",
        cfg.out_wav,
        "-r",
        "44100",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            "fluidsynth 轉檔失敗\n"
            f"cmd: {' '.join(cmd)}\n"
            f"stdout: {result.stdout}\n"
            f"stderr: {result.stderr}\n"
        )


def parse_args() -> GenerationConfig:
    parser = argparse.ArgumentParser(description="最簡單但可擴充的遊戲背景音樂生成器（先 MIDI 再 WAV）")
    parser.add_argument("--mood", choices=["calm", "tense"], required=True)
    parser.add_argument("--tempo", type=int, required=True, help="BPM（整數）")
    parser.add_argument("--duration", type=int, required=True, help="秒數（30~60）")
    parser.add_argument(
        "--soundfont",
        type=str,
        required=True,
        help=".sf2 SoundFont 檔案完整路徑（必填）",
    )
    parser.add_argument(
        "--fluidsynth",
        type=str,
        required=True,
        help="fluidsynth.exe 完整路徑（必填）",
    )
    parser.add_argument(
        "--out", 
        type=str, 
        required=True,
        help="輸出 WAV 完整路徑（必填）"
    )

    args = parser.parse_args()

    duration = clamp_duration(args.duration)
    out_wav = os.path.abspath(args.out)
    out_midi = os.path.splitext(out_wav)[0] + ".mid"

    return GenerationConfig(
        mood=args.mood,
        tempo=int(args.tempo),
        duration=duration,
        out_wav=out_wav,
        out_midi=out_midi,
        soundfont=args.soundfont,
        fluidsynth=args.fluidsynth,
        disable_pretty_midi_fluidsynth=True,
    )


def main() -> None:
    cfg = parse_args()

    generate_midi(cfg)
    midi_to_wav(cfg)

    print(f"已輸出：{cfg.out_wav}")


if __name__ == "__main__":
    main()
