import { MUSCLES, parseMuscles, type Muscle } from '../figure/anatomy';
import type { HistoryEntry } from './types';

export interface MuscleLoad {
  /** Segundos trabajados (los secundarios cuentan la mitad). */
  work: Record<Muscle, number>;
  /** Segundos estirados. */
  stretch: Record<Muscle, number>;
  /** Hay entrenamientos sin detalle por ejercicio (antiguos) que no se han podido contar. */
  missing: number;
}

/** Cuánto se ha trabajado y estirado cada músculo en los entrenamientos dados. */
export function muscleLoad(history: readonly HistoryEntry[], musclesOf: (exerciseId: string) => string | undefined): MuscleLoad {
  const work = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  const stretch = { ...work };
  let missing = 0;
  for (const e of history) {
    if (!e.items) {
      missing++;
      continue;
    }
    for (const it of e.items) {
      if (it.seconds <= 0) continue;
      const seen = new Set<string>();
      for (const t of parseMuscles(musclesOf(it.exerciseId))) {
        const key = t.kind + t.muscle;
        if (seen.has(key)) continue;
        seen.add(key);
        if (t.kind === 'stretch') stretch[t.muscle] += it.seconds;
        else work[t.muscle] += it.seconds * (t.kind === 'work' ? 1 : 0.5);
      }
    }
  }
  return { work, stretch, missing };
}

/** Pesos para colorear el maniquí: rojo según lo trabajado; turquesa suave si solo se ha estirado. */
export function loadWeights(load: MuscleLoad): number[] {
  const max = Math.max(1, ...MUSCLES.map((m) => load.work[m]));
  return MUSCLES.map((m) => (load.work[m] > 0 ? 0.3 + 0.7 * (load.work[m] / max) : load.stretch[m] > 0 ? -0.55 : 0));
}
