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

/** Tiempo total de cada músculo: trabajado y estirado cuentan igual (fuerza o estiramiento, el músculo trabaja). */
export function totalLoad(load: MuscleLoad): Record<Muscle, number> {
  return Object.fromEntries(MUSCLES.map((m) => [m, load.work[m] + load.stretch[m]])) as Record<Muscle, number>;
}

/** Pesos para colorear el maniquí: rojo más intenso cuanto más se ha trabajado (o estirado) cada músculo. */
export function loadWeights(load: MuscleLoad): number[] {
  const t = totalLoad(load);
  const max = Math.max(1, ...MUSCLES.map((m) => t[m]));
  return MUSCLES.map((m) => (t[m] > 0 ? 0.3 + 0.7 * (t[m] / max) : 0));
}
