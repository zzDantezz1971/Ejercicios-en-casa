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

/**
 * Pesos para colorear el maniquí en rojo: de rojo claro (poco) a rojo fuerte (mucho); 0 = gris.
 * Mezcla el puesto de cada músculo y su tiempo, para que se note la diferencia entre ellos aunque
 * un músculo tenga mucho más tiempo que los demás.
 */
export function loadWeights(load: MuscleLoad): number[] {
  const t = totalLoad(load);
  const done = MUSCLES.filter((m) => t[m] > 0).sort((a, b) => t[a] - t[b]);
  const max = Math.max(1, ...done.map((m) => t[m]));
  const rank = new Map(done.map((m, i) => [m, done.length > 1 ? i / (done.length - 1) : 1]));
  return MUSCLES.map((m) => (t[m] > 0 ? 0.22 + 0.78 * (0.6 * rank.get(m)! + 0.4 * (t[m] / max)) : 0));
}

/** Para el mapa de los resúmenes: los 5 más trabajados valen 1 (rojo vivo) y el resto de trabajados 0,3 (rojo suave). */
export function mapWeights(load: MuscleLoad, top = 5): number[] {
  const t = totalLoad(load);
  const best = new Set(MUSCLES.filter((m) => t[m] > 0).sort((a, b) => t[b] - t[a]).slice(0, top));
  return MUSCLES.map((m) => (best.has(m) ? 1 : t[m] > 0 ? 0.3 : 0));
}
