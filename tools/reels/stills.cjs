// Imágenes fijas (PNG) de cada pantalla de un vídeo de la app: node tools/reels/stills.cjs taules [carpeta] [feed]
// (con «feed», 1080 × 1350 para las publicaciones de Instagram; si no, 1080 × 1920 como los vídeos)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const name = process.argv[2] || 'anunci';
const feed = process.argv[4] === 'feed';
const out = path.join(process.argv[3] || path.join(__dirname, 'out'), name + (feed ? '-feed' : '-imatges'));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 540, height: feed ? 675 : 960 }, deviceScaleFactor: 2 });
  await p.goto(`http://127.0.0.1:5174/tools/reels/anunci.html?v=${name}${feed ? '&f=feed' : ''}`);
  await p.waitForFunction(() => window.__reel); await p.evaluate(() => window.__reel.ready);
  for (const s of await p.evaluate(() => window.__reel.stills)) {
    await p.evaluate((ms) => window.__reel.render(ms), s.ms); await p.waitForTimeout(150);
    await p.locator('#stage').screenshot({ path: path.join(out, s.name + '.png') });
  }
  await b.close();
  console.log('OK', out);
})();
