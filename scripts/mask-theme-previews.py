"""Second step of scripts/bake-theme-previews.cjs: each capture cut to its circle (the
corners transparent, whatever the screen behind), and src/constants/themePreviews.ts
written so the app ships them.  python3 scripts/mask-theme-previews.py"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..')
DIR = os.path.join(ROOT, 'assets', 'themes')
keys = sorted(f[:-4] for f in os.listdir(DIR) if f.endswith('.png'))
for key in keys:
    path = os.path.join(DIR, f'{key}.png')
    img = Image.open(path).convert('RGBA')
    side = min(img.size)
    img = img.crop((0, 0, side, side))
    # Drawn 4 times larger then reduced: a smooth edge.
    mask = Image.new('L', (side * 4, side * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, side * 4 - 1, side * 4 - 1), fill=255)
    img.putalpha(mask.resize((side, side), Image.LANCZOS))
    img.save(path, optimize=True)
    print(key, img.size, os.path.getsize(path) // 1024, 'Ko')

lines = [
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    '// Written by scripts/bake-theme-previews.cjs: the baked circle of each grand theme.',
    'export const THEME_PREVIEWS: Record<string, ImageSourcePropType> = {',
    *[f"  {k}: require('../../assets/themes/{k}.png')," for k in keys],
    '};',
    '',
]
open(os.path.join(ROOT, 'src', 'constants', 'themePreviews.ts'), 'w').write('\n'.join(lines))
