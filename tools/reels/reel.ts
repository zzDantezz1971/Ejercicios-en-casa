/*
 * Reels de Kasa Fit: el muñeco de la app en una habitación (siempre la misma; solo cambia el material de cada
 * ejercicio), en vertical 1080 × 1920, con textos en catalán encima. Se graba fotograma a fotograma con
 * tools/reels/record.cjs (window.__reel.render(ms) pinta el instante ms).
 */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import * as THREE from 'three';
import { CATALOG } from '../../src/data/catalog';
import { MannequinScene } from '../../src/figure/Mannequin';
import { setLook } from '../../src/figure/look';
import { REELS, type Clip } from './scripts';

const reel = REELS[new URLSearchParams(location.search).get('r') ?? 'presentacio'];
// muñeco de Kasa Fit: con pelo corto y la camiseta azul de la app
setLook({ hair: 'short', shirt: '#2F5BEA', shorts: '#1E2633', shoe: '#F2A516' }, () => true);

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(540, 960, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/** Textura de tablones de madera para el suelo. */
function woodTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const g = c.getContext('2d')!;
  const tones = ['#C9A27A', '#C29A71', '#CFAA82', '#BF976E', '#C8A178'];
  const W = 128;
  for (let x = 0; x < 1024; x += W) {
    let y = -((x / W) % 3) * 170;
    while (y < 1024) {
      const h = 340;
      g.fillStyle = tones[Math.floor(Math.abs(Math.sin(x * 7.3 + y * 1.7)) * tones.length)];
      g.fillRect(x, y, W, h);
      // vetas suaves
      g.strokeStyle = 'rgba(120,80,40,.10)'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(x + 10 + k * 19, y); g.bezierCurveTo(x + 18 + k * 19, y + h / 3, x + 4 + k * 19, y + (2 * h) / 3, x + 12 + k * 19, y + h); g.stroke(); }
      g.strokeStyle = 'rgba(90,60,30,.35)'; g.lineWidth = 3; g.strokeRect(x, y, W, h);
      y += h;
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
/** Cielo de la ventana. */
function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#9CC7EE'); gr.addColorStop(0.7, '#D7E9F6'); gr.addColorStop(1, '#F4E9D8');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const WOOD = woodTexture(), SKY = skyTexture();
/** Cámara fija: a qué altura mira, a qué distancia y con qué inclinación (radianes). */
const EYE = { target: 82, dist: 760, elev: 0.1 };

/**
 * La habitación, siempre igual vista desde la cámara: suelo de madera, pared del fondo con zócalo, una ventana a la
 * izquierda, una estantería con una planta y libros a la derecha y una planta grande en el suelo.
 */
function addRoom(ms: MannequinScene): void {
  const S = ms.scene, cam = ms.camera;
  const box = new THREE.Box3().setFromObject(S);
  const c = box.getCenter(new THREE.Vector3()).setY(0);
  const dir = cam.position.clone().sub(c).setY(0).normalize();
  // la cámara, siempre a la misma distancia, altura e inclinación respecto a la habitación (sea cual sea el ejercicio)
  const target = c.clone().setY(EYE.target);
  cam.position.copy(target).addScaledVector(dir, EYE.dist * Math.cos(EYE.elev)).add(new THREE.Vector3(0, EYE.dist * Math.sin(EYE.elev), 0));
  cam.lookAt(target);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
  const at = (back: number, side: number, y: number) => new THREE.Vector3(c.x, y, c.z).addScaledVector(dir, -back).addScaledVector(right, side);
  const face = (m: THREE.Object3D) => m.lookAt(m.position.clone().add(dir));
  const std = (color: string, rough = 0.85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const add = (m: THREE.Mesh, shadow = true) => { m.castShadow = shadow; m.receiveShadow = true; S.add(m); return m; };
  const BACK = 150;

  // suelo de madera (por debajo del suelo de sombras del muñeco)
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ map: WOOD, roughness: 0.7 })), false);
  floor.rotation.set(-Math.PI / 2, Math.atan2(dir.x, dir.z), 0, 'YXZ');
  floor.position.set(c.x, -0.2, c.z);
  // pared del fondo y zócalo
  const wall = add(new THREE.Mesh(new THREE.PlaneGeometry(1400, 420), std('#E3E9E5')), false);
  wall.position.copy(at(BACK, 0, 210)); face(wall);
  const base = add(new THREE.Mesh(new THREE.BoxGeometry(1400, 14, 3), std('#F7F7F4', 0.5)), false);
  base.position.copy(at(BACK - 1.5, 0, 7)); face(base);
  // franja de color en la pared (detalle de la marca)
  const band = add(new THREE.Mesh(new THREE.PlaneGeometry(1400, 6), std('#2F5BEA', 0.6)), false);
  band.position.copy(at(BACK - 0.5, 0, 92)); face(band);
  // ventana con marco blanco
  const win = at(BACK - 1, -95, 175);
  const glass = add(new THREE.Mesh(new THREE.PlaneGeometry(96, 118), new THREE.MeshBasicMaterial({ map: SKY })), false);
  glass.position.copy(win); face(glass);
  const frameM = std('#FAFAF8', 0.45);
  for (const [w, h, x, y] of [[108, 7, 0, 62], [108, 7, 0, -62], [7, 130, -51, 0], [7, 130, 51, 0], [96, 4, 0, 0], [4, 118, 0, 0]] as const) {
    const f = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), frameM), false);
    f.position.copy(win.clone().addScaledVector(right, x).add(new THREE.Vector3(0, y, 0)).addScaledVector(dir, 1.5)); face(f);
  }
  const sill = add(new THREE.Mesh(new THREE.BoxGeometry(118, 4, 12), frameM), false);
  sill.position.copy(win.clone().add(new THREE.Vector3(0, -66, 0)).addScaledVector(dir, 6)); face(sill);
  // estantería con libros y una planta pequeña
  const shelfC = at(BACK - 9, 100, 150);
  const shelf = add(new THREE.Mesh(new THREE.BoxGeometry(80, 4, 18), std('#B88A5E', 0.6)));
  shelf.position.copy(shelfC); face(shelf);
  const books = ['#2F5BEA', '#F2A516', '#1F8A57', '#E5484D'];
  books.forEach((col, i) => {
    const b = add(new THREE.Mesh(new THREE.BoxGeometry(6, 22 + (i % 2) * 4, 14), std(col, 0.7)));
    b.position.copy(shelfC.clone().addScaledVector(right, -30 + i * 7).add(new THREE.Vector3(0, 13 + (i % 2) * 2, 0))); face(b);
  });
  const pot = add(new THREE.Mesh(new THREE.CylinderGeometry(7, 5.5, 12, 20), std('#F4F1EC', 0.5)));
  pot.position.copy(shelfC.clone().addScaledVector(right, 22).add(new THREE.Vector3(0, 8, 0)));
  const leafM = std('#3E8A5B', 0.8);
  for (let k = 0; k < 7; k++) {
    const l = add(new THREE.Mesh(new THREE.SphereGeometry(5, 12, 8), leafM));
    l.scale.set(1, 1.6, 0.5);
    l.position.copy(pot.position.clone().add(new THREE.Vector3(Math.sin(k * 0.9) * 6, 14 + (k % 3) * 3, Math.cos(k * 0.9) * 6)));
    l.rotation.z = Math.sin(k) * 0.6;
  }
  // planta grande en el suelo, a la derecha
  const big = at(BACK - 30, 150, 0);
  const bigPot = add(new THREE.Mesh(new THREE.CylinderGeometry(17, 13, 34, 24), std('#D9CBB7', 0.6)));
  bigPot.position.copy(big.clone().add(new THREE.Vector3(0, 17, 0)));
  for (let k = 0; k < 16; k++) {
    const l = add(new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8), std(k % 2 ? '#3E8A5B' : '#2F7A4D', 0.8)));
    l.scale.set(0.6, 1.9, 0.35);
    const a = k * 2.4, r = 6 + (k % 4) * 3;
    l.position.copy(big.clone().add(new THREE.Vector3(Math.sin(a) * r, 44 + (k % 5) * 9, Math.cos(a) * r)));
    l.rotation.set(Math.cos(a) * 0.5, a, Math.sin(a) * 0.5);
  }
  // material de fitness fijo: esterilla enrollada de pie junto a la pared, kettlebell y botella de agua
  const matRoll = add(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 62, 24), std('#7B5CD6', 0.7)));
  matRoll.position.copy(at(BACK - 10, -122, 31));
  const matEnd = add(new THREE.Mesh(new THREE.TorusGeometry(4.5, 1.2, 8, 20), std('#5E44B0', 0.7)), false);
  matEnd.position.copy(matRoll.position.clone().add(new THREE.Vector3(0, 31.2, 0))); matEnd.rotation.x = Math.PI / 2;
  const kb = at(BACK - 32, -98, 0);
  const kbBody = add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), std('#22262E', 0.45, 0.3)));
  kbBody.scale.set(1, 0.92, 1); kbBody.position.copy(kb.clone().add(new THREE.Vector3(0, 9.5, 0)));
  const kbHandle = add(new THREE.Mesh(new THREE.TorusGeometry(6, 1.6, 10, 24, Math.PI), std('#22262E', 0.45, 0.3)));
  kbHandle.position.copy(kb.clone().add(new THREE.Vector3(0, 17, 0))); face(kbHandle);
  const kbBand = add(new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.2, 2.5, 24), std('#F2A516', 0.5)), false);
  kbBand.position.copy(kb.clone().add(new THREE.Vector3(0, 9.5, 0)));
  const bottle = add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 20, 16), std('#2F5BEA', 0.3)));
  bottle.position.copy(at(BACK - 18, -82, 10));
  const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 12), std('#F7F7F4', 0.4)));
  cap.position.copy(bottle.position.clone().add(new THREE.Vector3(0, 11.5, 0)));
  // reloj de pared
  const clockC = at(BACK - 1, 62, 252);
  const clockF = add(new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 2.5, 32), std('#FAFAF8', 0.4)), false);
  clockF.position.copy(clockC); clockF.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const rim = add(new THREE.Mesh(new THREE.TorusGeometry(14, 1.3, 8, 32), std('#1E2633', 0.5)), false);
  rim.position.copy(clockC.clone().addScaledVector(dir, 1)); face(rim);
  for (const [len, ang] of [[9, 0.5], [6, 2.2]] as const) {
    const hnd = add(new THREE.Mesh(new THREE.BoxGeometry(1.4, len, 0.6), std('#1E2633', 0.5)), false);
    hnd.position.copy(clockC.clone().addScaledVector(dir, 1.8).addScaledVector(right, Math.sin(ang) * len / 2).add(new THREE.Vector3(0, Math.cos(ang) * len / 2, 0)));
    face(hnd); hnd.rotateZ(-ang);
  }
  // luz cálida de la ventana
  const light = new THREE.PointLight(0xfff1dc, 0.6, 600);
  light.position.copy(win.clone().addScaledVector(dir, 60));
  S.add(light);
}

/** Escena de un clip (el muñeco con su ejercicio y la habitación). */
const scenes = new Map<number, MannequinScene>();
function sceneFor(i: number, clip: Clip): MannequinScene {
  let s = scenes.get(i);
  if (s) return s;
  const ex = CATALOG.get(clip.ex);
  if (!ex) throw new Error('No existe el ejercicio ' + clip.ex);
  s = new MannequinScene(ex.motion);
  s.minSpan = clip.span ?? 210;
  s.setAspect(540 / 960);
  if (clip.az !== undefined) s.angleOffset = clip.az;
  s.mood = 'happy';
  addRoom(s);
  scenes.set(i, s);
  return s;
}

const l1 = document.getElementById('l1')!, l2 = document.getElementById('l2')!, cap = document.getElementById('cap')!;
const end = document.getElementById('end')!, brand = document.getElementById('brand')!;
const total = reel.clips.reduce((n, c) => n + c.ms, 0) + reel.endMs;

function render(ms: number): void {
  let t = ms, i = 0;
  while (i < reel.clips.length && t >= reel.clips[i].ms) { t -= reel.clips[i].ms; i++; }
  if (i >= reel.clips.length) {
    end.hidden = false; brand.hidden = true; cap.hidden = true;
    (end.firstElementChild as HTMLElement).style.transform = `scale(${0.9 + 0.1 * Math.min(1, t / 400)})`;
    return;
  }
  end.hidden = true; brand.hidden = false; cap.hidden = false;
  const clip = reel.clips[i];
  const s = sceneFor(i, clip);
  s.update(t + (clip.start ?? 0), t);
  renderer.render(s.scene, s.camera);
  l1.textContent = clip.l1; l2.textContent = clip.l2 ?? ''; l2.hidden = !clip.l2;
  // el texto entra deslizándose un poco al empezar cada clip
  const k = Math.min(1, t / 300);
  cap.style.opacity = String(k);
  cap.style.transform = `translateY(${(1 - k) * 16}px)`;
}

(window as unknown as { __reel: unknown }).__reel = { total, render, ready: document.fonts.ready };
render(0);
