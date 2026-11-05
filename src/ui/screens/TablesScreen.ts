import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type SavedRoutine } from '../../domain/types';
import type { App, Screen } from '../App';
import { actionSheet, clear, confirmDialog, h, humanDuration, plural, promptDialog } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { formatDate } from './HomeScreen';
import { RoutineScreen } from './RoutineScreen';

/** Mis tablas: lista de tablas guardadas con nombre. */
export class TablesScreen implements Screen {
  readonly el = h('main', { class: 'screen tables' });
  readonly tab = 'tablas' as const;
  private body = h('div', { class: 'tables-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'page-head' },
        h('h1', {}, 'Mis tablas'),
        h('button', { class: 'btn primary small', onclick: () => void this.create() }, icon('plus'), 'Nueva')),
      this.body,
    );
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    const { store } = this.app;
    clear(this.body);
    for (const t of store.routines) this.body.append(this.card(t, t.id === store.active.id));
  }

  private card(t: SavedRoutine, active: boolean): HTMLElement {
    const plan = WorkoutPlan.build(t.routine, this.app.catalog, this.app.store.settings, t.rounds);
    const total = Math.max(1, SECTION_IDS.reduce((n, s) => n + t.routine[s].length, 0));
    const mix = h('div', { class: 'mix' }, ...SECTION_IDS.filter((s) => t.routine[s].length).map((s) => {
      const seg = h('span', { title: `${SECTION_TITLES[s]}: ${t.routine[s].length}` });
      seg.style.flex = String(t.routine[s].length / total);
      seg.style.background = SECTION_STYLE[s].color;
      return seg;
    }));
    const pills = SECTION_IDS.filter((s) => t.routine[s].length).map((s) => {
      const p = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[s].icon), String(t.routine[s].length));
      p.style.setProperty('--sec', SECTION_STYLE[s].color);
      p.title = SECTION_TITLES[s];
      return p;
    });
    return h('article', { class: 'card table-card' + (active ? ' active' : '') },
      h('div', { class: 'table-head' }, h('h2', {}, t.name), active ? h('span', { class: 'active-pill' }, 'En uso') : null),
      h('div', { class: 'table-meta' },
        h('span', { class: 'meta-line' }, icon('clock'), plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`),
        pills.length ? h('span', { class: 'pills' }, ...pills) : null,
        h('span', { class: 'meta-line' }, icon('calendar'), t.lastUsed ? `Última vez: ${formatDate(t.lastUsed)}` : 'Aún no la has usado')),
      pills.length ? mix : null,
      h('div', { class: 'table-actions' },
        h('button', { class: 'btn small ' + (active ? 'ghost' : 'primary'), disabled: active, onclick: () => this.use(t) }, active ? icon('check') : icon('play'), active ? 'En uso' : 'Usar'),
        h('button', { class: 'btn small ghost', onclick: () => this.edit(t) }, icon('edit'), 'Editar'),
        h('button', { class: 'more-btn', 'aria-label': `Más opciones de ${t.name}`, onclick: () => void this.more(t) }, icon('more'))),
    );
  }

  private use(t: SavedRoutine): void {
    this.app.store.setActive(t.id);
    this.app.haptics.tap();
    this.app.openTab('inicio');
  }

  private edit(t: SavedRoutine): void {
    this.app.store.setActive(t.id);
    this.app.push(new RoutineScreen(this.app));
  }

  private async create(): Promise<void> {
    const name = await promptDialog('Nombre de la nueva tabla', '', 'Crear');
    if (!name) return;
    this.app.store.createRoutine(name);
    this.app.push(new RoutineScreen(this.app));
  }

  private async more(t: SavedRoutine): Promise<void> {
    const choice = await actionSheet(t.name, [
      { id: 'rename', label: 'Cambiar nombre' },
      { id: 'duplicate', label: 'Duplicar' },
      { id: 'delete', label: 'Borrar', danger: true },
    ]);
    const { store } = this.app;
    if (choice === 'rename') {
      const name = await promptDialog('Nuevo nombre', t.name, 'Guardar');
      if (name) store.renameRoutine(t.id, name);
    } else if (choice === 'duplicate') {
      store.duplicateRoutine(t.id);
    } else if (choice === 'delete') {
      const last = store.routines.length === 1;
      const ok = await confirmDialog(
        last ? `¿Borrar "${t.name}"? Es tu única tabla: quedará una tabla vacía.` : `¿Borrar la tabla "${t.name}"? No se puede deshacer.`,
        'Borrar',
      );
      if (ok) store.deleteRoutine(t.id);
    }
    this.render();
  }
}
