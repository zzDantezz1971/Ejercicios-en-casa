import type { GenResult } from '../../domain/generator';
import type { App, Screen } from '../App';
import { clear, h, promptDialog } from '../dom';
import { icon } from '../icons';
import { preview } from './MakerScreens';
import { RoutineScreen } from './RoutineScreen';
import { PlanDayScreen, planDayOf } from './PlanScreens';

/** «Editar» una tabla: la de un día del plan, en su pantalla (con «Otra propuesta»); las demás, aquí. */
export function editTable(app: App, id: string): void {
  const p = planDayOf(app, id);
  app.push(p ? new PlanDayScreen(app, p.plan.id, p.day.day) : new TableEditScreen(app, id));
}

/**
 * Editar una tabla guardada: sus ejercicios por apartado con el tiempo (− +), cambiar, quitar, arrastrar para
 * mover, añadir, las vueltas y el peso. (La lista completa de ejercicios queda para crear una tabla vacía.)
 */
export class TableEditScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private readonly ask = { remove: true };

  constructor(private readonly app: App, private readonly id: string) {}

  enter(): void {
    this.render();
  }

  private render(): void {
    const { app } = this;
    const t = app.store.routineById(this.id);
    const y = this.el.isConnected ? window.scrollY : -1;
    clear(this.el);
    const back = h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back'));
    if (!t) { this.el.append(h('header', { class: 'bar sticky' }, back)); return; }
    const r: GenResult = { routine: t.routine, rounds: { ...(t.rounds ?? {}) } };
    const set = (next: GenResult) => { app.store.setRoutineContent(t.id, next.routine, next.rounds); this.render(); };
    this.el.append(
      h('header', { class: 'bar sticky' }, back,
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, 'Editar tabla'), h('h1', { class: 'bar-title' }, t.name)),
        h('button', { class: 'icon-btn rename-btn', 'aria-label': 'Cambiar nombre', title: 'Cambiar nombre', onclick: async () => {
          const name = await promptDialog('Nuevo nombre', t.name, 'Guardar');
          if (name) { app.store.renameRoutine(t.id, name); this.render(); }
        } }, icon('edit'))),
      h('div', { class: 'maker-body' }, preview(app, r, { set, ask: this.ask, full: true, tableId: t.id, addEmpty: (sec) => {
        // la pantalla de elegir ejercicios trabaja sobre la tabla en uso: esta pasa a serlo
        if (app.store.active.id !== t.id) app.store.setActive(t.id);
        app.push(new RoutineScreen(app, sec));
      } })));
    if (y >= 0) window.scrollTo({ top: y });
  }
}
