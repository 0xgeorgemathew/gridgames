"""Original synthetic arcade cues. Run from frontend; no external sound samples."""
import math
from pathlib import Path
import random
import struct
import wave

RATE = 22050
samples = [0.0] * int(RATE * 1.10)
rng = random.Random(4663)

def cue(offset, duration, kind, variant=0):
    phase = 0.0
    for i in range(int(duration * RATE)):
        t = i / RATE
        attack = min(1.0, t / 0.002)
        envelope = attack * (1 - t / duration) ** 2
        if kind == 'pending':
            frequency = [1120, 1040, 1170][variant] - 400 * t / duration
            phase += 2 * math.pi * frequency / RATE
            tone = 0.31 * math.sin(phase) + 0.10 * math.sin(phase * 2) + 0.15 * rng.uniform(-1, 1) * math.exp(-t * 90)
        elif kind == 'credited':
            frequency = 1000 if t < 0.065 else 1333
            phase += 2 * math.pi * frequency / RATE
            tone = 0.42 * math.sin(phase) + 0.05 * math.sin(phase * 3)
        elif kind == 'failed':
            phase += 2 * math.pi * (440 - 210 * t / duration) / RATE
            tone = 0.40 * math.sin(phase) + 0.07 * math.sin(phase * 2)
        else:
            phase += 2 * math.pi * 190 / RATE
            tone = 0.43 * math.sin(phase) + 0.08 * rng.uniform(-1, 1) * math.exp(-t * 130)
        samples[int(offset * RATE) + i] = tone * envelope

for v in range(3):
    cue(v * 0.16, 0.09, 'pending', v)
cue(0.48, 0.16, 'credited')
cue(0.72, 0.14, 'failed')
cue(0.94, 0.09, 'rejected')
path = Path(__file__).resolve().parents[1] / 'public/audio/stock-contact.wav'
with wave.open(str(path), 'wb') as out:
    out.setnchannels(1)
    out.setsampwidth(2)
    out.setframerate(RATE)
    out.writeframes(b''.join(struct.pack('<h', round(s * 32767)) for s in samples))
print(f'Generated {path.name}: {path.stat().st_size} bytes, original six-cue mono sprite')
