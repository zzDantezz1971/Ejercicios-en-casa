/*
 * Vídeo de presentación: Fit, quieto en el centro de la habitación. La cámara empieza de cerca (de pecho para arriba):
 * saluda y «habla» con bocadillos de cómic (sin voz) mientras la cámara se aleja hasta enseñar la habitación entera;
 * entonces hace unas sentadillas con la pesa rusa, la deja en el suelo y acaba sacando bíceps: «Som-hi?».
 * Se graba igual que los otros: node tools/reels/record.cjs hola <carpeta>.
 */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import * as THREE from 'three';
import { MannequinScene } from '../../src/figure/Mannequin';
import { Motion } from '../../src/figure/poses';
import { setLook } from '../../src/figure/look';
import type { MotionSpec } from '../../src/domain/types';
import { EYE, roomRig } from './room';

setLook({ skin: '#C68B62', shirt: '#2F5BEA', shorts: '#7A1F2B', shoe: '#E5484D', glasses: 'sun', beard: 'stubble', hair: 'none', top: 'tank', bottom: 'leggings' }, () => true);

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(540, 960, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── el guion (ms) ──────────────────────────────────────────────────────────────
const T = {
  waveEnd: 2600, // saluda (cámara de cerca)
  dbOn: 3000, // ya con las manos fuera de la imagen: aparece la pesa rusa
  zoomFrom: 2900, // la cámara empieza a alejarse…
  zoomTo: 8000, // …hasta enseñar la habitación entera
  curlFrom: 8100, // abre las piernas y hace sentadillas sumo con la pesa rusa (3)
  curlTo: 12500,
  dropAt: 13000, // deja la pesa en el suelo…
  upAt: 13500, // …se levanta
  hiEnd: 16000, // «Som-hi?» sacando bíceps
  end: 18600, // pantalla final
};
/** Dónde está Fit en la habitación (hacia la cámara desde el sitio de siempre): de cuerpo entero con la cámara lejos. */
const FIG_Z = 190;
const BUBBLES: Array<{ from: number; to: number; text: string }> = [
  { from: 300, to: 2600, text: 'Hola! Sóc en Fit <span class="em">👋</span>' },
  { from: 2750, to: 4450, text: 'A partir d’ara entrenarem junts' },
  { from: 4500, to: 6200, text: 'A casa i en català' },
  { from: 6250, to: 7950, text: 'Només uns minuts al dia' },
  { from: 13900, to: 16000, text: 'Som-hi? <span class="em">💪</span>' },
];

// ── posturas (vista de frente; ángulos como en la app: 90 = hacia abajo, -90 = hacia arriba) ──
type P = Record<string, number>;
/** La postura de pie de la app (con todos los valores), con los brazos relajados. */
const BASE: P = new Motion({ v: 'front', f: [[{}]] } as MotionSpec).poseAt(0);
const NEUTRAL: P = { ...BASE, uaL: 97, faL: 94, uaR: 83, faR: 86, sfL: 1, sfR: 1, zHL: 0, zHR: 0, zEL: 0, zER: 0, jy: 0, hd: -90, lean: 0 };
const mix = (a: P, b: P, k: number): P => {
  const o: P = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key] ?? NEUTRAL[key] ?? 0, y = b[key] ?? NEUTRAL[key] ?? 0;
    o[key] = x + (y - x) * k;
  }
  return o;
};
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

/** Saludar con la mano derecha (la del lado derecho de la pantalla). */
function wave(ms: number): P {
  return { ...NEUTRAL, uaR: -25, faR: -85 + 20 * Math.sin((ms / 520) * Math.PI * 2), zHR: 6 };
}
/** Las dos manos juntas delante, agarrando la pesa rusa por el asa (como en la sentadilla sumo de la app). */
const HOLD: P = { uaL: 74, faL: 66, uaR: 106, faR: 114, zEL: 6, zER: 6, zHL: 14, zHR: 14 };
/** Piernas abiertas (sumo), de pie y abajo; y abajo del todo para dejar la pesa en el suelo. */
const SUMO: P = { thL: 118, snL: 118, thR: 62, snR: 62, ftL: 180, ftR: 0 };
const SUMO_DOWN: P = { thL: 152, snL: 96, thR: 28, snR: 84, ftL: 180, ftR: 0, zKL: 9, zKR: 9, lean: 16 };
const SUMO_FLOOR: P = { thL: 160, snL: 92, thR: 20, snR: 88, ftL: 180, ftR: 0, zKL: 11, zKR: 11, lean: 30, uaL: 80, faL: 76, uaR: 100, faR: 104, zEL: 12, zER: 12, zHL: 30, zHR: 30 };
/** De pie con la pesa rusa, mientras habla: la cabeza se inclina un poco a ratos. */
function stand(ms: number): P {
  return { ...NEUTRAL, ...HOLD, hd: -90 + 4 * Math.sin((ms / 1100) * Math.PI) };
}
/** Abre las piernas (400 ms) y hace sentadillas sumo con la pesa (1,3 s cada una). */
function squats(ms: number): P {
  const open = smooth(ms / 400);
  const base = mix({ ...NEUTRAL, ...HOLD }, { ...NEUTRAL, ...HOLD, ...SUMO }, open);
  const t = Math.max(0, ms - 400);
  const k = (1 - Math.cos((t / 1300) * Math.PI * 2)) / 2;
  return mix(base, { ...NEUTRAL, ...HOLD, ...SUMO_DOWN }, k * open);
}
/** Baja a dejar la pesa en el suelo, la suelta y se levanta con las piernas juntas. */
function drop(ms: number): P {
  const down = { ...NEUTRAL, ...SUMO_FLOOR };
  if (ms < T.dropAt) return mix({ ...NEUTRAL, ...HOLD, ...SUMO }, down, smooth((ms - T.curlTo) / (T.dropAt - T.curlTo)));
  if (ms < T.upAt) return down;
  return mix(down, NEUTRAL, smooth((ms - T.upAt) / 450));
}
/** Sacar bíceps con los dos brazos (con un pequeño apretón). */
function flex(ms: number): P {
  const q = 4 * Math.sin((ms / 600) * Math.PI * 2);
  return { ...NEUTRAL, uaL: 188, faL: -78 + q, uaR: -8, faR: -102 - q };
}

/** La postura en cada instante del guion, con transiciones suaves entre partes. */
function poseAt(ms: number): P {
  if (ms < T.waveEnd) return mix(NEUTRAL, wave(ms), smooth(ms / 300) * (1 - smooth((ms - (T.waveEnd - 350)) / 350)));
  if (ms < T.curlFrom) return stand(ms);
  if (ms < T.curlTo) return squats(ms - T.curlFrom);
  if (ms < T.upAt + 450) return drop(ms);
  return mix(NEUTRAL, flex(ms), smooth((ms - (T.upAt + 450)) / 400));
}

// ── la escena ──────────────────────────────────────────────────────────────────
const spec: MotionSpec = { v: 'front', kb: 'both', fn: (u: number) => poseAt(u * T.end), per: T.end } as MotionSpec;
const ms = new MannequinScene(spec);
ms.setAspect(540 / 960);
ms.mood = 'happy';
const rig = roomRig(ms, { poster: 'Benvinguts!' });
rig.place(0, FIG_Z, 0);

/** La cámara: de cerca (de pecho para arriba) al principio y, al alejarse, la de siempre (la habitación entera). */
const CAM_NEAR = { pos: new THREE.Vector3(0, 148, FIG_Z + 235), look: new THREE.Vector3(0, 134, FIG_Z) };
const CAM_FAR = { pos: new THREE.Vector3(0, EYE.target + EYE.dist * Math.sin(EYE.elev), EYE.dist * Math.cos(EYE.elev)), look: new THREE.Vector3(0, EYE.target, 0) };
function placeCamera(t: number): void {
  const k = smooth((t - T.zoomFrom) / (T.zoomTo - T.zoomFrom));
  const pos = CAM_NEAR.pos.clone().lerp(CAM_FAR.pos, k), look = CAM_NEAR.look.clone().lerp(CAM_FAR.look, k);
  ms.camera.position.copy(rig.room.localToWorld(pos));
  ms.camera.lookAt(rig.room.localToWorld(look));
  ms.camera.updateMatrixWorld(true);
}

/**
 * La pesa rusa: escondida mientras saluda; aparece cuando las manos ya no se ven (y cierra los puños). Al dejarla en el
 * suelo se queda allí (una copia quieta) y él abre las manos.
 */
const msAny = ms as unknown as { gear: Record<string, THREE.Object3D[]>; grips: boolean };
const kbParts = msAny.gear.kbL;
const kbLeft = kbParts.map((m) => { const c = m.clone(); c.visible = false; ms.scene.add(c); return c; });
let kbPlaced = false;
function showKettlebell(t: number): void {
  const held = t >= T.dbOn && t < T.dropAt;
  msAny.grips = held;
  if (t >= T.dropAt && !kbPlaced) {
    // donde estaba en el momento de soltarla, apoyada en el suelo
    ms.update(T.dropAt - 1, T.dropAt - 1);
    const lift = kbParts[0].position.y - kbParts[0].scale.y;
    kbLeft.forEach((c, i) => { c.position.copy(kbParts[i].position); c.position.y -= lift; c.rotation.copy(kbParts[i].rotation); c.scale.copy(kbParts[i].scale); });
    kbPlaced = true;
    ms.update(t, t);
  }
  for (const m of kbParts) m.visible = held;
  kbLeft.forEach((c) => (c.visible = t >= T.dropAt));
}

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
  const k = smooth((t - (T.upAt + 600)) / 450);
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

// ── sombra de contacto bajo cada pie ──
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
  // «habla»: la boca se abre y se cierra mientras sale un bocadillo
  const b = BUBBLES.find((x) => t >= x.from && t < x.to);
  const speaking = b && t - b.from < Math.min(1400, (b.to - b.from) * 0.7);
  ms.mood = speaking && Math.floor(t / 110) % 2 === 0 ? 'effort' : 'happy';
  ms.update(t, t);
  showKettlebell(t);
  placeCamera(t);
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

// ?final=oro: la pantalla final dorada (si no, la azul)
if (new URLSearchParams(location.search).get('final') === 'oro') document.getElementById('end')!.classList.remove('blue');
(window as unknown as { __reel: unknown }).__reel = { total: T.end, render, ready: document.fonts.ready };
void document.fonts.ready.then(() => render(0));
