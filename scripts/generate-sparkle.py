#!/usr/bin/env python3
"""Generates assets/sounds/sparkle.wav, the AI wand's sound: a quick rising run of bell
notes, like a glint. Same format as the other sounds (44.1 kHz, mono, 16 bits, peak
0.8), so the volumes in src/lib/sound.ts keep comparing like with like.

Usage: python3 scripts/generate-sparkle.py
"""
import math
import struct
import wave

RATE = 44100
# Pentatonic run, E6 to G7: no note clashes with the one before, it rises like a glint.
NOTES = [(0.000, 1319), (0.045, 1568), (0.090, 1976), (0.135, 2349), (0.185, 2637), (0.240, 3136)]
LENGTH = 0.65
ATTACK = 0.003
DECAY = 0.09  # seconds for a note to fall to 1/e

samples = [0.0] * int(RATE * LENGTH)
for k, (start, freq) in enumerate(NOTES):
    level = 1.0 - 0.08 * k  # the run thins out as it climbs
    for i in range(int(start * RATE), len(samples)):
        t = i / RATE - start
        env = min(1.0, t / ATTACK) * math.exp(-t / DECAY)
        if t > ATTACK and env < 1e-4:
            break
        # A bell's inharmonic partial (×2.76) is what makes it shimmer rather than beep.
        tone = math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(2 * math.pi * freq * 2.76 * t)
        samples[i] += level * env * tone

peak = max(abs(s) for s in samples)
with wave.open("assets/sounds/sparkle.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes(b"".join(struct.pack("<h", round(s / peak * 0.8 * 32767)) for s in samples))
