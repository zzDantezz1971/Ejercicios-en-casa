import { LOCALE } from '../i18n';
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

export type MedalGroup = 'entrenos' | 'constancia' | 'tiempo' | 'calorias' | 'peso' | 'fuerza' | 'apartados' | 'especiales';

/** Grupos de medallas, en el orden en que se muestran. */
export const MEDAL_GROUPS: Array<{ id: MedalGroup; title: string; icon: MedalIcon }> = [
  { id: 'entrenos', title: 'Entrenamientos', icon: 'bolt' },
  { id: 'constancia', title: 'Constancia', icon: 'flame' },
  { id: 'tiempo', title: 'Tiempo entrenado', icon: 'clock' },
  { id: 'calorias', title: 'Calorías', icon: 'heart' },
  { id: 'peso', title: 'Peso corporal', icon: 'target' },
  { id: 'fuerza', title: 'Fuerza', icon: 'dumbbell' },
  { id: 'apartados', title: 'Apartados', icon: 'check' },
  { id: 'especiales', title: 'Especiales', icon: 'trophy' },
];

export interface Medal {
  id: string;
  group: MedalGroup;
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
const withSection = (c: MedalContext, sec: string) => c.history.filter((e) => e.sections.includes(sec as never)).length;
const maxWeight = (c: MedalContext) => Math.max(0, ...c.history.flatMap((e) => (e.items ?? []).filter((i) => i.completed && i.weight).map((i) => i.weight!)));
/** Semanas seguidas (hasta la última con entrenos) con al menos 3 días entrenados. */
const habitWeeks = (c: MedalContext) => {
  const m = new Map<string, Set<string>>();
  for (const e of c.history) {
    const d = new Date(e.date);
    const k = weekKey(d);
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(d.toDateString());
  }
  const good = [...m.entries()].filter(([, v]) => v.size >= 3).map(([k]) => Date.parse(k)).sort((a, b) => a - b);
  let best = 0, run = 0;
  for (let i = 0; i < good.length; i++) {
    run = i > 0 && Math.round((good[i] - good[i - 1]) / 864e5) === 7 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
};
const weekendBoth = (c: MedalContext) => {
  const m = new Map<string, Set<number>>();
  for (const e of c.history) {
    const d = new Date(e.date);
    const k = weekKey(d);
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(d.getDay());
  }
  return [...m.values()].some((s) => s.has(6) && s.has(0));
};

const count = (n: number, tier: Tier, title: string): Medal => ({
  group: 'entrenos', id: `entrenos-${n}`, title, desc: n === 1 ? 'Tu primer entrenamiento.' : `${n} entrenamientos hechos.`, icon: 'bolt', tier, earned: (c) => sessions(c) >= n,
});
const streak = (n: number, tier: Tier, title: string): Medal => ({
  group: 'constancia', id: `racha-${n}`, title, desc: `${n} días seguidos entrenando.`, icon: 'flame', tier, earned: (c) => bestStreak(c.history) >= n,
});
const time = (n: number, tier: Tier, title: string): Medal => ({
  group: 'tiempo', id: `horas-${n}`, title, desc: `${n} horas de entrenamiento en total.`, icon: 'clock', tier, earned: (c) => hours(c) >= n,
});
const kcal = (n: number, tier: Tier, title: string): Medal => ({
  group: 'calorias', id: `kcal-${n}`, title, desc: `${n.toLocaleString(LOCALE)} kcal quemadas en total.`, icon: 'heart', tier, earned: (c) => c.kcal >= n,
});
const kg = (n: number, tier: Tier, title: string): Medal => ({
  group: 'peso', id: `kg-${n}`, title, desc: `${n} kg menos desde tu primer peso anotado.`, icon: 'target', tier, earned: (c) => lost(c) >= n - 1e-9,
});

export const MEDALS: Medal[] = [
  // Entrenamientos
  count(1, 'bronce', 'Primer paso'),
  count(10, 'bronce', 'Diez de diez'),
  count(25, 'plata', 'Constante'),
  count(50, 'plata', 'Medio centenar'),
  count(100, 'oro', 'Centenario'),
  count(200, 'oro', 'Leyenda'),
  // Constancia
  streak(3, 'bronce', 'En racha'),
  streak(7, 'plata', 'Semana perfecta'),
  streak(14, 'oro', 'Imparable'),
  streak(30, 'oro', 'Un mes sin parar'),
  { group: 'constancia', id: 'semana-3', title: 'Buena semana', desc: '3 días entrenados en una misma semana.', icon: 'calendar', tier: 'bronce', earned: (c) => maxDaysInWeek(c) >= 3 },
  { group: 'constancia', id: 'semana-5', title: 'Semana de hierro', desc: '5 días entrenados en una misma semana.', icon: 'calendar', tier: 'plata', earned: (c) => maxDaysInWeek(c) >= 5 },
  { group: 'constancia', id: 'semana-7', title: 'Semana completa', desc: 'Los 7 días de una misma semana entrenados.', icon: 'calendar', tier: 'oro', earned: (c) => maxDaysInWeek(c) >= 7 },
  { group: 'constancia', id: 'habito-4', title: 'Hábito', desc: '4 semanas seguidas entrenando al menos 3 días.', icon: 'calendar', tier: 'oro', earned: (c) => habitWeeks(c) >= 4 },
  // Tiempo entrenado
  { group: 'tiempo', id: 'sesion-45', title: 'Sesión larga', desc: 'Un entrenamiento de 45 minutos o más.', icon: 'clock', tier: 'bronce', earned: (c) => c.history.some((e) => e.durationSec >= 45 * 60) },
  time(5, 'bronce', 'Cinco horas'),
  time(10, 'plata', 'Diez horas'),
  time(25, 'oro', 'Veinticinco horas'),
  time(50, 'oro', 'Cincuenta horas'),
  // Calorías
  { group: 'calorias', id: 'kcal-sesion-300', title: 'A tope', desc: '300 kcal o más en un solo entrenamiento.', icon: 'heart', tier: 'plata', earned: (c) => c.history.some((e) => (e.kcal ?? 0) >= 300) },
  kcal(1000, 'bronce', 'Mil calorías'),
  kcal(5000, 'plata', 'Horno encendido'),
  kcal(10000, 'oro', 'Diez mil'),
  // Peso corporal
  kg(1, 'bronce', 'Primer kilo'),
  kg(3, 'plata', 'Tres kilos'),
  kg(5, 'oro', 'Cinco kilos'),
  kg(10, 'oro', 'Diez kilos'),
  { group: 'peso', id: 'objetivo', title: 'Objetivo cumplido', desc: 'Has llegado a tu objetivo de peso.', icon: 'trophy', tier: 'oro',
    earned: (c) => !!c.goalKg && c.weights.length > 1 && (c.goalKg <= c.weights[0].kg ? c.weights.at(-1)!.kg <= c.goalKg : c.weights.at(-1)!.kg >= c.goalKg) },
  // Fuerza
  { group: 'fuerza', id: 'record-peso', title: 'Más fuerte', desc: 'Has subido el peso en un ejercicio.', icon: 'dumbbell', tier: 'plata', earned: weightRecord },
  { group: 'fuerza', id: 'pesas-10', title: 'Constructor', desc: '10 entrenamientos con pesas.', icon: 'dumbbell', tier: 'bronce', earned: (c) => withSection(c, 'pesas') >= 10 },
  { group: 'fuerza', id: 'peso-10kg', title: 'Peso pesado', desc: 'Un ejercicio con 10 kg o más por mancuerna.', icon: 'dumbbell', tier: 'oro', earned: (c) => maxWeight(c) >= 10 },
  // Apartados
  { group: 'apartados', id: 'completo', title: 'Tabla completa', desc: 'Un entrenamiento completo con los cuatro apartados.', icon: 'check', tier: 'bronce',
    earned: (c) => c.history.some((e) => e.completed && SECTION_IDS.every((s) => e.sections.includes(s))) },
  { group: 'apartados', id: 'calentamiento-10', title: 'Siempre a punto', desc: '10 entrenamientos con calentamiento.', icon: 'flame', tier: 'bronce', earned: (c) => withSection(c, 'calentamiento') >= 10 },
  { group: 'apartados', id: 'abdominales-10', title: 'Core de acero', desc: '10 entrenamientos con abdominales.', icon: 'target', tier: 'plata', earned: (c) => withSection(c, 'abdominales') >= 10 },
  { group: 'apartados', id: 'estiramientos-10', title: 'Flexible', desc: '10 entrenamientos con estiramientos.', icon: 'check', tier: 'plata', earned: (c) => withSection(c, 'estiramientos') >= 10 },
  // Especiales
  { group: 'especiales', id: 'madrugador', title: 'Madrugador', desc: 'Un entrenamiento antes de las 8 de la mañana.', icon: 'clock', tier: 'bronce', earned: (c) => c.history.some((e) => hourOf(e) < 8) },
  { group: 'especiales', id: 'nocturno', title: 'Búho', desc: 'Un entrenamiento después de las 10 de la noche.', icon: 'clock', tier: 'bronce', earned: (c) => c.history.some((e) => hourOf(e) >= 22) },
  { group: 'especiales', id: 'finde', title: 'Fin de semana activo', desc: 'Entrenar el sábado y el domingo de una misma semana.', icon: 'calendar', tier: 'plata', earned: weekendBoth },
];

/** Medallas conseguidas según los datos. */
export function earnedMedals(c: MedalContext): string[] {
  return MEDALS.filter((m) => m.earned(c)).map((m) => m.id);
}
