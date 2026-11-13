/**
 * Recordatorios (notificaciones del móvil): qué avisos tocan y cuándo.
 * Aquí solo se calculan las fechas; quien los programa en Android es services/Reminders.ts.
 * Los tres funcionan igual: los días de la semana elegidos, a la hora elegida.
 */

export type ReminderKind = 'train' | 'weigh' | 'backup';
export const REMINDER_KINDS: ReminderKind[] = ['train', 'weigh', 'backup'];

export interface ReminderRule {
  on: boolean;
  /** Días de la semana (0 = domingo … 6 = sábado). */
  days: number[];
  /** Hora «HH:MM». */
  time: string;
}
export type ReminderSettings = Record<ReminderKind, ReminderRule>;

export const DEFAULT_REMINDERS: ReminderSettings = {
  train: { on: false, days: [1, 3, 5], time: '19:00' },
  weigh: { on: false, days: [1], time: '08:30' },
  backup: { on: false, days: [0], time: '20:00' },
};

/** Ajustes guardados (pueden faltar campos o venir de una versión anterior) completados con los de por defecto. */
export function remindersOf(r: Partial<Record<ReminderKind, Partial<ReminderRule>>> | undefined): ReminderSettings {
  const one = (k: ReminderKind): ReminderRule => {
    const v = r?.[k] ?? {};
    const days = Array.isArray(v.days) ? v.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : DEFAULT_REMINDERS[k].days;
    return { on: !!v.on, days, time: typeof v.time === 'string' && /^\d\d:\d\d$/.test(v.time) ? v.time : DEFAULT_REMINDERS[k].time };
  };
  return { train: one('train'), weigh: one('weigh'), backup: one('backup') };
}

export interface PlannedReminder { id: number; kind: ReminderKind; at: Date }

export interface ReminderState {
  /** Fechas (ISO) de los entrenamientos hechos. */
  trainings: string[];
  /** Fechas (ISO) de los pesos anotados. */
  weighings: string[];
  /** Fecha (ISO) de la última copia de seguridad. */
  lastBackup?: string;
  premium: boolean;
}

/** Días hacia delante que se dejan programados (se recalculan cada vez que se abre la app o cambia algo). */
const DAYS_AHEAD = 14;
const BASE: Record<ReminderKind, number> = { train: 1000, weigh: 2000, backup: 3000 };

function at(day: Date, time: string): Date {
  const [h, m] = time.split(':').map((x) => Number(x) || 0);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * Avisos que hay que dejar programados a partir de ahora: cada recordatorio activo, en sus días y a su hora.
 * Si hoy ya lo has hecho (entrenar, pesarte o guardar la copia), hoy no avisa. La copia, solo con prémium.
 */
export function planReminders(now: Date, settings: ReminderSettings, state: ReminderState): PlannedReminder[] {
  const done: Record<ReminderKind, string[]> = {
    train: state.trainings,
    weigh: state.weighings,
    backup: state.lastBackup ? [state.lastBackup] : [],
  };
  const out: PlannedReminder[] = [];
  for (const kind of REMINDER_KINDS) {
    const r = settings[kind];
    if (!r.on || !r.days.length || (kind === 'backup' && !state.premium)) continue;
    const doneToday = done[kind].some((d) => sameDay(new Date(d), now));
    for (let i = 0; i <= DAYS_AHEAD; i++) {
      const when = at(addDays(now, i), r.time);
      if (when <= now || !r.days.includes(when.getDay())) continue;
      if (i === 0 && doneToday) continue;
      out.push({ id: BASE[kind] + i, kind, at: when });
    }
  }
  return out;
}
