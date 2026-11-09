import { SECTION_IDS, type HistoryEntry, type SectionId } from './types';

const DAY = 864e5;

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Mayor número de días seguidos entrenando en todo el historial. */
export function bestStreak(history: readonly HistoryEntry[]): number {
  const days = [...new Set(history.map((e) => dayKey(new Date(e.date))))]
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  let best = 0, run = 0, prev = NaN;
  for (const t of days) {
    run = Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/**
 * Tiempo entrenado por apartado (s). Con el detalle por ejercicio se usa el tiempo real;
 * en entrenamientos antiguos sin detalle se reparte la duración entre sus apartados (aproximado).
 */
export function secondsBySection(history: readonly HistoryEntry[]): { bySection: Record<SectionId, number>; approximate: boolean } {
  const out = Object.fromEntries(SECTION_IDS.map((s) => [s, 0])) as Record<SectionId, number>;
  let approximate = false;
  for (const e of history) {
    if (e.items?.length) {
      for (const i of e.items) out[i.section] += i.seconds;
    } else if (e.sections.length) {
      approximate = true;
      for (const s of e.sections) out[s] += e.durationSec / e.sections.length;
    }
  }
  return { bySection: out, approximate };
}

/**
 * Tiempo total de cada apartado (no solo el de los ejercicios): la duración de cada entrenamiento
 * (con descansos y cuentas atrás) se reparte entre sus apartados según el tiempo de ejercicio de cada uno.
 * La suma de todos los apartados es la duración total.
 */
export function totalBySection(history: readonly HistoryEntry[]): { bySection: Record<SectionId, number>; approximate: boolean } {
  const out = Object.fromEntries(SECTION_IDS.map((s) => [s, 0])) as Record<SectionId, number>;
  let approximate = false;
  for (const e of history) {
    const ex = Object.fromEntries(SECTION_IDS.map((s) => [s, 0])) as Record<SectionId, number>;
    for (const i of e.items ?? []) ex[i.section] += i.seconds;
    const sum = SECTION_IDS.reduce((n, s) => n + ex[s], 0);
    if (sum > 0) {
      for (const s of SECTION_IDS) out[s] += (e.durationSec * ex[s]) / sum;
    } else if (e.sections.length) {
      approximate = true;
      for (const s of e.sections) out[s] += e.durationSec / e.sections.length;
    }
  }
  return { bySection: out, approximate };
}

/** Ejercicios más hechos (completados), de más a menos. */
export function topExercises(history: readonly HistoryEntry[], n = 5): Array<{ exerciseId: string; times: number; seconds: number; maxWeight?: number }> {
  const map = new Map<string, { times: number; seconds: number; maxWeight?: number }>();
  for (const e of history) {
    for (const i of e.items ?? []) {
      if (!i.completed) continue;
      const m = map.get(i.exerciseId) ?? { times: 0, seconds: 0 };
      m.times++;
      m.seconds += i.seconds;
      if (i.weight && i.weight > (m.maxWeight ?? 0)) m.maxWeight = i.weight;
      map.set(i.exerciseId, m);
    }
  }
  return [...map.entries()]
    .map(([exerciseId, v]) => ({ exerciseId, ...v }))
    .sort((a, b) => b.times - a.times || b.seconds - a.seconds)
    .slice(0, n);
}

/** Nombres de tabla presentes en el historial (para el filtro), del más usado al menos. */
export function routineNames(history: readonly HistoryEntry[]): string[] {
  const count = new Map<string, number>();
  for (const e of history) if (e.routineName) count.set(e.routineName, (count.get(e.routineName) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}
