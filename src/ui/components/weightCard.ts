import { LOCALE, DEC } from '../../i18n';
import type { App } from '../App';
import { actionSheet, bodyWeightDialog, h } from '../dom';
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

/** Mis datos: tres tarjetas. Peso (el actual en grande, el cambio, botón para anotar y la gráfica),
    Objetivo (cuánto falta, con un solo botón para cambiarlo o quitarlo) e IMC (con su escala de colores). */
export function weightCards(app: App, onChange: () => void, onOpen: () => void): HTMLElement[] {
  const ws = app.store.weights;
  const profile = app.store.settings.profile;
  const goal = profile.goalKg ?? null;
  const add = h('button', { class: 'btn primary small', onclick: async () => { if (await askWeight(app)) onChange(); } }, icon('plus'), 'Anotar peso');
  const setGoal = (goalKg: number | null) => {
    app.store.saveSettings({ ...app.store.settings, profile: { ...app.store.settings.profile, goalKg } });
    onChange();
  };
  const askGoal = async () => {
    const kg = await bodyWeightDialog('Peso al que quieres llegar', goal ?? Math.round(((app.store.currentWeight ?? 80) - 3) * 10) / 10);
    if (kg !== null) setGoal(kg);
  };
  const goalMenu = async () => {
    const c = await actionSheet('Objetivo de peso', [{ id: 'change', label: 'Cambiar objetivo' }, { id: 'remove', label: 'Quitar objetivo', danger: true }]);
    if (c === 'change') void askGoal();
    if (c === 'remove') setGoal(null);
  };
  const first = ws[0], last = ws[ws.length - 1];

  // 1. Peso
  const peso = !last
    ? h('section', { class: 'card weight-card' }, h('div', { class: 'card-head' }, h('h3', {}, 'Peso')),
      h('div', { class: 'wa-hero' }, h('p', { class: 'muted small' }, 'Anota tu peso para ver cómo evoluciona y calcular las calorías de cada entrenamiento.'), add))
    : (() => {
      const diff = last.kg - first.kg;
      const when = new Date(last.date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
      const chip = ws.length > 1 ? h('span', { class: 'wv-diff' + (diff < 0 ? ' down' : diff > 0 ? ' up' : '') }, `${diff < 0 ? '↓ ' : diff > 0 ? '↑ ' : ''}${fmtDiff(diff).replace(/^[−+]/, '')} desde el inicio`) : null;
      return h('section', { class: 'card weight-card' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Peso'), h('button', { class: 'link-btn', onclick: onOpen }, 'Ver todo', icon('chevron'))),
        h('div', { class: 'wa-hero' },
          h('div', {}, h('strong', { class: 'wa-kg' }, fmtKg(last.kg)), h('div', { class: 'wa-sub' }, chip, h('span', { class: 'muted small' }, when))),
          add),
        weightChart(ws, goal) as unknown as HTMLElement);
    })();

  // 2. Objetivo: "Peso objetivo 78,0 kg · 61 %", "Te faltan 2,6 kg", la barra y el botón Cambiar objetivo
  const g = goal && last ? goalProgress(first.kg, last.kg, goal) : null;
  const fill = h('span', { class: 'goal-fill' });
  if (g) fill.style.width = `${Math.round(g.done * 100)}%`;
  const objetivo = h('section', { class: 'card weight-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Objetivo')),
    goal
      ? h('div', { class: 'wb-goal' },
        h('div', { class: 'wb-goal-line' }, h('span', {}, 'Peso objetivo'), h('strong', {}, fmtKg(goal)), g ? h('strong', { class: 'wb-pct' }, `${Math.round(g.done * 100)} %`) : null),
        g ? h('p', { class: 'wb-left' + (g.reached ? ' reached' : '') }, g.reached ? '¡Objetivo conseguido!' : `Te faltan ${fmtKg(g.left)}`) : null,
        g ? h('span', { class: 'goal-bar' }, fill) : null,
        h('button', { class: 'btn ghost small block', onclick: () => void goalMenu() }, icon('target'), 'Cambiar objetivo'))
      : h('div', { class: 'wb-row' }, h('p', { class: 'muted small' }, 'Fija un peso al que quieras llegar y verás cuánto te falta.'),
        h('button', { class: 'btn primary small', onclick: () => void askGoal() }, 'Fijar')));

  // 3. IMC (solo con peso anotado)
  if (!last) return [peso, objetivo];
  const height = profile.height;
  const v = height ? bmi(last.kg, height) : null;
  const imc = h('section', { class: 'card weight-card' }, h('div', { class: 'card-head' }, h('h3', {}, 'IMC')),
    v !== null ? bmiScale(v) : h('p', { class: 'muted small' }, 'Pon tu altura arriba para calcular tu IMC.'));
  return [peso, objetivo, imc];
}

/** Valor del IMC con una escala de colores (bajo peso, normal, sobrepeso, obesidad) y una marca donde estás. */
function bmiScale(v: number): HTMLElement {
  const cat = bmiCategory(v);
  const lo = 15, hi = 35;
  const at = (x: number) => `${(((Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  const mark = h('span', { class: 'wb-mark' });
  mark.style.left = at(v);
  const seg = (from: number, to: number, cls: string) => {
    const s = h('span', { class: 'wb-seg ' + cls });
    s.style.flex = String(to - from);
    return s;
  };
  return h('div', { class: 'wb-bmi' },
    h('div', { class: 'wb-bmi-top' }, h('strong', { class: 'wa-kg' }, String(v).replace('.', DEC)), h('span', { class: 'bmi-tag ' + cat.tone }, cat.label)),
    h('div', { class: 'wb-scale' }, seg(15, 18.5, 'low'), seg(18.5, 25, 'ok'), seg(25, 30, 'high'), seg(30, 35, 'veryHigh'), mark),
    h('div', { class: 'wb-ticks' }, ...[18.5, 25, 30].map((t) => {
      const s = h('span', {}, String(t).replace('.', DEC));
      s.style.left = at(t);
      return s;
    })));
}

