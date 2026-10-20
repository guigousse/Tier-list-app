#!/usr/bin/env python3
"""Generates the sounds of the welcome story, in the format of the others (44.1 kHz,
mono, 16 bits, peak 0.8), so the volumes in src/lib/sound.ts keep comparing like with like:

- assets/sounds/key.wav: a soft key of a phone keyboard, for each letter typed.
- assets/sounds/whoosh.wav: a short airy sweep, for a sheet or a panel sliding in.
- assets/sounds/notify.wav: a two-note chime, for a friend's answer arriving.

Usage: python3 scripts/generate-story-sounds.py
"""
import math
import random
import struct
import wave

RATE = 44100
random.seed(7)  # the same files at each run


def write(path, samples):
    peak = max(abs(s) for s in samples)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", round(s / peak * 0.8 * 32767)) for s in samples))


def key():
    # A muted tap: a low body thump and a click of filtered noise, gone in 40 ms.
    n = int(RATE * 0.04)
    out, low = [], 0.0
    for i in range(n):
        t = i / RATE
        noise = random.uniform(-1, 1)
        low += 0.35 * (noise - low)  # one-pole low-pass: softer than white noise
        body = math.sin(2 * math.pi * 180 * t) * math.exp(-t / 0.008)
        out.append((0.6 * low + 0.7 * body) * math.exp(-t / 0.006))
    return out


def whoosh():
    # Noise through a resonant band-pass whose centre sweeps up then down, swelling and fading.
    n = int(RATE * 0.38)
    out, y1, y2 = [], 0.0, 0.0
    for i in range(n):
        p = i / n
        centre = 500 + 2200 * math.sin(math.pi * p) ** 2
        r = 0.97
        theta = 2 * math.pi * centre / RATE
        x = random.uniform(-1, 1)
        y = x * (1 - r) + 2 * r * math.cos(theta) * y1 - r * r * y2
        y2, y1 = y1, y
        out.append(y * math.sin(math.pi * p) ** 1.5)
    return out


def notify():
    # G5 then C6, marimba-like: a fundamental with a soft 4th partial, each note ringing out.
    n = int(RATE * 0.7)
    out = [0.0] * n
    for start, freq in ((0.0, 784), (0.11, 1047)):
        for i in range(int(start * RATE), n):
            t = i / RATE - start
            env = min(1.0, t / 0.004) * math.exp(-t / 0.16)
            out[i] += env * (math.sin(2 * math.pi * freq * t) + 0.25 * math.sin(2 * math.pi * freq * 4 * t) * math.exp(-t / 0.03))
    return out


write("assets/sounds/key.wav", key())
write("assets/sounds/whoosh.wav", whoosh())
write("assets/sounds/notify.wav", notify())
