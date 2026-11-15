import type { HistoryEntry } from './types';

/*
 * Health Connect: lo que se guarda de cada entrenamiento (solo escribir; la app nunca lee datos de salud).
 * Inicio y fin reales (con las pausas), nombre de la tabla, calorías y las pulsaciones del reloj (una cada 5 s).
 */

export interface HealthWorkout {
  /** Identificador propio: si se guarda dos veces, Health Connect no lo duplica. */
  id: string;
  start: string;
  end: string;
  title: string;
  kcal?: number;
  hr?: number[];
  hrStep: number;
}

/** Segundos entre muestras de pulso (como las guarda el entrenamiento). */
export const HR_STEP = 5;

export function healthWorkout(e: HistoryEntry): HealthWorkout | null {
  const start = Date.parse(e.date);
  const secs = Math.round((e.durationSec || 0) + (e.pausedSec || 0));
  if (!Number.isFinite(start) || secs < 60) return null;
  return {
    id: new Date(start).toISOString(),
    start: new Date(start).toISOString(),
    end: new Date(start + secs * 1000).toISOString(),
    title: e.routineName?.trim() || 'Kasa Fit',
    ...(e.kcal && e.kcal > 0 ? { kcal: Math.round(e.kcal) } : {}),
    ...(e.heart?.samples.length ? { hr: e.heart.samples.map((b) => Math.round(b)) } : {}),
    hrStep: HR_STEP,
  };
}
