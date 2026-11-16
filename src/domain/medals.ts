import { LOCALE } from '../i18n';
import { SECTION_IDS, type HistoryEntry, type WeightEntry } from './types';
import { bestStreak } from './stats';
import { weekKey } from './monthSummary';
import { fullPlanWeek } from './weekPlan';

export type Tier = 'bronce' | 'plata' | 'oro';
export type MedalIcon = 'trophy' | 'flame' | 'clock' | 'bolt' | 'calendar' | 'target' | 'dumbbell' | 'heart' | 'check';

export interface MedalContext {
  history: readonly HistoryEntry[];
  weights: readonly WeightEntry[];
  goalKg?: number | null;
  kcal: number;
  /** Días de entrenamiento del plan de la semana (si hay plan). */
  planDays?: readonly number[];
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
  { id: 'apartados', title: 'Bloques', icon: 'check' },
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

/** Un entrenamiento cuenta para las medallas solo si dura 10 minutos o más. */
export const MIN_MEDAL_SECONDS = 10 * 60;
export const countsForMedals = (e: HistoryEntry) => e.durationSec >= MIN_MEDAL_SECONDS;

/** Veces que se ha subido el peso en un ejercicio (respecto al máximo anterior de ese ejercicio). */
const weightUps = (c: MedalContext) => {
  const best = new Map<string, number>();
  let ups = 0;
  for (const e of [...c.history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    for (const i of e.items ?? []) {
      if (!i.weight || !i.completed) continue;
      const prev = best.get(i.exerciseId);
      if (prev !== undefined && i.weight > prev) ups++;
      best.set(i.exerciseId, Math.max(prev ?? 0, i.weight));
    }
  }
  return ups;
};
const complete = (c: MedalContext) => c.history.filter((e) => e.completed && SECTION_IDS.every((s) => e.sections.includes(s))).length;
const early = (c: MedalContext) => c.history.filter((e) => hourOf(e) < 8).length;
const late = (c: MedalContext) => c.history.filter((e) => hourOf(e) >= 22).length;
/** Semanas en que se ha entrenado el sábado y el domingo. */
const weekends = (c: MedalContext) => {
  const m = new Map<string, Set<number>>();
  for (const e of c.history) {
    const d = new Date(e.date);
    const k = weekKey(d);
    if (!m.has(k)) m.set(k, new Set());
    m.get(k)!.add(d.getDay());
  }
  return [...m.values()].filter((s) => s.has(6) && s.has(0)).length;
};
/** Ejercicios distintos hechos (completos). */
const distinct = (c: MedalContext) => new Set(c.history.flatMap((e) => (e.items ?? []).filter((i) => i.completed).map((i) => i.exerciseId))).size;
/** Meses seguidos con al menos un entrenamiento. */
const monthsInRow = (c: MedalContext) => {
  const ms = [...new Set(c.history.map((e) => { const d = new Date(e.date); return d.getFullYear() * 12 + d.getMonth(); }))].sort((a, b) => a - b);
  let best = 0, run = 0;
  for (let i = 0; i < ms.length; i++) { run = i > 0 && ms[i] === ms[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); }
  return best;
};
/** ¿Alguna semana con los cuatro bloques hechos (en uno o varios entrenamientos)? */
const allBlocksWeek = (c: MedalContext) => {
  const m = new Map<string, Set<string>>();
  for (const e of c.history) {
    const k = weekKey(new Date(e.date));
    if (!m.has(k)) m.set(k, new Set());
    for (const s of e.sections) m.get(k)!.add(s);
  }
  return [...m.values()].some((s) => SECTION_IDS.every((x) => s.has(x)));
};

type M = Omit<Medal, 'group' | 'icon'>;
const g = (group: MedalGroup, icon: MedalIcon, ms: M[]): Medal[] => ms.map((m) => ({ ...m, group, icon }));

export const MEDALS: Medal[] = [
  // Entrenamientos
  ...g('entrenos', 'bolt', ([[1, 'bronce', 'Primer paso'], [10, 'bronce', 'Diez de diez'], [25, 'plata', 'Constante'], [50, 'plata', 'Medio centenar'],
    [100, 'oro', 'Centenario'], [200, 'oro', 'Leyenda'], [365, 'oro', 'Un año entrenando'], [500, 'oro', 'Quinientos']] as Array<[number, Tier, string]>)
    .map(([n, tier, title]) => ({ id: `entrenos-${n}`, tier, title, desc: n === 1 ? 'Tu primer entrenamiento.' : `${n} entrenamientos hechos.`, earned: (c: MedalContext) => sessions(c) >= n }))),
  // Constancia: días seguidos, días en una semana, plan y semanas seguidas
  ...g('constancia', 'flame', ([[5, 'bronce', 'En racha'], [7, 'plata', 'Semana perfecta'], [14, 'plata', 'Imparable'], [30, 'oro', 'Un mes sin parar'],
    [60, 'oro', 'Dos meses sin parar'], [100, 'oro', 'Cien días']] as Array<[number, Tier, string]>)
    .map(([n, tier, title]) => ({ id: `racha-${n}`, tier, title, desc: `${n} días seguidos entrenando.`, earned: (c: MedalContext) => bestStreak(c.history) >= n }))),
  ...g('constancia', 'calendar', [
    { id: 'semana-4', tier: 'bronce', title: 'Buena semana', desc: '4 días entrenados en una misma semana.', earned: (c) => maxDaysInWeek(c) >= 4 },
    { id: 'semana-5', tier: 'plata', title: 'Semana de hierro', desc: '5 días entrenados en una misma semana.', earned: (c) => maxDaysInWeek(c) >= 5 },
    { id: 'semana-7', tier: 'oro', title: 'Semana completa', desc: 'Los 7 días de una misma semana entrenados.', earned: (c) => maxDaysInWeek(c) >= 7 },
    { id: 'plan-cumplido', tier: 'plata', title: 'Plan cumplido', desc: 'Todos los días de tu plan de la semana entrenados en una misma semana.', earned: (c) => !!c.planDays && fullPlanWeek(c.history, c.planDays) },
    ...([[4, 'plata', 'Hábito'], [12, 'oro', 'Hábito de hierro'], [26, 'oro', 'Medio año constante'], [52, 'oro', 'Un año constante']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `habito-${n}`, tier, title, desc: `${n} semanas seguidas entrenando al menos 3 días.`, earned: (c) => habitWeeks(c) >= n })),
  ]),
  // Tiempo entrenado
  ...g('tiempo', 'clock', [
    ...([[30, 'bronce', 'Media hora'], [45, 'plata', 'Sesión larga'], [60, 'oro', 'Una hora entera']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `sesion-${n}`, tier, title, desc: `Un entrenamiento de ${n} minutos o más.`, earned: (c) => c.history.some((e) => e.durationSec >= n * 60) })),
    ...([[10, 'bronce', 'Diez horas'], [25, 'plata', 'Veinticinco horas'], [50, 'oro', 'Cincuenta horas'], [100, 'oro', 'Cien horas'], [250, 'oro', 'Doscientas cincuenta horas']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `horas-${n}`, tier, title, desc: `${n} horas de entrenamiento en total.`, earned: (c) => hours(c) >= n })),
  ]),
  // Calorías
  ...g('calorias', 'heart', [
    ...([[300, 'plata', 'A tope'], [500, 'oro', 'Al rojo vivo']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `kcal-sesion-${n}`, tier, title, desc: `${n} kcal o más en un solo entrenamiento.`, earned: (c) => c.history.some((e) => (e.kcal ?? 0) >= n) })),
    ...([[2500, 'bronce', 'Calentando motores'], [10000, 'plata', 'Diez mil'], [25000, 'oro', 'Horno encendido'], [50000, 'oro', 'Volcán'], [100000, 'oro', 'Cien mil']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `kcal-${n}`, tier, title, desc: `${n.toLocaleString(LOCALE)} kcal quemadas en total.`, earned: (c) => c.kcal >= n })),
  ]),
  // Peso corporal
  ...g('peso', 'target', [
    ...([[2, 'bronce', 'Dos kilos'], [5, 'plata', 'Cinco kilos'], [10, 'oro', 'Diez kilos'], [15, 'oro', 'Quince kilos']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `kg-${n}`, tier, title, desc: `${n} kg menos desde tu primer peso anotado.`, earned: (c) => lost(c) >= n - 1e-9 })),
  ]),
  { group: 'peso', id: 'objetivo', title: 'Objetivo cumplido', desc: 'Has llegado a tu objetivo de peso.', icon: 'trophy', tier: 'oro',
    earned: (c) => !!c.goalKg && c.weights.length > 1 && (c.goalKg <= c.weights[0].kg ? c.weights.at(-1)!.kg <= c.goalKg : c.weights.at(-1)!.kg >= c.goalKg) },
  // Fuerza
  ...g('fuerza', 'dumbbell', [
    ...([[10, 'bronce', 'Constructor'], [50, 'plata', 'Forjado'], [100, 'oro', 'Acero puro']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `pesas-${n}`, tier, title, desc: `${n} entrenamientos de fuerza.`, earned: (c) => withSection(c, 'pesas') >= n })),
    { id: 'record-peso-1', tier: 'bronce', title: 'Más fuerte', desc: 'Has subido el peso en un ejercicio.', earned: (c) => weightUps(c) >= 1 },
    ...([[5, 'plata', 'Cada vez más fuerte'], [20, 'oro', 'Progreso sin fin']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `record-peso-${n}`, tier, title, desc: `Has subido el peso ${n} veces.`, earned: (c) => weightUps(c) >= n })),
    ...([[10, 'plata', 'Peso pesado'], [15, 'oro', 'Titán'], [20, 'oro', 'Hércules']] as Array<[number, Tier, string]>)
      .map(([n, tier, title]): M => ({ id: `peso-${n}kg`, tier, title, desc: `Un ejercicio con ${n} kg o más por mancuerna.`, earned: (c) => maxWeight(c) >= n })),
  ]),
  // Bloques
  ...g('apartados', 'check', [
    { id: 'completo-10', tier: 'bronce', title: 'Tabla completa', desc: '10 entrenamientos completos con los cuatro bloques.', earned: (c) => complete(c) >= 10 },
    { id: 'completo-50', tier: 'oro', title: 'Completista', desc: '50 entrenamientos completos con los cuatro bloques.', earned: (c) => complete(c) >= 50 },
  ]),
  ...g('apartados', 'flame', ([[25, 'bronce', 'Siempre a punto'], [100, 'oro', 'Motor en marcha']] as Array<[number, Tier, string]>)
    .map(([n, tier, title]) => ({ id: `calentamiento-${n}`, tier, title, desc: `${n} entrenamientos con calentamiento.`, earned: (c: MedalContext) => withSection(c, 'calentamiento') >= n }))),
  ...g('apartados', 'target', ([[25, 'plata', 'Core de acero'], [100, 'oro', 'Abdomen de piedra']] as Array<[number, Tier, string]>)
    .map(([n, tier, title]) => ({ id: `abdominales-${n}`, tier, title, desc: `${n} entrenamientos con abdominales.`, earned: (c: MedalContext) => withSection(c, 'abdominales') >= n }))),
  ...g('apartados', 'check', ([[25, 'plata', 'Flexible'], [100, 'oro', 'Como un junco']] as Array<[number, Tier, string]>)
    .map(([n, tier, title]) => ({ id: `estiramientos-${n}`, tier, title, desc: `${n} entrenamientos con estiramientos.`, earned: (c: MedalContext) => withSection(c, 'estiramientos') >= n }))),
  // Especiales
  ...g('especiales', 'clock', [
    { id: 'madrugador-10', tier: 'plata', title: 'Madrugador', desc: '10 entrenamientos antes de las 8 de la mañana.', earned: (c) => early(c) >= 10 },
    { id: 'nocturno-10', tier: 'plata', title: 'Búho', desc: '10 entrenamientos después de las 10 de la noche.', earned: (c) => late(c) >= 10 },
  ]),
  ...g('especiales', 'calendar', [
    { id: 'finde-4', tier: 'plata', title: 'Fin de semana activo', desc: 'Entrenar el sábado y el domingo en 4 semanas distintas.', earned: (c) => weekends(c) >= 4 },
    { id: 'todo-el-ano', tier: 'oro', title: 'Todo el año', desc: 'Al menos un entrenamiento cada mes durante 12 meses seguidos.', earned: (c) => monthsInRow(c) >= 12 },
  ]),
  ...g('especiales', 'trophy', [
    { id: 'equilibrio', tier: 'plata', title: 'Equilibrio', desc: 'Los cuatro bloques en una misma semana.', earned: allBlocksWeek },
    { id: 'explorador-50', tier: 'plata', title: 'Explorador', desc: 'Has hecho 50 ejercicios distintos.', earned: (c) => distinct(c) >= 50 },
    { id: 'explorador-100', tier: 'oro', title: 'Trotamundos', desc: 'Has hecho 100 ejercicios distintos.', earned: (c) => distinct(c) >= 100 },
  ]),
];

/** Medallas conseguidas según los datos. */
export function earnedMedals(c: MedalContext): string[] {
  // solo cuentan los entrenamientos de 10 minutos o más
  const v: MedalContext = { ...c, history: c.history.filter(countsForMedals) };
  return MEDALS.filter((m) => m.earned(v)).map((m) => m.id);
}
