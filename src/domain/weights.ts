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

export const SAME_WEIGHT_SESSIONS = 4;
export const WEIGHT_STEP_UP = 1;

/** Si las últimas sesiones se han hecho completas con el mismo peso, propone subir. */
export function weightSuggestion(history: readonly HistoryEntry[], exerciseId: string): { kg: number; next: number; sessions: number } | null {
  const ws = exerciseWeights(history, exerciseId);
  if (ws.length < SAME_WEIGHT_SESSIONS) return null;
  const last = ws.slice(-SAME_WEIGHT_SESSIONS);
  const kg = last[last.length - 1].kg;
  if (!last.every((w) => w.kg === kg && w.completed)) return null;
  let n = 0;
  for (let i = ws.length - 1; i >= 0 && ws[i].kg === kg; i--) n++;
  return { kg, next: kg + WEIGHT_STEP_UP, sessions: n };
}
