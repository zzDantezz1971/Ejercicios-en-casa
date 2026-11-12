// Guarda las matrices de los huesos del mapa (postura de los resúmenes) en tools/bodymap/huesos.json.
// Uso (con npm run dev en marcha): node tools/bodymap/export_bones.cjs 5174
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const port = process.argv[2] || '5174';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  await p.goto(`http://127.0.0.1:${port}/tools/bodymap.html?skin=new&export=1`);
  await p.waitForFunction(() => document.body.dataset.done, null, { timeout: 600000 });
  fs.writeFileSync(__dirname + '/huesos.json', JSON.stringify(await p.evaluate(() => window.bones)));
  console.log('ok');
  await b.close();
})();
