import { canDo } from './equipment';
import { WorkoutPlan, type Catalog } from './WorkoutPlan';
import { emptyRoutine, SECTION_IDS, type ExerciseDef, type Routine, type SectionId, type Settings } from './types';

/*
 * Asistente «Crea-la per mi»: arma una tabla a partir del objetivo, la zona, el tiempo y el nivel, con el material
 * que tiene el usuario. Reparte el tiempo entre apartados según el objetivo, elige ejercicios de la zona variados
 * (sin repetir el mismo músculo seguido), estira los músculos que se han trabajado y ajusta el total al tiempo pedido.
 */

export type Goal = 'forma' | 'perder' | 'fuerza' | 'flexibilidad' | 'espalda';
export type Zone = 'entero' | 'superior' | 'inferior' | 'abdomen';
export type Level = 'suave' | 'normal' | 'intenso';

export interface GenOptions {
  goal: Goal;
  /** Con «espalda» no se pregunta (va enfocado a la espalda y el core). */
  zone: Zone;
  minutes: number;
  level: Level;
}

export interface GenContext {
  /** Ejercicios de cada apartado (los que se ven en la app; sin los retirados). */
  sections: ReadonlyArray<{ id: SectionId; exercises: readonly ExerciseDef[] }>;
  catalog: Catalog;
  /** Material que tiene el usuario. */
  owned: ReadonlySet<string>;
  /** Pausas y cuenta atrás de cada apartado (para cuadrar el tiempo). */
  settings: Settings;
  /** Número aleatorio en [0, 1) (para pruebas, uno fijo). */
  rng?: () => number;
}

export interface GenResult {
  routine: Routine;
  rounds: Partial<Record<SectionId, number>>;
  /** Orden de los bloques (al editar una tabla guardada); sin él, el de siempre. */
  order?: SectionId[];
}

export const GOALS: readonly Goal[] = ['forma', 'perder', 'fuerza', 'flexibilidad', 'espalda'];
export const ZONES: readonly Zone[] = ['entero', 'superior', 'inferior', 'abdomen'];
export const LEVELS: readonly Level[] = ['suave', 'normal', 'intenso'];
export const MINUTES: readonly number[] = [10, 15, 20, 30, 45];

/** Textos (en castellano; se traducen en pantalla con i18n/ui.ts). */
export const GOAL_INFO: Record<Goal, { name: string; help: string; icon: string }> = {
  forma: { name: 'Ponerme en forma', help: 'Un poco de todo: fuerza, abdominales y estiramientos.', icon: 'bolt' },
  perder: { name: 'Perder peso', help: 'Más pulsaciones: circuitos con poco descanso.', icon: 'flame' },
  fuerza: { name: 'Ganar fuerza', help: 'Más ejercicios de fuerza y más vueltas.', icon: 'dumbbell' },
  flexibilidad: { name: 'Flexibilidad', help: 'Movilidad y estiramientos.', icon: 'stretch' },
  espalda: { name: 'Espalda sana', help: 'Suave: movilidad, core y estiramientos de espalda.', icon: 'heart' },
};
export const ZONE_INFO: Record<Zone, { name: string; help: string }> = {
  entero: { name: 'Cuerpo entero', help: 'Brazos, tronco y piernas.' },
  superior: { name: 'Tren superior', help: 'Pecho, espalda, hombros y brazos.' },
  inferior: { name: 'Piernas y glúteos', help: 'Cuádriceps, glúteos, isquios y gemelos.' },
  abdomen: { name: 'Abdomen', help: 'Abdominales, oblicuos y zona lumbar.' },
};
export const LEVEL_INFO: Record<Level, { name: string; help: string }> = {
  suave: { name: 'Suave', help: 'Para empezar o volver: sin ejercicios exigentes.' },
  normal: { name: 'Normal', help: 'Ejercicios de 40 segundos.' },
  intenso: { name: 'Intenso', help: 'Ejercicios más largos y más vueltas.' },
};

const ZONE_MUSCLES: Record<Zone | 'espalda', readonly string[]> = {
  entero: [],
  superior: ['pecho', 'espalda', 'deltoides', 'biceps', 'triceps', 'trapecio', 'antebrazo'],
  inferior: ['cuadriceps', 'gluteos', 'isquios', 'gemelos', 'aductores'],
  abdomen: ['abdominales', 'oblicuos', 'lumbar'],
  espalda: ['espalda', 'lumbar', 'gluteos', 'abdominales', 'oblicuos', 'trapecio'],
};

/** Reparto del tiempo entre apartados según el objetivo (calentamiento, fuerza, abdominales, estiramientos). */
const SHARE: Record<Goal, Record<SectionId, number>> = {
  forma: { calentamiento: 0.17, pesas: 0.43, abdominales: 0.2, estiramientos: 0.2 },
  perder: { calentamiento: 0.3, pesas: 0.37, abdominales: 0.18, estiramientos: 0.15 },
  fuerza: { calentamiento: 0.13, pesas: 0.6, abdominales: 0.14, estiramientos: 0.13 },
  flexibilidad: { calentamiento: 0.22, pesas: 0, abdominales: 0, estiramientos: 0.78 },
  espalda: { calentamiento: 0.2, pesas: 0.18, abdominales: 0.27, estiramientos: 0.35 },
};

/** Segundos de cada ejercicio según el nivel. */
const SECONDS: Record<Level, Record<SectionId, number>> = {
  suave: { calentamiento: 30, pesas: 30, abdominales: 30, estiramientos: 30 },
  normal: { calentamiento: 30, pesas: 40, abdominales: 40, estiramientos: 40 },
  intenso: { calentamiento: 40, pesas: 45, abdominales: 45, estiramientos: 40 },
};

/** Músculos de un ejercicio: los que trabaja (principal 2, secundario 1) y los que estira. */
export function parseMuscles(spec: string | undefined): { works: Map<string, number>; stretches: Set<string> } {
  const works = new Map<string, number>(), stretches = new Set<string>();
  for (const tok of (spec ?? '').split(/\s+/)) {
    const m = /^([+~-])([a-z]+)/.exec(tok);
    if (!m) continue;
    if (m[1] === '-') stretches.add(m[2]);
    else works.set(m[2], Math.max(works.get(m[2]) ?? 0, m[1] === '+' ? 2 : 1));
  }
  return { works, stretches };
}

/** El músculo que más trabaja (para no repetirlo seguido). */
function mainMuscle(ex: ExerciseDef): string {
  const { works, stretches } = parseMuscles(ex.muscles);
  let best = '', w = 0;
  for (const [k, v] of works) if (v > w) { best = k; w = v; }
  return best || [...stretches][0] || ex.group || ex.id;
}

const targetZone = (o: GenOptions): Zone | 'espalda' => (o.goal === 'espalda' ? 'espalda' : o.zone);

/** Cuánto encaja un ejercicio en la zona (0 = nada). En estiramientos cuentan los músculos que estira. */
function zoneScore(ex: ExerciseDef, zone: Zone | 'espalda', section: SectionId): number {
  const target = ZONE_MUSCLES[zone];
  if (!target.length) return 1;
  const { works, stretches } = parseMuscles(ex.muscles);
  let s = 0;
  if (section === 'estiramientos') for (const m of stretches) s += target.includes(m) ? 2 : 0;
  // en fuerza cuenta sobre todo el músculo principal (un secundario de la zona no basta)
  for (const [m, v] of works) s += target.includes(m) ? (v === 2 ? 2 : 0.4) : 0;
  return s;
}

/** ¿Se puede proponer este ejercicio con estas opciones? */
function allowed(ex: ExerciseDef, o: GenOptions, owned: ReadonlySet<string>): boolean {
  if (ex.pending || !canDo(ex.equip, owned)) return false;
  // en suave y para la espalda, nada marcado como exigente
  if ((o.level === 'suave' || o.goal === 'espalda') && ex.badges?.includes('caution')) return false;
  return true;
}

/** Peso de cada candidato para el sorteo, según el apartado, el objetivo y la zona. */
function weightOf(ex: ExerciseDef, section: SectionId, o: GenOptions, worked: ReadonlySet<string>): number {
  const zone = targetZone(o);
  let w = 0.2;
  if (section === 'calentamiento') {
    const g = ex.group ?? '';
    w = 1;
    if (o.goal === 'perder' && /pulsaciones|comba/i.test(g)) w = 3;
    if ((o.goal === 'flexibilidad' || o.goal === 'espalda') && /movilidad/i.test(g)) w = 3;
    if (o.goal === 'espalda' && /pulsaciones/i.test(g)) w = 0.3;
    if ((o.goal === 'flexibilidad' || o.goal === 'espalda' || o.level === 'suave') && /comba/i.test(g)) w = 0.2;
    w *= 1 + Math.min(2, zoneScore(ex, zone, section)) * 0.3;
  } else if (section === 'estiramientos') {
    // estirar lo que se ha trabajado (y la zona elegida)
    const { stretches, works } = parseMuscles(ex.muscles);
    let s = 0;
    for (const m of stretches) if (worked.has(m)) s += 1;
    s += 3 * zoneScore(ex, zone, section);
    // «Fortalecer zona lumbar» (sin estirar nada): solo para la espalda
    if (!stretches.size && works.size && zone !== 'espalda') s = 0;
    w = s > 0 ? s : 0.15;
  } else {
    const z = zoneScore(ex, zone, section);
    w = z > 0 ? z : zone === 'entero' ? 1 : 0;
    if (o.goal === 'perder' && /Cuerpo entero/i.test(ex.group ?? '')) w *= 2;
    if (o.level === 'suave' && ex.badges?.includes('gentle')) w *= 1.5;
  }
  return w;
}

/** Sorteo ponderado sin repetir; procura no poner seguido el mismo músculo principal. */
function pick(cands: ExerciseDef[], weights: Map<string, number>, n: number, rng: () => number): ExerciseDef[] {
  const pool = cands.filter((e) => (weights.get(e.id) ?? 0) > 0);
  const out: ExerciseDef[] = [];
  while (out.length < n && pool.length) {
    const last = out.length ? mainMuscle(out[out.length - 1]) : '';
    const used = new Set(out.map(mainMuscle));
    const wOf = (e: ExerciseDef) => (weights.get(e.id) ?? 0) * (mainMuscle(e) === last ? 0.05 : used.has(mainMuscle(e)) ? 0.4 : 1);
    const total = pool.reduce((s, e) => s + wOf(e), 0);
    let r = rng() * total, i = 0;
    for (; i < pool.length - 1; i++) { r -= wOf(pool[i]); if (r <= 0) break; }
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}

/** Orden dentro del calentamiento: movilidad, activación y, al final, lo que sube pulsaciones. */
function warmupRank(ex: ExerciseDef): number {
  const g = ex.group ?? '';
  return /movilidad/i.test(g) ? 0 : /activaci/i.test(g) ? 1 : /pulsaciones/i.test(g) ? 2 : 3;
}

function roundsFor(o: GenOptions, section: SectionId): number {
  if (section !== 'pesas' && section !== 'abdominales') return 1;
  if (o.goal === 'flexibilidad' || o.goal === 'espalda' || o.level === 'suave') return 1;
  if (o.level === 'intenso' || o.goal === 'perder') return o.minutes >= 20 ? 2 : 1;
  if (o.goal === 'fuerza') return o.minutes >= 30 ? 2 : 1;
  return 1;
}

/** Duración real (s) de una tabla, como la calcula el entrenamiento. */
export function tableSeconds(r: GenResult, ctx: Pick<GenContext, 'catalog' | 'settings'>): number {
  return WorkoutPlan.build(r.routine, ctx.catalog, ctx.settings, r.rounds).estimatedSeconds;
}

/** Crea una tabla con estas opciones. */
export function generate(o: GenOptions, ctx: GenContext): GenResult {
  const rng = ctx.rng ?? Math.random;
  const target = o.minutes * 60;
  const share = SHARE[o.goal];
  const rounds: Partial<Record<SectionId, number>> = {};
  const lists: Partial<Record<SectionId, ExerciseDef[]>> = {};
  const worked = new Set<string>();

  // primero fuerza y abdominales (para saber qué estirar), luego calentamiento y estiramientos
  const order: SectionId[] = ['pesas', 'abdominales', 'calentamiento', 'estiramientos'];
  for (const sec of order) {
    if (!share[sec]) continue;
    const exs = ctx.sections.find((s) => s.id === sec)?.exercises ?? [];
    const cands = exs.filter((e) => allowed(e, o, ctx.owned));
    const weights = new Map(cands.map((e) => [e.id, weightOf(e, sec, o, worked)]));
    const R = roundsFor(o, sec);
    const secs = SECONDS[o.level][sec];
    const per = (secs + (ctx.settings.rest[sec] ?? 0)) * R;
    const budget = target * share[sec] - ctx.settings.sectionCountdown;
    const n = Math.max(sec === 'calentamiento' || sec === 'estiramientos' ? 2 : 1, Math.round(budget / per));
    let chosen = pick(cands, weights, n, rng);
    if (sec === 'calentamiento') chosen = chosen.sort((a, b) => warmupRank(a) - warmupRank(b));
    lists[sec] = chosen;
    if (R > 1) rounds[sec] = R;
    if (sec !== 'calentamiento') for (const e of chosen) for (const m of parseMuscles(e.muscles).works.keys()) worked.add(m);
  }

  // segundos de cada apartado (pueden subir un poco si no hay más ejercicios para llenar el tiempo)
  const secOf: Record<SectionId, number> = { ...SECONDS[o.level] };
  const build = (): GenResult => {
    const r = emptyRoutine();
    for (const sec of SECTION_IDS) r[sec] = (lists[sec] ?? []).map((e) => ({ exerciseId: e.id, seconds: secOf[sec] }));
    return { routine: r, rounds: { ...rounds } };
  };
  const addOne = (sec: SectionId): boolean => {
    if (!share[sec]) return false;
    const exs = ctx.sections.find((s) => s.id === sec)?.exercises ?? [];
    const have = new Set((lists[sec] ?? []).map((e) => e.id));
    const cands = exs.filter((e) => allowed(e, o, ctx.owned) && !have.has(e.id));
    const weights = new Map(cands.map((e) => [e.id, weightOf(e, sec, o, worked)]));
    const extra = pick(cands, weights, 1, rng);
    if (!extra.length) return false;
    (lists[sec] ??= []).push(extra[0]);
    return true;
  };

  // ajuste fino al tiempo pedido: quitar o añadir ejercicios donde más pese el apartado; si ya no hay más
  // ejercicios de la zona, una vuelta más (fuerza y abdominales) o unos segundos más por ejercicio
  let res = build();
  const bySize = [...SECTION_IDS].filter((x) => share[x]).sort((a, b) => share[b] - share[a]);
  const MAX_SECS: Record<SectionId, number> = { calentamiento: 45, pesas: 60, abdominales: 60, estiramientos: 60 };
  for (let guard = 0; guard < 60; guard++) {
    const t = tableSeconds(res, ctx);
    if (t > target * 1.08) {
      // quitar del apartado más largo que tenga más de lo mínimo
      const len = (x: SectionId) => (lists[x]?.length ?? 0) * secOf[x] * (rounds[x] ?? 1);
      const sec = [...SECTION_IDS].sort((a, b) => len(b) - len(a)).find((x) => (lists[x]?.length ?? 0) > 1);
      if (!sec) break;
      lists[sec]!.pop();
    } else if (t < target * 0.92) {
      if (bySize.some((x) => addOne(x))) { res = build(); continue; }
      const roundable = bySize.find((x) => (x === 'pesas' || x === 'abdominales') && (rounds[x] ?? 1) < 3 && (lists[x]?.length ?? 0) > 0);
      if (roundable) rounds[roundable] = (rounds[roundable] ?? 1) + 1;
      else {
        const longer = bySize.find((x) => secOf[x] < MAX_SECS[x]);
        if (!longer) break;
        secOf[longer] = Math.min(MAX_SECS[longer], secOf[longer] + 5);
      }
    } else break;
    res = build();
  }
  return res;
}

/** Cambia un ejercicio por otro parecido del mismo apartado (misma zona; si puede, el mismo músculo). */
export function swapExercise(r: GenResult, section: SectionId, index: number, o: GenOptions, ctx: GenContext): GenResult {
  const rng = ctx.rng ?? Math.random;
  const items = r.routine[section];
  const cur = ctx.catalog.get(items[index]?.exerciseId ?? '');
  if (!cur) return r;
  const have = new Set(SECTION_IDS.flatMap((s) => r.routine[s].map((i) => i.exerciseId)));
  const worked = new Set<string>();
  for (const s of ['pesas', 'abdominales'] as const) for (const i of r.routine[s]) for (const m of parseMuscles(ctx.catalog.get(i.exerciseId)?.muscles).works.keys()) worked.add(m);
  const exs = ctx.sections.find((s) => s.id === section)?.exercises ?? [];
  const cands = exs.filter((e) => e.id !== cur.id && !have.has(e.id) && allowed(e, o, ctx.owned));
  const main = mainMuscle(cur);
  const weights = new Map(cands.map((e) => {
    let w = weightOf(e, section, o, worked);
    if (w > 0 && mainMuscle(e) === main) w *= 4;
    if (w > 0 && e.group === cur.group) w *= 2;
    return [e.id, w];
  }));
  const next = pick(cands, weights, 1, rng)[0];
  if (!next) return r;
  const routine = { ...r.routine, [section]: items.map((it, i) => (i === index ? { ...it, exerciseId: next.id } : it)) };
  return { routine, rounds: { ...r.rounds } };
}

/** Nombre propuesto para la tabla (en castellano; se traduce con i18n antes de guardarla). */
export function suggestedName(o: GenOptions): { label: string; minutes: number } {
  const label = o.goal === 'espalda' || o.goal === 'flexibilidad' ? GOAL_INFO[o.goal].name : ZONE_INFO[o.zone].name;
  return { label, minutes: o.minutes };
}
