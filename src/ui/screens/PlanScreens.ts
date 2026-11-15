import { generate, GOAL_INFO, GOALS, LEVEL_INFO, LEVELS, swapExercise, type GenContext, type GenOptions, type GenResult, type Goal, type Level } from '../../domain/generator';
import { remindersOf } from '../../domain/reminders';
import { WorkoutPlan } from '../../domain/WorkoutPlan';
import {
  dateInWeek, dayOptions, kindLabel, MAX_DAYS, MIN_DAYS, mondayOf, nextPlanDay, planDayOn, sortDays, splitFor, trainedDates, WEEK_ORDER, ymd,
  type DayKind, type PlanDay, type WeekPlan,
} from '../../domain/weekPlan';
import { LOCALE, tr } from '../../i18n';
import { askNotificationPermission, REMINDERS_AVAILABLE } from '../../services/Reminders';
import type { App, Screen } from '../App';
import { actionSheet, clear, confirmDialog, h, humanDuration, plural, promptDialog } from '../dom';
import { formatDate } from './HomeScreen';
import { SECTION_IDS, SECTION_TITLES, type SectionId } from '../../domain/types';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { startWorkout } from '../components/startWorkout';
import { header, isEmptyResult, preview } from './MakerScreens';

/*
 * Plan de la semana (Prémium): asistente (objetivo, días, minutos y nivel), pantalla «Mi plan» con la semana de
 * lunes a domingo, la tabla de cada día (se puede cambiar o pedir otra) y, en Inicio, la tabla del día.
 * Cada día de entrenamiento tiene su propia tabla (se ve también en Tablas). Si «Renovar los ejercicios cada
 * semana» está activado, al empezar una semana nueva se cambian los ejercicios de cada día (las zonas no).
 */

const PLAN_MINUTES = [15, 20, 30, 45];

/** «Lunes», «Dilluns», «Monday»… (0 = domingo). */
export function dayName(day: number, style: 'long' | 'short' = 'long'): string {
  const s = new Date(2024, 0, 7 + day).toLocaleDateString(LOCALE, { weekday: style });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function genCtx(app: App): GenContext {
  return { sections: app.sections, catalog: app.catalog, owned: new Set(app.store.settings.equipment), settings: app.store.settings };
}

/** Nombre de la tabla de un día: «Plan · Lunes · Tren superior» (en el idioma de la app). */
function tableName(plan: Pick<WeekPlan, 'goal'>, day: number, kind: DayKind): string {
  return `${tr('Plan')} · ${dayName(day)} · ${tr(kindLabel(plan, kind))}`;
}

/** Abre la lista de planes (para elegir el que se usa o crear otro); si no hay ninguno, el asistente. */
export function openPlan(app: App): void {
  if (!app.access.premium) { app.showPremium(); return; }
  if (app.store.plans.length) app.push(new PlansScreen(app));
  else app.push(new PlanWizardScreen(app));
}

/** El plan y el día al que pertenece una tabla (si es de un plan). */
export function planDayOf(app: App, routineId: string): { plan: WeekPlan; day: PlanDay } | undefined {
  for (const plan of app.store.plans) {
    const day = plan.days.find((d) => d.routineId === routineId);
    if (day) return { plan, day };
  }
  return undefined;
}

/** Crear un plan nuevo (Nueva › Plan de la semana). */
export function newPlan(app: App): void {
  if (!app.access.premium) { app.showPremium(); return; }
  app.push(new PlanWizardScreen(app));
}

/** Nombre de un plan: el que le ha puesto el usuario o, si no, su objetivo. */
export function planTitle(p: WeekPlan): string {
  return p.name ?? tr(GOAL_INFO[p.goal].name);
}

/**
 * Pone un plan en uso: su tabla de hoy (o la del próximo día) pasa a ser la tabla en uso y, si el recordatorio de
 * entrenar está activado, pasa a avisar los días de este plan.
 */
export function usePlan(app: App, id: string): void {
  const p = app.store.planById(id);
  if (!p) return;
  app.store.setActivePlan(id);
  useTodaysTable(app, true);
  const r = remindersOf(app.store.settings.reminders);
  if (r.train.on) app.store.saveSettings({ ...app.store.settings, reminders: { ...r, train: { ...r.train, days: p.days.map((d) => d.day) } } });
}

/**
 * Pone el plan al día: si empieza una semana nueva y hay que renovar, cambia los ejercicios de cada día;
 * si se ha borrado la tabla de algún día, la vuelve a crear.
 */
export function refreshPlan(app: App, now = new Date()): void {
  if (!app.access.premium) return;
  for (const plan of app.store.plans) refreshOne(app, plan, now);
  useTodaysTable(app, false);
}

function refreshOne(app: App, plan: WeekPlan, now: Date): void {
  const week = mondayOf(now);
  const renew = plan.renew && plan.week !== week;
  let changed = plan.week !== week;
  const days = plan.days.map((d) => {
    const r = app.store.routineById(d.routineId);
    if (r && !renew) return d;
    const g = generate(dayOptions(plan, d.kind), genCtx(app));
    changed = true;
    if (r) { app.store.setRoutineContent(r.id, g.routine, g.rounds); return d; }
    return { ...d, routineId: app.store.addRoutine(tableName(plan, d.day, d.kind), g.routine, g.rounds).id };
  });
  if (changed) app.store.setPlan({ ...plan, days, week });
}

/**
 * La tabla en uso sigue al plan: la de hoy (o, si hoy se descansa, la del próximo día de entrenamiento).
 * Si el usuario ha elegido otra tabla que no es del plan, se respeta (salvo `force`, al crear el plan).
 */
export function useTodaysTable(app: App, force: boolean, now = new Date()): void {
  const plan = app.store.plan;
  if (!plan) return;
  if (!force && !app.store.isPlanRoutine(app.store.active.id)) return;
  const pd = planDayOn(plan, now) ?? nextPlanDay(plan, now)?.day;
  if (pd && app.store.routineById(pd.routineId) && app.store.active.id !== pd.routineId) app.store.setActive(pd.routineId);
}

/** Duración de una tabla guardada. */
function routineSeconds(app: App, id: string): number {
  const r = app.store.routineById(id);
  return r ? WorkoutPlan.build(r.routine, app.catalog, app.store.settings, r.rounds).estimatedSeconds : 0;
}

/** Empieza el entrenamiento de un día del plan. */
function startDay(app: App, planId: string, d: PlanDay): void {
  const r = app.store.routineById(d.routineId);
  if (!r) return;
  const plan = WorkoutPlan.build(app.playable(r.routine), app.catalog, app.store.settings, r.rounds);
  if (plan.isEmpty) { app.push(new PlanDayScreen(app, planId, d.day)); return; }
  void startWorkout(app, plan, r);
}

/** Resumen de un plan guardado. */
export function planSummary(p: WeekPlan): string {
  return summary({ ...p, n: p.days.length });
}

/** Resumen del plan: «Ganar fuerza · 4 días · 30 min · Normal». */
function summary(p: Pick<WeekPlan, 'goal' | 'minutes' | 'level'> & { n: number }): string {
  return [tr(GOAL_INFO[p.goal].name), tr(plural(p.n, 'día', 'días')), `${p.minutes} min`, tr(LEVEL_INFO[p.level].name)].join(' · ');
}

/** Pregunta si se quieren recordatorios los días de entrenamiento (y los activa con esos días). */
async function askReminders(app: App, days: number[]): Promise<void> {
  const ok = await confirmDialog(tr('¿Quieres que te avise los días de entrenamiento?'), tr('Sí, avísame'), tr('Ahora no'));
  if (!ok) return;
  if (REMINDERS_AVAILABLE && !(await askNotificationPermission())) {
    await confirmDialog(tr('Para recibir recordatorios, permite las notificaciones de Kasa Fit en los ajustes del móvil.'), tr('Vale'), '');
    return;
  }
  const r = remindersOf(app.store.settings.reminders);
  app.store.saveSettings({ ...app.store.settings, reminders: { ...r, train: { ...r.train, on: true, days: [...days], since: new Date().toISOString() } } });
}

/** Asistente del plan: objetivo, días, minutos, nivel y vista previa de la semana. */
export class PlanWizardScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private step = 0;
  private goal?: Goal;
  private days: number[];
  private minutes?: number;
  private level?: Level;
  private result: Array<{ day: number; kind: DayKind; r: GenResult }> = [];

  /** Con `replaceId`, el plan nuevo sustituye a ese («Cambiar el plan»). */
  constructor(private readonly app: App, private readonly replaceId?: string) {
    // los días de los recordatorios, si tiene (si no, lunes, miércoles y viernes)
    const rem = remindersOf(app.store.settings.reminders).train.days;
    this.days = rem.length >= MIN_DAYS && rem.length <= MAX_DAYS ? sortDays(rem) : [1, 3, 5];
    this.render();
  }

  enter(): void {
    if (this.step === 4) this.render();
  }

  onBack(): boolean {
    if (this.step === 0) return false;
    this.step--;
    this.render();
    return true;
  }

  private next(): void {
    this.step++;
    if (this.step === 4) this.propose();
    this.render();
    window.scrollTo({ top: 0 });
  }

  private propose(): void {
    const o = { goal: this.goal!, minutes: this.minutes!, level: this.level! };
    this.result = splitFor(o.goal, this.days).map(({ day, kind }) => ({ day, kind, r: generate(dayOptions(o, kind), genCtx(this.app)) }));
  }

  private render(): void {
    const { app } = this;
    clear(this.el);
    this.el.append(header(app, 'Plan de la semana', this.step < 4 ? `Paso ${this.step + 1} de 4` : undefined));
    const body = h('div', { class: 'maker-body' });
    this.el.append(body);
    const opt = (title: string, help: string, on: boolean, pick: () => void, ic?: string) =>
      h('button', { class: 'maker-opt' + (on ? ' on' : ''), onclick: () => { pick(); this.next(); } },
        ic ? h('span', { class: 'maker-opt-icon' }, icon(ic as IconName)) : '',
        h('span', { class: 'maker-opt-text' }, h('strong', {}, title), help ? h('span', { class: 'muted small' }, help) : ''),
        icon('chevron', 'ico chev'));
    if (this.step === 0) {
      body.append(h('p', { class: 'muted maker-intro' }, 'Elige los días que quieres entrenar y la app te prepara una tabla para cada uno, repartiendo las zonas para que descansen entre sesiones.'),
        h('h2', { class: 'maker-q' }, '¿Cuál es tu objetivo?'),
        ...GOALS.map((g) => opt(GOAL_INFO[g].name, GOAL_INFO[g].help, this.goal === g, () => (this.goal = g), GOAL_INFO[g].icon)));
    } else if (this.step === 1) {
      const n = this.days.length;
      const cont = h('button', { class: 'btn primary block big', disabled: n < MIN_DAYS || n > MAX_DAYS, onclick: () => this.next() }, 'Continuar');
      body.append(h('h2', { class: 'maker-q' }, '¿Qué días quieres entrenar?'),
        h('p', { class: 'muted small' }, 'Entre 2 y 6 días (al menos uno de descanso).'),
        h('div', { class: 'plan-days' }, ...WEEK_ORDER.map((d) =>
          h('button', { class: 'plan-day-chip' + (this.days.includes(d) ? ' on' : ''), 'aria-pressed': String(this.days.includes(d)), 'aria-label': dayName(d), onclick: () => {
            this.days = this.days.includes(d) ? this.days.filter((x) => x !== d) : sortDays([...this.days, d]);
            this.render();
          } }, dayName(d, 'short')))),
        h('div', { class: 'maker-actions' }, cont));
    } else if (this.step === 2) {
      body.append(h('h2', { class: 'maker-q' }, '¿Cuánto tiempo cada día?'),
        h('div', { class: 'maker-chips' }, ...PLAN_MINUTES.map((m) =>
          h('button', { class: 'maker-chip' + (this.minutes === m ? ' on' : ''), onclick: () => { this.minutes = m; this.next(); } }, `${m} min`))));
    } else if (this.step === 3) {
      body.append(h('h2', { class: 'maker-q' }, '¿Qué nivel?'),
        ...LEVELS.map((l) => opt(LEVEL_INFO[l].name, LEVEL_INFO[l].help, this.level === l, () => (this.level = l))));
    } else {
      const o = { goal: this.goal!, minutes: this.minutes!, level: this.level! };
      const list = h('div', { class: 'plan-week' });
      for (const d of WEEK_ORDER) {
        const x = this.result.find((y) => y.day === d);
        if (!x) { list.append(h('div', { class: 'plan-row rest' }, h('span', { class: 'plan-dname' }, dayName(d)), h('span', { class: 'muted' }, 'Descanso'))); continue; }
        const p = WorkoutPlan.build(x.r.routine, app.catalog, app.store.settings, x.r.rounds);
        // al tocar un día se ven sus ejercicios y se pueden cambiar antes de crear el plan
        list.append(h('button', { class: 'plan-row', onclick: () => app.push(new DraftDayScreen(app, x, dayOptions(o, x.kind), tr(kindLabel(o, x.kind)))) },
          h('span', { class: 'plan-dname' }, dayName(d)),
          h('span', { class: 'plan-dtext' }, h('strong', {}, tr(kindLabel(o, x.kind))), h('span', { class: 'muted small' }, `${humanDuration(p.estimatedSeconds)} · ${tr(plural(p.exerciseCount, 'ejercicio', 'ejercicios'))}`)),
          icon('chevron', 'ico chev')));
      }
      body.append(h('h2', { class: 'maker-q' }, 'Tu semana'),
        h('p', { class: 'muted maker-summary' }, summary({ ...o, n: this.days.length })),
        list,
        h('p', { class: 'note small plan-tip' }, icon('info'), h('span', {}, 'Toca un día para ver sus ejercicios y el tiempo de cada uno, y cambiar lo que quieras.')),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn ghost block', onclick: () => { this.propose(); this.render(); } }, icon('swap'), 'Otra propuesta'),
          h('button', { class: 'btn primary block big', onclick: () => void this.create() }, icon('check'), 'Crear el plan')));
    }
  }

  private async create(): Promise<void> {
    const { app } = this;
    const o = { goal: this.goal!, minutes: this.minutes!, level: this.level! };
    // «Cambiar el plan»: sustituye a ese plan (y a sus tablas), con el mismo nombre
    const old = this.replaceId ? app.store.planById(this.replaceId) : undefined;
    if (old) app.store.deletePlan(old.id, true);
    const days: PlanDay[] = this.result.map((x) => ({ day: x.day, kind: x.kind, routineId: app.store.addRoutine(tableName(o, x.day, x.kind), x.r.routine, x.r.rounds).id }));
    const id = old?.id ?? `plan-${Date.now()}`;
    app.store.setPlan({ id, ...(old?.name ? { name: old.name } : {}), ...o, days, renew: old?.renew ?? true, week: mondayOf(new Date()), createdAt: new Date().toISOString() });
    app.haptics.tap();
    await askReminders(app, days.map((d) => d.day));
    // el plan nuevo queda en uso: la tabla de hoy (o la del próximo día de entrenamiento) pasa a ser la tabla en uso
    usePlan(app, id);
    app.openTab('inicio');
  }
}

/** «Mi plan»: la semana de lunes a domingo, con lo que toca cada día y lo ya hecho. */
export class PlanScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });

  constructor(private readonly app: App, private readonly planId: string) {}

  enter(): void {
    refreshPlan(this.app);
    this.render();
  }

  private render(): void {
    const { app } = this;
    const plan = app.store.planById(this.planId);
    clear(this.el);
    if (!plan) { this.el.append(header(app, 'Plan de la semana')); app.back(); return; }
    const inUse = app.store.plan?.id === plan.id;
    this.el.append(header(app, planTitle(plan), tr('Plan de la semana')));
    const body = h('div', { class: 'maker-body' });
    this.el.append(body);
    // en uso, o botón para ponerlo en uso
    body.append(inUse
      ? h('p', { class: 'plan-inuse' }, h('span', { class: 'active-pill' }, 'En uso'))
      : h('button', { class: 'btn primary block', onclick: () => { usePlan(app, plan.id); app.haptics.tap(); this.render(); } }, icon('play'), 'Usar el plan'));
    const now = new Date();
    const done = trainedDates(app.store.history);
    const monday = mondayOf(now);
    const hits = plan.days.filter((d) => done.has(ymd(dateInWeek(monday, d.day)))).length;
    body.append(h('p', { class: 'muted maker-summary' }, summary({ ...plan, n: plan.days.length })),
      h('p', { class: 'plan-progress' }, icon('check'), `${hits} de ${plan.days.length} días hechos esta semana`));
    const list = h('div', { class: 'plan-week' });
    for (const d of WEEK_ORDER) {
      const date = dateInWeek(monday, d);
      const isToday = ymd(date) === ymd(now);
      const pd = plan.days.find((x) => x.day === d);
      const tag = isToday ? h('span', { class: 'plan-tag' }, 'Hoy') : '';
      if (!pd) {
        list.append(h('div', { class: 'plan-row rest' + (isToday ? ' today' : '') }, h('span', { class: 'plan-dname' }, dayName(d), tag), h('span', { class: 'muted' }, 'Descanso')));
        continue;
      }
      const hit = done.has(ymd(date));
      list.append(h('button', { class: 'plan-row' + (isToday ? ' today' : '') + (hit ? ' hit' : ''), onclick: () => app.push(new PlanDayScreen(app, plan.id, d)) },
        h('span', { class: 'plan-dname' }, dayName(d), tag),
        h('span', { class: 'plan-dtext' }, h('strong', {}, tr(kindLabel(plan, pd.kind))), h('span', { class: 'muted small' }, humanDuration(routineSeconds(app, pd.routineId)))),
        hit ? h('span', { class: 'plan-done', 'aria-label': tr('Hecho') }, icon('check')) : icon('chevron', 'ico chev')));
    }
    body.append(list,
      h('label', { class: 'switch-row card plan-renew', for: 'plan-renew' },
        h('span', { class: 'set-text' }, h('strong', {}, 'Renovar los ejercicios cada semana'), h('span', { class: 'muted block small' }, 'Cada lunes, ejercicios nuevos para cada día (las zonas se mantienen). Si lo desactivas, se quedan como están.')),
        h('input', { type: 'checkbox', id: 'plan-renew', class: 'switch', checked: plan.renew, onchange: (e: Event) => app.store.setPlan({ ...plan, renew: (e.target as HTMLInputElement).checked }) })),
      h('div', { class: 'maker-actions' },
        h('button', { class: 'btn ghost block', onclick: () => void this.rename() }, icon('edit'), 'Cambiar el nombre'),
        h('button', { class: 'btn ghost block', onclick: () => app.replace(new PlanWizardScreen(app, plan.id), 'forward') }, icon('swap'), 'Cambiar el plan'),
        h('button', { class: 'btn ghost block danger-text', onclick: () => void this.remove() }, icon('trash'), 'Borrar el plan')));
  }

  private async remove(): Promise<void> {
    const ok = await confirmDialog(tr('¿Borrar el plan de la semana y sus tablas?'), tr('Borrar'), tr('Cancelar'), true);
    if (!ok) return;
    this.app.store.deletePlan(this.planId, true);
    this.app.back();
  }

  private async rename(): Promise<void> {
    const p = this.app.store.planById(this.planId);
    if (!p) return;
    const name = await promptDialog(tr('Nombre del plan'), planTitle(p), tr('Guardar'));
    if (name === null) return;
    this.app.store.renamePlan(p.id, name);
    this.render();
  }
}

/** La tabla de un día del plan: se puede cambiar, pedir otra o empezar. */
export class PlanDayScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private readonly ask = { remove: true };

  constructor(private readonly app: App, private readonly planId: string, private readonly day: number) {}

  enter(): void {
    this.render();
  }

  private get pd(): PlanDay | undefined {
    return this.app.store.planById(this.planId)?.days.find((d) => d.day === this.day);
  }

  private render(): void {
    const { app } = this;
    const plan = app.store.planById(this.planId);
    const pd = this.pd;
    const t = pd && app.store.routineById(pd.routineId);
    const y = this.el.isConnected ? window.scrollY : -1;
    clear(this.el);
    if (!plan || !pd || !t) { this.el.append(header(app, 'Plan de la semana')); return; }
    const r: GenResult = { routine: t.routine, rounds: { ...(t.rounds ?? {}) } };
    const o = dayOptions(plan, pd.kind);
    const set = (next: GenResult) => { app.store.setRoutineContent(t.id, next.routine, next.rounds); this.render(); };
    this.el.append(header(app, tr(kindLabel(plan, pd.kind)), dayName(pd.day)),
      h('div', { class: 'maker-body' },
        preview(app, r, { set, ask: this.ask, swap: (s, i) => swapExercise(r, s, i, o, genCtx(app)) }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn ghost block', onclick: () => { const g = generate(o, genCtx(app)); this.ask.remove = true; set(g); window.scrollTo({ top: 0 }); } }, icon('swap'), 'Otra propuesta'),
          h('button', { class: 'btn primary block big', disabled: isEmptyResult(r), onclick: () => startDay(app, plan.id, pd) }, icon('play'), 'Empezar'))));
    if (y >= 0) window.scrollTo({ top: y });
  }
}

/** Un día del plan antes de crearlo: sus ejercicios con el tiempo de cada uno; se pueden cambiar. */
class DraftDayScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private readonly ask = { remove: true };

  constructor(private readonly app: App, private readonly x: { day: number; r: GenResult }, private readonly o: GenOptions, private readonly title: string) {
    this.render();
  }

  private render(): void {
    const { app, x, o } = this;
    const y = this.el.isConnected ? window.scrollY : -1;
    clear(this.el);
    const set = (next: GenResult) => { x.r = next; this.render(); };
    this.el.append(header(app, this.title, dayName(x.day)),
      h('div', { class: 'maker-body' },
        preview(app, x.r, { set, ask: this.ask, swap: (s, i) => swapExercise(x.r, s, i, o, genCtx(app)) }),
        h('div', { class: 'maker-actions' },
          h('button', { class: 'btn ghost block', onclick: () => { this.ask.remove = true; set(generate(o, genCtx(app))); window.scrollTo({ top: 0 }); } }, icon('swap'), 'Otra propuesta'),
          h('button', { class: 'btn primary block big', disabled: isEmptyResult(x.r), onclick: () => app.back() }, icon('check'), 'Listo'))));
    if (y >= 0) window.scrollTo({ top: y });
  }
}

/** Mis planes de la semana: lista para elegir cuál ver o poner en uso, y crear otro. */
export class PlansScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });

  constructor(private readonly app: App) {}

  enter(): void {
    this.render();
  }

  private render(): void {
    const { app } = this;
    clear(this.el);
    this.el.append(header(app, app.store.plans.length > 1 ? 'Planes de la semana' : 'Plan de la semana'));
    const body = h('div', { class: 'maker-body' });
    this.el.append(body);
    for (const p of app.store.plans) body.append(planTableCard(app, p, { after: () => this.render() }));
    body.append(h('button', { class: 'maker-add', onclick: () => newPlan(app) }, icon('plus'), 'Nuevo plan de la semana'));
  }
}

/**
 * Tarjeta de un plan con la misma estructura que las de las tablas: nombre, tiempo y ejercicios, pastillas por
 * apartado, última vez, barra de colores y botones Usar / Editar / ⋮. `extra`: línea de más (p. ej., «2 planes»).
 */
export function planTableCard(app: App, plan: WeekPlan, opts: { eyebrow?: string; extra?: HTMLElement | null; after: () => void }): HTMLElement {
  const inUse = app.store.plan?.id === plan.id && app.store.isPlanRoutine(app.store.active.id);
  const routines = plan.days.map((d) => app.store.routineById(d.routineId)).filter((r): r is NonNullable<typeof r> => !!r);
  const counts = Object.fromEntries(SECTION_IDS.map((sec) => [sec, routines.reduce((n, r) => n + r.routine[sec].length, 0)])) as Record<SectionId, number>;
  const total = Math.max(1, SECTION_IDS.reduce((n, sec) => n + counts[sec], 0));
  const secs = routines.map((r) => WorkoutPlan.build(app.playable(r.routine), app.catalog, app.store.settings, r.rounds).estimatedSeconds);
  const perDay = secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : 0;
  const last = routines.map((r) => r.lastUsed).filter((x): x is string => !!x).sort().pop();
  const withEx = SECTION_IDS.filter((sec) => counts[sec]);
  const pills = withEx.map((sec) => {
    const el = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[sec].icon), String(counts[sec]));
    el.style.setProperty('--sec', SECTION_STYLE[sec].color);
    el.title = SECTION_TITLES[sec];
    return el;
  });
  const mix = h('div', { class: 'mix' }, ...withEx.map((sec) => {
    const seg = h('span', { title: `${SECTION_TITLES[sec]}: ${counts[sec]}` });
    seg.style.flex = String(counts[sec] / total);
    seg.style.background = SECTION_STYLE[sec].color;
    return seg;
  }));
  const more = async () => {
    const choice = await actionSheet(planTitle(plan), [
      { id: 'rename', label: 'Cambiar el nombre' },
      { id: 'change', label: 'Cambiar el plan' },
      { id: 'delete', label: 'Borrar', danger: true },
    ]);
    if (choice === 'rename') {
      const name = await promptDialog(tr('Nombre del plan'), planTitle(plan), tr('Guardar'));
      if (name !== null) app.store.renamePlan(plan.id, name);
    } else if (choice === 'change') {
      app.push(new PlanWizardScreen(app, plan.id));
      return;
    } else if (choice === 'delete') {
      if (!(await confirmDialog(tr('¿Borrar el plan de la semana y sus tablas?'), tr('Borrar'), tr('Cancelar'), true))) return;
      app.store.deletePlan(plan.id, true);
    }
    opts.after();
  };
  return h('article', { class: 'card table-card plan-card' + (inUse ? ' active' : '') },
    opts.eyebrow ? h('span', { class: 'plan-eyebrow' }, icon('calendar'), opts.eyebrow) : null,
    h('div', { class: 'table-head' }, h('h2', {}, planTitle(plan)), inUse ? h('span', { class: 'active-pill' }, 'En uso') : null),
    h('div', { class: 'table-meta' },
      h('span', { class: 'meta-line' }, icon('clock'), [tr(plural(plan.days.length, 'día', 'días')), humanDuration(perDay), plan.name ? tr(GOAL_INFO[plan.goal].name) : ''].filter(Boolean).join(' · ')),
      pills.length ? h('span', { class: 'pills' }, ...pills) : null,
      h('span', { class: 'meta-line' }, icon('calendar'), last ? `Última vez: ${formatDate(last)}` : 'Aún no lo has usado'),
      opts.extra ?? null),
    pills.length ? mix : null,
    h('div', { class: 'table-actions' },
      h('button', { class: 'btn small ' + (inUse ? 'ghost' : 'primary'), disabled: inUse, onclick: () => { usePlan(app, plan.id); app.haptics.tap(); app.openTab('inicio'); } },
        inUse ? icon('check') : icon('play'), inUse ? 'En uso' : 'Usarlo'),
      h('button', { class: 'btn small ghost', onclick: () => app.push(new PlanScreen(app, plan.id)) }, icon('edit'), 'Editar'),
      h('button', { class: 'more-btn', 'aria-label': `Más opciones de ${planTitle(plan)}`, onclick: () => void more() }, icon('more'))));
}
