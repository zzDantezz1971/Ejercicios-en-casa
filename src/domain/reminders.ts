/**
 * Recordatorios (notificaciones del móvil): qué avisos tocan y cuándo.
 * Aquí solo se calculan las fechas; quien los programa en Android es services/Reminders.ts.
 */

export interface ReminderSettings {
  /** Entrenar: días de la semana (0 = domingo … 6 = sábado) y hora «HH:MM». */
  train: { on: boolean; days: number[]; time: string };
  /** Pesarse: cada semana (día de la semana) o cada mes (día del mes, 1-28). */
  weigh: { on: boolean; every: 'week' | 'month'; day: number; time: string };
  /** Copia de seguridad (prémium): cuando haga una semana o más de la última. */
  backup: { on: boolean; time: string };
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  train: { on: false, days: [1, 3, 5], time: '19:00' },
  weigh: { on: false, every: 'week', day: 1, time: '08:30' },
  backup: { on: false, time: '20:00' },
};

/** Ajustes guardados (pueden faltar campos de versiones antiguas) completados con los de por defecto. */
export function remindersOf(r: Partial<ReminderSettings> | undefined): ReminderSettings {
  return {
    train: { ...DEFAULT_REMINDERS.train, ...(r?.train ?? {}) },
    weigh: { ...DEFAULT_REMINDERS.weigh, ...(r?.weigh ?? {}) },
    backup: { ...DEFAULT_REMINDERS.backup, ...(r?.backup ?? {}) },
  };
}

export type ReminderKind = 'train' | 'weigh' | 'backup';
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
const TRAIN_DAYS_AHEAD = 21;
/** Días entre la última copia y el aviso, y entre un aviso y el siguiente si no se hace. */
const BACKUP_AFTER_DAYS = 7;
const BACKUP_REPEAT_DAYS = 3;

function at(day: Date, time: string): Date {
  const [h, m] = time.split(':').map((x) => Number(x) || 0);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
}
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Avisos que hay que dejar programados a partir de ahora (como mucho unos 30). */
export function planReminders(now: Date, settings: ReminderSettings, state: ReminderState): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const s = settings;
  // Entrenar: los días elegidos a la hora elegida; si hoy ya has entrenado, hoy no avisa
  if (s.train.on && s.train.days.length) {
    const trainedToday = state.trainings.some((d) => sameDay(new Date(d), now));
    for (let i = 0; i <= TRAIN_DAYS_AHEAD; i++) {
      const when = at(addDays(now, i), s.train.time);
      if (when <= now || !s.train.days.includes(when.getDay())) continue;
      if (i === 0 && trainedToday) continue;
      out.push({ id: 1000 + i, kind: 'train', at: when });
    }
  }
  // Pesarse: cada semana o cada mes; si ya te has pesado en ese periodo, ese aviso no sale
  if (s.weigh.on) {
    const last = state.weighings.map((d) => new Date(d).getTime()).reduce((a, b) => Math.max(a, b), 0);
    const gap = s.weigh.every === 'week' ? 6 : 27;
    let n = 0;
    for (let i = 0; i <= (s.weigh.every === 'week' ? 42 : 100) && n < (s.weigh.every === 'week' ? 6 : 3); i++) {
      const day = addDays(now, i);
      const hit = s.weigh.every === 'week' ? day.getDay() === s.weigh.day : day.getDate() === Math.min(28, Math.max(1, s.weigh.day));
      if (!hit) continue;
      const when = at(day, s.weigh.time);
      if (when <= now) continue;
      if (last && when.getTime() - last < gap * 864e5) continue;
      out.push({ id: 2000 + n, kind: 'weigh', at: when });
      n++;
    }
  }
  // Copia de seguridad (prémium): a la semana de la última y, si no se hace, cada 3 días
  if (s.backup.on && state.premium) {
    const base = state.lastBackup ? new Date(state.lastBackup) : now;
    let when = at(addDays(base, BACKUP_AFTER_DAYS), s.backup.time);
    while (when <= now) when = at(addDays(when, 1), s.backup.time);
    for (let n = 0; n < 4; n++) {
      out.push({ id: 3000 + n, kind: 'backup', at: when });
      when = at(addDays(when, BACKUP_REPEAT_DAYS), s.backup.time);
    }
  }
  return out;
}
