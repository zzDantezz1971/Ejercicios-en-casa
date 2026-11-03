import { SECTION_TITLES, type HistoryEntry } from '../../domain/types';
import type { App, Screen } from '../App';
import { addDays, dayKey, minutesPerWeek, startOfWeek, streak, trainedDays, WEEKDAY_LETTERS } from '../dates';
import { clear, confirmDialog, h, humanDuration, plural } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';

const NS = 'http://www.w3.org/2000/svg';

/** Historial: resumen, minutos por semana, calendario y lista de entrenamientos. */
export class HistoryScreen implements Screen {
  readonly el = h('main', { class: 'screen history' });
  readonly tab = 'historial' as const;
  private body = h('div', { class: 'history-body' });
  private month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  constructor(private readonly app: App) {
    this.el.append(h('header', { class: 'page-head' }, h('h1', {}, 'Historial')), this.body);
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    const list = this.app.store.history;
    clear(this.body);
    if (!list.length) {
      this.body.append(h('div', { class: 'empty-state' }, icon('calendar', 'ico big'), h('p', {}, 'Aún no hay entrenamientos. Cuando termines el primero aparecerá aquí.')));
      return;
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysThisMonth = new Set(list.filter((e) => Date.parse(e.date) >= monthStart).map((e) => dayKey(new Date(e.date)))).size;
    const total = list.reduce((n, e) => n + e.durationSec, 0);
    const run = streak(list, now);

    this.body.append(
      h('section', { class: 'stats-row' },
        stat('flame', String(run), run === 1 ? 'día seguido' : 'días seguidos'),
        stat('calendar', String(daysThisMonth), 'días este mes'),
        stat('clock', humanDuration(total), 'en total')),
      this.chart(list),
      this.calendar(list),
      h('h3', { class: 'block-title' }, 'Entrenamientos'),
    );

    let month = '';
    for (const e of list) {
      const d = new Date(e.date);
      const m = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      if (m !== month) {
        month = m;
        this.body.append(h('h4', { class: 'group-title' }, m));
      }
      this.body.append(row(e));
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
      }, icon('trash'), 'Borrar historial'),
    );
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
      const y = window.scrollY;
      this.render();
      window.scrollTo(0, y);
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

function row(e: HistoryEntry): HTMLElement {
  const d = new Date(e.date);
  return h('article', { class: 'card history-row' },
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
      !e.completed ? h('span', { class: 'badge warn' }, 'Terminado antes') : null),
    h('span', { class: 'h-time muted small' }, d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })),
  );
}
