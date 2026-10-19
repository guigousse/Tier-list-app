// Renders panorama.html and cuts it into the App Store screenshots (1320 × 2868).
// Usage: node scripts/store-screenshots/render.mjs
// Needs Playwright; set CHROMIUM_PATH to use a specific Chromium build.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../store/screenshots');
const names = ['1-classez', '2-classement', '3-du-jour', '4-comparatif', '5-personnalisation', '6-partage'];
const [W, H] = [1320, 2868];

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W * names.length, height: H } });
await page.goto(pathToFileURL(join(here, 'panorama.html')).href);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
for (const [i, name] of names.entries()) {
  await page.screenshot({ path: join(out, `${name}.png`), clip: { x: i * W, y: 0, width: W, height: H } });
}
await browser.close();
