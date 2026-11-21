/* Herramienta de desarrollo: vídeo promocional «Despertador» con Fit (el muñeco de Kasa Fit), en vertical 1080×1920.
   Uso: npm run dev y abrir /tools/promo.html?sleep=<id ejercicio tumbado> (idioma: el de la app en este navegador).
   window.frame(i) dibuja el fotograma i (30 por segundo); body.dataset.frames dice cuántos hay. */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import * as THREE from 'three';
import { CATALOG } from '../src/data/catalog';
import { MannequinScene, type Mood } from '../src/figure/Mannequin';
import { DEFAULT_ANGLES } from '../src/data/defaultAngles';
import { SECTION_TITLES, type SectionId } from '../src/domain/types';
import { tr } from '../src/i18n';

const q = new URLSearchParams(location.search);
const W = 1080, H = 1920, FPS = 30;
const out = document.getElementById('out') as HTMLCanvasElement;
const g = out.getContext('2d')!;
const SW = 1000, SH = 1100;
const glc = document.createElement('canvas');
const r = new THREE.WebGLRenderer({ canvas: glc, antialias: true, alpha: true, preserveDrawingBuffer: true });
r.shadowMap.enabled = true;
r.shadowMap.type = THREE.PCFSoftShadowMap;
r.setSize(SW, SH, false);

const SEC_COLOR: Record<SectionId, string> = { calentamiento: '#F58A3A', pesas: '#4A7BFF', abdominales: '#E9467A', estiramientos: '#22C3A6' };
const scenes = new Map<string, MannequinScene>();
function scene(id: string): MannequinScene {
  let sc = scenes.get(id);
  if (!sc) {
    const ex = CATALOG.get(id)!;
    sc = new MannequinScene(ex.motion, undefined, undefined, undefined, undefined);
    sc.setAspect(SW / SH);
    sc.angleOffset = DEFAULT_ANGLES[id] ?? 0;
    sc.placeCamera();
    scenes.set(id, sc);
  }
  return sc;
}
/** Tiempo del vídeo en ms (para la respiración y el parpadeo). */
let clock = 0;
/** Dibuja a Fit haciendo un ejercicio en el instante `ms` (con una cara y un zum). */
function fit(id: string, ms: number, mood: Mood, zoom: number, eyesClosed = false): void {
  const sc = scene(id);
  sc.mood = mood;
  // ojos cerrados: el parpadeo se queda fijo (dormido)
  // el reloj del vídeo (no el real): respiración y parpadeo iguales cada vez que se genera
  if (eyesClosed) (sc as unknown as { blinkOffset: number }).blinkOffset = 4300 - (clock % 4300) + 20;
  sc.update(ms, clock);
  sc.camera.zoom = zoom;
  sc.camera.updateProjectionMatrix();
  r.render(sc.scene, sc.camera);
}

function rr(x: number, y: number, w: number, h: number, rad: number) {
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function text(s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center', alpha = 1) {
  g.globalAlpha = alpha;
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
  g.globalAlpha = 1;
  g.textAlign = 'left';
}
function background(night: number) {
  // de la noche (azul muy oscuro) al día (con el brillo azul de la app)
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, night > 0.5 ? '#070A16' : '#121A33');
  bg.addColorStop(0.6, '#0A0D12');
  bg.addColorStop(1, '#0A0D12');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.75, 300, 0, W * 0.75, 300, 760);
  glow.addColorStop(0, `rgba(61,107,255,${0.38 * (1 - night)})`);
  glow.addColorStop(1, 'rgba(61,107,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
}
/** El escenario gris de la app con Fit dentro. */
function stage(y: number, h: number, shake = 0) {
  const x = 40, w = W - 80;
  g.save();
  g.translate(shake ? (Math.random() - 0.5) * shake : 0, shake ? (Math.random() - 0.5) * shake : 0);
  rr(x, y, w, h, 48);
  const st = g.createLinearGradient(0, y, 0, y + h);
  st.addColorStop(0, '#485261');
  st.addColorStop(1, '#282E37');
  g.fillStyle = st;
  g.fill();
  rr(x, y, w, h, 48);
  g.clip();
  g.drawImage(glc, x, y, w, h);
  g.restore();
}
function alarm(cx: number, cy: number, t: number, ringing: boolean) {
  const a = ringing ? Math.sin(t * 60) * 0.18 : 0;
  g.save();
  g.translate(cx, cy);
  g.rotate(a);
  g.fillStyle = '#F5C04A';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 46, -52, 24, 0, Math.PI * 2); g.fill(); }
  g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#121722';
  g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#F5C04A'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -38); g.moveTo(0, 0); g.lineTo(26, 0); g.stroke();
  g.restore();
  if (ringing) {
    g.strokeStyle = 'rgba(245,192,74,.8)'; g.lineWidth = 7;
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      g.beginPath(); g.arc(cx, cy, 100 + k * 26, s < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, s < 0 ? Math.PI * 1.2 : Math.PI * 0.2); g.stroke();
    }
  }
}
const logo = new Image();
logo.src = '/icon-512.png';

// guion
const SLEEP = q.get('sleep') ?? 'torsion-lumbar-tumbado';
const MOVES: Array<{ id: string; sec: SectionId }> = [
  { id: 'saltos-de-tijera-jumping-jacks', sec: 'calentamiento' },
  { id: 'swing-con-pesa-rusa', sec: 'pesas' },
  { id: 'escaladores', sec: 'abdominales' },
  { id: 'gato-camello', sec: 'estiramientos' },
];
const T_SLEEP = 2.4, T_FLASH = 0.35, T_MOVE = 1.5, T_WIN = 2.0, T_END = 2.6;
const T_MOVES = T_SLEEP + T_FLASH;
const T_WIN0 = T_MOVES + MOVES.length * T_MOVE;
const T_END0 = T_WIN0 + T_WIN;
const TOTAL = T_END0 + T_END;
const day = (q.get('day') ?? 'Dilluns, 7:00 h').toUpperCase();
const hello = (q.get('hello') ?? 'Bon dia, Fit!').toUpperCase();
const winTxt = (q.get('win') ?? 'Activat en 10 minuts').toUpperCase();
const slogan = q.get('slogan') ?? 'Entrena a casa en segons';
const soon = q.get('soon') ?? 'Aviat a Google Play';
const confetti = Array.from({ length: 60 }, (_, i) => ({ x: Math.random() * W, d: Math.random() * 0.6, s: 300 + Math.random() * 500, c: Object.values(SEC_COLOR)[i % 4], r: Math.random() * 6 }));

(window as unknown as { frame: (i: number) => string }).frame = (i: number) => {
  const t = i / FPS;
  clock = t * 1000;
  const stY = 470, stH = 1100;
  if (t < T_SLEEP) {
    // 1 · Fit duerme; suena el despertador
    background(1);
    const ring = t > 0.7;
    alarm(W / 2, 250, t, ring);
    text(day, W / 2, 430, '700 64px "Barlow Condensed"', '#C9D3E6', 'center', ease(t / 0.4));
    fit(SLEEP, 0, 'relaxed', 1.05, true);
    stage(stY, stH, ring ? 6 : 0);
    // «Z z z» que suben
    for (let k = 0; k < 3; k++) {
      const p = ((t * 0.7 + k / 3) % 1);
      text('Z', 640 + k * 40 + p * 60, stY + 420 - p * 260, `700 ${50 + k * 16}px "Barlow Condensed"`, '#FFFFFF', 'center', (1 - p) * (ring ? 0.4 : 0.9));
    }
  } else if (t < T_MOVES) {
    // 2 · se despierta de golpe: destello
    background(0);
    fit(MOVES[0].id, 0, 'happy', 1.0);
    stage(stY, stH);
    const k = (t - T_SLEEP) / T_FLASH;
    g.fillStyle = `rgba(255,255,255,${1 - k})`;
    g.fillRect(0, 0, W, H);
    text(hello, W / 2, 360, '700 120px "Barlow Condensed"', '#FFFFFF', 'center', ease(k * 2));
  } else if (t < T_WIN0) {
    // 3 · los cuatro bloques, uno detrás de otro
    background(0);
    const n = Math.min(MOVES.length - 1, Math.floor((t - T_MOVES) / T_MOVE));
    const lt = t - T_MOVES - n * T_MOVE;
    const m = MOVES[n];
    const punch = 1.08 - 0.08 * ease(lt / 0.25);
    fit(m.id, lt * 1000 * 1.25 + 300, 'effort', punch);
    stage(stY, stH);
    text(hello, W / 2, 230, '700 84px "Barlow Condensed"', '#FFFFFF', 'center');
    // nombre del bloque con su color
    const label = tr(SECTION_TITLES[m.sec]).toUpperCase();
    g.font = '700 70px "Barlow Condensed"';
    const lw = g.measureText(label).width + 90;
    const lx = W / 2 - lw / 2, ly = 300 + (1 - ease(lt / 0.2)) * 30;
    g.globalAlpha = ease(lt / 0.2);
    rr(lx, ly, lw, 110, 55); g.fillStyle = SEC_COLOR[m.sec]; g.fill();
    g.globalAlpha = 1;
    text(label, W / 2, ly + 80, '700 70px "Barlow Condensed"', '#FFFFFF', 'center', ease(lt / 0.2));
    // barras de colores (las del logo) que se van llenando
    const bw = (W - 140 - 3 * 18) / 4;
    MOVES.forEach((mm, k) => {
      const bx = 70 + k * (bw + 18), by = stY + stH + 60;
      rr(bx, by, bw, 22, 11); g.fillStyle = '#1C2333'; g.fill();
      const f = k < n ? 1 : k === n ? Math.min(1, lt / T_MOVE) : 0;
      if (f > 0) { rr(bx, by, Math.max(22, bw * f), 22, 11); g.fillStyle = SEC_COLOR[mm.sec]; g.fill(); }
    });
  } else if (t < T_END0) {
    // 4 · ¡conseguido! (cara de alegría, brazos arriba y confeti)
    background(0);
    const jj = scene(MOVES[0].id);
    fit(MOVES[0].id, jj.motion.total * 0.5, 'happy', 1.0);
    stage(stY, stH);
    const lt = t - T_WIN0;
    text(winTxt, W / 2, 330, '700 96px "Barlow Condensed"', '#FFFFFF', 'center', ease(lt / 0.3));
    for (const c of confetti) {
      const p = lt - c.d;
      if (p < 0) continue;
      g.fillStyle = c.c;
      g.save(); g.translate(c.x, -40 + p * c.s); g.rotate(p * 6 + c.r); g.fillRect(-10, -5, 20, 10); g.restore();
    }
    const bw = (W - 140 - 3 * 18) / 4;
    MOVES.forEach((mm, k) => { const bx = 70 + k * (bw + 18), by = stY + stH + 60; rr(bx, by, bw, 22, 11); g.fillStyle = SEC_COLOR[mm.sec]; g.fill(); });
  } else {
    // 5 · final: logo y marca
    background(0);
    const lt = t - T_END0;
    const k = ease(lt / 0.5);
    const s = 360 * (0.8 + 0.2 * k);
    g.globalAlpha = k;
    g.save(); rr(W / 2 - s / 2, 560 - s / 2 + 180, s, s, s * 0.22); g.clip(); g.drawImage(logo, W / 2 - s / 2, 560 - s / 2 + 180, s, s); g.restore();
    g.globalAlpha = 1;
    text('KASA FIT', W / 2, 1130, '700 150px "Barlow Condensed"', '#FFFFFF', 'center', k);
    text(slogan, W / 2, 1220, '500 54px Barlow', '#C9D3E6', 'center', ease((lt - 0.3) / 0.5));
    const k2 = ease((lt - 0.7) / 0.5);
    g.font = '600 48px Barlow';
    const pw = g.measureText(soon).width + 100;
    g.globalAlpha = k2; rr(W / 2 - pw / 2, 1300, pw, 100, 50); g.fillStyle = '#3D6BFF'; g.fill(); g.globalAlpha = 1;
    text(soon, W / 2, 1366, '600 48px Barlow', '#FFFFFF', 'center', k2);
    const bw = 70;
    Object.values(SEC_COLOR).forEach((c, n) => { g.globalAlpha = k; rr(W / 2 - 2 * bw - 27 + n * (bw + 18), 1460, bw, 14, 7); g.fillStyle = c; g.fill(); g.globalAlpha = 1; });
  }
  return out.toDataURL('image/jpeg', 0.92);
};
// las letras se cargan antes del primer fotograma (si no, los primeros salen con otra letra)
await Promise.all(['700 64px "Barlow Condensed"', '500 54px Barlow', '600 48px Barlow'].map((f) => document.fonts.load(f)));
await document.fonts.ready;
await new Promise((res) => (logo.complete ? res(0) : (logo.onload = () => res(0))));
document.body.dataset.frames = String(Math.round(TOTAL * FPS));
