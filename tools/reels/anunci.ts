/*
 * Anuncio de Kasa Fit para Instagram (unos 28 s, vertical), sin Fit: una entrada con el logo y, después, un móvil
 * inclinado (en 3D, moviéndose despacio) con la app de verdad en modo oscuro. Cada pantalla tiene su titular y una
 * frase que explica qué hace. Acaba con la pantalla final azul «Gratis a Google Play».
 * Las capturas están en tools/reels/assets (app-*.jpg, hechas con tools/play/demo-data.ts en modo oscuro).
 * Se graba igual que los otros: node tools/reels/record.cjs anunci <carpeta>.
 */
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';

// ── el guion ──────────────────────────────────────────────────────────────────
type Screen = { ms: number; shots: string[]; k: string; h: string; p: string };
const INTRO_MS = 2600;
const SCREENS: Screen[] = [
  { ms: 4500, shots: ['home'], k: 'La teva taula', h: 'Tot a punt<br /><em>en un toc</em>', p: 'Obre l’app, prem «Comença» i a entrenar. Sense pensar què toca avui.' },
  { ms: 5000, shots: ['w1', 'w3'], k: 'Entrenament guiat', h: 'Et diu què fer<br /><em>i quan</em>', p: 'Cada exercici en 3D, amb compte enrere i avisos per veu en català.' },
  { ms: 4500, shots: ['forca'], k: '+200 exercicis', h: 'Amb o sense<br /><em>material</em>', p: 'Tria el que tens a casa: manuelles, pesa russa, bandes, fitball…' },
  { ms: 4500, shots: ['hist'], k: 'Historial', h: 'Cada dia<br /><em>compta</em>', p: 'Calendari, ratxes, temps i calories de cada entrenament.' },
  { ms: 4500, shots: ['med'], k: 'Medalles', h: 'Motivació<br /><em>per seguir</em>', p: '72 medalles per anar guanyant mentre et poses en forma.' },
];
const END_MS = 2800;
const total = INTRO_MS + SCREENS.reduce((n, s) => n + s.ms, 0) + END_MS;

// ── capturas de la app ─────────────────────────────────────────────────────────
const scr = document.getElementById('scr')!;
const imgs = new Map<string, HTMLImageElement>();
for (const s of SCREENS) for (const n of s.shots) {
  if (imgs.has(n)) continue;
  const im = new Image();
  im.src = new URL(`./assets/app-${n}.jpg`, import.meta.url).href;
  im.style.opacity = '0';
  scr.append(im);
  imgs.set(n, im);
}
const loaded = Promise.all([...imgs.values()].map((im) => im.decode().catch(() => undefined)));

const $ = (id: string) => document.getElementById(id)!;
const bg = $('bg'), phone = $('phone'), head = $('head'), intro = $('intro'), end = $('end'), brand = $('brand');
const smooth = (k: number) => { const c = Math.min(1, Math.max(0, k)); return c * c * (3 - 2 * c); };

function render(ms: number): void {
  bg.hidden = false;
  end.hidden = true; brand.hidden = false;
  // entrada: logo y «Entrena a casa, en català»
  if (ms < INTRO_MS) {
    phone.hidden = true; head.hidden = true; intro.hidden = false;
    const k = smooth(ms / 450), out = smooth((ms - (INTRO_MS - 350)) / 350);
    intro.style.opacity = String(k * (1 - out));
    intro.style.transform = `scale(${0.92 + 0.08 * k + 0.05 * out})`;
    brand.hidden = true;
    return;
  }
  intro.hidden = true;
  let t = ms - INTRO_MS, i = 0;
  while (i < SCREENS.length && t >= SCREENS[i].ms) { t -= SCREENS[i].ms; i++; }
  if (i >= SCREENS.length) {
    bg.hidden = true; phone.hidden = true; head.hidden = true;
    end.hidden = false; brand.hidden = true;
    (end.firstElementChild as HTMLElement).style.transform = `scale(${0.9 + 0.1 * Math.min(1, t / 400)})`;
    return;
  }
  const s = SCREENS[i];
  phone.hidden = false; head.hidden = false;
  // el móvil: inclinado en 3D, entra desde abajo al principio y se mueve muy despacio todo el rato
  const since = ms - INTRO_MS, up = smooth(since / 700);
  const sway = since / 1000;
  const ry = -22 + 5 * Math.sin(sway * 0.35), rx = 10 + 2 * Math.sin(sway * 0.27 + 1), rz = 7 + 1.5 * Math.sin(sway * 0.3 + 2);
  phone.style.transform = `translate(${50 + (1 - up) * 40}px, ${(1 - up) * 560}px) perspective(1300px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg) scale(1.06)`;
  // las capturas: fundido de una a otra (la de antes queda debajo), con un desplazamiento lento hacia arriba
  const per = s.ms / s.shots.length;
  const cur = Math.min(s.shots.length - 1, Math.floor(t / per));
  const first = i === 0;
  const prev = s.shots[cur - 1] ?? (!first ? SCREENS[i - 1].shots.slice(-1)[0] : undefined);
  const k = first && cur === 0 ? 1 : smooth((t - cur * per) / 450);
  imgs.forEach((im, n) => {
    im.style.opacity = String(n === s.shots[cur] ? k : n === prev ? 1 : 0);
    im.style.zIndex = n === s.shots[cur] ? '2' : '1';
    im.style.transform = n === s.shots[cur] ? `translateY(${-14 * ((t - cur * per) / per)}px) scale(1.03)` : 'scale(1.03)';
  });
  // los textos: entran al empezar cada pantalla y salen un poco antes de acabar
  const tin = smooth(t / 500), tout = smooth((t - (s.ms - 350)) / 350);
  $('hk').textContent = s.k;
  $('h2').innerHTML = s.h;
  $('hp').textContent = s.p;
  head.style.opacity = String(tin * (1 - tout));
  head.style.transform = `translateX(${(1 - tin) * -24}px)`;
}

(window as unknown as { __reel: unknown }).__reel = { total, render, ready: Promise.all([document.fonts.ready, loaded]) };
void Promise.all([document.fonts.ready, loaded]).then(() => render(0));
