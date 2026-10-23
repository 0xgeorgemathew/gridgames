"""Original layered arcade cues. Run from frontend; no external samples."""
import math
from pathlib import Path
import random
import struct
import wave

RATE = 44100
samples = [0.0] * int(RATE * 1.85)
rng = random.Random(4663)


def cue(offset, duration, kind, variant=0):
    phase = body_phase = edge_phase = 0.0
    low = high = 0.0
    for i in range(int(duration * RATE)):
        t = i / RATE
        attack = min(1.0, t / 0.0015)
        release = min(1.0, (duration - t) / 0.018)
        noise = rng.uniform(-1, 1)
        low += 0.06 * (noise - low)
        high += 0.38 * (noise - high)
        band = high - low
        if kind == 'pending':
            # Weight at contact, a bright blade edge, then a smooth energy tail.
            # Variations change material color slightly, never imply a combo.
            body_phase += 2 * math.pi * (155 * math.exp(-t * 20) + 58) / RATE
            edge_phase += 2 * math.pi * ([1550, 1460, 1620][variant] * math.exp(-t * 16) + 420) / RATE
            tone = (0.65 * math.sin(body_phase) * math.exp(-t * 38)
                    + 0.27 * band * math.exp(-t * 23)
                    + 0.19 * math.sin(edge_phase) * math.exp(-t * 28)
                    + 0.09 * math.sin(edge_phase * 1.51) * math.exp(-t * 37))
            if t > 0.09:
                u = t - 0.09
                pulse = max(0, math.sin(2 * math.pi * 34 * u)) ** 4
                tone += 0.12 * band * pulse * math.exp(-u * 14)
        elif kind == 'credited':
            # Small, warm resolved interval; separate from the physical slice.
            tone = 0.32 * math.sin(2 * math.pi * 784 * t) * math.exp(-t * 20)
            if t >= 0.045:
                u = t - 0.045
                tone += 0.27 * math.sin(2 * math.pi * 1176 * u) * min(1, u / 0.004) * math.exp(-u * 22)
        elif kind == 'failed':
            phase += 2 * math.pi * (360 - 170 * t / duration) / RATE
            tone = (0.43 * math.sin(phase) + 0.12 * math.sin(phase * 1.5)) * math.exp(-t * 24)
        else:
            # Dry muted double tap: capacity refused, never a penalty alarm.
            u = t if t < 0.055 else t - 0.055
            tone = (0.5 * math.sin(2 * math.pi * 145 * u)
                    + 0.12 * band) * min(1, u / 0.0015) * math.exp(-u * 80)
        samples[int(offset * RATE) + i] = tone * attack * release


for v in range(3):
    cue(v * 0.35, 0.31, 'pending', v)
cue(1.05, 0.23, 'credited')
cue(1.35, 0.18, 'failed')
cue(1.60, 0.13, 'rejected')
path = Path(__file__).resolve().parents[1] / 'public/audio/stock-contact.wav'
with wave.open(str(path), 'wb') as out:
    out.setnchannels(1)
    out.setsampwidth(2)
    out.setframerate(RATE)
    out.writeframes(b''.join(struct.pack('<h', round(s * 32767)) for s in samples))
print(f'Generated {path.name}: {path.stat().st_size} bytes, original layered six-cue mono sprite')
