/*
 * Anuncio de Kasa Fit para Instagram (unos 22 s, vertical). Empieza con Fit en su habitación y una pregunta gancho;
 * después, un móvil con la app de verdad (modo oscuro) va enseñando lo que hace; vuelve Fit y acaba con la pantalla
 * final azul «Gratis a Google Play».
 * Las capturas están en tools/reels/assets (app-*.jpg, hechas con tools/play/demo-data.ts en modo oscuro).
 * Se graba igual que los otros: node tools/reels/record.cjs anunci <carpeta>.
 */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import * as THREE from 'three';
import { CATALOG } from '../../src/data/catalog';
import { MannequinScene } from '../../src/figure/Mannequin';
import { setLook } from '../../src/figure/look';
import { addRoom } from './room';

setLook({ skin: '#C68B62', shirt: '#2F5BEA', shorts: '#7A1F2B', shoe: '#E5484D', glasses: 'sun', beard: 'stubble', hair: 'none', top: 'tank', bottom: 'leggings' }, () => true);

const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
renderer.setSize(540, 960, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// ── el guion ──────────────────────────────────────────────────────────────────
type Fit = { kind: 'fit'; ms: number; ex: string; hook: [string, string?]; tag?: string; poster: string };
type Phone = { kind: 'phone'; ms: number; shots: string[]; k: string; h: string; p: string };
const SCENES: Array<Fit | Phone> = [
  { kind: 'fit', ms: 3000, ex: 'saltos-de-tijera-jumping-jacks', hook: ['Vols posar-te en forma', 'sense sortir de casa?'], poster: 'Cada dia,|una mica|més' },
  { kind: 'phone', ms: 3600, shots: ['w1', 'w3'], k: 'Pas a pas', h: 'En <em>Fit</em> et fa<br />cada exercici', p: 'Amb avisos per veu en català' },
  { kind: 'phone', ms: 3200, shots: ['forca'], k: '+200 exercicis', h: 'Amb o sense<br /><em>material</em>', p: 'Manuelles, pesa russa, bandes, fitball…' },
  { kind: 'phone', ms: 3200, shots: ['home'], k: 'Les teves taules', h: 'Uns minuts<br /><em>al dia</em>', p: 'Fes-la tu o deixa que la faci l’app' },
  { kind: 'phone', ms: 3400, shots: ['hist', 'med'], k: 'Motivació', h: 'Segueix el teu<br /><em>progrés</em>', p: 'Historial, calories i medalles' },
  { kind: 'fit', ms: 3000, ex: 'curl-de-biceps', hook: ['Tot en català', 'i sense anuncis'], tag: 'Gratis a Google Play', poster: 'Som-hi!' },
];
const END_MS = 2800;
const total = SCENES.reduce((n, s) => n + s.ms, 0) + END_MS;

// ── escenas de Fit (con la habitación de siempre) ──────────────────────────────
const fitScenes = new Map<number, MannequinScene>();
function fitScene(i: number, s: Fit): MannequinScene {
  let m = fitScenes.get(i);
  if (m) return m;
  m = new MannequinScene(CATALOG.get(s.ex)!.motion);
  m.setAspect(540 / 960);
  m.mood = 'happy';
  // que no tape el titular de arriba ni la barra de abajo
  addRoom(m, { poster: s.poster, avoid: [{ x0: -1, x1: 1, y0: 0.55, y1: 1 }] });
  fitScenes.set(i, m);
  return m;
}

// ── capturas de la app ─────────────────────────────────────────────────────────
const scr = document.getElementById('scr')!;
const imgs = new Map<string, HTMLImageElement>();
for (const s of SCENES) if (s.kind === 'phone') for (const n of s.shots) {
  if (imgs.has(n)) continue;
  const im = new Image();
  im.src = new URL(`./assets/app-${n}.jpg`, import.meta.url).href;
  im.style.opacity = '0';
  scr.append(im);
  imgs.set(n, im);
}
const loaded = Promise.all([...imgs.values()].map((im) => im.decode().catch(() => undefined)));

const $ = (id: string) => document.getElementById(id)!;
const bg = $('bg'), phone = $('phone'), head = $('head'), hook = $('hook'), tag = $('tag'), end = $('end'), brand = $('brand');
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

function render(ms: number): void {
  let t = ms, i = 0;
  while (i < SCENES.length && t >= SCENES[i].ms) { t -= SCENES[i].ms; i++; }
  for (const el of [bg, phone, head, hook, tag]) el.hidden = true;
  if (i >= SCENES.length) {
    end.hidden = false; brand.hidden = true;
    (end.firstElementChild as HTMLElement).style.transform = `scale(${0.9 + 0.1 * Math.min(1, t / 400)})`;
    return;
  }
  end.hidden = true; brand.hidden = false;
  const s = SCENES[i];
  const inK = smooth(t / 350);
  if (s.kind === 'fit') {
    const m = fitScene(i, s);
    m.update(t, t);
    renderer.render(m.scene, m.camera);
    hook.hidden = false;
    $('hook1').textContent = s.hook[0];
    $('hook2').textContent = s.hook[1] ?? '';
    $('hook2').hidden = !s.hook[1];
    hook.style.opacity = String(inK);
    hook.style.transform = `translateY(${(1 - inK) * -18}px) scale(${0.94 + 0.06 * inK})`;
    if (s.tag) {
      const k = smooth((t - 700) / 350);
      tag.hidden = false; tag.textContent = s.tag;
      tag.style.opacity = String(k);
      tag.style.transform = `translateX(-50%) scale(${0.85 + 0.15 * k})`;
    }
    return;
  }
  bg.hidden = false; phone.hidden = false; head.hidden = false;
  // el móvil sube desde abajo en la primera escena de móvil; luego se queda y solo cambia la pantalla
  const first = SCENES[i - 1]?.kind !== 'phone';
  const up = first ? smooth(t / 500) : 1;
  phone.style.transform = `translateY(${(1 - up) * 520}px) rotate(${(1 - up) * 6}deg)`;
  // las capturas: cada una un rato, con fundido; y un poco de desplazamiento hacia arriba (como si se moviera)
  const per = s.ms / s.shots.length;
  const cur = Math.min(s.shots.length - 1, Math.floor(t / per));
  // debajo, la captura que se veía justo antes (la última de la escena anterior), para fundir de una a otra
  const prev = s.shots[cur - 1] ?? (!first ? (SCENES[i - 1] as Phone).shots.slice(-1)[0] : undefined);
  const k = smooth((t - cur * per) / 250);
  imgs.forEach((im, n) => {
    const o = n === s.shots[cur] ? (first && cur === 0 ? 1 : k) : n === prev ? 1 : 0;
    im.style.opacity = String(o);
    im.style.zIndex = n === s.shots[cur] ? '2' : '1';
  });
  $('hk').textContent = s.k;
  $('h2').innerHTML = s.h;
  $('hp').textContent = s.p;
  head.style.opacity = String(inK);
  head.style.transform = `translateY(${(1 - inK) * 14}px)`;
}

(window as unknown as { __reel: unknown }).__reel = { total, render, ready: Promise.all([document.fonts.ready, loaded]) };
void Promise.all([document.fonts.ready, loaded]).then(() => render(0));
