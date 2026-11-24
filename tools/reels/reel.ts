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
import { addRoom, EYE } from './room';
import { EX1 } from '../../src/i18n/ex1';
import { EX2 } from '../../src/i18n/ex2';
import { EX3 } from '../../src/i18n/ex3';
import { EX4 } from '../../src/i18n/ex4';
import { EXTRA_T } from '../../src/data/extra';

// ?dist=600&alto=80: probar otra distancia o altura de la cámara
const qs = new URLSearchParams(location.search);
if (qs.get('dist')) EYE.dist = Number(qs.get('dist'));
if (qs.get('alto')) EYE.target = Number(qs.get('alto'));
if (qs.get('cerca')) EYE.near = Number(qs.get('cerca'));
const reel = REELS[new URLSearchParams(location.search).get('r') ?? 'presentacio'];
// muñeco de Kasa Fit: con pelo corto y la camiseta azul de la app
// el muñeco de estos primeros vídeos (el mismo que lleva David en la app)
setLook({ skin: '#C68B62', shirt: '#2F5BEA', shorts: '#7A1F2B', shoe: '#E5484D', glasses: 'sun', beard: 'stubble', hair: 'none', top: 'tank', bottom: 'leggings' }, () => true);

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(540, 960, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
  // el muñeco no debe tapar el nombre del ejercicio: se mide con el nombre de este clip ya puesto
  exname.hidden = false;
  exname.textContent = nameOf(clip);
  const st = document.getElementById('stage')!.getBoundingClientRect(), r = exname.getBoundingClientRect(), M = 8;
  const ndc = (px: number, py: number) => [((px - st.left) / st.width) * 2 - 1, 1 - ((py - st.top) / st.height) * 2];
  const [ax0, ay1] = ndc(r.left - M, r.top - M), [ax1, ay0] = ndc(r.right + M, r.bottom + M);
  addRoom(s, { poster: reel.poster, avoid: [{ x0: ax0, x1: ax1, y0: ay0, y1: ay1 }] });
  // ?vacia=1: solo la habitación, sin el muñeco ni su material
  if (new URLSearchParams(location.search).get('vacia')) {
    const room = s.scene.children.find((o) => o.userData.room);
    s.scene.children.forEach((o) => { if (o !== room && !(o as THREE.Light).isLight) o.visible = false; });
  }
  scenes.set(i, s);
  return s;
}

const l1 = document.getElementById('l1')!, l2 = document.getElementById('l2')!, cap = document.getElementById('cap')!;
const exname = document.getElementById('exname')!;
if (qs.get('ex') === 'arriba') document.getElementById('stage')!.classList.add('ex-top');
/** Nombre en catalán del ejercicio (sin el nombre en inglés entre paréntesis). */
const EXCA: Record<string, { ca: string[] }> = { ...EX1, ...EX2, ...EX3, ...EX4, ...EXTRA_T };
// ?largo=1: probar con un nombre muy largo
const nameOf = (clip: Clip) => (qs.get('largo') ? 'Estirament de quàdriceps dempeus amb suport a la paret' : clip.name ?? exName(clip.ex));
const exName = (id: string) => (EXCA[id]?.ca[0] ?? id).replace(/\s*\([^)]*\)\s*$/, '');
const end = document.getElementById('end')!, brand = document.getElementById('brand')!;
const total = reel.clips.reduce((n, c) => n + c.ms, 0) + reel.endMs;

function render(ms: number): void {
  let t = ms, i = 0;
  while (i < reel.clips.length && t >= reel.clips[i].ms) { t -= reel.clips[i].ms; i++; }
  if (i >= reel.clips.length) {
    end.hidden = false; brand.hidden = true; cap.hidden = true; exname.hidden = true;
    (end.firstElementChild as HTMLElement).style.transform = `scale(${0.9 + 0.1 * Math.min(1, t / 400)})`;
    return;
  }
  end.hidden = true; brand.hidden = false; cap.hidden = false; exname.hidden = false;
  const clip = reel.clips[i];
  const s = sceneFor(i, clip);
  s.update(t + (clip.start ?? 0), t);
  renderer.render(s.scene, s.camera);
  exname.textContent = nameOf(clip);
  l1.textContent = clip.l1; l2.textContent = clip.l2 ?? ''; l2.hidden = !clip.l2;
  // el texto entra deslizándose un poco al empezar cada clip
  const k = Math.min(1, t / 300);
  cap.style.opacity = String(k);
  cap.style.transform = `translateY(${(1 - k) * 16}px)`;
}

// ?final=oro: la pantalla final dorada (si no, la azul)
if (new URLSearchParams(location.search).get('final') === 'oro') document.getElementById('end')!.classList.remove('blue');
(window as unknown as { __reel: unknown }).__reel = { total, render, ready: document.fonts.ready };
// la primera imagen, con las letras ya cargadas (el nombre del ejercicio se mide para colocar al muñeco)
void document.fonts.ready.then(() => render(0));
