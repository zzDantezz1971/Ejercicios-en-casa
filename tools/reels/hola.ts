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
import { Motion } from '../../src/figure/poses';
import { CATALOG } from '../../src/data/catalog';
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
  nearEnd: 4700, // se acerca a la cámara (de pecho hacia arriba)
  waveEnd: 7000, // saluda
  talkEnd: 12300, // habla
  backEnd: 13500, // da unos pasos atrás
  jackEnd: 16100, // saltos de tijera
  hiEnd: 18200, // «Som-hi?» sacando bíceps
  end: 20800, // pantalla final
};
const START_X = -175, MID_X = -15, NEAR_Z = 520, NEAR_X = 0, BACK_Z = 190;
const BUBBLES: Array<{ from: number; to: number; text: string }> = [
  { from: 4900, to: 7000, text: 'Hola! Sóc en Fit <span class="em">👋</span>' },
  { from: 7100, to: 8800, text: 'A partir d’ara entrenarem junts' },
  { from: 8850, to: 10550, text: 'A casa i en català' },
  { from: 10600, to: 12300, text: 'Només uns minuts al dia' },
  { from: 16200, to: 18200, text: 'Som-hi? <span class="em">💪</span>' },
];

// ── posturas (vista de frente; ángulos como en la app: 90 = hacia abajo, -90 = hacia arriba) ──
type P = Record<string, number>;
/** La postura de pie de la app (con todos los valores), con los brazos relajados. */
const BASE: P = new Motion({ v: 'front', f: [[{}]] } as MotionSpec).poseAt(0);
const NEUTRAL: P = { ...BASE, uaL: 97, faL: 94, uaR: 83, faR: 86, zHL: 0, zHR: 0, zEL: 0, zER: 0, zKL: 0, zKR: 0, zAL: 0, zAR: 0, jy: 0, hd: -90, lean: 0 };
const mix = (a: P, b: P, k: number): P => {
  const o: P = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? NEUTRAL[key] ?? 0, y = b[key] ?? NEUTRAL[key] ?? 0;
    o[key] = x + (y - x) * k;
  }
  return o;
};
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };
/** Los saltos de tijera de la app (el mismo movimiento que en el ejercicio). */
const JACKS = new Motion(CATALOG.get('saltos-de-tijera-jumping-jacks')!.motion);

/** Caminar (las piernas y los brazos van y vienen hacia delante y hacia atrás). */
function walk(ms: number, amount = 1): P {
  const ph = (ms / 900) * Math.PI * 2, s = Math.sin(ph) * amount;
  return {
    ...NEUTRAL,
    zKL: 13 * s, zAL: 17 * s, zKR: -13 * s, zAR: -17 * s,
    zHL: -13 * s, zEL: -5 * s, zHR: 13 * s, zER: 5 * s,
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
  // pasos atrás (las piernas al revés que al avanzar)
  if (ms < T.backEnd) return walk(-ms, smooth((ms - T.talkEnd) / 200) * (1 - smooth((ms - (T.backEnd - 250)) / 250)));
  if (ms < T.jackEnd) {
    const j = JACKS.poseAt(ms - T.backEnd);
    return mix(NEUTRAL, j, smooth((ms - T.backEnd) / 250) * (1 - smooth((ms - (T.jackEnd - 250)) / 250)));
  }
  return mix(NEUTRAL, flex(ms), smooth((ms - T.jackEnd) / 350));
}

/** Dónde está Fit en la habitación (x, z) y hacia dónde mira (grados: 90 = a la derecha, 0 = a la cámara). */
function pathAt(ms: number): { x: number; z: number; facing: number } {
  if (ms < T.walkEnd) return { x: START_X + (MID_X - START_X) * (ms / T.walkEnd), z: 0, facing: 90 };
  if (ms < T.turnEnd) {
    const k = smooth((ms - T.walkEnd) / (T.turnEnd - T.walkEnd));
    // sigue avanzando un poquito mientras se gira
    return { x: MID_X + 15 * k, z: 0, facing: 90 * (1 - k) };
  }
  if (ms < T.nearEnd) { const k = smooth((ms - T.turnEnd) / (T.nearEnd - T.turnEnd)); return { x: NEAR_X * k, z: NEAR_Z * k, facing: 0 }; }
  if (ms < T.talkEnd) return { x: NEAR_X, z: NEAR_Z, facing: 0 };
  if (ms < T.backEnd) { const k = smooth((ms - T.talkEnd) / (T.backEnd - T.talkEnd)); return { x: NEAR_X * (1 - k), z: NEAR_Z + (BACK_Z - NEAR_Z) * k, facing: 0 }; }
  return { x: 0, z: BACK_Z, facing: 0 };
}

// ── la escena ──────────────────────────────────────────────────────────────────
const spec: MotionSpec = { v: 'front', fn: (u: number) => poseAt(u * T.end), per: T.end } as MotionSpec;
const ms = new MannequinScene(spec);
ms.setAspect(540 / 960);
ms.mood = 'happy';
const rig = roomRig(ms, { poster: 'Benvinguts!' });

// ── bíceps: dos «bultos» de músculo que crecen cuando saca bíceps al final ──
const parts0 = (ms as unknown as { parts: Record<string, THREE.Mesh> }).parts;
const biceps = (['L', 'R'] as const).map((s) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), parts0['ua' + s].material);
  m.castShadow = true;
  ms.scene.add(m);
  return { s, m };
});
const Y = new THREE.Vector3(0, 1, 0);
function placeBiceps(t: number): void {
  const k = smooth((t - (T.jackEnd + 150)) / 450);
  for (const { s, m } of biceps) {
    m.visible = k > 0.01;
    if (!m.visible) continue;
    const ua = parts0['ua' + s], fa = parts0['fa' + s];
    const along = Y.clone().applyQuaternion(ua.quaternion), fore = Y.clone().applyQuaternion(fa.quaternion);
    // hacia donde se dobla el brazo (el lado del bíceps), sin la parte a lo largo del brazo
    const out = fore.clone().addScaledVector(along, -fore.dot(along)).normalize();
    const L = ua.scale.y;
    m.position.copy(ua.position).addScaledVector(along, L * 0.08).addScaledVector(out, 2.4 * k);
    m.quaternion.setFromUnitVectors(Y, along);
    // un poco de «apretón» (crece y decrece un pelín con el movimiento)
    const pump = 1 + 0.06 * Math.sin((t / 600) * Math.PI * 2);
    m.scale.set(3.4 * k * pump, L * 0.3 * (0.6 + 0.4 * k), 3.3 * k * pump);
  }
}

// ── sombra de contacto bajo cada pie (para que al andar no parezca que flota) ──
const footShadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(25,18,10,.7)'); gr.addColorStop(1, 'rgba(25,18,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const feetShadows = (['L', 'R'] as const).map((s) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: footShadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  ms.scene.add(m);
  return { s, m };
});
function placeFeetShadows(): void {
  const p = new THREE.Vector3();
  for (const { s, m } of feetShadows) {
    parts0['sole' + s].getWorldPosition(p);
    // más clara cuanto más levantado está el pie
    const lift = Math.max(0, p.y - 1.5);
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0.15, 1 - lift / 14);
    m.position.set(p.x, 0.12, p.z);
    m.scale.set(13 + lift * 0.4, 18 + lift * 0.4, 1);
  }
}

const bubble = document.getElementById('bubble')!, end = document.getElementById('end')!, brand = document.getElementById('brand')!;
const head = new THREE.Vector3();

function render(t: number): void {
  if (t >= T.hiEnd) {
    end.hidden = false; brand.hidden = true; bubble.hidden = true;
    (end.firstElementChild as HTMLElement).style.transform = `scale(${0.9 + 0.1 * Math.min(1, (t - T.hiEnd) / 400)})`;
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
  placeBiceps(t);
  placeFeetShadows();
  renderer.render(ms.scene, ms.camera);
  // bocadillo encima de la cabeza, con la punta hacia Fit
  if (b) {
    bubble.hidden = false;
    if (bubble.dataset.text !== b.text) { bubble.innerHTML = b.text; bubble.dataset.text = b.text; }
    const scr = (v: THREE.Vector3) => { v.project(ms.camera); return { x: (v.x + 1) * 270, y: (1 - v.y) * 480 }; };
    // la cabeza del muñeco en la pantalla, donde esté en este instante
    const parts = (ms as unknown as { parts: Record<string, THREE.Object3D> }).parts;
    const hb = new THREE.Box3().setFromObject(parts.head);
    let x0 = Infinity, x1 = -Infinity, top = Infinity;
    for (let k = 0; k < 8; k++) {
      const c = scr(head.set(k & 1 ? hb.max.x : hb.min.x, k & 2 ? hb.max.y : hb.min.y, k & 4 ? hb.max.z : hb.min.z));
      x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); top = Math.min(top, c.y);
    }
    const hx = (x0 + x1) / 2;
    const w = bubble.offsetWidth, h = bubble.offsetHeight, TAIL = 26;
    const left = Math.max(14, Math.min(540 - 14 - w, hx - w / 2));
    bubble.style.left = `${left}px`;
    bubble.style.top = `${Math.max(14, top - h - TAIL - 8)}px`;
    // la punta, apuntando a la cabeza
    bubble.style.setProperty('--tx', `${Math.max(18, Math.min(w - 40, hx - left - 11))}px`);
    const k = smooth((t - b.from) / 220) * (1 - smooth((t - (b.to - 160)) / 160));
    bubble.style.opacity = String(k);
    bubble.style.transform = `scale(${0.7 + 0.3 * k})`;
  } else bubble.hidden = true;
}

(window as unknown as { __reel: unknown }).__reel = { total: T.end, render, ready: document.fonts.ready };
void document.fonts.ready.then(() => render(0));
