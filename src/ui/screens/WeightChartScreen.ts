import { DEC, LOCALE } from '../../i18n';
import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { fmtDiff, fmtKg } from '../components/weightCard';

const NS = 'http://www.w3.org/2000/svg';
type Range = 30 | 90 | 180 | 365 | 0;

/**
 * Gráfica del peso a pantalla completa y en horizontal: con el móvil en vertical se dibuja girada 90°
 * (y si el sistema lo permite, además se bloquea la pantalla en horizontal). Más rejilla, más fechas,
 * el valor de cada punto y la elección del periodo.
 */
export class WeightChartScreen implements Screen {
  readonly el = h('main', { class: 'weight-full' });
  private range: Range = 0;
  private box = h('div', { class: 'wf-chart' });
  private chips = h('div', { class: 'wf-chips' });
  private stats = h('div', { class: 'wf-stats' });
  private onResize = () => this.draw();

  constructor(private readonly app: App) {
    this.el.append(h('div', { class: 'wf-rot' },
      h('header', { class: 'wf-head' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('strong', { class: 'wf-title' }, 'Peso'),
        this.stats, this.chips),
      this.box));
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

  onBack(): boolean {
    this.app.back();
    return true;
  }

  private draw(): void {
    const all = this.app.store.weights;
    const since = this.range ? Date.now() - this.range * 864e5 : -Infinity;
    const pts = all.filter((p) => Date.parse(p.date) >= since);
    const opts: Array<[Range, string]> = [[30, '1 mes'], [90, '3 meses'], [180, '6 meses'], [365, '1 año'], [0, 'Todo']];
    this.chips.replaceChildren(...opts.map(([r, label]) =>
      h('button', { class: 'chip-btn' + (r === this.range ? ' on' : ''), onclick: () => { this.range = r; this.draw(); } }, label)));
    if (pts.length) {
      const d = pts[pts.length - 1].kg - pts[0].kg;
      this.stats.replaceChildren(h('span', {}, fmtKg(pts[pts.length - 1].kg)),
        ...(pts.length > 1 ? [h('span', { class: 'wf-diff' + (d < 0 ? ' down' : d > 0 ? ' up' : '') }, fmtDiff(d))] : []));
    } else this.stats.replaceChildren();
    // tamaño real del hueco (en horizontal: el ancho es el lado largo)
    const portrait = window.innerHeight > window.innerWidth;
    const W = Math.max(320, (portrait ? window.innerHeight : window.innerWidth) - 24);
    const H = Math.max(200, (portrait ? window.innerWidth : window.innerHeight) - 70);
    this.box.replaceChildren(pts.length
      ? bigChart(pts, this.app.store.settings.profile.goalKg ?? null, W, H)
      : h('p', { class: 'muted wf-empty' }, 'No hay pesos anotados en este periodo.'));
  }
}

function bigChart(points: ReadonlyArray<{ date: string; kg: number }>, goal: number | null, W: number, H: number): SVGSVGElement {
  const pad = { l: 44, r: 16, t: 14, b: 28 };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  svg.setAttribute('class', 'weight-chart big');
  const kgs = points.map((p) => p.kg).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...kgs) - 0.5), hi = Math.ceil(Math.max(...kgs) + 0.5);
  const t0 = Date.parse(points[0].date), t1 = Date.parse(points[points.length - 1].date);
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
  // fechas: unas 6 repartidas
  const nT = Math.min(6, Math.max(1, points.length));
  for (let i = 0; i < nT; i++) {
    const t = nT === 1 ? t0 : t0 + ((t1 - t0) * i) / (nT - 1);
    el('line', { x1: x(t), x2: x(t), y1: pad.t, y2: H - pad.b, class: 'grid v' });
    el('text', { x: x(t), y: H - 8, class: 'axis', 'text-anchor': i === 0 ? 'start' : i === nT - 1 ? 'end' : 'middle' },
      new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }));
  }
  if (goal) {
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(goal), y2: y(goal), class: 'w-goal' });
    el('text', { x: W - pad.r - 2, y: y(goal) - 5, class: 'w-goal-label', 'text-anchor': 'end' }, `Objetivo ${String(goal).replace('.', DEC)}`);
  }
  const P = points.map((p) => [x(Date.parse(p.date)), y(p.kg)] as const);
  if (points.length > 1) {
    el('path', { d: `M${P[0][0]},${H - pad.b} ` + P.map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join(' ') + ` L${P[P.length - 1][0]},${H - pad.b} Z`, class: 'w-area' });
    el('polyline', { points: P.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' '), class: 'w-line' });
  }
  // el valor encima de cada punto (si no hay demasiados)
  const label = points.length <= 24;
  points.forEach((p, i) => {
    el('circle', { cx: P[i][0], cy: P[i][1], r: i === points.length - 1 ? 5 : 3.5, class: i === points.length - 1 ? 'w-dot last' : 'w-dot' });
    if (label || i === points.length - 1 || i === 0) el('text', { x: P[i][0], y: P[i][1] - 9, class: 'w-val', 'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle' }, p.kg.toFixed(1).replace('.', DEC));
  });
  return svg;
}
