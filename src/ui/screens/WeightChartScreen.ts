import { DEC, LOCALE } from '../../i18n';
import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { fmtDiff, fmtKg, smoothPath } from '../components/weightCard';

const NS = 'http://www.w3.org/2000/svg';
type Range = 30 | 90 | 180 | 365 | 0;

/**
 * Gráfica del peso a pantalla completa y en horizontal: con el móvil en vertical se dibuja girada 90°
 * (y si el sistema lo permite, además se bloquea la pantalla en horizontal). Más rejilla, más fechas,
 * el valor de cada punto y la elección del periodo.
 */
export class WeightChartScreen implements Screen {
  readonly el = h('main', { class: 'weight-full' });
  private range: Range = 30;
  private box = h('div', { class: 'wf-chart' });
  private chips = h('div', { class: 'wf-chips' });
  private stats = h('div', { class: 'wf-stats' });
  private onResize = () => this.draw();
  /** Final de la ventana que se ve (se mueve arrastrando el dedo). */
  private end = Date.now();
  private plotW = 1;

  constructor(private readonly app: App) {
    this.el.append(h('div', { class: 'wf-rot' },
      h('header', { class: 'wf-head' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('strong', { class: 'wf-title' }, 'Peso'),
        this.stats, this.chips),
      this.box));
    // tocar en cualquier sitio que no sea un punto quita la fecha que se estaba enseñando
    this.el.addEventListener('click', () => this.el.querySelector('.w-tip')?.remove());
    this.dragToScroll();
  }

  private dragToScroll(): void {
    // arrastrar el dedo a lo largo de la gráfica mueve las fechas (hacia atrás o hacia delante)
    let start: { pos: number; end: number; id: number } | null = null, moved = false, raf = 0;
    const along = (e: PointerEvent) => (window.innerHeight > window.innerWidth ? e.clientY : e.clientX); // en vertical va girada 90°
    this.box.addEventListener('pointerdown', (e) => {
      if (!this.range) return;
      start = { pos: along(e), end: this.end, id: e.pointerId };
      moved = false;
    });
    this.box.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = along(e) - start.pos;
      if (!moved && Math.abs(dx) < 6) return;
      if (!moved) { moved = true; this.box.setPointerCapture(e.pointerId); }
      const ms = (dx * this.range * 864e5) / this.plotW;
      const first = this.app.store.weights.length ? Date.parse(this.app.store.weights[0].date) : Date.now();
      // ni más allá de hoy ni antes del primer pesaje (con medio periodo de margen)
      this.end = Math.min(Date.now(), Math.max(first + (this.range * 864e5) / 2, start.end - ms));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.draw(); });
    });
    const stop = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      start = null;
      // tras arrastrar, que el "click" de soltar no enseñe ni quite fechas
      if (moved) window.addEventListener('click', (c) => c.stopPropagation(), { capture: true, once: true });
    };
    this.box.addEventListener('pointerup', stop);
    this.box.addEventListener('pointercancel', stop);
  }

  enter(): void {
    window.addEventListener('resize', this.onResize);
    // pantalla completa en horizontal si el sistema lo deja (si no, la gráfica ya va girada)
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    void so?.lock?.('landscape').catch(() => undefined);
    this.draw();
  }

  leave(): void {
    window.removeEventListener('resize', this.onResize);
    try { screen.orientation?.unlock?.(); } catch { /* sin bloqueo */ }
  }

  private draw(): void {
    const all = this.app.store.weights;
    const since = this.range ? this.end - this.range * 864e5 : -Infinity, until = this.range ? this.end : Infinity;
    const pts = all.filter((p) => Date.parse(p.date) >= since && Date.parse(p.date) <= until);
    // para que la línea llegue a los bordes: el pesaje anterior y el siguiente a la ventana (se recortan)
    const before = all.filter((p) => Date.parse(p.date) < since).pop(), after = all.find((p) => Date.parse(p.date) > until);
    const line = [...(before ? [before] : []), ...pts, ...(after ? [after] : [])];
    const opts: Array<[Range, string]> = [[30, '1 mes'], [90, '3 meses'], [180, '6 meses'], [365, '1 año'], [0, 'Todo']];
    this.chips.replaceChildren(...opts.map(([r, label]) =>
      h('button', { class: 'chip-btn' + (r === this.range ? ' on' : ''), onclick: () => { this.range = r; this.end = Date.now(); this.draw(); } }, label)));
    if (pts.length) {
      const d = pts[pts.length - 1].kg - pts[0].kg;
      this.stats.replaceChildren(h('span', {}, fmtKg(pts[pts.length - 1].kg)),
        ...(pts.length > 1 ? [h('span', { class: 'wf-diff' + (d < 0 ? ' down' : d > 0 ? ' up' : '') }, fmtDiff(d))] : []));
    } else this.stats.replaceChildren();
    // tamaño real del hueco (en horizontal: el ancho es el lado largo)
    const portrait = window.innerHeight > window.innerWidth;
    const W = Math.max(320, (portrait ? window.innerHeight : window.innerWidth) - 24);
    const H = Math.max(200, (portrait ? window.innerWidth : window.innerHeight) - 70);
    this.plotW = W - 60;
    this.box.replaceChildren(line.length
      ? bigChart(line, this.app.store.settings.profile.goalKg ?? null, W, H, this.range ? [since, until] : undefined)
      : h('p', { class: 'muted wf-empty' }, 'No hay pesos anotados en este periodo.'));
  }
}

/** Marcas del eje de fechas según lo que abarca: días, semanas (lunes) o meses (día 1). */
function dateTicks(t0: number, t1: number): { ticks: number[]; fmt: Intl.DateTimeFormatOptions } {
  const days = (t1 - t0) / 864e5;
  const ticks: number[] = [];
  const d = new Date(t0);
  d.setHours(0, 0, 0, 0);
  if (days <= 45) {
    // días: uno de cada N para que quepan unos 8
    const every = Math.max(1, Math.ceil(days / 8));
    for (; d.getTime() <= t1; d.setDate(d.getDate() + every)) if (d.getTime() >= t0) ticks.push(d.getTime());
    return { ticks, fmt: { day: 'numeric', month: 'short' } };
  }
  if (days <= 130) {
    // semanas: cada lunes
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
    const every = days > 90 ? 2 : 1;
    for (; d.getTime() <= t1; d.setDate(d.getDate() + 7 * every)) ticks.push(d.getTime());
    return { ticks, fmt: { day: 'numeric', month: 'short' } };
  }
  // meses: el día 1 de cada mes (uno de cada dos si hay muchos)
  d.setDate(1);
  if (d.getTime() < t0) d.setMonth(d.getMonth() + 1);
  const every = days > 400 ? 2 : 1;
  for (; d.getTime() <= t1; d.setMonth(d.getMonth() + every)) ticks.push(d.getTime());
  return { ticks, fmt: days > 330 ? { month: 'short', year: '2-digit' } : { month: 'long' } };
}

function bigChart(points: ReadonlyArray<{ date: string; kg: number }>, goal: number | null, W: number, H: number, domain?: [number, number]): SVGSVGElement {
  const pad = { l: 44, r: 16, t: 14, b: 28 };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('class', 'weight-chart big');
  const kgs = points.map((p) => p.kg).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...kgs) - 0.5), hi = Math.ceil(Math.max(...kgs) + 0.5);
  const t0 = domain ? domain[0] : Date.parse(points[0].date), t1 = domain ? domain[1] : Date.parse(points[points.length - 1].date);
  const x = (t: number) => pad.l + (t1 > t0 ? ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r) : (W - pad.l - pad.r) / 2);
  const y = (kg: number) => pad.t + (H - pad.t - pad.b) * (1 - (kg - lo) / (hi - lo));
  const el = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text) e.textContent = text;
    svg.append(e);
    return e;
  };
  // rejilla: una línea por kilo (o cada 2 / 5 si el rango es grande)
  const span = hi - lo, step = span <= 8 ? 1 : span <= 20 ? 2 : 5;
  for (let g = Math.ceil(lo / step) * step; g <= hi; g += step) {
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(g), y2: y(g), class: 'grid' });
    el('text', { x: pad.l - 8, y: y(g), class: 'axis', 'text-anchor': 'end', 'dominant-baseline': 'central' }, String(g));
  }
  // fechas: por días, semanas o meses según el periodo
  const { ticks, fmt } = dateTicks(t0, t1);
  for (const t of ticks) {
    const tx = x(t);
    if (tx < pad.l + 12 || tx > W - pad.r - 12) continue;
    el('line', { x1: tx, x2: tx, y1: pad.t, y2: H - pad.b, class: 'grid v' });
    el('text', { x: tx, y: H - 8, class: 'axis', 'text-anchor': 'middle' }, new Date(t).toLocaleDateString(LOCALE, fmt));
  }
  if (goal) {
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(goal), y2: y(goal), class: 'w-goal' });
    el('text', { x: W - pad.r - 2, y: y(goal) - 5, class: 'w-goal-label', 'text-anchor': 'end' }, `Objetivo ${String(goal).replace('.', DEC)}`);
  }
  const P = points.map((p) => [x(Date.parse(p.date)), y(p.kg)] as const);
  // lo que se sale por los lados (al arrastrar) se recorta
  const clipId = `wclip${Math.round(Math.random() * 1e6)}`;
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = `<clipPath id="${clipId}"><rect x="${pad.l - 6}" y="0" width="${W - pad.l - pad.r + 12}" height="${H}"></rect></clipPath>`;
  svg.append(defs);
  const inside = (i: number) => P[i][0] >= pad.l - 6 && P[i][0] <= W - pad.r + 6;
  if (points.length > 1) {
    const curve = smoothPath(P);
    el('path', { d: `${curve} L${P[P.length - 1][0]},${H - pad.b} L${P[0][0]},${H - pad.b} Z`, class: 'w-area', 'clip-path': `url(#${clipId})` });
    el('path', { d: curve, class: 'w-line', 'clip-path': `url(#${clipId})` });
  }
  // el valor encima de cada punto (si no hay demasiados)
  const label = points.length <= 24;
  // al tocar un punto: su fecha (corta) en una etiqueta pequeña, debajo del punto
  const tip = document.createElementNS(NS, 'g');
  tip.setAttribute('class', 'w-tip');
  const show = (i: number) => {
    const text = new Date(points[i].date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
    const w = text.length * 6.6 + 14, bx = Math.min(W - pad.r - w, Math.max(pad.l, P[i][0] - w / 2));
    const by = P[i][1] + 30 > H - pad.b ? P[i][1] - 50 : P[i][1] + 10;
    tip.innerHTML = `<rect x="${bx}" y="${by}" width="${w}" height="26" rx="8"></rect><text x="${bx + w / 2}" y="${by + 17}" text-anchor="middle"></text>`;
    tip.querySelector('text')!.textContent = text;
    svg.append(tip);
  };
  points.forEach((p, i) => {
    if (!inside(i)) return;
    el('circle', { cx: P[i][0], cy: P[i][1], r: i === points.length - 1 ? 5 : 3.5, class: i === points.length - 1 ? 'w-dot last' : 'w-dot' });
    // zona grande y transparente para tocar con el dedo
    el('circle', { cx: P[i][0], cy: P[i][1], r: 16, class: 'w-hit' }).addEventListener('click', (e) => { e.stopPropagation(); show(i); });
    if (label || i === points.length - 1 || i === 0) el('text', { x: P[i][0], y: P[i][1] - 9, class: 'w-val', 'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle' }, p.kg.toFixed(1).replace('.', DEC));
  });
  return svg;
}
