import { WorkoutPlan, MAX_ROUNDS } from '../../domain/WorkoutPlan';
import { MAX_SECONDS, MIN_SECONDS, STEP_SECONDS } from '../../domain/RoutineEditor';
import { freeToRoutine, routineToFree, type ExerciseDef, type FreeEntry, type FreeNode } from '../../domain/types';
import type { App, Screen } from '../App';
import { actionSheet, clear, confirmDialog, h, humanDuration, plural, promptDialog } from '../dom';
import { sortableList, type SortableRow } from '../components/sortable';
import { icon } from '../icons';
import { DetailScreen } from './DetailScreen';
import { blockTag, header, PickExerciseScreen } from './MakerScreens';

/*
 * Tabla libre: una sola lista, sin bloques. Ejercicios de cualquier tipo en el orden que se quiera, descansos donde se
 * quiera y series (unos ejercicios que se repiten 2, 3… veces seguidas). Se ordena arrastrando por el asa.
 */

const REST_MIN = 5, REST_MAX = 600, REST_STEP = 5;
const clone = (free: readonly FreeNode[]): FreeNode[] => JSON.parse(JSON.stringify(free)) as FreeNode[];

/** Guarda la lista de una tabla libre (con su reflejo por tipos, para contar y para la barra de colores). */
export function saveFree(app: App, id: string, free: readonly FreeNode[], name?: string): void {
  app.store.setFreeContent(id, free, freeToRoutine(free, (x) => app.catalog.get(x)?.section), name);
}

/** «+ Tabla › Tabla libre»: con nombre; en la versión gratis, si su única tabla está vacía, se convierte esa. */
export async function newFreeTable(app: App, reuseActive: boolean): Promise<void> {
  if (reuseActive) {
    const name = await promptDialog('Nombre de la tabla', app.store.active.name, 'Crear');
    if (!name) return;
    saveFree(app, app.store.active.id, [], name);
    app.push(new FreeTableScreen(app, app.store.active.id));
    return;
  }
  const name = await promptDialog('Nombre de la nueva tabla', '', 'Crear');
  if (!name) return;
  const t = app.store.createFreeRoutine(name);
  app.push(new FreeTableScreen(app, t.id));
}

/** Pasa una tabla por bloques a libre (avisando antes). */
export async function convertToFree(app: App, id: string): Promise<boolean> {
  const t = app.store.routineById(id);
  if (!t || t.free) return false;
  const ok = await confirmDialog('La tabla pasará a ser una sola lista, sin bloques: los mismos ejercicios en el mismo orden, y los bloques con vueltas como series. ¿Quieres pasarla a tabla libre?', 'Pasar a libre', 'Cancelar');
  if (!ok) return false;
  saveFree(app, id, routineToFree(t.routine, t.rounds ?? {}, t.order));
  app.haptics.tap();
  return true;
}

/** Editar una tabla libre. */
export class FreeTableScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen free-screen' });
  /** Eligiendo ejercicios para hacer una serie: los índices marcados (de la lista de fuera de las series). */
  private picking: Set<number> | null = null;

  constructor(private readonly app: App, private readonly id: string) {}

  enter(): void {
    this.render();
  }

  private get free(): FreeNode[] {
    return clone(this.app.store.routineById(this.id)?.free ?? []);
  }

  private set(next: FreeNode[]): void {
    saveFree(this.app, this.id, next);
    this.render();
  }

  private render(): void {
    const { app } = this;
    const t = app.store.routineById(this.id);
    const y = this.el.isConnected ? window.scrollY : -1;
    clear(this.el);
    if (!t) { this.el.append(header(app, 'Tabla libre')); return; }
    const free = this.free;
    const plan = WorkoutPlan.forTable(t, app.catalog, app.store.settings);
    const shown = free.flatMap((n) => (n.kind === 'group' ? n.items : [n])).map((e) => (e.kind === 'ex' ? app.catalog.get(e.exerciseId) : undefined)).filter((e): e is ExerciseDef => !!e);
    const body = h('div', { class: 'maker-body' });
    this.el.append(header(app, t.name, 'Tabla libre'), body);
    body.append(h('p', { class: 'maker-total' }, icon('clock'), plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`));

    if (this.picking) {
      const n = this.picking.size;
      body.append(h('div', { class: 'card free-pick-bar' },
        h('p', { class: 'small' }, 'Marca los ejercicios que quieres repetir seguidos (una serie).'),
        h('div', { class: 'free-pick-btns' },
          h('button', { class: 'btn ghost small', onclick: () => { this.picking = null; this.render(); } }, 'Cancelar'),
          h('button', { class: 'btn primary small', disabled: !n, onclick: () => this.makeGroup() }, icon('swap'), n ? `Crear la serie (${n})` : 'Crear la serie'))));
    } else if (free.length) {
      body.append(h('div', { class: 'maker-legend' }, h('span', {}, icon('tables'), 'Arrastra para mover'), h('span', {}, icon('more'), 'Más opciones')));
    }

    if (!free.length) body.append(h('p', { class: 'muted free-empty' }, 'Añade los ejercicios que quieras, de cualquier tipo, y ordénalos a tu manera. Puedes poner descansos y series que se repiten.'));

    if (this.picking) {
      // elegir: las filas de fuera de las series, con una casilla
      const list = h('div', { class: 'free-list' });
      free.forEach((n, i) => {
        if (n.kind === 'group') { list.append(h('div', { class: 'free-group picking-off' }, this.groupHead(n, i, free, true))); return; }
        const on = this.picking!.has(i);
        list.append(h('button', { class: 'free-pickrow' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: () => { if (on) this.picking!.delete(i); else this.picking!.add(i); this.render(); } },
          h('span', { class: 'free-check' }, on ? icon('check') : ''), this.entryContent(n, shown, null)));
      });
      body.append(list);
    } else {
      const rows: SortableRow[] = free.map((n, i) => ({
        content: n.kind === 'group' ? this.groupBox(n, i, free, shown) : this.entryRow(n, shown, { free, at: [i] }),
        label: n.kind === 'group' ? 'Serie' : n.kind === 'rest' ? 'Descanso' : app.catalog.get(n.exerciseId)?.name ?? '',
      }));
      if (rows.length) body.append(h('div', { class: 'free-list' }, sortableList(rows, (from, to) => {
        const next = this.free;
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        this.set(next);
      }, { arrows: false, handleFirst: true })));
      body.append(h('div', { class: 'free-adds' },
        h('button', { class: 'maker-add', onclick: () => this.addExercises(null) }, icon('plus'), 'Añadir ejercicios'),
        h('button', { class: 'maker-add', onclick: () => void this.addRest(null) }, icon('hourglass'), 'Añadir un descanso'),
        free.filter((n) => n.kind !== 'group').length ? h('button', { class: 'maker-add', onclick: () => { this.picking = new Set(); this.render(); } }, icon('swap'), 'Repetir unos ejercicios (serie)') : null));
    }
    if (y >= 0) window.scrollTo({ top: y });
  }

  /** Fila de un ejercicio o de un descanso: tiempo (− +) y ⋯. `at`: dónde está ([i] fuera, [i, j] dentro de una serie). */
  private entryRow(e: FreeEntry, shown: ExerciseDef[], where: { free: FreeNode[]; at: number[] }): HTMLElement {
    return this.entryContent(e, shown, where);
  }

  private entryContent(e: FreeEntry, shown: ExerciseDef[], where: { free: FreeNode[]; at: number[] } | null): HTMLElement {
    const { app } = this;
    const edit = (fn: (e: FreeEntry) => void) => {
      if (!where) return;
      const next = this.free;
      const [i, j] = where.at;
      const node = next[i];
      fn(j === undefined ? (node as FreeEntry) : (node as Extract<FreeNode, { kind: 'group' }>).items[j]);
      this.set(next);
    };
    const step = e.kind === 'rest' ? REST_STEP : STEP_SECONDS;
    const min = e.kind === 'rest' ? REST_MIN : MIN_SECONDS, max = e.kind === 'rest' ? REST_MAX : MAX_SECONDS;
    const time = where ? h('div', { class: 'stepper inline maker-time' },
      h('button', { 'aria-label': 'Menos tiempo', disabled: e.seconds <= min, onclick: () => edit((x) => { x.seconds = Math.max(min, x.seconds - step); }) }, '−'),
      h('span', { class: 'secs' }, `${e.seconds} s`),
      h('button', { 'aria-label': 'Más tiempo', disabled: e.seconds >= max, onclick: () => edit((x) => { x.seconds = Math.min(max, x.seconds + step); }) }, '+'))
      : h('span', { class: 'maker-secs muted small' }, `${e.seconds} s`);
    const more = where ? h('button', { class: 'icon-btn small', 'aria-label': 'Más opciones', onclick: () => void this.entryMenu(where) }, icon('more')) : null;
    if (e.kind === 'rest') {
      return h('div', { class: 'maker-row free-rest' },
        h('span', { class: 'free-rest-ico' }, icon('hourglass')),
        h('div', { class: 'maker-name' }, h('strong', { class: 'maker-title' }, 'Descanso'), h('div', { class: 'maker-ctrls' }, time)),
        more ? h('div', { class: 'maker-acts' }, more) : null);
    }
    const ex = app.catalog.get(e.exerciseId);
    if (!ex) return h('div', { class: 'maker-row' }, h('span', { class: 'muted' }, '—'), more);
    const img = h('img', { class: 'maker-thumb', alt: '' });
    void app.thumbs.get(ex).then((url) => (img.src = url));
    const open = () => app.push(new DetailScreen(app, ex, shown));
    const tag = blockTag(ex);
    return h('div', { class: 'maker-row' },
      h('button', { class: 'maker-open', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: open }, img),
      h('div', { class: 'maker-name' },
        h('button', { class: 'maker-open maker-title', onclick: open }, ex.name),
        h('span', { class: 'free-sub' }, tag, ex.oneSided ? h('span', { class: 'by-sides small' }, icon('sides'), 'por lados') : null),
        h('div', { class: 'maker-ctrls' }, time)),
      more ? h('div', { class: 'maker-acts' }, more) : null);
  }

  /** ⋯ de un ejercicio o descanso: duplicar, meterlo en una serie de al lado, sacarlo de la serie o quitarlo. */
  private async entryMenu(where: { at: number[] }): Promise<void> {
    const free = this.free;
    const [i, j] = where.at;
    const inGroup = j !== undefined;
    const prev = free[i - 1], next = free[i + 1];
    type Op = 'dup' | 'up' | 'down' | 'out' | 'del';
    const ops: Array<{ id: Op; label: string; danger?: boolean }> = [{ id: 'dup', label: 'Duplicar' }];
    if (!inGroup && prev?.kind === 'group') ops.push({ id: 'up', label: 'Meter en la serie de arriba' });
    if (!inGroup && next?.kind === 'group') ops.push({ id: 'down', label: 'Meter en la serie de abajo' });
    if (inGroup) ops.push({ id: 'out', label: 'Sacar de la serie' });
    ops.push({ id: 'del', label: 'Quitar', danger: true });
    const op = await actionSheet(this.app.store.routineById(this.id)?.name ?? '', ops);
    if (!op) return;
    if (inGroup) {
      const g = free[i] as Extract<FreeNode, { kind: 'group' }>;
      const e = g.items[j];
      if (op === 'dup') g.items.splice(j + 1, 0, { ...e });
      else if (op === 'out' || op === 'del') {
        g.items.splice(j, 1);
        // fuera: justo después de la serie
        if (op === 'out') free.splice(i + 1, 0, e);
        // una serie sin nada desaparece
        if (!g.items.length) free.splice(i, 1);
      }
    } else {
      const e = free[i] as FreeEntry;
      if (op === 'dup') free.splice(i + 1, 0, { ...e });
      else if (op === 'del') free.splice(i, 1);
      else if (op === 'up') { (prev as Extract<FreeNode, { kind: 'group' }>).items.push(e); free.splice(i, 1); }
      else if (op === 'down') { (next as Extract<FreeNode, { kind: 'group' }>).items.unshift(e); free.splice(i, 1); }
    }
    this.set(free);
  }

  /** Cabecera de una serie: «Serie», las vueltas (− xN +) y ⋯. */
  private groupHead(g: Extract<FreeNode, { kind: 'group' }>, i: number, free: FreeNode[], readOnly = false): HTMLElement {
    const setRounds = (v: number) => { const next = this.free; (next[i] as typeof g).rounds = Math.min(MAX_ROUNDS, Math.max(1, v)); this.set(next); };
    const n = g.items.filter((e) => e.kind === 'ex').length;
    // arriba «Serie · N ejercicios» y ⋯; debajo, las vueltas (− xN +)
    return h('div', { class: 'free-group-head' },
      h('div', { class: 'free-group-top' },
        h('span', { class: 'free-group-title' }, h('strong', {}, 'Serie'), h('span', { class: 'muted small' }, '· ', plural(n, 'ejercicio', 'ejercicios'))),
        readOnly ? h('span', { class: 'sec-rounds' }, `x${g.rounds}`) : h('button', { class: 'icon-btn small', 'aria-label': 'Más opciones de la serie', onclick: () => void this.groupMenu(i, free) }, icon('more'))),
      readOnly ? null : h('span', { class: 'maker-rounds-ctl free-rounds' }, h('span', {}, 'Vueltas'),
        h('span', { class: 'stepper inline maker-time' },
          h('button', { 'aria-label': 'Menos vueltas', disabled: g.rounds <= 1, onclick: () => setRounds(g.rounds - 1) }, '−'),
          h('span', { class: 'secs' }, `x${g.rounds}`),
          h('button', { 'aria-label': 'Más vueltas', disabled: g.rounds >= MAX_ROUNDS, onclick: () => setRounds(g.rounds + 1) }, '+'))));
  }

  /** Una serie: su cabecera y sus ejercicios (que se ordenan arrastrando dentro de la serie). */
  private groupBox(g: Extract<FreeNode, { kind: 'group' }>, i: number, free: FreeNode[], shown: ExerciseDef[]): HTMLElement {
    const rows: SortableRow[] = g.items.map((e, j) => ({
      content: this.entryRow(e, shown, { free, at: [i, j] }),
      label: e.kind === 'rest' ? 'Descanso' : this.app.catalog.get(e.exerciseId)?.name ?? '',
    }));
    return h('div', { class: 'free-group' },
      this.groupHead(g, i, free),
      sortableList(rows, (from, to) => {
        const next = this.free;
        const items = (next[i] as typeof g).items;
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        this.set(next);
      }, { arrows: false, handleFirst: true }),
      h('div', { class: 'free-group-adds' },
        h('button', { class: 'btn ghost small', onclick: () => this.addExercises(i) }, icon('plus'), 'Ejercicios'),
        h('button', { class: 'btn ghost small', onclick: () => void this.addRest(i) }, icon('hourglass'), 'Descanso')));
  }

  private async groupMenu(i: number, free: FreeNode[]): Promise<void> {
    const op = await actionSheet('Serie', [
      { id: 'undo', label: 'Deshacer la serie (los ejercicios se quedan)' },
      { id: 'del', label: 'Borrar la serie y sus ejercicios', danger: true },
    ]);
    if (!op) return;
    const next = clone(free);
    const g = next[i] as Extract<FreeNode, { kind: 'group' }>;
    if (op === 'undo') next.splice(i, 1, ...g.items);
    else next.splice(i, 1);
    this.set(next);
  }

  /** Junta los ejercicios marcados en una serie (en el sitio del primero), con 2 vueltas para empezar. */
  private makeGroup(): void {
    const idx = [...(this.picking ?? [])].sort((a, b) => a - b);
    this.picking = null;
    if (!idx.length) { this.render(); return; }
    const free = this.free;
    const items = idx.map((i) => free[i] as FreeEntry);
    for (const i of [...idx].reverse()) free.splice(i, 1);
    free.splice(idx[0], 0, { kind: 'group', rounds: 2, items });
    this.app.haptics.tap();
    this.set(free);
  }

  /** Añadir ejercicios (de todos los bloques) al final de la lista o de una serie. */
  private addExercises(group: number | null): void {
    const { app } = this;
    app.push(new PickExerciseScreen(app, null, new Set(), (_ids, items) => {
      const free = this.free;
      const add: FreeEntry[] = items.map((it) => ({ kind: 'ex', exerciseId: it.exerciseId, seconds: it.seconds, ...(it.weight ? { weight: it.weight } : {}) }));
      if (group === null) free.push(...add);
      else (free[group] as Extract<FreeNode, { kind: 'group' }>).items.push(...add);
      saveFree(app, this.id, free);
      app.back();
    }, 'Añadir ejercicios', true, undefined,
    // al final de la lista: también juntos como una serie (2 vueltas para empezar)
    group === null ? (items) => {
      const free = this.free;
      free.push({ kind: 'group', rounds: 2, items: items.map((it) => ({ kind: 'ex', exerciseId: it.exerciseId, seconds: it.seconds, ...(it.weight ? { weight: it.weight } : {}) })) });
      saveFree(app, this.id, free);
      app.back();
    } : undefined));
  }

  /** Añadir un descanso (pregunta cuántos segundos) al final de la lista o de una serie. */
  private async addRest(group: number | null): Promise<void> {
    const v = await promptDialog('¿Cuántos segundos de descanso?', '30', 'Añadir');
    if (v === null) return;
    const secs = Math.round(Number(v.replace(',', '.')));
    if (!Number.isFinite(secs) || secs <= 0) return;
    const rest: FreeEntry = { kind: 'rest', seconds: Math.min(REST_MAX, Math.max(REST_MIN, secs)) };
    const free = this.free;
    if (group === null) free.push(rest);
    else (free[group] as Extract<FreeNode, { kind: 'group' }>).items.push(rest);
    this.set(free);
  }
}
