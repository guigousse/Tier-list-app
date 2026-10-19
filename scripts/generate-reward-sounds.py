#!/usr/bin/env python3
"""Generates the sound of a reward collected, in the format of the other sounds
(44.1 kHz, mono, 16 bits, peak 0.8, see generate-sparkle.py):
  assets/sounds/complete.wav  an item reaching the player's profile: three quick bell
                              notes going up (a major arpeggio), bright and short.

Usage: python3 scripts/generate-reward-sounds.py
"""
import math
import struct
import wave

RATE = 44100


def write(path, samples):
    peak = max(abs(s) for s in samples)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", round(s / peak * 0.8 * 32767)) for s in samples))


def bell(freq, t):
    # A bell: the note, a softer octave and a faint inharmonic partial, all fading out.
    return (
        math.sin(2 * math.pi * freq * t)
        + 0.35 * math.sin(2 * math.pi * freq * 2 * t) * math.exp(-t / 0.08)
        + 0.12 * math.sin(2 * math.pi * freq * 2.76 * t) * math.exp(-t / 0.05)
    )


def complete():
    length = 0.75
    n = int(RATE * length)
    out = [0.0] * n
    # C6, E6, G6 then C7: 70 ms apart, the last one ringing longer.
    notes = [(1046.5, 0.0, 0.12), (1318.5, 0.07, 0.12), (1568.0, 0.14, 0.14), (2093.0, 0.21, 0.32)]
    for freq, start, decay in notes:
        for i in range(int(start * RATE), n):
            t = i / RATE - start
            attack = min(1.0, t / 0.004)
            out[i] += 0.6 * attack * math.exp(-t / decay) * bell(freq, t)
    return out


if __name__ == "__main__":
    write("assets/sounds/complete.wav", complete())
