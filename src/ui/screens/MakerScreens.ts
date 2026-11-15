import { TEMPLATES, type TableTemplate } from '../../data/templates';
import { canDo, EQUIP_INFO, type Equip } from '../../domain/equipment';
import {
  generate, GOAL_INFO, GOALS, LEVEL_INFO, LEVELS, MINUTES, suggestedName, swapExercise, tableSeconds, ZONE_INFO, ZONES,
  type GenContext, type GenOptions, type GenResult, type Goal,
} from '../../domain/generator';
import { clampRounds, MAX_ROUNDS, WorkoutPlan } from '../../domain/WorkoutPlan';
import { MAX_SECONDS, MIN_SECONDS, STEP_SECONDS } from '../../domain/RoutineEditor';
import { emptyRoutine, SECTION_IDS, SECTION_TITLES, usesWeight, type SectionId } from '../../domain/types';
import { tr } from '../../i18n';
import type { App, Screen } from '../App';
import { clear, h, humanDuration, kg, plural, promptDialog, weightDialog } from '../dom';
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
  const opt = (ic: IconName, title: string, help: string, go: () => void) =>
    h('button', { class: 'maker-opt', onclick: () => { close(); go(); } },
      h('span', { class: 'maker-opt-icon' }, icon(ic)),
      h('span', { class: 'maker-opt-text' }, h('strong', {}, title), h('span', { class: 'muted small' }, help)),
      icon('chevron', 'ico chev'));
  const wrap = h('div', { class: 'dialog-wrap sheet-wrap', onclick: (e: Event) => e.target === wrap && close() },
    h('div', { class: 'sheet maker-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Nueva tabla' },
      h('p', { class: 'sheet-title' }, 'Nueva tabla'),
      opt('bolt', 'Créala por mí', 'Elige objetivo, zona y tiempo', () => app.push(new GeneratorScreen(app))),
      opt('tables', 'Tablas hechas', 'Listas para usar', () => app.push(new TemplatesScreen(app))),
      opt('edit', 'Tabla vacía', 'Elige tú los ejercicios', () => void emptyTable(app)),
      // plan de la semana (Prémium): una tabla para cada día de entrenamiento
      h('button', { class: 'maker-opt', onclick: () => { close(); newPlan(app); } },
        h('span', { class: 'maker-opt-icon' }, icon('calendar')),
        h('span', { class: 'maker-opt-text' }, h('strong', {}, 'Plan de la semana'), h('span', { class: 'muted small' }, 'Una tabla para cada día que entrenas')),
        app.access.premium ? icon('chevron', 'ico chev') : icon('lock', 'ico lock')),
      h('button', { class: 'sheet-btn cancel', onclick: close }, 'Cancelar')));
  document.body.append(wrap);
}

async function emptyTable(app: App): Promise<void> {
  const name = await promptDialog('Nombre de la nueva tabla', '', 'Crear');
  if (!name) return;
  app.store.createRoutine(name);
  app.push(new RoutineScreen(app));
}

/** Guarda la tabla propuesta (en la activa si está vacía y se pidió así) y lleva a Inicio para empezar. */
async function saveTable(app: App, defName: string, r: GenResult, fillActive: boolean): Promise<void> {
  const name = await promptDialog('Nombre de la tabla', defName, 'Guardar');
  if (!name) return;
  if (fillActive) app.store.fillActive(name, r.routine, r.rounds);
  else app.store.createRoutineFrom(name, r.routine, r.rounds);
  app.haptics.tap();
  app.openTab('inicio');
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

/** Lo que se puede hacer con la tabla en la vista previa: cambiarla (mover, quitar) y, en el asistente, cambiar un ejercicio. */
export interface PreviewEdit {
  set(r: GenResult): void;
  swap?(s: SectionId, i: number): GenResult;
  /** Preguntar antes de quitar un ejercicio (se puede desactivar para esta lista con la casilla del aviso). */
  ask: { remove: boolean };
  /** Editar también las vueltas de cada apartado y el peso de las mancuernas (al editar una tabla guardada). */
  full?: boolean;
}

/** Añadir un ejercicio a un apartado: abre la lista para elegirlo y lo pone al final. */
function addTo(app: App, r: GenResult, s: SectionId, edit: PreviewEdit): void {
  const have = new Set(SECTION_IDS.flatMap((x) => r.routine[x].map((i) => i.exerciseId)));
  const items = r.routine[s];
  // los segundos, como los demás ejercicios del apartado (o los de siempre)
  const secs = items.length ? items[items.length - 1].seconds : app.store.settings.defaultSeconds;
  app.push(new PickExerciseScreen(app, s, have, (id) => {
    edit.set(withSection(r, s, [...items, { exerciseId: id, seconds: secs }]));
    app.back();
  }));
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
  return { routine: { ...r.routine, [s]: items }, rounds };
}

/** Vista previa de una tabla: resumen y ejercicios por apartado. Al tocar un ejercicio se ve cómo se hace;
 *  con `edit`, se ordenan arrastrándolos con el asa y cada uno se puede cambiar o quitar (con aviso). */
/** «Necesitas: [icono] Step, [icono] Mancuernas»: cada material con su icono. */
function missLine(miss: readonly Equip[]): HTMLElement[] {
  return [h('span', {}, 'Necesitas:'), ...miss.map((e) => h('span', { class: 'miss-item' }, icon(EQUIP_INFO[e].icon as IconName), tr(EQUIP_INFO[e].name)))];
}

export function preview(app: App, r: GenResult, edit?: PreviewEdit): HTMLElement {
  const plan = WorkoutPlan.build(r.routine, app.catalog, app.store.settings, r.rounds);
  const locked = SECTION_IDS.some((s) => r.routine[s].some((i) => !app.access.canUse(i.exerciseId)));
  const miss = missingEquip(app, r);
  const shown = SECTION_IDS.flatMap((s) => r.routine[s].map((i) => app.catalog.get(i.exerciseId)).filter((e): e is NonNullable<typeof e> => !!e));
  const box = h('div', { class: 'maker-preview' },
    h('p', { class: 'maker-total' }, icon('clock'), plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`));
  if (miss.length) box.append(h('p', { class: 'note small miss-note' }, ...missLine(miss)));
  // leyenda de los botones de cada ejercicio
  if (edit) box.append(h('div', { class: 'maker-legend' },
    edit.swap ? h('span', {}, icon('swap'), 'Cambiar') : '',
    h('span', {}, icon('trash', 'ico danger'), 'Quitar'),
    h('span', {}, icon('tables'), 'Arrastra para mover')));
  for (const s of SECTION_IDS) {
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
    box.append(head);
    const rows: SortableRow[] = [];
    items.forEach((it, i) => {
      const ex = app.catalog.get(it.exerciseId);
      if (!ex) return;
      const img = h('img', { class: 'maker-thumb', alt: '' });
      void app.thumbs.get(ex).then((url) => (img.src = url));
      const lock = !app.access.canUse(ex.id);
      const open = () => (lock ? app.showPremium() : app.push(new DetailScreen(app, ex, shown)));
      const setSecs = (d: number) => {
        const next = items.slice();
        next[i] = { ...it, seconds: Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, it.seconds + d)) };
        edit!.set(withSection(r, s, next));
      };
      const content = h('div', { class: 'maker-row' + (lock ? ' locked' : '') },
        // tocar la miniatura o el nombre abre la ficha (cómo se hace)
        h('button', { class: 'maker-open', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: open }, img),
        h('div', { class: 'maker-name' },
          h('button', { class: 'maker-open maker-title', onclick: open }, ex.name, lock ? icon('lock', 'ico lock') : ''),
          // tiempo del ejercicio: con − y + en las tablas que se pueden cambiar
          edit ? h('div', { class: 'stepper inline maker-time' },
            h('button', { 'aria-label': 'Menos tiempo', disabled: it.seconds <= MIN_SECONDS, onclick: () => setSecs(-STEP_SECONDS) }, '−'),
            h('span', { class: 'secs' }, `${it.seconds} s`),
            h('button', { 'aria-label': 'Más tiempo', disabled: it.seconds >= MAX_SECONDS, onclick: () => setSecs(STEP_SECONDS) }, '+'))
            : h('span', { class: 'maker-secs muted small' }, `${it.seconds} s`),
          // peso de la mancuerna (al editar una tabla guardada)
          edit?.full && usesWeight(ex) ? h('button', { class: 'weight-btn small' + (it.weight ? '' : ' none'), 'aria-label': `Peso de ${ex.name}: ${it.weight ? kg(it.weight) + ' por mancuerna' : 'sin peso'}. Cambiar`, onclick: async () => {
            const w = await weightDialog(ex.name, it.weight ?? app.store.lastWeight(ex.id) ?? 5);
            if (w === null) return;
            const next = items.slice();
            const { weight: _old, ...rest } = it;
            next[i] = w ? { ...rest, weight: w } : rest;
            edit.set(withSection(r, s, next));
          } }, icon('dumbbell'), it.weight ? kg(it.weight) : 'Sin peso') : ''),
        edit?.swap ? h('button', { class: 'icon-btn small', 'aria-label': `Cambiar ${ex.name} por otro parecido`, onclick: () => edit.set(edit.swap!(s, i)) }, icon('swap')) : '',
        // quitar: apartado de los demás botones y con aviso (que se puede desactivar para esta lista)
        edit ? h('button', { class: 'icon-btn small danger maker-remove', 'aria-label': `Quitar ${ex.name} de la tabla`, onclick: async () => {
          if (edit.ask.remove) {
            const { ok, stop } = await confirmRemove(ex.name);
            if (!ok) return;
            if (stop) edit.ask.remove = false;
          }
          const next = items.slice();
          next.splice(i, 1);
          edit.set(withSection(r, s, next));
        } }, icon('trash')) : '');
      rows.push({ content, label: ex.name });
    });
    // se ordena arrastrando con el asa (sin flechas)
    if (edit) box.append(sortableList(rows, (from, to) => {
      const next = items.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      edit.set(withSection(r, s, next));
    }, { arrows: false }));
    else for (const row of rows) box.append(row.content);
    if (edit) box.append(h('button', { class: 'maker-add', onclick: () => addTo(app, r, s, edit) }, icon('plus'), 'Añadir un ejercicio'));
  }
  if (locked) box.append(h('p', { class: 'muted small maker-free' }, icon('lock'), 'Los ejercicios con candado son de Prémium: en la versión gratis se saltan.'));
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
          swap: (sec, i) => swapExercise(this.result!, sec, i, o, this.ctx()),
        }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn ghost block', onclick: () => { this.result = generate(o, this.ctx()); this.ask = { remove: true }; this.render(); window.scrollTo({ top: 0 }); } }, icon('swap'), 'Otra propuesta'),
          h('button', { class: 'btn primary block big', disabled: isEmptyResult(this.result), onclick: () => void saveTable(this.app, `${tr(name.label)} · ${name.minutes} min`, this.result!, this.fillActive) }, icon('check'), 'Guardar la tabla')));
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
          // otro parecido (mismo músculo y grupo), con el material del usuario
          swap: (sec, i) => swapExercise(this.r, sec, i, { goal: 'forma', zone: 'entero', level: 'normal', minutes: 20 },
            { sections: app.sections, catalog: app.catalog, owned: new Set(app.store.settings.equipment), settings: app.store.settings }),
        }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn primary block big', disabled: isEmptyResult(this.r), onclick: () => void saveTable(app, tr(t.name), this.r, this.fillActive) }, icon('check'), 'Usar esta tabla'))));
    if (y >= 0) window.scrollTo({ top: y });
  }
}

/** ¿Se han quitado todos los ejercicios? (entonces no se puede guardar). */
export function isEmptyResult(r: GenResult | null): boolean {
  return !r || SECTION_IDS.every((s) => !r.routine[s].length);
}

const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Elegir un ejercicio para añadirlo a un apartado de la tabla nueva (con tu material; con buscador). */
class PickExerciseScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private readonly list = h('div', { class: 'maker-preview' });
  private q = '';

  constructor(private readonly app: App, private readonly s: SectionId, private readonly have: ReadonlySet<string>, private readonly pick: (id: string) => void) {
    const search = h('input', { class: 'text-input', type: 'search', placeholder: 'Buscar', 'aria-label': 'Buscar', oninput: () => { this.q = search.value; this.paint(); } });
    this.el.append(header(app, SECTION_TITLES[s], 'Añadir un ejercicio'), h('div', { class: 'maker-body' }, search, this.list));
    this.paint();
  }

  private paint(): void {
    const { app } = this;
    const owned = new Set<string>(app.store.settings.equipment);
    const q = fold(this.q.trim());
    const exs = (app.sections.find((x) => x.id === this.s)?.exercises ?? [])
      .filter((e) => !this.have.has(e.id) && !e.pending && canDo(e.equip, owned))
      .filter((e) => !q || fold(`${e.name} ${tr(e.name)} ${e.zone} ${e.group ? tr(e.group) : ''}`).includes(q));
    clear(this.list);
    let group: string | undefined;
    for (const ex of exs) {
      if (ex.group !== group) {
        group = ex.group;
        if (group) this.list.append(h('h2', { class: 'maker-sec' }, group));
      }
      const img = h('img', { class: 'maker-thumb', alt: '' });
      void app.thumbs.get(ex).then((url) => (img.src = url));
      const lock = !app.access.canUse(ex.id);
      this.list.append(h('button', { class: 'maker-row maker-pick' + (lock ? ' locked' : ''), onclick: () => this.pick(ex.id) },
        img,
        h('span', { class: 'maker-name' }, h('span', {}, ex.name), h('span', { class: 'maker-secs muted small' }, ex.zone, lock ? icon('lock', 'ico lock') : '')),
        icon('plus')));
    }
    if (!exs.length) this.list.append(h('p', { class: 'muted' }, 'No hay más ejercicios para añadir.'));
  }
}
