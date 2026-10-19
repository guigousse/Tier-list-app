"""Generates the Tiercraft app icons from code.

Usage: python3 scripts/generate-icons.py  (requires Pillow)

The mark is five tier bars (S to D), each starting with its letter, getting
longer from S to D, with a crown at the end of S and a poop at the end of D, on
a deep violet background.
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
# (left edge, right edge) of each bar as a fraction of the mark width: S shortest, D longest.
BARS = [(0.0, 0.42), (0.0, 0.56), (0.0, 0.70), (0.0, 0.84), (0.0, 0.98)]
# Sticker drawn at the end of a bar (tier index → image in scripts/icon-parts, rendered
# from the .svg next to it).
PARTS = Path(__file__).resolve().parent / "icon-parts"
BAR_STICKERS = {0: "crown.png", 4: "poop.png"}
FONT = "/usr/share/fonts/opentype/inter/Inter-Black.otf"


def sticker(name: str, px: int) -> Image.Image:
    """The sticker fitted (aspect kept) in a `px` square, centred."""
    img = Image.open(PARTS / name).convert("RGBA")
    img = img.crop(img.getbbox())
    scale = px / max(img.size)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    out = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    out.alpha_composite(img, ((px - img.width) // 2, (px - img.height) // 2))
    return out


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

    if not mono:
        for i, name in BAR_STICKERS.items():
            a, b, c, e = rect(i)
            px = round(bar_h * 1.5)
            # Centred on the end of the bar, overflowing it like a sticker.
            img.alpha_composite(sticker(name, px), (round(c - px * 0.6), round((b + e) / 2 - px * 0.55)))
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
