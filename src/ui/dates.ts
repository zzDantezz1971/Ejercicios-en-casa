import type { HistoryEntry } from '../domain/types';

const DAY = 864e5;

/** "2026-11-03" en hora local. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Lunes de la semana de `d`. */
export function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getDay() + 6) % 7; // lunes = 0
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() - dow);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Días (clave local) en los que se entrenó. */
export function trainedDays(history: readonly HistoryEntry[]): Set<string> {
  return new Set(history.map((e) => dayKey(new Date(e.date))));
}

/** Días seguidos entrenando hasta hoy (si hoy aún no, cuenta hasta ayer). */
export function streak(history: readonly HistoryEntry[], now = new Date()): number {
  const days = trainedDays(history);
  let d = startOfDay(now);
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Minutos entrenados en cada una de las últimas `weeks` semanas (la última es la actual). */
export function minutesPerWeek(history: readonly HistoryEntry[], weeks: number, now = new Date()): Array<{ start: Date; minutes: number }> {
  const current = startOfWeek(now);
  const out = Array.from({ length: weeks }, (_, i) => ({ start: addDays(current, -7 * (weeks - 1 - i)), minutes: 0 }));
  for (const e of history) {
    const w = startOfWeek(new Date(e.date)).getTime();
    const idx = Math.round((w - out[0].start.getTime()) / (7 * DAY));
    if (idx >= 0 && idx < weeks) out[idx].minutes += e.durationSec / 60;
  }
  return out;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
