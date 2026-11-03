import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type SavedRoutine } from '../../domain/types';
import type { App, Screen } from '../App';
import { actionSheet, clear, confirmDialog, h, humanDuration, plural, promptDialog } from '../dom';
import { formatDate } from './HomeScreen';
import { RoutineScreen } from './RoutineScreen';

/** Mis tablas: lista de tablas guardadas con nombre. */
export class TablesScreen implements Screen {
  readonly el = h('main', { class: 'screen tables' });
  private body = h('div', { class: 'tables-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, '‹'),
        h('h1', {}, 'Mis tablas')),
      h('button', { class: 'btn primary block', onclick: () => void this.create() }, '+ Nueva tabla'),
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
    const plan = WorkoutPlan.build(t.routine, this.app.catalog, this.app.store.settings);
    const parts = SECTION_IDS.filter((s) => t.routine[s].length).map((s) => `${SECTION_TITLES[s]} ${t.routine[s].length}`);
    return h('article', { class: 'card table-card' + (active ? ' active' : '') },
      h('div', { class: 'table-head' }, h('h2', {}, t.name), active ? h('span', { class: 'active-pill' }, 'En uso') : null),
      h('div', { class: 'table-meta' },
        h('span', {}, plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`),
        parts.length ? h('span', {}, parts.join(' · ')) : null,
        h('span', {}, t.lastUsed ? `Última vez: ${formatDate(t.lastUsed)}` : 'Aún no la has usado')),
      h('div', { class: 'table-actions' },
        h('button', { class: 'btn small ' + (active ? 'ghost' : 'primary'), disabled: active, onclick: () => this.use(t) }, active ? 'En uso' : 'Usar'),
        h('button', { class: 'btn small ghost', onclick: () => this.edit(t) }, 'Editar'),
        h('button', { class: 'more-btn', 'aria-label': `Más opciones de ${t.name}`, onclick: () => void this.more(t) }, '⋯')),
    );
  }

  private use(t: SavedRoutine): void {
    this.app.store.setActive(t.id);
    this.app.back();
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
