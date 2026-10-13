"""Generates the Tiercraft app icons from code.

Usage: python3 scripts/generate-icons.py  (requires Pillow)

The mark is five tier bars (S to D), each starting with its letter, laid out
to draw a C with a sparkle in its opening, on a deep violet background.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SS = 4  # supersampling factor

BG_TOP = (44, 28, 102)
BG_BOTTOM = (15, 17, 21)
GLOW = (124, 92, 255)
TIERS = [(255, 127, 127), (255, 191, 127), (255, 223, 127), (255, 255, 127), (191, 255, 127)]
LETTERS = "SABCD"
# (left edge, right edge) of each bar as a fraction of the mark width: together they draw a "C".
BARS = [(0.16, 0.96), (0.04, 0.60), (0.0, 0.50), (0.04, 0.60), (0.16, 0.96)]
FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"


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
    x0 = (s - span) / 2
    bar_h = span * 0.15
    gap = span * 0.055
    top = (s - (5 * bar_h + 4 * gap)) / 2
    font = ImageFont.truetype(FONT, round(bar_h * 0.72))

    def rect(i: int):
        left, right = BARS[i]
        y = top + i * (bar_h + gap)
        return (x0 + span * left, y, x0 + span * right, y + bar_h)

    if shadow and not mono:
        sh = Image.new("L", (s, s), 0)
        sd = ImageDraw.Draw(sh)
        for i in range(5):
            a, b, c, e = rect(i)
            sd.rounded_rectangle((a, b + span * 0.025, c, e + span * 0.025), radius=bar_h * 0.3, fill=140)
        sh = sh.filter(ImageFilter.GaussianBlur(span * 0.025))
        img.paste((0, 0, 0, 255), (0, 0), sh)

    d = ImageDraw.Draw(img)
    for i, (letter, color) in enumerate(zip(LETTERS, TIERS)):
        a, b, c, e = rect(i)
        d.rounded_rectangle((a, b, c, e), radius=bar_h * 0.3, fill=(255, 255, 255, 255) if mono else color + (255,))
        cx, cy = a + bar_h * 0.55, (b + e) / 2
        if mono:
            # Punch the letter out of the bar so it stays readable as a silhouette.
            m = Image.new("L", (s, s), 0)
            ImageDraw.Draw(m).text((cx, cy), letter, font=font, fill=255, anchor="mm")
            img.paste((0, 0, 0, 0), (0, 0), m)
        else:
            # Darker label cell at the start of the bar, like a tier list row header.
            shade = tuple(round(v * 0.80) for v in color) + (255,)
            d.rounded_rectangle((a, b, a + bar_h * 1.1, e), radius=bar_h * 0.3, corners=(True, False, False, True), fill=shade)
            d.text((cx, cy), letter, font=font, fill=(26, 20, 40, 255), anchor="mm")

    sparkle(d, x0 + span * 0.86, top + 2.5 * bar_h + 2 * gap, span * 0.08, (255, 255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    icon = background(1024).convert("RGBA")
    icon.alpha_composite(mark(1024, 0.78))
    icon.convert("RGB").save(ASSETS / "icon.png")

    mark(1024, 0.62).save(ASSETS / "splash-icon.png")

    # Android adaptive icon: keep the mark inside the 66% safe zone.
    mark(512, 0.56).save(ASSETS / "android-icon-foreground.png")
    background(512).save(ASSETS / "android-icon-background.png")
    mark(432, 0.56, mono=True, shadow=False).save(ASSETS / "android-icon-monochrome.png")

    fav = background(192).convert("RGBA")
    fav.alpha_composite(mark(192, 0.84, shadow=False))
    fav.resize((48, 48), Image.LANCZOS).save(ASSETS / "favicon.png")


if __name__ == "__main__":
    main()
