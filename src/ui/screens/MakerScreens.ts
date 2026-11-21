import { TEMPLATES, type TableTemplate } from '../../data/templates';
import { canDo, EQUIP_INFO, type Equip } from '../../domain/equipment';
import {
  generate, GOAL_INFO, GOALS, LEVEL_INFO, LEVELS, MINUTES, suggestedName, tableSeconds, ZONE_INFO, ZONES,
  type GenContext, type GenOptions, type GenResult, type Goal,
} from '../../domain/generator';
import { clampRounds, MAX_ROUNDS, WorkoutPlan } from '../../domain/WorkoutPlan';
import { MAX_SECONDS, MIN_SECONDS, STEP_SECONDS } from '../../domain/RoutineEditor';
import { emptyRoutine, SECTION_IDS, sectionOrder, SECTION_TITLES, usesWeight, weightUnit, type ExerciseDef, type RoutineItem, type SectionId } from '../../domain/types';
import { LOCALE, tr } from '../../i18n';
import type { App, Screen } from '../App';
import { clear, confirmDialog, h, humanDuration, kg, plural, promptDialog, weightDialog } from '../dom';
import { sortableList, type SortableRow } from '../components/sortable';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { DetailScreen } from './DetailScreen';
import { RoutineScreen } from './RoutineScreen';
import { newPlan } from './PlanScreens';

/*
 * Crear tablas: menú «Nueva tabla» (asistente, tablas hechas o vacía), el asistente «Crea-la per mi»
 * (objetivo, zona, tiempo y nivel) y la lista de tablas hechas. Las dos dan una vista previa con la tabla
 * por apartados antes de guardarla.
 */

/** Menú de «Nueva tabla»: tres formas de crearla. */
export function openNewTable(app: App): void {
  const close = () => wrap.remove();
  // versión gratis: una sola tabla (la vacía); el resto de formas de crear tablas, con candado
  const opt = (ic: IconName, title: string, help: string, go: () => void, locked = false) =>
    h('button', { class: 'maker-opt', onclick: () => { close(); if (locked) app.showPremium(); else go(); } },
      h('span', { class: 'maker-opt-icon' }, icon(ic)),
      h('span', { class: 'maker-opt-text' }, h('strong', {}, title), h('span', { class: 'muted small' }, help)),
      locked ? icon('lock', 'ico lock') : icon('chevron', 'ico chev'));
  const free = !app.access.premium;
  const wrap = h('div', { class: 'dialog-wrap sheet-wrap', onclick: (e: Event) => e.target === wrap && close() },
    h('div', { class: 'sheet maker-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Nueva tabla' },
      h('p', { class: 'sheet-title' }, 'Nueva tabla'),
      opt('edit', 'Tabla vacía', 'Elige tú los ejercicios', () => void emptyTable(app), free && !canAddFreeTable(app)),
      opt('bolt', 'Créala por mí', 'Elige objetivo, zona y tiempo', () => app.push(new GeneratorScreen(app)), free),
      opt('tables', 'Tablas hechas', 'Listas para usar', () => app.push(new TemplatesScreen(app)), free),
      // plan de la semana: una tabla para cada día de entrenamiento
      opt('calendar', 'Plan de la semana', 'Una tabla para cada día que entrenas', () => newPlan(app), free),
      h('button', { class: 'sheet-btn cancel', onclick: close }, 'Cancelar')));
  document.body.append(wrap);
}

/** Versión gratis: solo una tabla. Si la única que hay está vacía, se rellena esa. */
export function canAddFreeTable(app: App): boolean {
  return app.store.routines.length < 1 || (app.store.routines.length === 1 && activeIsEmpty(app));
}

async function emptyTable(app: App): Promise<void> {
  // versión gratis con su única tabla vacía: se eligen los ejercicios de esa misma tabla
  if (!app.access.premium && app.store.routines.length === 1) { app.push(new RoutineScreen(app)); return; }
  const name = await promptDialog('Nombre de la nueva tabla', '', 'Crear');
  if (!name) return;
  app.store.createRoutine(name);
  app.push(new RoutineScreen(app));
}

/** Guarda la tabla propuesta (en la activa si está vacía y se pidió así) y lleva a Inicio para empezar. */
async function saveTable(app: App, defName: string, r: GenResult, fillActive: boolean): Promise<void> {
  // «Créala por mí» y las tablas hechas son de Prémium
  if (!app.access.premium) { app.showPremium(); return; }
  const name = await promptDialog('Nombre de la tabla', defName, 'Guardar');
  if (!name) return;
  if (fillActive) app.store.fillActive(name, r.routine, r.rounds);
  else app.store.createRoutineFrom(name, r.routine, r.rounds);
  app.haptics.tap();
  app.openTab('inicio');
}

/** Botón para guardar la propuesta. */
function saveButton(_app: App, r: GenResult, label: string, save: () => void): HTMLElement[] {
  return [h('button', { class: 'btn primary block big', disabled: isEmptyResult(r), onclick: save }, icon('check'), label)];
}

/** ¿Está vacía la tabla en uso? (entonces el asistente la llena en vez de crear otra). */
export function activeIsEmpty(app: App): boolean {
  return SECTION_IDS.every((s) => !app.store.active.routine[s].some((i) => app.catalog.has(i.exerciseId)));
}

/** Material que necesita una tabla y que el usuario no tiene. */
function missingEquip(app: App, r: GenResult): Equip[] {
  const owned = new Set<string>(app.store.settings.equipment);
  const miss = new Set<Equip>();
  for (const s of SECTION_IDS) for (const it of r.routine[s]) {
    const need = app.catalog.get(it.exerciseId)?.equip ?? [];
    if (!canDo(need, owned)) for (const alts of need) if (!alts.some((e) => owned.has(e))) miss.add(alts[0]);
  }
  return [...miss];
}

/** Todo el material que pide la tabla (o unos apartados) (de cada requisito, el que se tiene o, si no, el primero) y si falta. */
export function neededEquip(app: App, r: GenResult, sections: readonly SectionId[] = SECTION_IDS): Array<{ e: Equip; missing: boolean }> {
  const owned = new Set<string>(app.store.settings.equipment);
  const out = new Map<Equip, boolean>();
  for (const s of sections) for (const it of r.routine[s]) {
    for (const alts of app.catalog.get(it.exerciseId)?.equip ?? []) {
      const have = alts.find((e) => owned.has(e));
      if (have) out.set(have, out.get(have) ?? false);
      else out.set(alts[0], true);
    }
  }
  return [...out].map(([e, missing]) => ({ e, missing }));
}

/** Lo que se puede hacer con la tabla en la vista previa: cambiarla (mover, quitar) y, en el asistente, cambiar un ejercicio. */
export interface PreviewEdit {
  set(r: GenResult): void;
  /** Preguntar antes de quitar un ejercicio (se puede desactivar para esta lista con la casilla del aviso). */
  ask: { remove: boolean };
  /** Editar también las vueltas de cada apartado y el peso de las mancuernas (al editar una tabla guardada). */
  full?: boolean;
  /** Añadir a un apartado vacío: en vez de la lista corta, la pantalla completa de ejercicios (la de elegirlos). */
  addEmpty?: (s: SectionId) => void;
  /** Tabla que se edita (para copiar un apartado y pegarlo solo en otra tabla). */
  tableId?: string;
}

/** Añadir ejercicios a un apartado: abre la lista, se eligen los que se quieran y se ponen al final. */
function addTo(app: App, r: GenResult, s: SectionId, edit: PreviewEdit): void {
  const have = new Set(SECTION_IDS.flatMap((x) => r.routine[x].map((i) => i.exerciseId)));
  const items = r.routine[s];
  // los segundos, como los demás ejercicios del apartado (o los de siempre)
  const secs = items.length ? items[items.length - 1].seconds : app.store.settings.defaultSeconds;
  app.push(new PickExerciseScreen(app, s, have, (_ids, picked) => {
    edit.set(withSection(r, s, [...items, ...picked]));
    app.back();
  }, 'Añadir ejercicios', true, secs));
}

/** Portapapeles de la app: los ejercicios de un apartado copiados para pegarlos en otra tabla (mientras la app está abierta). */
let CLIPBOARD: { section: SectionId; items: RoutineItem[]; rounds: number; from?: string } | null = null;

/** Apartados plegados de cada lista (todos al entrar; se recuerda mientras estás en la pantalla, aunque se vuelva a pintar). */
const FOLDED = new WeakMap<object, Set<SectionId>>();
const NO_EDIT = {};
function foldedOf(edit?: PreviewEdit): Set<SectionId> {
  const k = edit?.ask ?? NO_EDIT;
  let f = FOLDED.get(k);
  // de entrada, todos plegados: se ve la tabla entera de un vistazo y se abre el apartado que interesa
  if (!f) { f = new Set(SECTION_IDS); FOLDED.set(k, f); }
  return f;
}

/** «¿Quitar X de la tabla?» con la casilla «No volver a preguntar en esta lista». */
function confirmRemove(name: string): Promise<{ ok: boolean; stop: boolean }> {
  return new Promise((resolve) => {
    const box = h('input', { type: 'checkbox', id: 'rm-stop' });
    const close = (ok: boolean) => { wrap.remove(); resolve({ ok, stop: ok && box.checked }); };
    const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close(false) },
      h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' },
        h('p', { class: 'dialog-title' }, `¿Quitar ${name} de la tabla?`),
        h('label', { class: 'rm-stop', for: 'rm-stop' }, box, h('span', {}, 'No volver a preguntar en esta lista')),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost', onclick: () => close(false) }, 'Cancelar'),
          h('button', { class: 'btn danger', onclick: () => close(true) }, 'Quitar'))));
    document.body.append(wrap);
  });
}

/** Copia de la tabla con un apartado cambiado (si se queda vacío, sin vueltas). */
function withSection(r: GenResult, s: SectionId, items: GenResult['routine'][SectionId]): GenResult {
  const rounds = { ...r.rounds };
  if (!items.length) delete rounds[s];
  return { routine: { ...r.routine, [s]: items }, rounds, ...(r.order ? { order: r.order } : {}) };
}

/** Vista previa de una tabla: resumen y ejercicios por apartado. Al tocar un ejercicio se ve cómo se hace;
 *  con `edit`, se ordenan arrastrándolos con el asa y cada uno se puede cambiar o quitar (con aviso). */
/** «Necesitas: [icono] Step, [icono] Mancuernas»: cada material con su icono. */
function missLine(miss: readonly Equip[]): HTMLElement[] {
  return [h('span', {}, 'Necesitas:'), ...miss.map((e) => h('span', { class: 'miss-item' }, icon(EQUIP_INFO[e].icon as IconName), tr(EQUIP_INFO[e].name)))];
}

export function preview(app: App, r: GenResult, edit?: PreviewEdit): HTMLElement {
  const plan = WorkoutPlan.build(r.routine, app.catalog, app.store.settings, r.rounds, r.order);
  const shown = SECTION_IDS.flatMap((s) => r.routine[s].map((i) => app.catalog.get(i.exerciseId)).filter((e): e is NonNullable<typeof e> => !!e));
  const box = h('div', { class: 'maker-preview' },
    h('p', { class: 'maker-total' }, icon('clock'), plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`));
  // leyenda de los botones de cada ejercicio
  if (edit) box.append(h('div', { class: 'maker-legend' },
    h('span', {}, icon('swap'), 'Cambiar'),
    h('span', {}, icon('trash', 'ico danger'), 'Quitar'),
    h('span', {}, icon('tables'), 'Arrastra para mover')));
  // al editar una tabla guardada, los bloques también se ordenan arrastrándolos por su asa
  const blockRows: SortableRow[] = [];
  for (const s of sectionOrder(r.order)) {
    const items = r.routine[s];
    // sin ejercicios: solo se ve si se puede añadir alguno
    if (!items.length && !edit) continue;
    const st = SECTION_STYLE[s];
    const nr = clampRounds(r.rounds[s]);
    const setRounds = (v: number) => edit!.set({ routine: r.routine, rounds: { ...r.rounds, [s]: clampRounds(v) } });
    const head = h('h2', { class: 'maker-sec' }, icon(st.icon), SECTION_TITLES[s],
      edit?.full && items.length ? h('span', { class: 'maker-rounds-ctl' }, h('span', {}, 'Vueltas'),
        h('span', { class: 'stepper inline maker-time' },
          h('button', { 'aria-label': 'Menos vueltas', disabled: nr <= 1, onclick: () => setRounds(nr - 1) }, '−'),
          h('span', { class: 'secs' }, `x${nr}`),
          h('button', { 'aria-label': 'Más vueltas', disabled: nr >= MAX_ROUNDS, onclick: () => setRounds(nr + 1) }, '+')))
        : nr > 1 ? h('span', { class: 'maker-rounds' }, plural(nr, 'vuelta', 'vueltas')) : '');
    head.style.setProperty('--sec', st.color);
    // cada apartado se puede plegar (tocando su título) para que la lista no sea interminable
    const folded = foldedOf(edit);
    const isFolded = folded.has(s);
    const sbody = h('div', { class: 'sec-body', hidden: isFolded });
    const fold = h('button', { class: 'sec-fold' + (isFolded ? ' folded' : ''), 'aria-expanded': String(!isFolded), 'aria-label': isFolded ? 'Desplegar' : 'Plegar', onclick: () => {
      const now = !sbody.hidden;
      sbody.hidden = now;
      fold.classList.toggle('folded', now);
      fold.setAttribute('aria-expanded', String(!now));
      if (now) folded.add(s); else folded.delete(s);
      foldInfo.hidden = !now;
      head.classList.toggle('folded', now);
    } }, icon('chevron', 'ico'));
    const foldInfo = h('span', { class: 'muted small sec-fold-info', hidden: !isFolded }, items.length ? plural(items.length, 'ejercicio', 'ejercicios') : 'Sin ejercicios');
    head.prepend(fold);
    head.append(foldInfo);
    if (isFolded) head.classList.add('folded');
    // toda la fila del título abre y cierra el apartado (menos sus propios botones, como las vueltas)
    head.classList.add('foldable');
    head.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, input, select')) return;
      fold.click();
    });
    if (edit?.full) blockRows.push({ content: h('div', { class: 'sec-block' }, head, sbody), label: SECTION_TITLES[s] });
    else box.append(head, sbody);
    // el material que pide este apartado (el que no está en tu material, marcado)
    const need = neededEquip(app, r, [s]);
    if (need.length) sbody.append(h('div', { class: 'sec-need small', style: `--sec: ${st.color}` }, h('span', {}, 'Necesitas:'),
      h('div', { class: 'sec-need-items' }, ...need.map(({ e, missing }) => h('span', { class: 'miss-item' + (missing ? ' missing' : '') }, icon(EQUIP_INFO[e].icon as IconName), tr(EQUIP_INFO[e].name), missing ? h('span', { class: 'miss-flag' }, '(no está en tu material)') : '')))));
    const rows: SortableRow[] = [];
    items.forEach((it, i) => {
      const ex = app.catalog.get(it.exerciseId);
      if (!ex) return;
      const img = h('img', { class: 'maker-thumb', alt: '' });
      void app.thumbs.get(ex).then((url) => (img.src = url));
      const open = () => app.push(new DetailScreen(app, ex, shown));
      const setSecs = (d: number) => {
        const next = items.slice();
        next[i] = { ...it, seconds: Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, it.seconds + d)) };
        edit!.set(withSection(r, s, next));
      };
      const swapBtn = edit ? h('button', { class: 'icon-btn small', 'aria-label': `Cambiar ${ex.name} por otro`, onclick: () => {
          // la lista para elegir el que lo sustituye (sin los que ya están en la tabla); conserva el tiempo
          const have = new Set(SECTION_IDS.flatMap((x) => r.routine[x].map((y) => y.exerciseId)));
          app.push(new PickExerciseScreen(app, s, have, ([id]) => {
            const next = items.slice();
            next[i] = { exerciseId: id, seconds: it.seconds };
            edit.set(withSection(r, s, next));
            app.back();
          }, `Cambiar ${ex.name}`));
        } }, icon('swap')) : '';
      // quitar: apartado de los demás botones y con aviso (que se puede desactivar para esta lista)
      const removeBtn = edit ? h('button', { class: 'icon-btn small danger maker-remove', 'aria-label': `Quitar ${ex.name} de la tabla`, onclick: async () => {
          if (edit.ask.remove) {
            const { ok, stop } = await confirmRemove(ex.name);
            if (!ok) return;
            if (stop) edit.ask.remove = false;
          }
          const next = items.slice();
          next.splice(i, 1);
          edit.set(withSection(r, s, next));
        } }, icon('trash')) : '';
      const content = h('div', { class: 'maker-row' },
        // tocar la miniatura o el nombre abre la ficha (cómo se hace)
        h('button', { class: 'maker-open', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: open }, img),
        h('div', { class: 'maker-name' },
          h('button', { class: 'maker-open maker-title', onclick: open }, ex.name),
          // se hace por lados (una vez con cada lado): que se vea al montar la tabla
          ex.oneSided ? h('span', { class: 'by-sides small' }, icon('sides'), 'por lados') : '',
          // tiempo (− +)
          edit ? h('div', { class: 'maker-ctrls' },
            h('div', { class: 'stepper inline maker-time' },
              h('button', { 'aria-label': 'Menos tiempo', disabled: it.seconds <= MIN_SECONDS, onclick: () => setSecs(-STEP_SECONDS) }, '−'),
              h('span', { class: 'secs' }, `${it.seconds} s`),
              h('button', { 'aria-label': 'Más tiempo', disabled: it.seconds >= MAX_SECONDS, onclick: () => setSecs(STEP_SECONDS) }, '+')),
            )
            : h('span', { class: 'maker-secs muted small' }, `${it.seconds} s`),
          // peso de la mancuerna (al editar una tabla guardada)
          edit?.full && usesWeight(ex) ? h('button', { class: 'weight-btn small' + (it.weight ? '' : ' none'), 'aria-label': `Peso de ${ex.name}: ${it.weight ? kg(it.weight) + ' por mancuerna' : 'sin peso'}. Cambiar`, onclick: async () => {
            const w = await weightDialog(ex.name, it.weight ?? app.store.lastWeight(ex.id) ?? (/barra/.test(weightUnit(ex)) ? 20 : 5), weightUnit(ex));
            if (w === null) return;
            const next = items.slice();
            const { weight: _old, ...rest } = it;
            next[i] = w ? { ...rest, weight: w } : rest;
            edit.set(withSection(r, s, next));
          } }, icon('dumbbell'), it.weight ? kg(it.weight) : 'Sin peso') : ''),
        // cambiar y quitar: a la derecha, más grandes y centrados en la fila
        edit ? h('div', { class: 'maker-acts' }, swapBtn, removeBtn) : '');
      rows.push({ content, label: ex.name });
    });
    // se ordena arrastrando con el asa (sin flechas)
    if (edit) sbody.append(sortableList(rows, (from, to) => {
      const next = items.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      edit.set(withSection(r, s, next));
    }, { arrows: false, handleFirst: true }));
    else for (const row of rows) sbody.append(row.content);
    if (edit) sbody.append(h('button', { class: 'maker-add', onclick: () => (!items.length && edit.addEmpty ? edit.addEmpty(s) : addTo(app, r, s, edit)) }, icon('plus'), 'Añadir un ejercicio'));
    // copiar todo el apartado y pegarlo en otra tabla (en el mismo apartado)
    if (edit?.full) {
      // pegar: solo en el mismo apartado y en otra tabla (no en la tabla de la que se copió)
      const clip = CLIPBOARD && CLIPBOARD.section === s && CLIPBOARD.from !== edit.tableId ? CLIPBOARD : null;
      const copyBtn: HTMLElement = h('button', { class: 'btn ghost small clip-btn', disabled: !items.length, onclick: () => {
        CLIPBOARD = { section: s, items: items.map((i) => ({ ...i })), rounds: nr, from: edit.tableId };
        app.haptics.tap();
        copyBtn.replaceChildren(icon('check'), h('span', {}, 'Copiado'));
      } }, icon('copy'), h('span', {}, 'Copiar el bloque'));
      const pasteBtn = clip ? h('button', { class: 'btn ghost small clip-btn', onclick: async () => {
        const have = new Set(items.map((i) => i.exerciseId));
        const add = clip.items.filter((i) => !have.has(i.exerciseId));
        if (!add.length) { await confirmDialog('Esos ejercicios ya están en este bloque.', 'Vale', ''); return; }
        app.haptics.tap();
        // pegado: ya no se ofrece «Pegar» hasta que se copie otra cosa
        CLIPBOARD = null;
        const next = withSection(r, s, [...items, ...add]);
        // en un apartado vacío, también sus vueltas
        edit.set(items.length ? next : { routine: next.routine, rounds: { ...next.rounds, [s]: clip.rounds } });
      } }, icon('plus'), h('span', {}, `Pegar (${clip.items.length})`)) : null;
      sbody.append(h('div', { class: 'clip-row' }, copyBtn, pasteBtn));
    }
  }
  if (edit?.full) box.append(h('div', { class: 'blocks-sort' }, sortableList(blockRows, (from, to) => {
    const order = sectionOrder(r.order);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    edit.set({ ...r, order });
  }, { arrows: false, handleFirst: true })));
  return box;
}

export const header = (app: App, title: string, sub?: string) =>
  h('header', { class: 'bar sticky' },
    h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
    h('div', { class: 'titles' }, sub ? h('span', { class: 'subtitle' }, sub) : '', h('h1', { class: 'bar-title' }, title)));

/** Asistente «Créala por mí». */
export class GeneratorScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private step = 0;
  private o: Partial<GenOptions> = {};
  private result: GenResult | null = null;
  /** Preguntar antes de quitar (para esta propuesta). */
  private ask = { remove: true };

  constructor(private readonly app: App, private readonly fillActive = false) {
    this.render();
  }

  /** La zona no se pregunta con «Espalda sana» ni con «Flexibilidad». */
  private get askZone(): boolean {
    return this.o.goal !== 'espalda' && this.o.goal !== 'flexibilidad';
  }

  private ctx(): GenContext {
    const { app } = this;
    return { sections: app.sections, catalog: app.catalog, owned: new Set(app.store.settings.equipment), settings: app.store.settings };
  }

  onBack(): boolean {
    if (this.step === 0) return false;
    this.step = this.step === 2 && !this.askZone ? 0 : this.step - 1;
    this.render();
    return true;
  }

  private next(): void {
    this.step = this.step === 0 && !this.askZone ? 2 : this.step + 1;
    if (this.step === 4) {
      this.result = generate(this.o as GenOptions, this.ctx());
      this.ask = { remove: true };
    }
    this.render();
    window.scrollTo({ top: 0 });
  }

  /** Vuelve a pintar sin mover la pantalla (al cambiar la tabla propuesta). */
  private keepRender(): void {
    const y = window.scrollY;
    this.render();
    window.scrollTo({ top: y });
  }

  private render(): void {
    clear(this.el);
    const total = this.askZone ? 4 : 3;
    const pos = this.step === 0 ? 1 : this.askZone ? this.step + 1 : this.step;
    const sub = this.step < 4 ? `Paso ${pos} de ${total}` : undefined;
    this.el.append(header(this.app, 'Créala por mí', sub));
    const body = h('div', { class: 'maker-body' });
    this.el.append(body);
    const opt = (title: string, help: string, on: boolean, pick: () => void, ic?: string) =>
      h('button', { class: 'maker-opt' + (on ? ' on' : ''), onclick: () => { pick(); this.next(); } },
        ic ? h('span', { class: 'maker-opt-icon' }, icon(ic as IconName)) : '',
        h('span', { class: 'maker-opt-text' }, h('strong', {}, title), help ? h('span', { class: 'muted small' }, help) : ''),
        icon('chevron', 'ico chev'));
    if (this.step === 0) {
      body.append(h('h2', { class: 'maker-q' }, '¿Cuál es tu objetivo?'),
        ...GOALS.map((g: Goal) => opt(GOAL_INFO[g].name, GOAL_INFO[g].help, this.o.goal === g, () => {
          this.o.goal = g;
          if (g === 'espalda' || g === 'flexibilidad') this.o.zone = 'entero';
        }, GOAL_INFO[g].icon)));
    } else if (this.step === 1) {
      body.append(h('h2', { class: 'maker-q' }, '¿Qué zona quieres trabajar?'),
        ...ZONES.map((z) => opt(ZONE_INFO[z].name, ZONE_INFO[z].help, this.o.zone === z, () => (this.o.zone = z))));
    } else if (this.step === 2) {
      body.append(h('h2', { class: 'maker-q' }, '¿Cuánto tiempo tienes?'),
        h('div', { class: 'maker-chips' }, ...MINUTES.map((m) =>
          h('button', { class: 'maker-chip' + (this.o.minutes === m ? ' on' : ''), onclick: () => { this.o.minutes = m; this.next(); } }, `${m} min`))));
    } else if (this.step === 3) {
      body.append(h('h2', { class: 'maker-q' }, '¿Qué nivel?'),
        ...LEVELS.map((l) => opt(LEVEL_INFO[l].name, LEVEL_INFO[l].help, this.o.level === l, () => (this.o.level = l))));
    } else if (this.result) {
      const o = this.o as GenOptions;
      const name = suggestedName(o);
      body.append(
        h('h2', { class: 'maker-q' }, 'Tu tabla'),
        h('p', { class: 'muted maker-summary' }, [GOAL_INFO[o.goal].name, this.askZone ? ZONE_INFO[o.zone].name : '', `${o.minutes} min`, LEVEL_INFO[o.level].name].filter(Boolean).map((t) => tr(t)).join(' · ')),
        preview(this.app, this.result, {
          set: (r) => { this.result = r; this.keepRender(); },
          ask: this.ask,
        }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn ghost block', onclick: () => { this.result = generate(o, this.ctx()); this.ask = { remove: true }; this.render(); window.scrollTo({ top: 0 }); } }, icon('swap'), 'Otra propuesta'),
          ...saveButton(this.app, this.result, 'Guardar la tabla', () => void saveTable(this.app, `${tr(name.label)} · ${name.minutes} min`, this.result!, this.fillActive))));
    }
  }
}

/** Una tabla hecha, como resultado (ejercicios y vueltas). */
function fromTemplate(t: TableTemplate): GenResult {
  const routine = emptyRoutine();
  for (const s of SECTION_IDS) routine[s] = (t.routine[s] ?? []).map(([exerciseId, seconds]) => ({ exerciseId, seconds }));
  return { routine, rounds: { ...(t.rounds ?? {}) } };
}

/** Lista de tablas hechas. */
export class TemplatesScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });

  constructor(app: App, private readonly fillActive = false) {
    this.el.append(header(app, 'Tablas hechas'));
    const body = h('div', { class: 'maker-body' });
    this.el.append(body);
    body.append(h('p', { class: 'muted maker-intro' }, 'Tablas listas para usar. Al elegir una, se copia a tus tablas y la puedes cambiar como quieras.'));
    for (const t of TEMPLATES) {
      const r = fromTemplate(t);
      const miss = missingEquip(app, r);
      const secs = SECTION_IDS.filter((s) => r.routine[s].length).map((s) => {
        const p = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[s].icon), String(r.routine[s].length));
        p.style.setProperty('--sec', SECTION_STYLE[s].color);
        return p;
      });
      body.append(h('button', { class: 'card maker-tpl', onclick: () => app.push(new TemplateScreen(app, t, this.fillActive)) },
        h('span', { class: 'maker-opt-icon' }, icon(t.icon as IconName)),
        h('span', { class: 'maker-opt-text' },
          h('strong', {}, t.name),
          h('span', { class: 'muted small' }, t.desc),
          h('span', { class: 'maker-meta small' }, icon('clock'), humanDuration(tableSeconds(r, { catalog: app.catalog, settings: app.store.settings })), h('span', { class: 'pills' }, ...secs)),
          miss.length ? h('span', { class: 'maker-miss small' }, ...missLine(miss)) : ''),
        icon('chevron', 'ico chev')));
    }
  }
}

/** Una tabla hecha: vista previa (se puede cambiar antes de usarla) y «Usar esta tabla». */
class TemplateScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private r: GenResult;
  private readonly ask = { remove: true };

  constructor(private readonly app: App, private readonly t: TableTemplate, private readonly fillActive: boolean) {
    this.r = fromTemplate(t);
    this.render();
  }

  private render(): void {
    const { app, t } = this;
    const y = this.el.isConnected ? window.scrollY : -1;
    clear(this.el);
    this.el.append(header(app, t.name),
      h('div', { class: 'maker-body' },
        h('p', { class: 'muted maker-intro' }, t.desc),
        preview(app, this.r, {
          set: (r) => { this.r = r; this.render(); },
          ask: this.ask,
        }),
        h('div', { class: 'maker-actions' },
          ...saveButton(app, this.r, 'Usar esta tabla', () => void saveTable(app, tr(t.name), this.r, this.fillActive)))));
    if (y >= 0) window.scrollTo({ top: y });
  }
}

/** ¿Se han quitado todos los ejercicios? (entonces no se puede guardar). */
export function isEmptyResult(r: GenResult | null): boolean {
  return !r || SECTION_IDS.every((s) => !r.routine[s].length);
}

const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Elegir un ejercicio para añadirlo a un apartado de la tabla nueva (con tu material; con buscador). */
type PickSort = 'zona' | 'musculo' | 'material' | 'az';
const PICK_SORTS: Record<PickSort, string> = { zona: 'Zona del cuerpo', musculo: 'Por músculo', material: 'Por material', az: 'Alfabético (A-Z)' };

class PickExerciseScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private readonly list = h('div', { class: 'maker-preview' });
  private readonly foot = h('div', { class: 'pick-foot' });
  private q = '';
  private sort: PickSort = 'zona';
  /** Elegidos (en el orden en que se han tocado), si se pueden elegir varios. */
  private chosen: string[] = [];
  /** Tiempo y peso de cada elegido (se cambian en la misma lista, antes de añadirlos). */
  private opts = new Map<string, { seconds: number; weight?: number }>();

  /**
   * Lista de ejercicios de un apartado. Con `multi`, se tocan los que se quieran (se marcan) y se añaden todos
   * con el botón de abajo (o al volver atrás); sin `multi` (cambiar uno), al tocarlo ya está.
   */
  constructor(private readonly app: App, private readonly s: SectionId, private readonly have: ReadonlySet<string>,
    private readonly pick: (ids: string[], items: RoutineItem[]) => void, sub = 'Añadir un ejercicio', private readonly multi = false,
    private readonly defSecs = app.store.settings.defaultSeconds) {
    const search = h('input', { class: 'search-input', type: 'search', placeholder: 'Buscar ejercicio o zona', 'aria-label': 'Buscar', oninput: () => { this.q = search.value; this.paint(); } });
    // ordenar la lista (empieza siempre por zona; no se guarda)
    const sort = h('select', { class: 'sort-select', 'aria-label': 'Ordenar por', onchange: (e: Event) => {
      this.sort = (e.target as HTMLSelectElement).value as PickSort;
      (e.target as HTMLSelectElement).blur();
      this.paint();
    } }, ...(Object.entries(PICK_SORTS) as Array<[PickSort, string]>).map(([v, label]) => h('option', { value: v, selected: v === this.sort }, label)));
    this.el.append(header(app, SECTION_TITLES[s], sub), h('div', { class: 'maker-body' },
      h('div', { class: 'pick-tools' },
        h('label', { class: 'search pick-search' }, icon('search'), search),
        h('label', { class: 'pick-sort' }, icon('tables'), h('span', { class: 'muted small' }, 'Ordenar:'), sort)),
      this.list, multi ? this.foot : ''));
    this.paint();
  }

  /** Atrás con ejercicios marcados: se añaden igualmente (no se pierde lo elegido). */
  onBack(): boolean {
    if (!this.multi || !this.chosen.length) return false;
    this.done();
    return true;
  }

  /** Añade los marcados (se vacía antes: al volver atrás se vuelve a pasar por onBack). */
  private done(): void {
    const ids = this.chosen;
    this.chosen = [];
    const items: RoutineItem[] = ids.map((id) => {
      const o = this.opts.get(id);
      return { exerciseId: id, seconds: o?.seconds ?? this.defSecs, ...(o?.weight ? { weight: o.weight } : {}) };
    });
    this.pick(ids, items);
  }

  private paintFoot(): void {
    const n = this.chosen.length;
    this.foot.replaceChildren(h('button', { class: 'btn primary block big', disabled: !n, onclick: () => this.done() },
      icon('plus'), n ? `Añadir ${plural(n, 'ejercicio', 'ejercicios')}` : 'Elige los que quieras'));
  }

  private paint(): void {
    const { app } = this;
    const owned = new Set<string>(app.store.settings.equipment);
    const q = fold(this.q.trim());
    const exs = (app.sections.find((x) => x.id === this.s)?.exercises ?? [])
      .filter((e) => !this.have.has(e.id) && !e.pending && canDo(e.equip, owned))
      .filter((e) => !q || fold(`${e.name} ${tr(e.name)} ${e.zone} ${e.group ? tr(e.group) : ''}`).includes(q));
    clear(this.list);
    this.shown = [];
    const rest = exs;
    // agrupados según el orden elegido (en A-Z, sin grupos)
    const key = (e: ExerciseDef): string => this.sort === 'musculo' ? tr(e.zone)
      : this.sort === 'material' ? (e.equip?.[0]?.[0] ? tr(EQUIP_INFO[e.equip[0][0]].name) : tr('Sin material'))
      : this.sort === 'az' ? '' : (e.group ?? '');
    const sorted = this.sort === 'zona' ? rest
      : [...rest].sort((a, b) => (this.sort === 'material' && !a.equip?.length !== !b.equip?.length ? (a.equip?.length ? 1 : -1) : 0)
        || key(a).localeCompare(key(b), LOCALE) || tr(a.name).localeCompare(tr(b.name), LOCALE));
    let group: string | undefined;
    for (const ex of sorted) {
      const g = key(ex);
      if (g && g !== group) this.list.append(h('h2', { class: 'maker-sec pick-group' }, g));
      group = g;
      this.row(ex);
    }
    if (!exs.length) this.list.append(h('p', { class: 'muted' }, 'No hay más ejercicios para añadir.'));
    if (this.multi) this.paintFoot();
  }

  /** Ejercicios de la lista, en su orden (para pasar de uno a otro en la ficha). */
  private shown: ExerciseDef[] = [];

  private row(ex: ExerciseDef): void {
    this.shown.push(ex);
    this.list.append(this.buildRow(ex));
  }

  /** Fila de un ejercicio: la miniatura y el nombre abren la ficha; el botón de la derecha lo elige.
   *  Elegido (en la lista de varios): debajo, su tiempo (− +) y, si lleva mancuernas, el peso. */
  private buildRow(ex: ExerciseDef): HTMLElement {
    const { app } = this;
    const img = h('img', { class: 'maker-thumb', alt: '' });
    void app.thumbs.get(ex).then((url) => (img.src = url));
    const on = this.chosen.includes(ex.id);
    const shown = this.shown;
    const repaint = () => row.replaceWith(this.buildRow(ex));
    const sel = h('button', { class: 'pick-sel', 'aria-pressed': this.multi ? String(on) : null, 'aria-label': `Elegir ${ex.name}`, onclick: () => {
      if (!this.multi) { this.pick([ex.id], [{ exerciseId: ex.id, seconds: this.defSecs }]); return; }
      app.haptics.tap();
      this.chosen = on ? this.chosen.filter((x) => x !== ex.id) : [...this.chosen, ex.id];
      repaint();
      this.paintFoot();
    } }, icon(on ? 'check' : 'plus'));
    const o = this.opts.get(ex.id) ?? { seconds: this.defSecs };
    const set = (next: { seconds: number; weight?: number }) => { this.opts.set(ex.id, next); repaint(); };
    const ctrls = this.multi && on ? h('div', { class: 'pick-ctrls' },
      h('div', { class: 'stepper inline maker-time' },
        h('button', { 'aria-label': 'Menos tiempo', disabled: o.seconds <= MIN_SECONDS, onclick: () => set({ ...o, seconds: Math.max(MIN_SECONDS, o.seconds - STEP_SECONDS) }) }, '−'),
        h('span', { class: 'secs' }, `${o.seconds} s`),
        h('button', { 'aria-label': 'Más tiempo', disabled: o.seconds >= MAX_SECONDS, onclick: () => set({ ...o, seconds: Math.min(MAX_SECONDS, o.seconds + STEP_SECONDS) }) }, '+')),
      usesWeight(ex) ? h('button', { class: 'weight-btn small' + (o.weight ? '' : ' none'), 'aria-label': `Peso de ${ex.name}: ${o.weight ? kg(o.weight) + ' por mancuerna' : 'sin peso'}. Cambiar`, onclick: async () => {
        const w = await weightDialog(ex.name, o.weight ?? app.store.lastWeight(ex.id) ?? (/barra/.test(weightUnit(ex)) ? 20 : 5), weightUnit(ex));
        if (w === null) return;
        set({ seconds: o.seconds, ...(w ? { weight: w } : {}) });
      } }, icon('dumbbell'), o.weight ? kg(o.weight) : 'Sin peso') : '') : '';
    const row: HTMLElement = h('div', { class: 'maker-row maker-pick' + (on ? ' on' : '') },
      h('div', { class: 'pick-top' },
        h('button', { class: 'maker-open', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => app.push(new DetailScreen(app, ex, shown)) },
          img,
          h('span', { class: 'maker-name' }, h('span', {}, ex.name), h('span', { class: 'maker-secs muted small' }, ex.zone),
            ex.oneSided ? h('span', { class: 'by-sides small' }, icon('sides'), 'por lados') : '')),
        sel),
      ctrls);
    return row;
  }
}
