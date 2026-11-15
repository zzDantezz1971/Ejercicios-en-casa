import type { GenOptions, Goal, Level } from './generator';

/*
 * Plan de la semana (Prémium): el usuario elige objetivo, días, minutos y nivel; la app reparte las zonas entre
 * los días (para que cada zona descanse entre sesiones) y crea una tabla para cada día con el asistente.
 * Los días van como en JavaScript: 0 = domingo, 1 = lunes … 6 = sábado (igual que los recordatorios).
 */

/** Tipo de sesión de cada día. */
export type DayKind = 'superior' | 'inferior' | 'entero' | 'abdomen' | 'cardio' | 'movilidad';

export interface PlanDay {
  /** Día de la semana (0 = domingo). */
  day: number;
  kind: DayKind;
  /** Tabla (SavedRoutine) de ese día. */
  routineId: string;
}

export interface WeekPlan {
  /** Identificador (se puede tener más de un plan; uno está en uso). */
  id: string;
  /** Nombre que le pone el usuario (si no, se muestra el resumen). */
  name?: string;
  goal: Goal;
  minutes: number;
  level: Level;
  days: PlanDay[];
  /** Cambiar los ejercicios cada semana (manteniendo las zonas). */
  renew: boolean;
  /** Lunes (AAAA-MM-DD) de la semana con la que se generaron los ejercicios. */
  week: string;
  createdAt: string;
  /** Aviso del plan (sus días, a esta hora). Cada plan tiene el suyo; al borrar el plan, desaparece. */
  remind?: PlanRemind;
}

export interface PlanRemind { on: boolean; time: string }

/** Nombre de cada tipo de sesión (en castellano; se traduce en pantalla). */
export const KIND_NAME: Record<DayKind, string> = {
  superior: 'Tren superior',
  inferior: 'Piernas y glúteos',
  entero: 'Cuerpo entero',
  abdomen: 'Abdomen y cardio',
  cardio: 'Cardio',
  movilidad: 'Estiramientos y movilidad',
};

/** Orden de la semana para mostrarla: de lunes a domingo. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const MIN_DAYS = 2;
export const MAX_DAYS = 6;

/** Reparto de zonas según cuántos días se entrena (para que cada zona descanse entre sesiones). */
const SPLIT: Record<number, DayKind[]> = {
  2: ['entero', 'entero'],
  3: ['superior', 'inferior', 'entero'],
  4: ['superior', 'inferior', 'abdomen', 'entero'],
  5: ['superior', 'inferior', 'abdomen', 'entero', 'movilidad'],
  6: ['superior', 'inferior', 'abdomen', 'superior', 'inferior', 'entero'],
};

/** Días ordenados de lunes a domingo. */
export function sortDays(days: readonly number[]): number[] {
  return [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b));
}

/** Tipo de sesión de cada día elegido, según el objetivo. */
export function splitFor(goal: Goal, days: readonly number[]): Array<{ day: number; kind: DayKind }> {
  const ds = sortDays(days);
  const base = SPLIT[Math.min(MAX_DAYS, Math.max(MIN_DAYS, ds.length))];
  return ds.map((day, i) => {
    let kind = base[i % base.length];
    // perder peso: los días de cuerpo entero, de cardio
    if (goal === 'perder' && kind === 'entero') kind = 'cardio';
    return { day, kind };
  });
}

/** Opciones del asistente para la tabla de un día. */
export function dayOptions(plan: Pick<WeekPlan, 'goal' | 'minutes' | 'level'>, kind: DayKind): GenOptions {
  const { goal, minutes, level } = plan;
  // espalda sana y flexibilidad: todos los días con ese objetivo (cambia la zona en la que se fija)
  if (goal === 'espalda') return { goal, zone: 'entero', minutes, level };
  const zone = kind === 'superior' ? 'superior' : kind === 'inferior' ? 'inferior' : kind === 'abdomen' ? 'abdomen' : 'entero';
  if (goal === 'flexibilidad') return { goal, zone, minutes, level };
  if (kind === 'movilidad') return { goal: 'flexibilidad', zone: 'entero', minutes, level };
  if (kind === 'cardio') return { goal: 'perder', zone: 'entero', minutes, level };
  if (kind === 'abdomen') return { goal: goal === 'perder' ? 'perder' : 'forma', zone: 'abdomen', minutes, level };
  return { goal: goal === 'fuerza' ? 'fuerza' : goal === 'perder' ? 'perder' : 'forma', zone, minutes, level };
}

/** Nombre de la sesión de un día (con «Espalda sana» o «Flexibilidad» todos los días se llaman así). */
export function kindLabel(plan: Pick<WeekPlan, 'goal'>, kind: DayKind): string {
  if (plan.goal === 'espalda') return 'Espalda sana';
  if (plan.goal === 'flexibilidad') return 'Flexibilidad';
  return KIND_NAME[kind];
}

/** Lunes (AAAA-MM-DD, hora local) de la semana de una fecha. */
export function mondayOf(d: Date): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

/** El día del plan de una fecha (o nada si ese día se descansa). */
export function planDayOn(plan: WeekPlan, d: Date): PlanDay | undefined {
  return plan.days.find((x) => x.day === d.getDay());
}

/** El siguiente día de entrenamiento después de una fecha (y cuántos días faltan). */
export function nextPlanDay(plan: WeekPlan, d: Date): { day: PlanDay; inDays: number } | undefined {
  for (let i = 1; i <= 7; i++) {
    const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const p = planDayOn(plan, f);
    if (p) return { day: p, inDays: i };
  }
  return undefined;
}

/** Fechas (AAAA-MM-DD, hora local) con algún entrenamiento. */
export function trainedDates(history: ReadonlyArray<{ date: string }>): Set<string> {
  const out = new Set<string>();
  for (const e of history) {
    const d = new Date(e.date);
    out.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Fecha de un día del plan dentro de la semana que empieza el lunes `monday`. */
export function dateInWeek(monday: string, day: number): Date {
  const [y, m, dd] = monday.split('-').map(Number);
  return new Date(y, m - 1, dd + ((day + 6) % 7));
}

/** ¿Alguna semana (de lunes a domingo) con entrenamiento en todos estos días? (medalla «Plan cumplido»). */
export function fullPlanWeek(history: ReadonlyArray<{ date: string }>, days: readonly number[]): boolean {
  if (days.length < MIN_DAYS) return false;
  const done = trainedDates(history);
  const weeks = new Set([...done].map((s) => mondayOf(new Date(`${s}T12:00:00`))));
  return [...weeks].some((w) => days.every((d) => done.has(ymd(dateInWeek(w, d)))));
}

const KINDS = Object.keys(KIND_NAME) as DayKind[];

/** Comprueba un plan guardado (de una copia o de una versión anterior); si está roto, no hay plan. */
export function sanitizePlan(input: unknown): WeekPlan | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const p = input as Partial<WeekPlan>;
  const goals = ['forma', 'perder', 'fuerza', 'flexibilidad', 'espalda'];
  const levels = ['suave', 'normal', 'intenso'];
  if (!goals.includes(p.goal as string) || !levels.includes(p.level as string) || !Number.isFinite(p.minutes) || !Array.isArray(p.days)) return undefined;
  const seen = new Set<number>();
  const days = p.days.filter((d): d is PlanDay => !!d && Number.isInteger(d.day) && d.day >= 0 && d.day <= 6 && KINDS.includes(d.kind) && typeof d.routineId === 'string' && !seen.has(d.day) && !!seen.add(d.day));
  if (days.length < 1) return undefined;
  return {
    id: typeof p.id === 'string' && p.id ? p.id : `plan-${Date.parse(String(p.createdAt)) || Date.now()}`,
    ...(typeof p.name === 'string' && p.name.trim() ? { name: p.name.trim().slice(0, 40) } : {}),
    goal: p.goal!, level: p.level!, minutes: Math.round(p.minutes!),
    days: sortDays(days.map((d) => d.day)).map((x) => days.find((d) => d.day === x)!),
    renew: p.renew !== false,
    week: typeof p.week === 'string' ? p.week : mondayOf(new Date()),
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
    ...(p.remind && typeof p.remind === 'object' ? { remind: { on: !!p.remind.on, time: typeof p.remind.time === 'string' && /^\d\d:\d\d$/.test(p.remind.time) ? p.remind.time : '19:00' } } : {}),
  };
}
