"""Generate placeholder notification sounds as WAV files.

Usage: python scripts/generate-sounds.py

Output: public/sounds/confirm.wav  public/sounds/success.wav

For production replace these with professionally mastered MP3s
normalised to -18 LUFS integrated.
"""

import math, struct, wave, os

SAMPLE_RATE = 44100
AMPLITUDE = 0.3

def write_wav(path: str, samples: list[float]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        raw = b"".join(
            struct.pack("<h", max(-32768, min(32767, int(s * 32767))))
            for s in samples
        )
        w.writeframes(raw)

def sine(freq: float, duration: float, sample_rate: int = SAMPLE_RATE) -> list[float]:
    n = int(sample_rate * duration)
    return [math.sin(2 * math.pi * freq * t / sample_rate) for t in range(n)]

def envelope(samples: list[float], attack: float = 0.01, release: float = 0.05) -> list[float]:
    n = len(samples)
    at = int(n * attack)
    rt = int(n * release)
    out = samples[:]
    for i in range(at):
        out[i] *= i / at
    for i in range(rt):
        out[n - 1 - i] *= i / rt
    return out

def render_confirm() -> list[float]:
    beep = envelope(sine(660, 0.12))
    return [s * AMPLITUDE for s in beep]

def render_success() -> list[float]:
    tone1 = envelope(sine(523, 0.1))
    tone2 = envelope(sine(659, 0.1))
    tone3 = envelope(sine(784, 0.18))
    gap = [0.0] * int(SAMPLE_RATE * 0.04)
    raw = tone1 + gap + tone2 + gap + tone3
    return [s * AMPLITUDE for s in raw]

def main() -> None:
    base = os.path.join(os.path.dirname(__file__), "..", "public", "sounds")
    write_wav(os.path.join(base, "confirm.wav"), render_confirm())
    write_wav(os.path.join(base, "success.wav"), render_success())
    print(f"Generated placeholder WAVs in {os.path.abspath(base)}/")

if __name__ == "__main__":
    main()
