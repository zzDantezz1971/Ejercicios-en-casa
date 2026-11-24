// Graba un reel a 1080×1920 y 30 fps: node tools/reels/record.cjs presentacio [carpeta]
// (con el servidor de desarrollo en marcha: npx vite --port 5174 --strictPort --host 127.0.0.1)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const name = process.argv[2] || 'presentacio';
const out = process.argv[3] || path.join(__dirname, 'out');
(async () => {
  const frames = path.join(out, name + '-frames');
  fs.mkdirSync(frames, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  // hola: el de Fit; anunci y los de la app (taules…): anunci.html?v=…; el resto, reel.html?r=…
  const VIDEOS = ['anunci', 'taules', 'publi', 'entreno'];
  await p.goto(name === 'hola' ? 'http://127.0.0.1:5174/tools/reels/hola.html' : VIDEOS.includes(name) ? `http://127.0.0.1:5174/tools/reels/anunci.html?v=${name}` : `http://127.0.0.1:5174/tools/reels/reel.html?r=${name}`);
  await p.waitForFunction(() => window.__reel);
  await p.evaluate(() => window.__reel.ready);
  const total = await p.evaluate(() => window.__reel.total);
  const n = Math.round((total / 1000) * 30);
  const stage = p.locator('#stage');
  for (let f = 0; f < n; f++) {
    await p.evaluate((ms) => window.__reel.render(ms), (f * 1000) / 30);
    await stage.screenshot({ path: path.join(frames, String(f).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92 });
    if (f % 60 === 0) console.log(`${f}/${n}`);
  }
  await b.close();
  const mp4 = path.join(out, name + '.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(frames, '%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
  console.log('OK', mp4);
})();
