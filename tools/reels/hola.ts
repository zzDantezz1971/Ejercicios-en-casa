/*
 * Vídeo de presentación: Fit entra caminando por un lado de la habitación, se gira, se acerca a la cámara, saluda y
 * «habla» con bocadillos de cómic (sin voz). Acaba sacando bíceps y con la pantalla final.
 * Se graba igual que los otros: node tools/reels/record.cjs hola <carpeta>.
 */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import * as THREE from 'three';
import { MannequinScene } from '../../src/figure/Mannequin';
import { setLook } from '../../src/figure/look';
import type { MotionSpec } from '../../src/domain/types';
import { roomRig } from './room';

setLook({ skin: '#C68B62', shirt: '#2F5BEA', shorts: '#7A1F2B', shoe: '#E5484D', glasses: 'sun', beard: 'stubble', hair: 'none', top: 'tank', bottom: 'leggings' }, () => true);

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(540, 960, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── el guion (ms) ──────────────────────────────────────────────────────────────
const T = {
  walkEnd: 2300, // entra caminando de perfil hasta casi el centro
  turnEnd: 3000, // se gira hacia la cámara
  nearEnd: 4300, // se acerca a la cámara
  waveEnd: 6900, // saluda
  talkEnd: 12600, // habla
  flexEnd: 15000, // saca bíceps
  end: 17600, // pantalla final
};
const START_X = -175, MID_X = -15, NEAR_Z = 380;
const BUBBLES: Array<{ from: number; to: number; text: string }> = [
  { from: 4500, to: 6900, text: 'Hola! Sóc en Fit <span class="em">👋</span>' },
  { from: 7000, to: 8900, text: 'A partir d’ara entrenarem junts' },
  { from: 8950, to: 10750, text: 'A casa i en català' },
  { from: 10800, to: 12600, text: 'Només uns minuts al dia' },
  { from: 12700, to: 15000, text: 'Som-hi? <span class="em">💪</span>' },
];

// ── posturas (vista de frente; ángulos como en la app: 90 = hacia abajo, -90 = hacia arriba) ──
type P = Record<string, number>;
const NEUTRAL: P = { uaL: 97, faL: 94, uaR: 83, faR: 86, zHL: 0, zHR: 0, zEL: 0, zER: 0, zKL: 0, zKR: 0, zAL: 0, zAR: 0, jy: 0, hd: -90, lean: 0 };
const mix = (a: P, b: P, k: number): P => {
  const o: P = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? NEUTRAL[key] ?? 0, y = b[key] ?? NEUTRAL[key] ?? 0;
    o[key] = x + (y - x) * k;
  }
  return o;
};
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

/** Caminar (las piernas y los brazos van y vienen hacia delante y hacia atrás). */
function walk(ms: number, amount = 1): P {
  const ph = (ms / 900) * Math.PI * 2, s = Math.sin(ph) * amount;
  return {
    ...NEUTRAL,
    zKL: 13 * s, zAL: 17 * s, zKR: -13 * s, zAR: -17 * s,
    zHL: -13 * s, zEL: -5 * s, zHR: 13 * s, zER: 5 * s,
    jy: 1.6 * Math.abs(Math.cos(ph)) * amount,
  };
}
/** Saludar con la mano derecha (la del lado derecho de la pantalla). */
function wave(ms: number): P {
  return { ...NEUTRAL, uaR: -25, faR: -85 + 20 * Math.sin((ms / 520) * Math.PI * 2), zHR: 6 };
}
/** Hablar: las manos abiertas a los lados, un poco hacia delante, moviéndose como al explicar algo; la cabeza se inclina a ratos. */
function talk(ms: number): P {
  const a = (ms / 1100) * Math.PI * 2;
  return {
    ...NEUTRAL,
    uaL: 104, faL: 128 + 16 * Math.sin(a), zHL: 9 + 3 * Math.sin(a * 1.3), zEL: 2,
    uaR: 76, faR: 52 - 16 * Math.sin(a + 1.6), zHR: 9 + 3 * Math.sin(a * 1.1 + 0.7), zER: 2,
    hd: -90 + 4 * Math.sin(a * 0.5),
  };
}
/** Sacar bíceps con los dos brazos (con un pequeño apretón). */
function flex(ms: number): P {
  const q = 4 * Math.sin((ms / 600) * Math.PI * 2);
  return { ...NEUTRAL, uaL: 188, faL: -78 + q, uaR: -8, faR: -102 - q, jy: 0 };
}

/** La postura en cada instante del guion, con transiciones suaves entre partes. */
function poseAt(ms: number): P {
  if (ms < T.turnEnd) return walk(ms);
  if (ms < T.nearEnd) return walk(ms, 1 - smooth((ms - (T.nearEnd - 300)) / 300));
  if (ms < T.waveEnd) return mix(NEUTRAL, wave(ms), smooth((ms - T.nearEnd) / 350) * (1 - smooth((ms - (T.waveEnd - 300)) / 300)));
  if (ms < T.talkEnd) return mix(NEUTRAL, talk(ms), smooth((ms - T.waveEnd) / 350) * (1 - smooth((ms - (T.talkEnd - 250)) / 250)));
  return mix(NEUTRAL, flex(ms), smooth((ms - T.talkEnd) / 400));
}

/** Dónde está Fit en la habitación (x, z) y hacia dónde mira (grados: 90 = a la derecha, 0 = a la cámara). */
function pathAt(ms: number): { x: number; z: number; facing: number } {
  if (ms < T.walkEnd) return { x: START_X + (MID_X - START_X) * (ms / T.walkEnd), z: 0, facing: 90 };
  if (ms < T.turnEnd) {
    const k = smooth((ms - T.walkEnd) / (T.turnEnd - T.walkEnd));
    // sigue avanzando un poquito mientras se gira
    return { x: MID_X + 15 * k, z: 0, facing: 90 * (1 - k) };
  }
  if (ms < T.nearEnd) return { x: 0, z: NEAR_Z * smooth((ms - T.turnEnd) / (T.nearEnd - T.turnEnd)), facing: 0 };
  return { x: 0, z: NEAR_Z, facing: 0 };
}

// ── la escena ──────────────────────────────────────────────────────────────────
const spec: MotionSpec = { v: 'front', fn: (u: number) => poseAt(u * T.end), per: T.end } as MotionSpec;
const ms = new MannequinScene(spec);
ms.setAspect(540 / 960);
ms.mood = 'happy';
const rig = roomRig(ms, { poster: 'Benvinguts!' });

const bubble = document.getElementById('bubble')!, end = document.getElementById('end')!, brand = document.getElementById('brand')!;
const head = new THREE.Vector3();

function render(t: number): void {
  if (t >= T.flexEnd) {
    end.hidden = false; brand.hidden = true; bubble.hidden = true;
    (end.firstElementChild as HTMLElement).style.transform = `scale(${0.9 + 0.1 * Math.min(1, (t - T.flexEnd) / 400)})`;
    return;
  }
  end.hidden = true; brand.hidden = false;
  const p = pathAt(t);
  rig.place(p.x, p.z, p.facing);
  // «habla»: la boca se abre y se cierra mientras sale un bocadillo
  const b = BUBBLES.find((x) => t >= x.from && t < x.to);
  const speaking = b && t - b.from < Math.min(1400, (b.to - b.from) * 0.7);
  ms.mood = speaking && Math.floor(t / 110) % 2 === 0 ? 'effort' : 'happy';
  ms.update(t, t);
  renderer.render(ms.scene, ms.camera);
  // bocadillo al lado de la cabeza (a la izquierda, con la punta hacia ella)
  if (b) {
    bubble.hidden = false;
    if (bubble.dataset.text !== b.text) { bubble.innerHTML = b.text; bubble.dataset.text = b.text; }
    head.set(0, 168, 0).project(ms.camera);
    const hx = (head.x + 1) * 270, hy = (1 - head.y) * 480;
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const left = Math.max(16, Math.min(540 - 16 - w, hx - w - 18));
    bubble.style.left = `${left}px`;
    bubble.style.top = `${Math.max(16, hy - h - 34)}px`;
    const k = smooth((t - b.from) / 220) * (1 - smooth((t - (b.to - 160)) / 160));
    bubble.style.opacity = String(k);
    bubble.style.transform = `scale(${0.7 + 0.3 * k})`;
  } else bubble.hidden = true;
}

(window as unknown as { __reel: unknown }).__reel = { total: T.end, render, ready: document.fonts.ready };
void document.fonts.ready.then(() => render(0));
