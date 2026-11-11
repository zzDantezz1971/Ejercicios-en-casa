/* Genera los iconos de la app (web y Android) a partir de tools/icono/dibujo.svg.txt:
   Kasa Fit: tejado dorado, K, FIT y los cuatro colores de los apartados. Uso: node tools/icono/generar.cjs */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const art = fs.readFileSync(path.join(__dirname, 'dibujo.svg.txt'), 'utf8');
const BG = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A1A1A"/><stop offset="1" stop-color="#000000"/></linearGradient></defs>';
// k: tamaño del dibujo (1 = icono normal); fondo: 'square' | 'none'
const svg = (k, fondo = 'square') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${BG}${fondo === 'square' ? '<rect width="512" height="512" fill="url(#g)"/>' : ''}` +
  `<g transform="translate(256 256) scale(${k}) translate(-256 -256)">${art}</g></svg>`;
const RES = path.join(root, 'android/app/src/main/res');
const DENS = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

(async () => {
  fs.writeFileSync(path.join(root, 'public/icon.svg'), svg(1));
  const b = await chromium.launch();
  const p = await b.newPage();
  // shape: 'square' (cuadrado), 'rounded' (cuadrado redondeado con margen), 'circle'
  const shot = async (file, size, k, shape, transparent = false) => {
    const inner = shape === 'rounded' ? size * 0.917 : size;
    const radius = shape === 'circle' ? '50%' : shape === 'rounded' ? `${inner * 0.18}px` : '0';
    const data = 'data:image/svg+xml;base64,' + Buffer.from(svg(k, transparent ? 'none' : 'square')).toString('base64');
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<body style="margin:0;background:transparent;display:grid;place-items:center;width:${size}px;height:${size}px">
      <img src="${data}" style="width:${inner}px;height:${inner}px;border-radius:${radius};display:block"></body>`);
    await p.waitForTimeout(50);
    await p.screenshot({ path: file, omitBackground: true });
  };
  await shot(path.join(root, 'public/icon-192.png'), 192, 1, 'square');
  await shot(path.join(root, 'public/icon-512.png'), 512, 1, 'square');
  // máscara de Android/PWA: el dibujo dentro de la zona segura (80 %)
  await shot(path.join(root, 'public/icon-maskable-512.png'), 512, 1.0, 'square');
  for (const [d, px] of Object.entries(DENS)) {
    await shot(`${RES}/mipmap-${d}/ic_launcher.png`, px, 1, 'rounded');
    await shot(`${RES}/mipmap-${d}/ic_launcher_round.png`, px, 0.82, 'circle');
    // icono adaptable: el dibujo solo, centrado y pequeño (Android recorta los bordes)
    await shot(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, px, 0.86, 'square', true);
  }
  await b.close();
  console.log('Iconos generados');
})();
