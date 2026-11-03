import { SECTION_TITLES, type HistoryEntry } from '../../domain/types';
import type { App, Screen } from '../App';
import { clear, confirmDialog, h, humanDuration, plural } from '../dom';

/** Historial sencillo: días entrenados, duración y ejercicios. */
export class HistoryScreen implements Screen {
  readonly el = h('main', { class: 'screen history' });
  private body = h('div', { class: 'history-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, '‹'),
        h('h1', {}, 'Historial')),
      this.body,
    );
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    const list = this.app.store.history;
    clear(this.body);
    if (!list.length) {
      this.body.append(h('p', { class: 'empty-state' }, 'Aún no hay entrenamientos. Cuando termines el primero aparecerá aquí.'));
      return;
    }
    const weekAgo = Date.now() - 7 * 864e5, monthAgo = Date.now() - 30 * 864e5;
    const days = (from: number) => new Set(list.filter((e) => Date.parse(e.date) >= from).map((e) => new Date(e.date).toDateString())).size;
    const total = list.reduce((n, e) => n + e.durationSec, 0);
    this.body.append(
      h('section', { class: 'stats-row' },
        stat('Últimos 7 días', plural(days(weekAgo), 'día', 'días')),
        stat('Últimos 30 días', plural(days(monthAgo), 'día', 'días')),
        stat('Tiempo total', humanDuration(total))),
    );
    let month = '';
    for (const e of list) {
      const d = new Date(e.date);
      const m = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      if (m !== month) {
        month = m;
        this.body.append(h('h2', { class: 'group-title' }, m));
      }
      this.body.append(row(e));
    }
    this.body.append(
      h('button', {
        class: 'btn ghost block danger',
        onclick: async () => {
          if (await confirmDialog('¿Borrar todo el historial? No se puede deshacer.', 'Borrar')) {
            this.app.store.clearHistory();
            this.render();
          }
        },
      }, 'Borrar historial'),
    );
  }
}

function stat(label: string, value: string): HTMLElement {
  return h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, value), h('span', { class: 'muted' }, label));
}

function row(e: HistoryEntry): HTMLElement {
  const d = new Date(e.date);
  return h('article', { class: 'card history-row' },
    h('div', { class: 'h-date' },
      h('span', { class: 'h-day' }, d.toLocaleDateString('es-ES', { day: 'numeric' })),
      h('span', { class: 'h-wd' }, d.toLocaleDateString('es-ES', { weekday: 'short' }))),
    h('div', { class: 'h-main' },
      h('strong', {}, `${humanDuration(e.durationSec)} · ${plural(e.exercisesDone, 'ejercicio', 'ejercicios')}`),
      h('span', { class: 'muted' }, e.sections.map((s) => SECTION_TITLES[s]).join(' · ')),
      !e.completed ? h('span', { class: 'badge warn' }, 'Terminado antes') : null),
  );
}
