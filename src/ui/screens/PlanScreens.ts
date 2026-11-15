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
import { clear, confirmDialog, h, humanDuration, plural } from '../dom';
import { icon, type IconName } from '../icons';
import { startWorkout } from '../components/startWorkout';
import { header, isEmptyResult, preview } from './MakerScreens';

/*
 * Plan de la semana (Prémium): asistente (objetivo, días, minutos y nivel), pantalla «Mi plan» con la semana de
 * lunes a domingo, la tabla de cada día (se puede cambiar o pedir otra) y la tarjeta «Hoy toca» de Inicio.
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

/** Abre el plan (o la pantalla Prémium si no lo es). */
export function openPlan(app: App): void {
  if (!app.access.premium) { app.showPremium(); return; }
  if (app.store.plan) app.push(new PlanScreen(app));
  else app.push(new PlanWizardScreen(app));
}

/**
 * Pone el plan al día: si empieza una semana nueva y hay que renovar, cambia los ejercicios de cada día;
 * si se ha borrado la tabla de algún día, la vuelve a crear.
 */
export function refreshPlan(app: App, now = new Date()): void {
  const plan = app.store.plan;
  if (!plan || !app.access.premium) return;
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
  useTodaysTable(app, false);
}

/**
 * La tabla en uso sigue al plan: la de hoy (o, si hoy se descansa, la del próximo día de entrenamiento).
 * Si el usuario ha elegido otra tabla que no es del plan, se respeta (salvo `force`, al crear el plan).
 */
export function useTodaysTable(app: App, force: boolean, now = new Date()): void {
  const plan = app.store.plan;
  if (!plan) return;
  const ids = new Set(plan.days.map((d) => d.routineId));
  if (!force && !ids.has(app.store.active.id)) return;
  const pd = planDayOn(plan, now) ?? nextPlanDay(plan, now)?.day;
  if (pd && app.store.routineById(pd.routineId) && app.store.active.id !== pd.routineId) app.store.setActive(pd.routineId);
}

/** Duración de una tabla guardada. */
function routineSeconds(app: App, id: string): number {
  const r = app.store.routineById(id);
  return r ? WorkoutPlan.build(r.routine, app.catalog, app.store.settings, r.rounds).estimatedSeconds : 0;
}

/** Empieza el entrenamiento de un día del plan. */
function startDay(app: App, d: PlanDay): void {
  const r = app.store.routineById(d.routineId);
  if (!r) return;
  const plan = WorkoutPlan.build(app.playable(r.routine), app.catalog, app.store.settings, r.rounds);
  if (plan.isEmpty) { app.push(new PlanDayScreen(app, d.day)); return; }
  void startWorkout(app, plan, r);
}

/** Tarjeta de Inicio: «Hoy toca…», «Hoy descanso» o «Ayer te saltaste…». */
export function todayCard(app: App, now = new Date()): HTMLElement | null {
  const plan = app.store.plan;
  if (!plan || !app.access.premium) return null;
  const done = trainedDates(app.store.history);
  const today = planDayOn(plan, now);
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const missed = planDayOn(plan, yest);
  const open = () => app.push(new PlanScreen(app));
  const line = (d: PlanDay) => `${tr(kindLabel(plan, d.kind))} · ${humanDuration(routineSeconds(app, d.routineId))}`;
  let body: HTMLElement[];
  if (today && done.has(ymd(now))) {
    body = [h('span', { class: 'plan-eyebrow' }, 'Plan de la semana'), h('strong', {}, '¡Hecho por hoy!'), h('span', { class: 'muted small' }, line(today))];
  } else if (today) {
    body = [h('span', { class: 'plan-eyebrow' }, 'Hoy toca'), h('strong', {}, tr(kindLabel(plan, today.kind))), h('span', { class: 'muted small' }, `${dayName(today.day)} · ${humanDuration(routineSeconds(app, today.routineId))}`)];
  } else {
    const next = nextPlanDay(plan, now);
    // ayer tocaba y no se entrenó (y hoy no se ha entrenado): se ofrece hacerlo hoy
    if (missed && !done.has(ymd(yest)) && !done.has(ymd(now)) && mondayOf(yest) === mondayOf(now) && ymd(yest) >= ymd(new Date(plan.createdAt))) {
      body = [h('span', { class: 'plan-eyebrow' }, 'Hoy descanso 😌'), h('strong', {}, `Ayer te saltaste ${tr(kindLabel(plan, missed.kind))}`), h('span', { class: 'muted small' }, '¿La haces hoy?')];
      return planCard(body, open, h('button', { class: 'btn primary small', onclick: (e: Event) => { e.stopPropagation(); startDay(app, missed); } }, icon('play'), 'Empezar'));
    }
    body = [h('span', { class: 'plan-eyebrow' }, 'Hoy descanso 😌'),
      h('strong', {}, next ? (next.inDays === 1 ? `Mañana: ${tr(kindLabel(plan, next.day.kind))}` : `${dayName(next.day.day)}: ${tr(kindLabel(plan, next.day.kind))}`) : 'Plan de la semana'),
      h('span', { class: 'muted small' }, 'Descansar también es entrenar.')];
    return planCard(body, open);
  }
  const action = today && !done.has(ymd(now))
    ? h('button', { class: 'btn primary small', onclick: (e: Event) => { e.stopPropagation(); startDay(app, today); } }, icon('play'), 'Empezar')
    : h('span', { class: 'plan-done' }, icon('check'));
  return planCard(body, open, action);
}

function planCard(body: HTMLElement[], open: () => void, action?: HTMLElement): HTMLElement {
  return h('section', { class: 'card plan-today', role: 'button', tabindex: 0, 'aria-label': 'Ver mi plan de la semana', onclick: open },
    h('span', { class: 'plan-icon' }, icon('calendar')),
    h('div', { class: 'plan-text' }, ...body),
    action ?? icon('chevron', 'ico chev'));
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

  constructor(private readonly app: App) {
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
    // un plan nuevo sustituye al anterior (y a sus tablas)
    if (app.store.plan) app.store.deletePlan(true);
    const days: PlanDay[] = this.result.map((x) => ({ day: x.day, kind: x.kind, routineId: app.store.addRoutine(tableName(o, x.day, x.kind), x.r.routine, x.r.rounds).id }));
    app.store.setPlan({ ...o, days, renew: true, week: mondayOf(new Date()), createdAt: new Date().toISOString() });
    app.haptics.tap();
    await askReminders(app, days.map((d) => d.day));
    // la tabla de hoy (o la del próximo día de entrenamiento) pasa a ser la tabla en uso
    useTodaysTable(app, true);
    app.openTab('inicio');
  }
}

/** «Mi plan»: la semana de lunes a domingo, con lo que toca cada día y lo ya hecho. */
export class PlanScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });

  constructor(private readonly app: App) {}

  enter(): void {
    refreshPlan(this.app);
    this.render();
  }

  private render(): void {
    const { app } = this;
    const plan = app.store.plan;
    clear(this.el);
    this.el.append(header(app, 'Mi plan de la semana'));
    const body = h('div', { class: 'maker-body' });
    this.el.append(body);
    if (!plan) { app.back(); return; }
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
      list.append(h('button', { class: 'plan-row' + (isToday ? ' today' : '') + (hit ? ' hit' : ''), onclick: () => app.push(new PlanDayScreen(app, d)) },
        h('span', { class: 'plan-dname' }, dayName(d), tag),
        h('span', { class: 'plan-dtext' }, h('strong', {}, tr(kindLabel(plan, pd.kind))), h('span', { class: 'muted small' }, humanDuration(routineSeconds(app, pd.routineId)))),
        hit ? h('span', { class: 'plan-done', 'aria-label': tr('Hecho') }, icon('check')) : icon('chevron', 'ico chev')));
    }
    body.append(list,
      h('label', { class: 'switch-row card plan-renew', for: 'plan-renew' },
        h('span', { class: 'set-text' }, h('strong', {}, 'Renovar los ejercicios cada semana'), h('span', { class: 'muted block small' }, 'Cada lunes, ejercicios nuevos para cada día (las zonas se mantienen). Si lo desactivas, se quedan como están.')),
        h('input', { type: 'checkbox', id: 'plan-renew', class: 'switch', checked: plan.renew, onchange: (e: Event) => app.store.setPlan({ ...plan, renew: (e.target as HTMLInputElement).checked }) })),
      h('div', { class: 'maker-actions' },
        h('button', { class: 'btn ghost block', onclick: () => app.replace(new PlanWizardScreen(app), 'forward') }, icon('edit'), 'Cambiar el plan'),
        h('button', { class: 'btn ghost block danger-text', onclick: () => void this.remove() }, icon('trash'), 'Borrar el plan')));
  }

  private async remove(): Promise<void> {
    const ok = await confirmDialog(tr('¿Borrar el plan de la semana y sus tablas?'), tr('Borrar'), tr('Cancelar'), true);
    if (!ok) return;
    this.app.store.deletePlan(true);
    this.app.back();
  }
}

/** La tabla de un día del plan: se puede cambiar, pedir otra o empezar. */
export class PlanDayScreen implements Screen {
  readonly el = h('main', { class: 'screen maker-screen' });
  private readonly ask = { remove: true };

  constructor(private readonly app: App, private readonly day: number) {}

  enter(): void {
    this.render();
  }

  private get pd(): PlanDay | undefined {
    return this.app.store.plan?.days.find((d) => d.day === this.day);
  }

  private render(): void {
    const { app } = this;
    const plan = app.store.plan;
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
          h('button', { class: 'btn primary block big', disabled: isEmptyResult(r), onclick: () => startDay(app, pd) }, icon('play'), 'Empezar'))));
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
