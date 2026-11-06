import { SECTION_IDS, type HistoryEntry, type WeightEntry } from './types';
import { bestStreak } from './stats';
import { weekKey } from './monthSummary';

export type Tier = 'bronce' | 'plata' | 'oro';
export type MedalIcon = 'trophy' | 'flame' | 'clock' | 'bolt' | 'calendar' | 'target' | 'dumbbell' | 'heart' | 'check';

export interface MedalContext {
  history: readonly HistoryEntry[];
  weights: readonly WeightEntry[];
  goalKg?: number | null;
  kcal: number;
}

export interface Medal {
  id: string;
  title: string;
  desc: string;
  icon: MedalIcon;
  tier: Tier;
  earned: (c: MedalContext) => boolean;
}

const sessions = (c: MedalContext) => c.history.length;
const hours = (c: MedalContext) => c.history.reduce((n, e) => n + e.durationSec, 0) / 3600;
const lost = (c: MedalContext) => (c.weights.length > 1 ? c.weights[0].kg - Math.min(...c.weights.map((w) => w.kg)) : 0);
const maxDaysInWeek = (c: MedalContext) => {
  const m = new Map<string, Set<string>>();
  for (const e of c.history) {
    const d = new Date(e.date);
    const k = weekKey(d);
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(d.toDateString());
  }
  return Math.max(0, ...[...m.values()].map((s) => s.size));
};
const weightRecord = (c: MedalContext) => {
  const best = new Map<string, number>();
  for (const e of [...c.history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    for (const i of e.items ?? []) {
      if (!i.weight || !i.completed) continue;
      const prev = best.get(i.exerciseId);
      if (prev !== undefined && i.weight > prev) return true;
      best.set(i.exerciseId, Math.max(prev ?? 0, i.weight));
    }
  }
  return false;
};
const hourOf = (e: HistoryEntry) => new Date(e.date).getHours();

const count = (n: number, tier: Tier, title: string): Medal => ({
  id: `entrenos-${n}`, title, desc: n === 1 ? 'Tu primer entrenamiento.' : `${n} entrenamientos hechos.`, icon: 'bolt', tier, earned: (c) => sessions(c) >= n,
});
const streak = (n: number, tier: Tier, title: string): Medal => ({
  id: `racha-${n}`, title, desc: `${n} días seguidos entrenando.`, icon: 'flame', tier, earned: (c) => bestStreak(c.history) >= n,
});
const time = (n: number, tier: Tier, title: string): Medal => ({
  id: `horas-${n}`, title, desc: `${n} horas de entrenamiento en total.`, icon: 'clock', tier, earned: (c) => hours(c) >= n,
});
const kcal = (n: number, tier: Tier, title: string): Medal => ({
  id: `kcal-${n}`, title, desc: `${n.toLocaleString('es-ES')} kcal quemadas en total.`, icon: 'heart', tier, earned: (c) => c.kcal >= n,
});
const kg = (n: number, tier: Tier, title: string): Medal => ({
  id: `kg-${n}`, title, desc: `${n} kg menos desde tu primer peso anotado.`, icon: 'target', tier, earned: (c) => lost(c) >= n - 1e-9,
});

export const MEDALS: Medal[] = [
  count(1, 'bronce', 'Primer paso'),
  count(10, 'bronce', 'Diez de diez'),
  count(25, 'plata', 'Constante'),
  count(50, 'plata', 'Medio centenar'),
  count(100, 'oro', 'Centenario'),
  streak(3, 'bronce', 'En racha'),
  streak(7, 'plata', 'Semana perfecta'),
  streak(14, 'oro', 'Imparable'),
  streak(30, 'oro', 'Un mes sin parar'),
  { id: 'semana-3', title: 'Buena semana', desc: '3 días entrenados en una misma semana.', icon: 'calendar', tier: 'bronce', earned: (c) => maxDaysInWeek(c) >= 3 },
  { id: 'semana-5', title: 'Semana de hierro', desc: '5 días entrenados en una misma semana.', icon: 'calendar', tier: 'plata', earned: (c) => maxDaysInWeek(c) >= 5 },
  time(5, 'bronce', 'Cinco horas'),
  time(10, 'plata', 'Diez horas'),
  time(25, 'oro', 'Veinticinco horas'),
  kcal(1000, 'bronce', 'Mil calorías'),
  kcal(5000, 'plata', 'Horno encendido'),
  kcal(10000, 'oro', 'Diez mil'),
  kg(1, 'bronce', 'Primer kilo'),
  kg(3, 'plata', 'Tres kilos'),
  kg(5, 'oro', 'Cinco kilos'),
  kg(10, 'oro', 'Diez kilos'),
  { id: 'objetivo', title: 'Objetivo cumplido', desc: 'Has llegado a tu objetivo de peso.', icon: 'trophy', tier: 'oro',
    earned: (c) => !!c.goalKg && c.weights.length > 1 && (c.goalKg <= c.weights[0].kg ? c.weights.at(-1)!.kg <= c.goalKg : c.weights.at(-1)!.kg >= c.goalKg) },
  { id: 'record-peso', title: 'Más fuerte', desc: 'Has subido el peso en un ejercicio.', icon: 'dumbbell', tier: 'plata', earned: weightRecord },
  { id: 'completo', title: 'Tabla completa', desc: 'Un entrenamiento completo con los cuatro apartados.', icon: 'check', tier: 'bronce',
    earned: (c) => c.history.some((e) => e.completed && SECTION_IDS.every((s) => e.sections.includes(s))) },
  { id: 'madrugador', title: 'Madrugador', desc: 'Un entrenamiento antes de las 8 de la mañana.', icon: 'clock', tier: 'bronce', earned: (c) => c.history.some((e) => hourOf(e) < 8) },
  { id: 'nocturno', title: 'Búho', desc: 'Un entrenamiento después de las 10 de la noche.', icon: 'clock', tier: 'bronce', earned: (c) => c.history.some((e) => hourOf(e) >= 22) },
];

/** Medallas conseguidas según los datos. */
export function earnedMedals(c: MedalContext): string[] {
  return MEDALS.filter((m) => m.earned(c)).map((m) => m.id);
}
