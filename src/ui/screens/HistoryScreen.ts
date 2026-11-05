import { bestStreak, routineNames, secondsBySection } from '../../domain/stats';
import { caloriesOf, totalCalories } from '../../domain/calories';
import { SECTION_IDS, SECTION_TITLES, type HistoryEntry, type Profile } from '../../domain/types';
import type { App, Screen } from '../App';
import { addDays, dayKey, minutesPerWeek, startOfWeek, streak, trainedDays, WEEKDAY_LETTERS } from '../dates';
import { append, clear, confirmDialog, h, humanDuration, plural } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { HistoryDetailScreen } from './HistoryDetailScreen';
import { backupCard, backupDue } from '../components/backupPrompt';

const NS = 'http://www.w3.org/2000/svg';

/** Historial: resumen, minutos por semana, calendario y lista de entrenamientos. */
export class HistoryScreen implements Screen {
  readonly el = h('main', { class: 'screen history' });
  readonly tab = 'historial' as const;
  private body = h('div', { class: 'history-body' });
  private month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  /** Tabla por la que se filtra (null = todas). */
  private filter: string | null = null;

  constructor(private readonly app: App) {
    this.el.append(h('header', { class: 'page-head' }, h('h1', {}, 'Historial')), this.body);
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    const all = this.app.store.history;
    clear(this.body);
    if (!all.length) {
      this.body.append(h('div', { class: 'empty-state' }, icon('calendar', 'ico big'), h('p', {}, 'Aún no hay entrenamientos. Cuando termines el primero aparecerá aquí.')));
      return;
    }
    const names = routineNames(all);
    if (this.filter && !names.includes(this.filter)) this.filter = null;
    const list = this.filter ? all.filter((e) => e.routineName === this.filter) : all;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysThisMonth = new Set(list.filter((e) => Date.parse(e.date) >= monthStart).map((e) => dayKey(new Date(e.date)))).size;
    const total = list.reduce((n, e) => n + e.durationSec, 0);
    const run = streak(list, now);

    append(this.body,
      backupDue(this.app) ? backupCard(this.app, { question: false }) : null,
      names.length > 1 ? this.filters(names) : null,
      h('section', { class: 'stats-row four' },
        stat('flame', String(run), run === 1 ? 'día seguido' : 'días seguidos'),
        stat('trophy', String(bestStreak(list)), 'récord de racha'),
        stat('calendar', String(daysThisMonth), 'días este mes'),
        stat('clock', humanDuration(total), 'en total'),
        ...this.kcalStats(list, now)),
      this.chart(list),
      this.calendar(list),
      this.bySection(list),
      h('h3', { class: 'block-title' }, 'Entrenamientos'),
      h('p', { class: 'muted small' }, 'Toca un entrenamiento para ver el detalle, repetirlo o borrarlo.'),
    );

    let month = '';
    for (const e of list) {
      const d = new Date(e.date);
      const m = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      if (m !== month) {
        month = m;
        this.body.append(h('h4', { class: 'group-title' }, m));
      }
      this.body.append(row(e, this.app.store.settings.profile, () => this.app.push(new HistoryDetailScreen(this.app, e))));
    }
    this.body.append(
      h('button', {
        class: 'btn danger block',
        onclick: async () => {
          if (await confirmDialog('¿Borrar todo el historial? No se puede deshacer.', 'Borrar')) {
            this.app.store.clearHistory();
            this.render();
          }
        },
      }, icon('trash'), 'Borrar todo el historial'),
    );
  }

  /** Calorías de esta semana y de este mes (si hay peso en Mis datos). */
  private kcalStats(list: readonly HistoryEntry[], now: Date): HTMLElement[] {
    const p = this.app.store.settings.profile;
    const week = startOfWeek(now).getTime();
    const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const w = totalCalories(list.filter((e) => Date.parse(e.date) >= week), p);
    const m = totalCalories(list.filter((e) => Date.parse(e.date) >= month), p);
    if (w === null || m === null) return [];
    return [stat('flame', String(w), 'kcal esta semana'), stat('flame', String(m), 'kcal este mes')];
  }

  private rerender(): void {
    const y = window.scrollY;
    this.render();
    window.scrollTo(0, y);
  }

  /** Chips para ver solo los entrenamientos de una tabla. */
  private filters(names: string[]): HTMLElement {
    const chip = (label: string, value: string | null) =>
      h('button', {
        class: 'filter-chip' + (this.filter === value ? ' on' : ''),
        'aria-pressed': String(this.filter === value),
        onclick: () => { this.filter = value; this.rerender(); },
      }, label);
    return h('div', { class: 'filter-chips', role: 'group', 'aria-label': 'Filtrar por tabla' },
      chip('Todas', null), ...names.map((n) => chip(n, n)));
  }

  /** Barras con el tiempo dedicado a cada apartado. */
  private bySection(list: readonly HistoryEntry[]): HTMLElement | null {
    const { bySection, approximate } = secondsBySection(list);
    const max = Math.max(...SECTION_IDS.map((s) => bySection[s]));
    if (max <= 0) return null;
    return h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Tiempo por apartado'), approximate ? h('span', { class: 'muted small' }, 'aprox.') : null),
      ...SECTION_IDS.map((s) => {
        const st = SECTION_STYLE[s];
        const fill = h('span', { class: 'sb-fill' });
        fill.style.width = `${(bySection[s] / max) * 100}%`;
        const r = h('div', { class: 'sb-row' },
          h('span', { class: 'sec-dot' }, icon(st.icon)),
          h('span', { class: 'sb-name' }, SECTION_TITLES[s]),
          h('span', { class: 'sb-bar' }, fill),
          h('span', { class: 'sb-val' }, bySection[s] ? humanDuration(bySection[s]) : '—'));
        r.style.setProperty('--sec', st.color);
        return r;
      }));
  }

  /** Barras con los minutos de las últimas 8 semanas. */
  private chart(list: readonly HistoryEntry[]): HTMLElement {
    const weeks = minutesPerWeek(list, 8);
    const max = Math.max(30, ...weeks.map((w) => w.minutes));
    const nice = Math.ceil(max / 30) * 30;
    const W = 320, H = 150, pad = { l: 30, r: 6, t: 14, b: 22 };
    const bw = (W - pad.l - pad.r) / weeks.length;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Minutos entrenados por semana en las últimas 8 semanas');
    const el = (tag: string, attrs: Record<string, string | number>, text?: string) => {
      const e = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      if (text) e.textContent = text;
      svg.append(e);
      return e;
    };
    const y = (m: number) => pad.t + (H - pad.t - pad.b) * (1 - m / nice);
    for (const g of [0, nice / 2, nice]) {
      el('line', { x1: pad.l, x2: W - pad.r, y1: y(g), y2: y(g), class: 'grid' });
      el('text', { x: pad.l - 6, y: y(g), class: 'axis', 'text-anchor': 'end', 'dominant-baseline': 'central' }, String(g));
    }
    weeks.forEach((w, i) => {
      const x = pad.l + i * bw + bw * 0.18, bwi = bw * 0.64;
      const last = i === weeks.length - 1;
      if (w.minutes > 0) {
        const top = y(w.minutes);
        el('rect', { x, y: top, width: bwi, height: Math.max(2, H - pad.b - top), rx: 4, class: last ? 'bar now' : 'bar' });
        if (last || w.minutes === Math.max(...weeks.map((q) => q.minutes))) el('text', { x: x + bwi / 2, y: top - 4, class: 'val', 'text-anchor': 'middle' }, String(Math.round(w.minutes)));
      }
      el('text', { x: x + bwi / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, last ? 'Esta' : `${w.start.getDate()}/${w.start.getMonth() + 1}`);
    });
    return h('section', { class: 'card chart-card' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Minutos por semana'), h('span', { class: 'muted small' }, 'Últimas 8 semanas')),
      svg as unknown as HTMLElement);
  }

  /** Calendario del mes con los días entrenados. */
  private calendar(list: readonly HistoryEntry[]): HTMLElement {
    const days = trainedDays(list);
    const m = this.month;
    const first = startOfWeek(m);
    const today = dayKey(new Date());
    const title = m.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const cells: HTMLElement[] = WEEKDAY_LETTERS.map((l) => h('span', { class: 'cal-wd' }, l));
    for (let i = 0; i < 42; i++) {
      const d = addDays(first, i);
      if (i >= 35 && d.getMonth() !== m.getMonth()) break;
      const k = dayKey(d);
      cells.push(h('span', { class: 'cal-day' + (d.getMonth() !== m.getMonth() ? ' out' : '') + (days.has(k) ? ' done' : '') + (k === today ? ' today' : '') }, String(d.getDate())));
    }
    const go = (delta: number) => {
      this.month = new Date(m.getFullYear(), m.getMonth() + delta, 1);
      this.rerender();
    };
    const isCurrent = m.getFullYear() === new Date().getFullYear() && m.getMonth() === new Date().getMonth();
    return h('section', { class: 'card cal-card' },
      h('div', { class: 'card-head' },
        h('button', { class: 'icon-btn small', 'aria-label': 'Mes anterior', onclick: () => go(-1) }, icon('back')),
        h('h3', { class: 'cal-title' }, title),
        h('button', { class: 'icon-btn small', 'aria-label': 'Mes siguiente', disabled: isCurrent, onclick: () => go(1) }, icon('chevron'))),
      h('div', { class: 'cal-grid' }, ...cells));
  }
}

function stat(ic: IconName, value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label));
}

function kcalTag(e: HistoryEntry, profile: Profile): HTMLElement | null {
  const c = caloriesOf(e, profile);
  return c ? h('span', { class: 'h-kcal' }, icon('flame'), `${c.kcal} kcal`) : null;
}

function row(e: HistoryEntry, profile: Profile, onOpen: () => void): HTMLElement {
  const d = new Date(e.date);
  return h('button', { class: 'card history-row', 'aria-label': `Ver el entrenamiento del ${d.toLocaleDateString('es-ES')}`, onclick: onOpen },
    h('div', { class: 'h-date' },
      h('span', { class: 'h-day' }, d.toLocaleDateString('es-ES', { day: 'numeric' })),
      h('span', { class: 'h-wd' }, d.toLocaleDateString('es-ES', { weekday: 'short' }))),
    h('div', { class: 'h-main' },
      e.routineName ? h('span', { class: 'h-name' }, e.routineName) : null,
      h('strong', {}, `${humanDuration(e.durationSec)} · ${plural(e.exercisesDone, 'ejercicio', 'ejercicios')}`),
      h('span', { class: 'h-secs' }, ...e.sections.map((s) => {
        const c = h('span', { class: 'sec-dot', title: SECTION_TITLES[s] }, icon(SECTION_STYLE[s].icon));
        c.style.setProperty('--sec', SECTION_STYLE[s].color);
        return c;
      })),
      h('span', { class: 'h-extra' },
        e.heart ? h('span', { class: 'h-hr' }, icon('heart'), `${e.heart.avg} ppm`) : null,
        kcalTag(e, profile)),
      !e.completed ? h('span', { class: 'badge warn' }, 'Terminado antes') : null),
    h('span', { class: 'h-time muted small' }, d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })),
  );
}
