import { SECTION_IDS, type HistoryEntry, type Profile, type SectionId } from './types';
import { secondsBySection } from './stats';

/** Gasto aproximado de cada apartado en MET (1 MET = reposo). */
export const SECTION_MET: Record<SectionId, number> = {
  calentamiento: 4,
  pesas: 3.5,
  abdominales: 3.8,
  estiramientos: 2.3,
};
/** Pausas, cuentas atrás y esperas entre apartados. */
const REST_MET = 1.5;
/** Por debajo de este pulso la fórmula del pulso no es fiable: se usa la estimación por ejercicio. */
const HR_MIN = 90;

/** Índice de masa corporal: kg / m². */
export function bmi(kg: number, cm: number): number {
  return Math.round((kg / (cm / 100) ** 2) * 10) / 10;
}

/** Clasificación de la OMS para adultos. */
export function bmiCategory(v: number): { label: string; tone: 'low' | 'ok' | 'high' | 'veryHigh' } {
  if (v < 18.5) return { label: 'Bajo peso', tone: 'low' };
  if (v < 25) return { label: 'Peso normal', tone: 'ok' };
  if (v < 30) return { label: 'Sobrepeso', tone: 'high' };
  return { label: 'Obesidad', tone: 'veryHigh' };
}

/** kcal por minuto según el pulso (fórmula de Keytel et al., 2005). */
export function keytelPerMin(hr: number, p: { age: number; weight: number; sex: 'h' | 'm' }): number {
  const v = p.sex === 'm'
    ? -20.4022 + 0.4472 * hr - 0.1263 * p.weight + 0.074 * p.age
    : -55.0969 + 0.6309 * hr + 0.1988 * p.weight + 0.2017 * p.age;
  return Math.max(0, v / 4.184);
}

export interface Calories {
  kcal: number;
  /** 'pulso' si se ha usado el pulso del reloj; 'estimado' si solo el tipo de ejercicio y el tiempo. */
  method: 'pulso' | 'estimado';
}

/** Calorías aproximadas de un entrenamiento (null si falta el peso). */
export function caloriesOf(e: HistoryEntry, p: Pick<Profile, 'age' | 'sex'> & { weight?: number | null }): Calories | null {
  if (!p.weight) return null;
  const weight = p.weight;
  // Estimación por tipo de ejercicio: kcal = MET × kg × horas
  const { bySection } = secondsBySection([e]);
  const exerciseSec = SECTION_IDS.reduce((n, s) => n + bySection[s], 0);
  const restSec = Math.max(0, e.durationSec - exerciseSec);
  const metKcal = (SECTION_IDS.reduce((n, s) => n + SECTION_MET[s] * bySection[s], 0) + REST_MET * restSec) * weight / 3600;

  const samples = e.heart?.samples ?? [];
  if (!samples.length || !p.age) return { kcal: Math.round(metKcal), method: 'estimado' };
  // Con pulso: cada muestra con la fórmula; las de pulso bajo, con el ritmo medio de la estimación
  const metPerMin = e.durationSec > 0 ? metKcal / (e.durationSec / 60) : 0;
  const prof = { age: p.age, weight, sex: p.sex };
  const avgPerMin = samples.reduce((n, hr) => n + (hr >= HR_MIN ? keytelPerMin(hr, prof) : metPerMin), 0) / samples.length;
  return { kcal: Math.round(avgPerMin * (e.durationSec / 60)), method: 'pulso' };
}


