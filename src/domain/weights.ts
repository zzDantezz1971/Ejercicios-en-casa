import type { HistoryEntry } from './types';

/** Kilos usados en un ejercicio en cada entrenamiento (del más antiguo al más reciente). */
export function exerciseWeights(history: readonly HistoryEntry[], exerciseId: string): Array<{ date: string; kg: number; completed: boolean }> {
  const out: Array<{ date: string; kg: number; completed: boolean }> = [];
  for (const e of history) {
    const its = (e.items ?? []).filter((i) => i.exerciseId === exerciseId && i.weight && i.seconds > 0);
    if (!its.length) continue;
    out.push({ date: e.date, kg: Math.max(...its.map((i) => i.weight!)), completed: its.some((i) => i.completed) });
  }
  return out.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
