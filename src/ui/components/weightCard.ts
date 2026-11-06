import { LOCALE, DEC } from '../../i18n';
import type { App } from '../App';
import { bodyWeightDialog, h } from '../dom';
import { icon } from '../icons';
import { bmi, bmiCategory } from '../../domain/calories';
import { goalProgress } from '../../domain/goal';
import { checkAndCelebrate } from './medals';

const NS = 'http://www.w3.org/2000/svg';

export function fmtKg(kg: number): string {
  return `${kg.toFixed(1).replace('.', DEC)} kg`;
}

/** Diferencia con signo: −3,5 kg / +0,4 kg. */
export function fmtDiff(d: number): string {
  const v = Math.abs(d).toFixed(1).replace('.', DEC);
  return d < 0 ? `−${v} kg` : d > 0 ? `+${v} kg` : '0 kg';
}

/** Fila con el IMC y su clasificación. */
export function bmiRow(kg: number, cm: number, firstKg?: number): HTMLElement {
  const v = bmi(kg, cm);
  const c = bmiCategory(v);
  const change = firstKg !== undefined && firstKg !== kg ? v - bmi(firstKg, cm) : 0;
  return h('div', { class: 'bmi-row' },
    h('span', { class: 'bmi-label' }, 'IMC'),
    h('strong', {}, String(v).replace('.', DEC)),
    h('span', { class: 'bmi-tag ' + c.tone }, c.label),
    change ? h('span', { class: 'muted small' }, `${change < 0 ? '−' : '+'}${Math.abs(change).toFixed(1).replace('.', DEC)} desde el inicio`) : null);
}

/** Anota el peso de hoy. Devuelve true si se guardó. */
export async function askWeight(app: App): Promise<boolean> {
  const kg = await bodyWeightDialog('Tu peso de hoy', app.store.currentWeight ?? 75);
  if (kg === null) return false;
  app.store.addWeight(kg);
  checkAndCelebrate(app);
  return true;
}

/** Gráfica con la línea del peso a lo largo del tiempo. */
export function weightChart(points: ReadonlyArray<{ date: string; kg: number }>, goal?: number | null): SVGSVGElement {
  const W = 320, H = 130, pad = { l: 34, r: 8, t: 10, b: 20 };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'weight-chart');
  svg.setAttribute('role', 'img');
  const kgs = points.map((p) => p.kg).concat(goal ? [goal] : []);
  const lo = Math.floor(Math.min(...kgs) - 1), hi = Math.ceil(Math.max(...kgs) + 1);
  const t0 = Date.parse(points[0].date), t1 = Date.parse(points[points.length - 1].date);
  const x = (d: string) => pad.l + (t1 > t0 ? ((Date.parse(d) - t0) / (t1 - t0)) * (W - pad.l - pad.r) : (W - pad.l - pad.r) / 2);
  const y = (kg: number) => pad.t + (H - pad.t - pad.b) * (1 - (kg - lo) / (hi - lo));
  const el = (tag: string, attrs: Record<string, string | number>, text?: string) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    if (text) e.textContent = text;
    svg.append(e);
    return e;
  };
  for (const g of [lo, (lo + hi) / 2, hi]) {
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(g), y2: y(g), class: 'grid' });
    el('text', { x: pad.l - 6, y: y(g), class: 'axis', 'text-anchor': 'end', 'dominant-baseline': 'central' }, String(Math.round(g * 10) / 10).replace('.', DEC));
  }
  if (goal) {
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(goal), y2: y(goal), class: 'w-goal' });
    el('text', { x: W - pad.r - 2, y: y(goal) - 4, class: 'w-goal-label', 'text-anchor': 'end' }, `Objetivo ${String(goal).replace('.', DEC)}`);
  }
  const short = (d: string) => new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  el('text', { x: x(points[0].date), y: H - 4, class: 'axis', 'text-anchor': points.length > 1 ? 'start' : 'middle' }, short(points[0].date));
  if (points.length > 1) el('text', { x: W - pad.r, y: H - 4, class: 'axis', 'text-anchor': 'end' }, short(points[points.length - 1].date));
  if (points.length > 1) el('polyline', { points: points.map((p) => `${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' '), class: 'w-line', pathLength: 1 });
  points.forEach((p, i) => el('circle', { cx: x(p.date), cy: y(p.kg), r: i === points.length - 1 ? 4.5 : 3, class: i === points.length - 1 ? 'w-dot last' : 'w-dot' }));
  svg.setAttribute('aria-label', `Peso de ${fmtKg(points[0].kg)} a ${fmtKg(points[points.length - 1].kg)}`);
  return svg;
}

/** Tarjeta del Historial: peso actual, cambio desde el principio, gráfica y botón para anotar. */
export function weightCard(app: App, onChange: () => void, onOpen: () => void): HTMLElement {
  const ws = app.store.weights;
  const add = h('button', {
    class: 'btn primary small',
    onclick: async (ev: Event) => {
      ev.stopPropagation();
      if (await askWeight(app)) onChange();
    },
  }, icon('plus'), 'Anotar peso');
  if (!ws.length) {
    return h('section', { class: 'card weight-card' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Peso')),
      h('p', { class: 'muted small' }, 'Anota tu peso para ver cómo evoluciona y calcular las calorías de cada entrenamiento.'),
      h('div', { class: 'wc-actions' }, add));
  }
  const first = ws[0], last = ws[ws.length - 1];
  const height = app.store.settings.profile.height;
  const goal = app.store.settings.profile.goalKg;
  const diff = last.kg - first.kg;
  const since = new Date(first.date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
  return h('section', { class: 'card weight-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Peso'),
      h('button', { class: 'link-btn', onclick: onOpen }, 'Ver todo', icon('chevron'))),
    h('div', { class: 'wc-now' },
      h('strong', {}, fmtKg(last.kg)),
      ws.length > 1 ? h('span', { class: 'wc-diff' + (diff < 0 ? ' down' : diff > 0 ? ' up' : '') }, `${fmtDiff(diff)} desde el ${since}`) : h('span', { class: 'muted small' }, 'Primera anotación')),
    height ? bmiRow(last.kg, height, first.kg) : h('p', { class: 'muted small' }, 'Pon tu altura en Ajustes › Mis datos para ver tu IMC.'),
    goal ? goalBlock(first.kg, last.kg, goal) : null,
    weightChart(ws, goal) as unknown as HTMLElement,
    h('div', { class: 'wc-actions' }, add));
}

/** "Te faltan X kg" con barra de progreso, o la felicitación si ya se ha llegado. */
export function goalBlock(firstKg: number, currentKg: number, goal: number): HTMLElement {
  const g = goalProgress(firstKg, currentKg, goal);
  if (g.reached) {
    return h('div', { class: 'goal-block reached' }, icon('trophy'),
      h('div', {}, h('strong', {}, '¡Objetivo conseguido!'), h('span', { class: 'muted small' }, `Has llegado a ${fmtKg(goal)}. Puedes fijar uno nuevo en Ajustes › Mis datos.`)));
  }
  const bar = h('span', { class: 'goal-fill' });
  bar.style.width = `${Math.round(g.done * 100)}%`;
  return h('div', { class: 'goal-block' },
    h('div', { class: 'goal-top' }, h('strong', {}, `Te faltan ${fmtKg(g.left)}`), h('span', { class: 'muted small' }, `Objetivo ${fmtKg(goal)} · ${Math.round(g.done * 100)} %`)),
    h('span', { class: 'goal-bar' }, bar));
}
