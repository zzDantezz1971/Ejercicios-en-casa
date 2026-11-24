import type { WorkoutPlan } from '../domain/WorkoutPlan';
import { humanDuration, plural } from './dom';

/*
 * Resumen de una tabla o de un bloque, igual en toda la app:
 *  - los ejercicios distintos y, si algo se repite (vueltas o series), cuántos se hacen en total;
 *  - el tiempo real de principio a fin (con las vueltas, las series, los descansos y las cuentas atrás).
 */

/** «4 ejercicios» o «4 ejercicios, con repeticiones 10». */
export function countText(plan: WorkoutPlan): string {
  const d = plan.distinctCount, n = plan.exerciseCount;
  return `${plural(d, 'ejercicio', 'ejercicios')}${n > d ? `, con repeticiones ${n}` : ''}`;
}

/** «4 ejercicios, con repeticiones 10 - Total 14 min» (o «Sin ejercicios»). */
export function planText(plan: WorkoutPlan, empty = 'Sin ejercicios'): string {
  // con ejercicios por repeticiones, el tiempo es aproximado (≈)
  return plan.isEmpty ? empty : `${countText(plan)} - Total ${plan.hasReps ? '≈ ' : ''}${humanDuration(plan.estimatedSeconds)}`;
}
