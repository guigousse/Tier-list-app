"""Generates the Tiercraft app icons from code.

Usage: python3 scripts/generate-icons.py  (requires Pillow)

The mark is four stacked tier bars (S, A, B, C) of decreasing width with a
sparkle next to the S tier, on a deep violet background.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SS = 4  # supersampling factor

BG_TOP = (44, 28, 102)
BG_BOTTOM = (15, 17, 21)
GLOW = (124, 92, 255)
TIERS = [(255, 127, 127), (255, 191, 127), (255, 223, 127), (191, 255, 127)]
WIDTHS = [1.0, 0.78, 0.58, 0.40]


def background(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        row = tuple(round(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM))
        for x in range(size):
            px[x, y] = row
    glow = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(glow)
    r = size * 0.42
    cx, cy = size * 0.30, size * 0.22
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=150)
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.16))
    return Image.composite(Image.new("RGB", (size, size), GLOW), img, glow)


def sparkle(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill) -> None:
    w = r * 0.28
    d.polygon([(cx, cy - r), (cx + w, cy - w), (cx + r, cy), (cx + w, cy + w),
               (cx, cy + r), (cx - w, cy + w), (cx - r, cy), (cx - w, cy - w)], fill=fill)


def mark(size: int, box: float, mono: bool = False, shadow: bool = True) -> Image.Image:
    """Transparent image of `size` with the mark fitting in a centred square of `box` * size."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    span = s * box
    full = span * 0.84
    left = (s - full) / 2
    bar_h = span * 0.17
    gap = span * 0.06
    total = 4 * bar_h + 3 * gap
    top = (s - total) / 2 + span * 0.07

    if shadow and not mono:
        sh = Image.new("L", (s, s), 0)
        sd = ImageDraw.Draw(sh)
        for i, w in enumerate(WIDTHS):
            y = top + i * (bar_h + gap) + span * 0.03
            sd.rounded_rectangle((left, y, left + full * w, y + bar_h), radius=bar_h * 0.32, fill=140)
        sh = sh.filter(ImageFilter.GaussianBlur(span * 0.03))
        img.paste((0, 0, 0, 255), (0, 0), sh)

    d = ImageDraw.Draw(img)
    for i, (w, c) in enumerate(zip(WIDTHS, TIERS)):
        y = top + i * (bar_h + gap)
        fill = (255, 255, 255, 255) if mono else c + (255,)
        d.rounded_rectangle((left, y, left + full * w, y + bar_h), radius=bar_h * 0.32, fill=fill)

    star_fill = (255, 255, 255, 255)
    sparkle(d, left + full * 0.80, top - span * 0.115, span * 0.085, star_fill)
    sparkle(d, left + full * 0.97, top - span * 0.20, span * 0.042, star_fill)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    icon = background(1024).convert("RGBA")
    icon.alpha_composite(mark(1024, 0.74))
    icon.convert("RGB").save(ASSETS / "icon.png")

    mark(1024, 0.62).save(ASSETS / "splash-icon.png")

    # Android adaptive icon: keep the mark inside the 66% safe zone.
    mark(512, 0.56).save(ASSETS / "android-icon-foreground.png")
    background(512).save(ASSETS / "android-icon-background.png")
    mark(432, 0.56, mono=True, shadow=False).save(ASSETS / "android-icon-monochrome.png")

    fav = background(192).convert("RGBA")
    fav.alpha_composite(mark(192, 0.80, shadow=False))
    fav.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")


if __name__ == "__main__":
    main()
