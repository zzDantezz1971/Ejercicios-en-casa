import { LOCALE } from '../../i18n';
import { bestStreak, routineNames } from '../../domain/stats';
import { MonthScreen } from './MonthScreen';
import type { Store } from '../../domain/Store';
import { SECTION_TITLES, type HistoryEntry } from '../../domain/types';
import type { App, Screen } from '../App';
import { addDays, dayKey, startOfWeek, streak, trainedDays, WEEKDAY_LETTERS } from '../dates';
import { append, clear, confirmDialog, h, humanDuration, plural } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { HistoryDetailScreen } from './HistoryDetailScreen';
import { backupCard, backupDue } from '../components/backupPrompt';

/** Historial: récords, calendario y botones de los resúmenes semanal y mensual. */
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
    append(this.body,
      backupDue(this.app) ? backupCard(this.app) : null,
      names.length > 1 ? this.filters(names) : null,
      this.records(list),
      this.calendar(list),
      h('div', { class: 'summary-btns' },
        h('button', { class: 'btn ghost', onclick: () => this.app.push(new MonthScreen(this.app, undefined, 'week')) }, icon('calendar'), 'Resumen semanal'),
        h('button', { class: 'btn ghost', onclick: () => this.app.push(new MonthScreen(this.app, undefined, 'month')) }, icon('calendar'), 'Resumen del mes')),
    );

    this.body.append(
      h('button', {
        class: 'btn danger block',
        onclick: async () => {
          // doble confirmación: es irreversible (salvo con una copia de seguridad)
          const n = this.app.store.history.length;
          if (!(await confirmDialog('¿Borrar todo el historial? No se puede deshacer. Solo podrás recuperarlo si tienes una copia de seguridad (Configuración → Copia de seguridad).', 'Continuar'))) return;
          if (await confirmDialog(`¿Seguro? Se borrarán ${plural(n, 'entrenamiento', 'entrenamientos')}, con tus récords, rachas y resúmenes. Esta es la última confirmación.`, 'Sí, borrar todo', 'Cancelar', true)) {
            this.app.store.clearHistory();
            this.render();
          }
        },
      }, icon('trash'), 'Borrar todo el historial'),
    );
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

  /** Récords de siempre (con el filtro de tabla): rachas, entrenamiento más largo, más calorías y mejor mes. */
  private records(list: readonly HistoryEntry[]): HTMLElement {
    const { app } = this;
    const now = new Date();
    const short = (d: Date) => d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
    const open = (e: HistoryEntry) => () => app.push(new HistoryDetailScreen(app, e));
    const run = streak(list, now), best = bestStreak(list);

    let longest: HistoryEntry | null = null;
    let topKcal: { e: HistoryEntry; kcal: number } | null = null;
    const months = new Map<number, { start: Date; days: Set<string>; sec: number }>();
    for (const e of list) {
      if (!longest || e.durationSec > longest.durationSec) longest = e;
      const c = app.store.caloriesFor(e);
      if (c && (!topKcal || c.kcal > topKcal.kcal)) topKcal = { e, kcal: c.kcal };
      const d = new Date(e.date), ms = new Date(d.getFullYear(), d.getMonth(), 1);
      const m = months.get(ms.getTime()) ?? { start: ms, days: new Set<string>(), sec: 0 };
      m.days.add(dayKey(d));
      m.sec += e.durationSec;
      months.set(ms.getTime(), m);
    }
    // mejor mes: más días entrenados y, si empatan, más tiempo
    const bm = [...months.values()].sort((a, b) => b.days.size - a.days.size || b.sec - a.sec)[0];

    const tile = (ic: IconName, value: string, label: string, sub: string | null, onclick?: () => void, sub2?: string) =>
      h(onclick ? 'button' : 'div', { class: 'rec-tile' + (onclick ? ' tap' : ''), ...(onclick ? { onclick } : {}) },
        h('span', { class: 'rec-top' }, icon(ic), h('span', { class: 'stat-value' }, value)),
        h('span', { class: 'rec-label' }, label),
        sub ? h('span', { class: 'rec-sub' }, sub) : null,
        sub2 ? h('span', { class: 'rec-sub' }, sub2) : null);
    return h('section', { class: 'card rec-card' },
      h('div', { class: 'rec-row two' },
        tile('flame', String(run), 'Racha actual', run === 1 ? 'día seguido' : 'días seguidos'),
        tile('trophy', String(best), 'Mejor racha', best === 1 ? 'día seguido' : 'días seguidos')),
      h('div', { class: 'rec-row' + (topKcal ? '' : ' two') },
        longest ? tile('clock', humanDuration(longest.durationSec), 'Entreno más largo', short(new Date(longest.date)), open(longest)) : null,
        topKcal ? tile('flame', `${topKcal.kcal} kcal`, 'Récord de calorías', short(new Date(topKcal.e.date)), open(topKcal.e)) : null,
        bm ? tile('calendar', plural(bm.days.size, 'día', 'días'), 'Mejor mes', bm.start.toLocaleDateString(LOCALE, { month: 'short', year: 'numeric' }),
          () => app.push(new MonthScreen(app, bm.start, 'month')), humanDuration(bm.sec)) : null));
  }

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
      const cls = 'cal-day' + (d.getMonth() !== m.getMonth() ? ' out' : '') + (days.has(k) ? ' done' : '') + (k === today ? ' today' : '');
      cells.push(days.has(k)
        ? h('button', { class: cls, 'aria-label': `Ver el entrenamiento del ${d.toLocaleDateString(LOCALE)}`, onclick: () => openDay(this.app, list, k) }, String(d.getDate()))
        : h('span', { class: cls }, String(d.getDate())));
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
      h('div', { class: 'cal-grid' }, ...cells),
      h('p', { class: 'muted small cal-hint' }, 'Toca un día marcado para ver su entrenamiento.'));
  }
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

/** Abre el entrenamiento de un día; si hubo varios, deja elegir. */
export function openDay(app: App, list: readonly HistoryEntry[], k: string): void {
  const es = list.filter((e) => dayKey(new Date(e.date)) === k);
  if (es.length === 1) return app.push(new HistoryDetailScreen(app, es[0]));
  const close = () => wrap.remove();
  const d = new Date(es[0].date);
  const wrap = h('div', { class: 'dialog-wrap', onclick: (ev: Event) => ev.target === wrap && close() },
    h('div', { class: 'dialog day-pick', role: 'dialog', 'aria-modal': 'true' },
      h('p', { class: 'dialog-title' }, d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })),
      ...es.map((e) => row(e, app.store, () => { close(); app.push(new HistoryDetailScreen(app, e)); })),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn ghost', onclick: close }, 'Cerrar'))));
  document.body.append(wrap);
}
