// Guarda las capturas de tools/bodymap.html (con el servidor de desarrollo en marcha en el puerto indicado).
// Uso: node tools/bodymap.cjs 5174 carpeta-de-salida
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [port = '5174', dir = 'tmp-bodymap', test = ''] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:${port}/tools/bodymap.html${test ? '?test=' + test : ''}`);
  await p.waitForFunction(() => document.body.dataset.done, null, { timeout: 120000 });
  const maps = await p.evaluate(() => window.maps);
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(maps)) fs.writeFileSync(`${dir}/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
  console.log(Object.keys(maps).join(' '));
  await b.close();
})();
