// Bakes the circle of each grand theme (the sticker bomb of src/components/ThemeGallery.tsx)
// into a PNG shipped with the app (assets/themes/), so the gallery of public lists shows
// at once instead of loading twenty images per theme.
//
// Run again after the library drew new pictures, or the patchworks changed:
//   CI=1 npx expo start --web --port 8081 &       (wait until it answers)
//   NODE_PATH=$(npm root -g) node scripts/bake-theme-previews.cjs
//   python3 scripts/mask-theme-previews.py      (cuts the circles, lists them for the app)
// Needs Playwright (preinstalled in the cloud sessions).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'assets', 'themes');
const URL = process.env.BAKE_URL ?? 'http://localhost:8081/popular';
// 4× the circle's size on a 390-point phone: sharp on every iPhone and on the iPad column.
const SCALE = 4;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: SCALE });
  // The welcome screens seen, and the live collage drawn (not the baked one being replaced).
  await page.addInitScript(() => {
    localStorage.setItem('tiercraft-store', JSON.stringify({ state: { settings: { onboarded: true } }, version: 7 }));
    window.__BAKING_THEMES__ = true;
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  // The catalogue answers, then every sticker image loads.
  await page.waitForFunction(() => document.querySelectorAll('[data-testid^="theme-circle-"]').length > 0, null, { timeout: 60_000 });
  // React Native Web draws images as backgrounds, not <img>: wait for the network to rest
  // (the catalogue, then the ~170 sticker pictures), with a margin for the last paints.
  await page.waitForLoadState('networkidle', { timeout: 120_000 });
  await page.waitForTimeout(15_000);
  await page.waitForLoadState('networkidle', { timeout: 120_000 });
  await page.waitForTimeout(3000);
  const circles = await page.$$('[data-testid^="theme-circle-"]');
  for (const circle of circles) {
    const key = (await circle.getAttribute('data-testid')).replace('theme-circle-', '');
    await circle.screenshot({ path: path.join(OUT, `${key}.png`), omitBackground: true });
    console.log(`${key}.png`);
  }
  await browser.close();
})();
