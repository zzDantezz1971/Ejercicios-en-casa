import { LOCALE } from '../../i18n';
import { bestStreak, routineNames, secondsBySection } from '../../domain/stats';
import { weightCard } from '../components/weightCard';
import { medalsCard } from '../components/medals';
import { loadWeights, muscleLoad } from '../../domain/muscleLoad';
import { MUSCLE_NAMES, MUSCLES } from '../../figure/anatomy';
import { bodyMaps } from '../components/bodyMaps';
import { MonthScreen } from './MonthScreen';
import { WeightScreen } from './WeightScreen';
import type { Store } from '../../domain/Store';
import { SECTION_IDS, SECTION_TITLES, type HistoryEntry } from '../../domain/types';
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
  /** Periodo del mapa de músculos. */
  private mapRange: 'week' | 'month' = 'week';
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
      this.body.append(weightCard(this.app, () => this.rerender(), () => this.app.push(new WeightScreen(this.app))));
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
      weightCard(this.app, () => this.rerender(), () => this.app.push(new WeightScreen(this.app))),
      medalsCard(this.app),
      this.chart(list),
      this.calendar(list),
      h('div', { class: 'summary-btns' },
        h('button', { class: 'btn ghost', onclick: () => this.app.push(new MonthScreen(this.app, undefined, 'week')) }, icon('calendar'), 'Resumen semanal'),
        h('button', { class: 'btn ghost', onclick: () => this.app.push(new MonthScreen(this.app, undefined, 'month')) }, icon('calendar'), 'Resumen del mes')),
      this.bySection(list),
      this.muscleMap(list, now),
      h('h3', { class: 'block-title' }, 'Entrenamientos'),
      h('p', { class: 'muted small' }, 'Toca un entrenamiento para ver el detalle, repetirlo o borrarlo.'),
    );

    let month = '';
    for (const e of list) {
      const d = new Date(e.date);
      const m = d.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
      if (m !== month) {
        month = m;
        this.body.append(h('h4', { class: 'group-title' }, m));
      }
      this.body.append(row(e, this.app.store, () => this.app.push(new HistoryDetailScreen(this.app, e))));
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
    const st = this.app.store;
    const week = startOfWeek(now).getTime();
    const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const w = st.totalCalories(list.filter((e) => Date.parse(e.date) >= week));
    const m = st.totalCalories(list.filter((e) => Date.parse(e.date) >= month));
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

  /** Mapa de músculos: el cuerpo de frente y de espaldas coloreado según lo trabajado en la semana o el mes. */
  private muscleMap(list: readonly HistoryEntry[], now: Date): HTMLElement {
    const from = this.mapRange === 'week' ? startOfWeek(now).getTime() : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const entries = list.filter((e) => Date.parse(e.date) >= from);
    const load = muscleLoad(entries, (id) => this.app.catalog.get(id)?.muscles);
    const weights = loadWeights(load);
    const seg = (r: 'week' | 'month', label: string) =>
      h('button', { class: 'seg' + (this.mapRange === r ? ' on' : ''), 'aria-pressed': String(this.mapRange === r), onclick: () => { this.mapRange = r; this.rerender(); } }, label);
    const img = (back: boolean) => {
      const el = h('img', { class: 'mm-img', alt: back ? 'Músculos de espaldas' : 'Músculos de frente' });
      void bodyMaps().bodyMap(weights, back).then((u) => { if (u) el.src = u; else el.remove(); });
      return h('figure', { class: 'mm-fig' }, el, h('figcaption', { class: 'muted small' }, back ? 'Detrás' : 'Delante'));
    };
    const worked = MUSCLES.filter((m) => load.work[m] > 0).sort((a, b) => load.work[b] - load.work[a]);
    const none = MUSCLES.filter((m) => load.work[m] === 0 && load.stretch[m] === 0);
    const onlyStretch = MUSCLES.filter((m) => load.work[m] === 0 && load.stretch[m] > 0);
    const minutes = (s: number) => (s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
    return h('section', { class: 'card muscle-map' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Músculos'), h('div', { class: 'segmented small' }, seg('week', 'Semana'), seg('month', 'Mes'))),
      entries.length && load.missing < entries.length
        ? h('div', { class: 'mm-figs' }, img(false), img(true))
        : h('p', { class: 'muted small' }, entries.length ? 'Los entrenamientos de este periodo son de una versión anterior y no guardan el detalle de cada ejercicio.' : 'Aún no has entrenado en este periodo.'),
      worked.length ? h('p', { class: 'mm-line' }, h('span', { class: 'mu-dot work' }), h('strong', {}, 'Más trabajados: '), worked.slice(0, 5).map((m) => `${MUSCLE_NAMES[m]} (${minutes(load.work[m])})`).join(', ')) : null,
      onlyStretch.length ? h('p', { class: 'mm-line' }, h('span', { class: 'mu-dot stretch' }), h('strong', {}, 'Solo estirados: '), onlyStretch.map((m) => MUSCLE_NAMES[m]).join(', ')) : null,
      worked.length && none.length ? h('p', { class: 'mm-line' }, h('span', { class: 'mu-dot none' }), h('strong', {}, 'Sin trabajar: '), none.map((m) => MUSCLE_NAMES[m]).join(', ')) : null);
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
        el('rect', { x, y: top, width: bwi, height: Math.max(2, H - pad.b - top), rx: 4, class: last ? 'bar now' : 'bar', style: `animation-delay:${i * 60}ms` });
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
    const title = m.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
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

function kcalTag(e: HistoryEntry, store: Store): HTMLElement | null {
  const c = store.caloriesFor(e);
  return c ? h('span', { class: 'h-kcal' }, icon('flame'), `${c.kcal} kcal`) : null;
}

function row(e: HistoryEntry, store: Store, onOpen: () => void): HTMLElement {
  const d = new Date(e.date);
  return h('button', { class: 'card history-row', 'aria-label': `Ver el entrenamiento del ${d.toLocaleDateString(LOCALE)}`, onclick: onOpen },
    h('div', { class: 'h-date' },
      h('span', { class: 'h-day' }, d.toLocaleDateString(LOCALE, { day: 'numeric' })),
      h('span', { class: 'h-wd' }, d.toLocaleDateString(LOCALE, { weekday: 'short' }))),
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
        kcalTag(e, store)),
      !e.completed ? h('span', { class: 'badge warn' }, 'Terminado antes') : null),
    h('span', { class: 'h-time muted small' }, d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })),
  );
}
