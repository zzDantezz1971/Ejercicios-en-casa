/* Herramienta de desarrollo: fotogramas de un Reel vertical (1080×1920) con el muñeco de la app haciendo un ejercicio.
   Uso: npm run dev y abrir /tools/reel.html?id=sentadilla-goblet-con-pesa-rusa&eyebrow=Exercici del dia&reps=3 × 40 s
   (el idioma es el de la app guardado en este navegador). window.frame(i) dibuja el fotograma i (a 30 por segundo)
   y devuelve la imagen; un script de Playwright los recoge y ffmpeg hace el vídeo. */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import * as THREE from 'three';
import { CATALOG } from '../src/data/catalog';
import { MannequinScene } from '../src/figure/Mannequin';
import { DEFAULT_ANGLES } from '../src/data/defaultAngles';
import { parseMuscles, MUSCLE_NAMES } from '../src/figure/anatomy';
import { EQUIP_INFO } from '../src/domain/equipment';
import { tr } from '../src/i18n';

const q = new URLSearchParams(location.search);
const ex = CATALOG.get(q.get('id') ?? 'sentadilla-goblet-con-pesa-rusa')!;
const W = 1080, H = 1920, FPS = 30;
const out = document.getElementById('out') as HTMLCanvasElement;
const g = out.getContext('2d')!;

// el muñeco, en un lienzo cuadrado grande
const SW = 1000, SH = 820;
const glc = document.createElement('canvas');
const r = new THREE.WebGLRenderer({ canvas: glc, antialias: true, alpha: true, preserveDrawingBuffer: true });
r.shadowMap.enabled = true;
r.shadowMap.type = THREE.PCFSoftShadowMap;
r.setSize(SW, SH, false);
const sc = new MannequinScene(ex.motion, undefined, undefined, undefined, undefined);
sc.setAspect(SW / SH);
sc.mood = 'effort';
sc.angleOffset = DEFAULT_ANGLES[ex.id] ?? 0;
sc.placeCamera();

const eyebrow = (q.get('eyebrow') ?? 'Exercici del dia').toUpperCase();
const name = tr(ex.name).toUpperCase();
const reps = q.get('reps') ?? '3 × 40 s';
const works = parseMuscles(ex.muscles).filter((m) => m.kind === 'work').map((m) => MUSCLE_NAMES[m.muscle]);
const equip = (ex.equip ?? []).map((x) => tr(EQUIP_INFO[x[0] as keyof typeof EQUIP_INFO].name));
const logo = new Image();
logo.src = '/icon-192.png';

function rr(x: number, y: number, w: number, h: number, rad: number) {
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}
function pill(text: string, x: number, y: number, color: string): number {
  g.font = '600 38px Barlow';
  const w = g.measureText(text).width + 56;
  rr(x, y, w, 72, 36);
  g.fillStyle = color;
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.textBaseline = 'middle';
  g.fillText(text, x + 28, y + 37);
  return w;
}

(window as unknown as { frame: (i: number) => string }).frame = (i: number) => {
  const t = i / FPS;
  // fondo como la app: oscuro con un brillo azul
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#121A33');
  bg.addColorStop(0.55, '#0A0D12');
  bg.addColorStop(1, '#0A0D12');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, 260, 0, W * 0.8, 260, 700);
  glow.addColorStop(0, 'rgba(61,107,255,.35)');
  glow.addColorStop(1, 'rgba(61,107,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // entrada suave de los textos (primer medio segundo)
  const k = Math.min(1, t / 0.5);
  g.globalAlpha = k;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#7FA0FF';
  g.font = '700 46px "Barlow Condensed"';
  g.fillText(eyebrow.split('').join(String.fromCharCode(8202)), 70, 300);
  g.fillStyle = '#FFFFFF';
  g.font = '700 104px "Barlow Condensed"';
  // nombre en una o dos líneas
  const words = name.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const tryL = cur ? cur + ' ' + w : w;
    if (g.measureText(tryL).width > W - 140 && cur) { lines.push(cur); cur = w; } else cur = tryL;
  }
  lines.push(cur);
  lines.forEach((l, n) => g.fillText(l, 70, 410 + n * 104));
  const top = 410 + (lines.length - 1) * 104 + 46;
  g.globalAlpha = 1;

  // el escenario con el muñeco
  const sx = 40, sy = top, sw = SW, sh = SH;
  rr(sx, sy, sw, sh, 48);
  const st = g.createLinearGradient(0, sy, 0, sy + sh);
  st.addColorStop(0, '#485261');
  st.addColorStop(1, '#282E37');
  g.fillStyle = st;
  g.fill();
  sc.update((t * 1000) % sc.motion.total);
  // el muñeco más grande que en la app (ocupa casi todo el escenario)
  sc.camera.zoom = 1.12;
  sc.camera.updateProjectionMatrix();
  r.render(sc.scene, sc.camera);
  g.save();
  rr(sx, sy, sw, sh, 48);
  g.clip();
  g.drawImage(glc, sx, sy, sw, sh);
  g.restore();

  // datos: series y tiempo, material y músculos
  let y = sy + sh + 40;
  let x = 70;
  x += pill(reps, x, y, '#3D6BFF') + 18;
  for (const e of equip) x += pill(e, x, y, '#2A3344') + 18;
  y += 125;
  g.fillStyle = '#E9455F';
  g.beginPath();
  g.arc(84, y - 14, 12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#C9D3E6';
  g.font = '500 42px Barlow';
  g.textBaseline = 'alphabetic';
  g.fillText(`${tr('Trabaja:')} ${works.join(', ')}`, 112, y);

  // pie: logo y nombre de la app
  // por encima de la franja de abajo, que Instagram tapa con el texto y los botones
  const fy = y + 50;
  if (logo.complete) {
    g.save();
    rr(70, fy, 100, 100, 24);
    g.clip();
    g.drawImage(logo, 70, fy, 100, 100);
    g.restore();
  }
  g.fillStyle = '#FFFFFF';
  g.font = '700 58px "Barlow Condensed"';
  g.fillText('KASA FIT', 196, fy + 52);
  g.fillStyle = '#9AA6BA';
  g.font = '500 36px Barlow';
  g.fillText(q.get('foot') ?? 'Entrena a casa · App per a Android', 196, fy + 96);
  const cols = ['#F58A3A', '#4A7BFF', '#E9467A', '#22C3A6'];
  cols.forEach((c, n) => { g.fillStyle = c; rr(W - 70 - (4 - n) * 58, fy + 44, 46, 10, 5); g.fill(); });
  return out.toDataURL('image/jpeg', 0.92);
};
await document.fonts.ready;
await new Promise((res) => (logo.complete ? res(0) : (logo.onload = () => res(0))));
document.body.dataset.ready = String(Math.round((sc.motion.total / 1000) * FPS));
