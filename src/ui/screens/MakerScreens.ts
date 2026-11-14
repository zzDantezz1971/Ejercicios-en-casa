import { TEMPLATES, type TableTemplate } from '../../data/templates';
import { canDo, EQUIP_INFO, type Equip } from '../../domain/equipment';
import {
  generate, GOAL_INFO, GOALS, LEVEL_INFO, LEVELS, MINUTES, suggestedName, swapExercise, tableSeconds, ZONE_INFO, ZONES,
  type GenContext, type GenOptions, type GenResult, type Goal,
} from '../../domain/generator';
import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { emptyRoutine, SECTION_IDS, SECTION_TITLES, type SectionId } from '../../domain/types';
import { tr } from '../../i18n';
import type { App, Screen } from '../App';
import { actionSheet, clear, h, humanDuration, plural, promptDialog } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { DetailScreen } from './DetailScreen';
import { RoutineScreen } from './RoutineScreen';

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
interface PreviewEdit {
  set(r: GenResult): void;
  swap?(s: SectionId, i: number): GenResult;
}

/** Copia de la tabla con un apartado cambiado (si se queda vacío, sin vueltas). */
function withSection(r: GenResult, s: SectionId, items: GenResult['routine'][SectionId]): GenResult {
  const rounds = { ...r.rounds };
  if (!items.length) delete rounds[s];
  return { routine: { ...r.routine, [s]: items }, rounds };
}

/** Opciones de un ejercicio de la vista previa: subir, bajar, cambiar por otro parecido o quitarlo. */
async function rowMenu(r: GenResult, s: SectionId, i: number, name: string, edit: PreviewEdit): Promise<void> {
  const items = r.routine[s];
  type Opt = 'up' | 'down' | 'swap' | 'remove';
  const opts: Array<{ id: Opt; label: string; danger?: boolean }> = [];
  if (i > 0) opts.push({ id: 'up', label: 'Subir' });
  if (i < items.length - 1) opts.push({ id: 'down', label: 'Bajar' });
  if (edit.swap) opts.push({ id: 'swap', label: 'Cambiar por otro parecido' });
  opts.push({ id: 'remove', label: 'Quitar de la tabla', danger: true });
  const c = await actionSheet(name, opts);
  if (!c) return;
  if (c === 'swap') return edit.set(edit.swap!(s, i));
  const next = items.slice();
  if (c === 'remove') next.splice(i, 1);
  else {
    const j = c === 'up' ? i - 1 : i + 1;
    [next[i], next[j]] = [next[j], next[i]];
  }
  edit.set(withSection(r, s, next));
}

/** Vista previa de una tabla: resumen y ejercicios por apartado. Al tocar un ejercicio se ve cómo se hace;
 *  con `edit`, cada uno tiene un menú para moverlo, quitarlo o cambiarlo. */
function preview(app: App, r: GenResult, edit?: PreviewEdit): HTMLElement {
  const plan = WorkoutPlan.build(r.routine, app.catalog, app.store.settings, r.rounds);
  const locked = SECTION_IDS.some((s) => r.routine[s].some((i) => !app.access.canUse(i.exerciseId)));
  const miss = missingEquip(app, r);
  const shown = SECTION_IDS.flatMap((s) => r.routine[s].map((i) => app.catalog.get(i.exerciseId)).filter((e): e is NonNullable<typeof e> => !!e));
  const box = h('div', { class: 'maker-preview' },
    h('p', { class: 'maker-total' }, icon('clock'), plan.isEmpty ? 'Sin ejercicios' : `${humanDuration(plan.estimatedSeconds)} · ${plural(plan.exerciseCount, 'ejercicio', 'ejercicios')}`));
  if (miss.length) box.append(h('p', { class: 'note small' }, icon('dumbbell'), h('span', {}, h('span', {}, 'Necesitas:'), ` ${miss.map((e) => tr(EQUIP_INFO[e].name)).join(', ')}`)));
  for (const s of SECTION_IDS) {
    const items = r.routine[s];
    if (!items.length) continue;
    const st = SECTION_STYLE[s];
    const head = h('h2', { class: 'maker-sec' }, icon(st.icon), SECTION_TITLES[s], (r.rounds[s] ?? 1) > 1 ? h('span', { class: 'maker-rounds' }, plural(r.rounds[s]!, 'vuelta', 'vueltas')) : '');
    head.style.setProperty('--sec', st.color);
    box.append(head);
    items.forEach((it, i) => {
      const ex = app.catalog.get(it.exerciseId);
      if (!ex) return;
      const img = h('img', { class: 'maker-thumb', alt: '' });
      void app.thumbs.get(ex).then((url) => (img.src = url));
      const lock = !app.access.canUse(ex.id);
      box.append(h('div', { class: 'maker-row' + (lock ? ' locked' : '') },
        h('button', { class: 'maker-open', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => (lock ? app.showPremium() : app.push(new DetailScreen(app, ex, shown))) },
          img,
          h('span', { class: 'maker-name' }, ex.name, lock ? icon('lock', 'ico lock') : ''),
          h('span', { class: 'maker-secs muted small' }, `${it.seconds} s`)),
        edit ? h('button', { class: 'more-btn', 'aria-label': `Más opciones de ${ex.name}`, onclick: () => void rowMenu(r, s, i, ex.name, edit) }, icon('more')) : ''));
    });
  }
  if (locked) box.append(h('p', { class: 'muted small maker-free' }, icon('lock'), 'Los ejercicios con candado son de Prémium: en la versión gratis se saltan.'));
  return box;
}

const header = (app: App, title: string, sub?: string) =>
  h('header', { class: 'bar sticky' },
    h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
    h('div', { class: 'titles' }, sub ? h('span', { class: 'subtitle' }, sub) : '', h('h1', { class: 'bar-title' }, title)));

/** Asistente «Créala por mí». */
export class GeneratorScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private step = 0;
  private o: Partial<GenOptions> = {};
  private result: GenResult | null = null;

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
    if (this.step === 4) this.result = generate(this.o as GenOptions, this.ctx());
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
          swap: (sec, i) => swapExercise(this.result!, sec, i, o, this.ctx()),
        }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn ghost block', onclick: () => { this.result = generate(o, this.ctx()); this.render(); window.scrollTo({ top: 0 }); } }, icon('swap'), 'Otra propuesta'),
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
          miss.length ? h('span', { class: 'maker-miss small' }, icon('dumbbell'), h('span', {}, 'Necesitas:'), ` ${miss.map((e) => tr(EQUIP_INFO[e].name)).join(', ')}`) : ''),
        icon('chevron', 'ico chev')));
    }
  }
}

/** Una tabla hecha: vista previa (se puede cambiar antes de usarla) y «Usar esta tabla». */
class TemplateScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private r: GenResult;

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
        preview(app, this.r, { set: (r) => { this.r = r; this.render(); } }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn primary block big', disabled: isEmptyResult(this.r), onclick: () => void saveTable(app, tr(t.name), this.r, this.fillActive) }, icon('check'), 'Usar esta tabla'))));
    if (y >= 0) window.scrollTo({ top: y });
  }
}

/** ¿Se han quitado todos los ejercicios? (entonces no se puede guardar). */
function isEmptyResult(r: GenResult | null): boolean {
  return !r || SECTION_IDS.every((s) => !r.routine[s].length);
}
