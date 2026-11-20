// node render.js <video> [fps] [stills]: renders stage.html?v=<video> to out/tiercraft-<video>.mp4 with the app's
// sound effects, or with stills ("1.0,5.5"), only PNGs of those instants. Run ./fetch-images.sh first.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const [video, fpsArg, stills] = process.argv.slice(2);
const fps = Number(fpsArg || 30);
const out = path.join(__dirname, 'out');
const SOUNDS = path.join(__dirname, '../../assets/sounds');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'stage.html') + '?v=' + video);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const meta = await page.evaluate(() => window.meta);
  if (stills) {
    for (const s of stills.split(',')) {
      await page.evaluate((t) => window.render(t), Number(s));
      await page.screenshot({ path: `${out}/${video}-${s}.png` });
    }
    return browser.close();
  }
  const silent = `${out}/${video}-silent.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(meta.duration * fps);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  const inputs = [], filters = [];
  meta.sfx.forEach(([name, t], i) => {
    inputs.push('-i', `${SOUNDS}/${name}.wav`);
    const ms = Math.round(t * 1000);
    filters.push(`[${i + 1}:a]adelay=${ms}|${ms},volume=0.9[a${i}]`);
  });
  const mix = meta.sfx.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${meta.sfx.length}:normalize=0,alimiter=limit=0.9,apad[aout]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, ...inputs, '-filter_complex', filters.concat(mix).join(';'),
    '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(meta.duration), '-movflags', '+faststart',
    `${out}/tiercraft-${video}.mp4`]);
  fs.unlinkSync(silent);
  console.log('done', video, frames, 'frames', meta.pct !== undefined ? `pct=${meta.pct}` : '');
})();
