import { SECTION_TITLES, type HistoryEntry } from '../../domain/types';
import { timeText } from '../../i18n/fmtDate';
import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon, SECTION_STYLE } from '../icons';

const NS = 'http://www.w3.org/2000/svg';

/**
 * Gráfica del pulso de un entrenamiento, grande y en horizontal (girada si el móvil está en vertical): la hora de
 * inicio y de fin, la hora de cada pulsación (tocando o arrastrando el dedo) y una línea en cada cambio de bloque.
 */
export class HeartChartScreen implements Screen {
  readonly el = h('main', { class: 'weight-full heart-full' });
  private box = h('div', { class: 'wf-chart' });
  private onResize = () => this.draw();

  constructor(app: App, private readonly entry: HistoryEntry) {
    const hr = entry.heart!;
    const start = new Date(entry.date);
    const end = new Date(start.getTime() + (entry.durationSec + (entry.pausedSec ?? 0)) * 1000);
    this.el.append(h('div', { class: 'wf-rot' },
      h('header', { class: 'wf-head' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('strong', { class: 'wf-title' }, 'Pulsaciones'),
        h('span', { class: 'hc-range' }, icon('clock'), `${timeText(start)} – ${timeText(end)}`),
        h('span', { class: 'wf-stats hc-stats' },
          h('span', {}, `Media ${hr.avg}`), h('span', {}, `Máx. ${hr.max}`), h('span', {}, `Mín. ${hr.min}`))),
      this.box));
  }

  enter(): void {
    window.addEventListener('resize', this.onResize);
    // en horizontal si el sistema lo deja (si no, la gráfica ya va girada)
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    void so?.lock?.('landscape').catch(() => undefined);
    this.draw();
  }

  leave(): void {
    window.removeEventListener('resize', this.onResize);
    try { screen.orientation?.unlock?.(); } catch { /* sin bloqueo */ }
  }

  private draw(): void {
    const portrait = window.innerHeight > window.innerWidth;
    const bw = this.box.clientWidth, bh = this.box.clientHeight;
    const W = Math.max(320, bw > 100 ? bw : (portrait ? window.innerHeight : window.innerWidth) - 24);
    const H = Math.max(200, bh > 100 ? bh : (portrait ? window.innerWidth : window.innerHeight) - 70);
    this.box.replaceChildren(heartChart(this.entry, W, H));
  }
}

function heartChart(e: HistoryEntry, W: number, H: number): SVGSVGElement {
  const hr = e.heart!;
  const s = hr.samples;
  // segundo de cada muestra desde el inicio (los entrenamientos antiguos no lo guardaban: una cada 5 s)
  const T = hr.times && hr.times.length === s.length ? hr.times : s.map((_b, i) => i * 5);
  const start = Date.parse(e.date);
  const total = Math.max(T[T.length - 1] ?? 0, e.durationSec + (e.pausedSec ?? 0), 60);
  const pad = { l: 40, r: 14, t: 30, b: 28 };
  // la escala, con las muestras de verdad (por si el mínimo o el máximo guardados no coinciden)
  const sMin = Math.min(...s), sMax = Math.max(...s);
  const lo = Math.max(30, Math.floor((sMin - 8) / 10) * 10), hi = Math.ceil((sMax + 8) / 10) * 10;
  const x = (t: number) => pad.l + (t / total) * (W - pad.l - pad.r);
  const y = (b: number) => pad.t + (H - pad.t - pad.b) * (1 - (b - lo) / (hi - lo));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('class', 'weight-chart big heart-chart');
  const el = (tag: string, attrs: Record<string, string | number>, text?: string, parent: Element = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text) n.textContent = text;
    parent.append(n);
    return n;
  };
  const clock = (t: number) => timeText(new Date(start + t * 1000));
  // rejilla de pulsaciones (cada 10 o 20)
  const stepB = hi - lo > 80 ? 20 : 10;
  for (let b = lo; b <= hi; b += stepB) {
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(b), y2: y(b), class: 'grid' });
    el('text', { x: pad.l - 6, y: y(b), class: 'axis', 'text-anchor': 'end', 'dominant-baseline': 'central' }, String(b));
  }
  // horas: la de inicio y la de fin en los extremos, y en medio cada pocos minutos
  const mins = total / 60;
  const every = [1, 2, 5, 10, 15, 30].find((m) => mins / m <= 8) ?? 60;
  for (let t = every * 60; t < total - every * 30; t += every * 60) {
    el('line', { x1: x(t), x2: x(t), y1: pad.t, y2: H - pad.b, class: 'grid v' });
    el('text', { x: x(t), y: H - 8, class: 'axis', 'text-anchor': 'middle' }, clock(t));
  }
  el('text', { x: pad.l, y: H - 8, class: 'axis hc-end', 'text-anchor': 'start' }, clock(0));
  el('text', { x: W - pad.r, y: H - 8, class: 'axis hc-end', 'text-anchor': 'end' }, clock(total));
  // cambios de bloque: una línea vertical con el color y el nombre del bloque que empieza
  (e.blocks ?? []).forEach((b, i) => {
    if (i === 0 && b.at < 5) {
      // el primero (al empezar): solo su nombre, arriba a la izquierda
      el('text', { x: pad.l + 4, y: 14, class: 'hc-block', fill: SECTION_STYLE[b.section].color }, SECTION_TITLES[b.section]);
      return;
    }
    const bx = x(b.at);
    el('line', { x1: bx, x2: bx, y1: pad.t - 10, y2: H - pad.b, class: 'hc-block-line', stroke: SECTION_STYLE[b.section].color });
    el('text', { x: bx + 4, y: 14, class: 'hc-block', fill: SECTION_STYLE[b.section].color }, SECTION_TITLES[b.section]);
  });
  // media
  el('line', { x1: pad.l, x2: W - pad.r, y1: y(hr.avg), y2: y(hr.avg), class: 'hr-avg' });
  // la línea del pulso
  const pts = s.map((b, i) => `${x(T[i]).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
  el('polygon', { points: `${x(T[0])},${H - pad.b} ${pts} ${x(T[T.length - 1])},${H - pad.b}`, class: 'hr-area' });
  el('polyline', { points: pts, class: 'hr-line' });
  // al tocar o arrastrar: una línea, el punto y «10:32 · 128 ppm»
  const cursor = document.createElementNS(NS, 'g');
  cursor.setAttribute('class', 'hc-cursor');
  const show = (ev: PointerEvent) => {
    const m = svg.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    const t = ((p.x - pad.l) / (W - pad.l - pad.r)) * total;
    let k = 0;
    T.forEach((tt, i) => { if (Math.abs(tt - t) < Math.abs(T[k] - t)) k = i; });
    const cx = x(T[k]), cy = y(s[k]);
    const text = `${clock(T[k])} · ${s[k]} ppm`;
    const w = text.length * 7 + 16, bx = Math.min(W - pad.r - w, Math.max(pad.l, cx - w / 2));
    const by = cy - 40 < pad.t ? cy + 12 : cy - 40;
    cursor.replaceChildren();
    el('line', { x1: cx, x2: cx, y1: pad.t, y2: H - pad.b, class: 'hc-cursor-line' }, undefined, cursor);
    el('circle', { cx, cy, r: 5, class: 'hc-dot' }, undefined, cursor);
    el('rect', { x: bx, y: by, width: w, height: 28, rx: 8, class: 'hc-tip' }, undefined, cursor);
    el('text', { x: bx + w / 2, y: by + 18, 'text-anchor': 'middle', class: 'hc-tip-text' }, text, cursor);
    svg.append(cursor);
  };
  svg.addEventListener('pointerdown', (ev) => { svg.setPointerCapture(ev.pointerId); show(ev); });
  svg.addEventListener('pointermove', (ev) => { if (ev.buttons || ev.pointerType === 'mouse') show(ev); });
  return svg;
}
