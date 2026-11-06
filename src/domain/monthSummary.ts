import type { HistoryEntry, WeightEntry } from './types';
import { bestStreak } from './stats';
import { exerciseWeights } from './weights';

export interface MonthStats {
  /** Primer día del mes (hora local). */
  start: Date;
  entries: HistoryEntry[];
  days: number;
  sessions: number;
  seconds: number;
  kcal: number | null;
  bestStreak: number;
  topTable: { name: string; times: number } | null;
  /** Peso al empezar y al terminar el mes (según las anotaciones), si las hay. */
  weight: { from: number; to: number } | null;
  /** Ejercicios en los que se ha subido el peso máximo este mes. */
  records: Array<{ exerciseId: string; from: number | null; to: number }>;
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Clave del mes, p. ej. "2026-10". */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthStats(
  history: readonly HistoryEntry[],
  weights: readonly WeightEntry[],
  start: Date,
  kcalOf: (e: HistoryEntry) => number | null,
): MonthStats {
  const a = start.getTime(), b = addMonths(start, 1).getTime();
  const entries = history.filter((e) => { const t = Date.parse(e.date); return t >= a && t < b; });
  const dayKeys = new Set(entries.map((e) => new Date(e.date).toDateString()));
  let kcal: number | null = null;
  for (const e of entries) {
    const k = kcalOf(e);
    if (k != null) kcal = (kcal ?? 0) + k;
  }
  const tables = new Map<string, number>();
  for (const e of entries) if (e.routineName) tables.set(e.routineName, (tables.get(e.routineName) ?? 0) + 1);
  const top = [...tables.entries()].sort((x, y) => y[1] - x[1])[0];

  // peso: última anotación antes del mes (o la primera dentro) y última dentro del mes
  const before = weights.filter((w) => Date.parse(w.date) < a);
  const inside = weights.filter((w) => { const t = Date.parse(w.date); return t >= a && t < b; });
  const from = before.at(-1)?.kg ?? inside[0]?.kg;
  const to = inside.at(-1)?.kg;
  const weight = from != null && to != null && (before.length || inside.length > 1) ? { from, to } : null;

  // récords: máximo del mes por encima del máximo anterior
  const ids = new Set(entries.flatMap((e) => (e.items ?? []).filter((i) => i.weight).map((i) => i.exerciseId)));
  const records: MonthStats['records'] = [];
  for (const id of ids) {
    const ws = exerciseWeights(history, id);
    const prev = ws.filter((w) => Date.parse(w.date) < a).map((w) => w.kg);
    const now = ws.filter((w) => { const t = Date.parse(w.date); return t >= a && t < b; }).map((w) => w.kg);
    if (!now.length) continue;
    const maxNow = Math.max(...now), maxPrev = prev.length ? Math.max(...prev) : null;
    if (maxPrev === null ? now.length > 1 && maxNow > Math.min(...now) : maxNow > maxPrev) {
      records.push({ exerciseId: id, from: maxPrev ?? Math.min(...now), to: maxNow });
    }
  }

  return {
    start, entries, days: dayKeys.size, sessions: entries.length,
    seconds: entries.reduce((n, e) => n + e.durationSec, 0),
    kcal, bestStreak: bestStreak(entries),
    topTable: top ? { name: top[0], times: top[1] } : null,
    weight, records,
  };
}
