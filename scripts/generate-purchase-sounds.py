#!/usr/bin/env python3
"""Generates the sounds of a pack bought in the shop, in the format of the other sounds
(44.1 kHz, mono, 16 bits, peak 0.8, see generate-sparkle.py):
  assets/sounds/thunder.wav  the bolt striking: a sharp crack, then a short rumble;
  assets/sounds/coin.wav     one coin of the slot machine, played again and again while
                             the balance counts up, so it stays short and bright.

Usage: python3 scripts/generate-purchase-sounds.py
"""
import math
import random
import struct
import wave

RATE = 44100
random.seed(7)  # the same file at every run


def write(path, samples):
    peak = max(abs(s) for s in samples)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", round(s / peak * 0.8 * 32767)) for s in samples))


def thunder():
    length = 1.3
    n = int(RATE * length)
    out = [0.0] * n
    # Crack: white noise, high-passed (difference of samples), gone in ~80 ms, with a few
    # later snaps so it crackles instead of clicking once.
    prev = 0.0
    snaps = [0.0, 0.035, 0.07, 0.12]
    for i in range(n):
        t = i / RATE
        white = random.uniform(-1, 1)
        hp = white - prev
        prev = white
        env = sum(math.exp(-(t - s) / 0.02) for s in snaps if t >= s)
        out[i] += 0.9 * hp * min(env, 1.5)
    # Rumble: noise low-passed twice (≈ 60–150 Hz), swelling after the crack, then dying.
    lp1 = lp2 = 0.0
    a = 1 - math.exp(-2 * math.pi * 140 / RATE)
    for i in range(n):
        t = i / RATE
        lp1 += a * (random.uniform(-1, 1) - lp1)
        lp2 += a * (lp1 - lp2)
        swell = min(1.0, t / 0.08) * math.exp(-t / 0.45)
        out[i] += 9.0 * lp2 * swell
    # The last 40 ms fade to nothing: no click at the end of the file.
    for i in range(n - int(0.04 * RATE), n):
        out[i] *= (n - i) / (0.04 * RATE)
    return out


def coin():
    length = 0.22
    n = int(RATE * length)
    out = [0.0] * n
    # Two quick notes, B6 then E7, like a coin landing in the tray; the inharmonic
    # partials (×2.76, ×5.4) make it ring like metal rather than beep.
    for start, freq in [(0.0, 1976), (0.045, 2637)]:
        for i in range(int(start * RATE), n):
            t = i / RATE - start
            env = min(1.0, t / 0.002) * math.exp(-t / 0.05)
            tone = math.sin(2 * math.pi * freq * t) + 0.35 * math.sin(2 * math.pi * freq * 2.76 * t) + 0.12 * math.sin(2 * math.pi * freq * 5.4 * t)
            out[i] += env * tone
    return out


write("assets/sounds/thunder.wav", thunder())
write("assets/sounds/coin.wav", coin())
