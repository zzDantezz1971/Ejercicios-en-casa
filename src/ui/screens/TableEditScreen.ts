import { swapExercise, type GenOptions, type GenResult } from '../../domain/generator';
import type { App, Screen } from '../App';
import { clear, h, promptDialog } from '../dom';
import { icon } from '../icons';
import { preview } from './MakerScreens';
import { PlanDayScreen, planDayOf } from './PlanScreens';

/** «Editar» una tabla: la de un día del plan, en su pantalla (con «Otra propuesta»); las demás, aquí. */
export function editTable(app: App, id: string): void {
  const p = planDayOf(app, id);
  app.push(p ? new PlanDayScreen(app, p.plan.id, p.day.day) : new TableEditScreen(app, id));
}

/** Para «Cambiar» un ejercicio de una tabla propia: uno parecido (misma zona y grupo), sin fijarse en un objetivo. */
const SWAP_OPTIONS: GenOptions = { goal: 'forma', zone: 'entero', minutes: 30, level: 'normal' };

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
    const ctx = { sections: app.sections, catalog: app.catalog, owned: new Set(app.store.settings.equipment), settings: app.store.settings };
    this.el.append(
      h('header', { class: 'bar sticky' }, back,
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, 'Editar tabla'), h('h1', { class: 'bar-title' }, t.name)),
        h('button', { class: 'icon-btn rename-btn', 'aria-label': 'Cambiar nombre', title: 'Cambiar nombre', onclick: async () => {
          const name = await promptDialog('Nuevo nombre', t.name, 'Guardar');
          if (name) { app.store.renameRoutine(t.id, name); this.render(); }
        } }, icon('edit'))),
      h('div', { class: 'maker-body' }, preview(app, r, { set, ask: this.ask, full: true, swap: (s, i) => swapExercise(r, s, i, SWAP_OPTIONS, ctx) })));
    if (y >= 0) window.scrollTo({ top: y });
  }
}
