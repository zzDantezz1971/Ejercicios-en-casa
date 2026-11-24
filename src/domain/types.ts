import { DEFAULT_ANGLES_VER } from '../data/defaultAngles';
import type { Equip } from './equipment';
/** Apartados de la rutina, en el orden en que se hacen. */
export const SECTION_IDS = ['calentamiento', 'pesas', 'abdominales', 'estiramientos'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

/** Orden de los bloques de una tabla: el suyo si es válido (los cuatro, sin repetir); si no, el de siempre. */
export function sectionOrder(order?: readonly string[] | null): SectionId[] {
  if (!order || order.length !== SECTION_IDS.length || !SECTION_IDS.every((s) => order.includes(s))) return [...SECTION_IDS];
  return [...order] as SectionId[];
}

export const SECTION_TITLES: Record<SectionId, string> = {
  calentamiento: 'Calentamiento',
  pesas: 'Fuerza',
  abdominales: 'Abdominales',
  estiramientos: 'Estiramientos',
};

export type Badge = 'lumbar' | 'caution' | 'gentle' | 'pilates';

export interface ExerciseDescription {
  /** Posición inicial. */
  start: string;
  /** Cómo se hace el movimiento. */
  move: string;
  /** Respiración o consejo principal. */
  tip: string;
  /** Errores habituales. */
  mistakes?: string;
  /** Versión más fácil. */
  easier?: string;
}

/** Especificación del movimiento para el motor de posturas (ver figure/poses.ts). */
export interface MotionSpec {
  v?: 'side' | 'front' | 'top';
  f?: Array<[Record<string, number>, number?, number?]>;
  fn?: (t: number) => Record<string, number>;
  per?: number;
  anchor?: { j: string; y: number };
  plant?: string;
  /** Manos apoyadas en el suelo: no se mueven del sitio donde empiezan y el codo se dobla para llegar
      (número: altura de la muñeca sobre el suelo; true = 3.5). */
  handsDown?: boolean | number;
  /** Pies fijos en el suelo: el tobillo cercano al suelo baja hasta él (puente, crunch... tumbado con rodillas dobladas). */
  feetDown?: boolean;
  /** No bajar al suelo las piernas estiradas cuando está tumbado o sentado. */
  noSettle?: boolean;
  /** Con handsDown: las manos pueden avanzar por el suelo (oso, gusano); solo se fija la altura. */
  handsSlide?: boolean;
  /** Con handsDown: solo esta mano (la otra se mueve libre, p. ej. hilo en la aguja). */
  handsDownSide?: 'L' | 'R';
  /** Manos apoyadas detrás del cuerpo (fondos de tríceps): los dedos miran hacia los pies. */
  fingersToFeet?: boolean;
  /** Mancuernas: en una mano, en las dos, o una sola cogida con las dos manos ('two'). */
  db?: 'L' | 'R' | 'both' | 'two';
  /** Con db 'two': la mancuerna va cruzada, cogida por los dos extremos (no a lo largo de los antebrazos). */
  dbAcross?: boolean;
  mat?: boolean | number | 'top';
  noGround?: boolean | number;
  /** Altura del cuerpo sobre el suelo en vista desde arriba (p. ej. tumbado en el banco). */
  lift?: number;
  /** En vista desde arriba, las rodillas bajan en vez de subir (pies en el suelo junto al banco). */
  legsDown?: boolean;
  /** Los fotogramas contienen los dos lados: la primera mitad es el lado 1 y la segunda el lado 2. */
  split?: boolean;
  /** En vista lateral, los brazos acortados (sa < 1) se abren hacia los lados. */
  armsOut?: boolean;
  /** En vista desde arriba, la figura está boca abajo. */
  prone?: boolean;
  mark?: string[];
  props?: (j: Record<string, [number, number]>, p: PropHelpers) => PropOp[];
  /** Material que se mueve con el cuerpo (ver figure/Mannequin.ts, updateGear). */
  /** Pesa rusa: en una mano, cogida con las dos, o 'up': en la mano que está más arriba (pasa de una a otra). */
  kb?: 'L' | 'R' | 'both' | 'up';
  /** La pesa rusa boca abajo (la bola por encima de las manos), como en el halo. */
  kbUp?: boolean;
  /** Repite los fotogramas reflejados: el ejercicio alterna los dos lados (sin hacerse por lados). */
  alternate?: boolean;
  /** Agarre martillo: las mancuernas de canto (palmas enfrentadas). */
  hammer?: boolean;
  /** Manos juntas (giros rusos…). */
  clasp?: boolean;
  /** Manos cerradas en puño (golpes, guardia). */
  fist?: boolean;
  /** Barra con discos entre las dos manos. */
  bar?: boolean;
  /** Banda elástica: de las manos a los pies, entre las manos, entre rodillas o tobillos, o a un punto fijo (2D, en la postura inicial). */
  /** 'bar': banda atada a la barra de dominadas (entre las manos) que baja hasta la rodilla. */
  band?: 'feet' | 'hands' | 'knees' | 'ankles' | 'bar' | 'back' | ((j: Record<string, [number, number]>) => [number, number]);
  /** Fitball: centro (2D) según las articulaciones de cada instante. */
  ball?: (j: Record<string, [number, number]>, pose: Record<string, number>) => [number, number];
  /** Radio de la fitball (27 por defecto). */
  ballR?: number;
  /** Comba entre las manos; su posición la da el ángulo `rp` de la postura (grados). */
  rope?: boolean;
  /** Rueda abdominal en las manos. */
  wheel?: boolean;
  /** Ángulo de cámara preferido en 3D (grados). */
  az?: number;
  el?: number;
}

export type PropOp =
  | { t: 'rect'; x: number; y: number; w: number; h: number; soft?: boolean; z?: number; dep?: number; color?: string }
  | { t: 'line'; a: [number, number]; b: [number, number]; w: number; soft?: boolean; z?: number; dep?: number };

export interface PropHelpers {
  benchFlat(x1: number, x2: number, h?: number): PropOp[];
  line(a: [number, number], b: [number, number], w?: number, soft?: boolean): PropOp[];
  wall(x: number, h?: number, dep?: number): PropOp[];
  rect(x: number, y: number, w: number, h: number, soft?: boolean): PropOp[];
}

export interface ExerciseDef {
  id: string;
  name: string;
  section: SectionId;
  /** Zona del cuerpo que trabaja. */
  zone: string;
  /** Zona o subgrupo dentro del apartado. */
  group?: string;
  /** Se hace primero con un lado y luego con el otro: aviso de cambio a mitad del tiempo. */
  oneSided?: boolean;
  badges?: Badge[];
  description?: ExerciseDescription;
  motion: MotionSpec;
  /** Músculos que trabaja y estira (ver data/muscles.ts). */
  muscles?: string;
  /** Texto que indica desde dónde se ve la figura, si no es de lado. */
  viewLabel?: string;
  /** Material que necesita (vacío o sin definir = sin material). */
  equip?: Equip[][];
  /** Aún sin animación del muñeco: se muestra "Animación en preparación". */
  pending?: boolean;
  /** Ejercicio de pilates (sale con la etiqueta «Pilates» y en su filtro de la lista). */
  pilates?: boolean;
}

export interface RoutineItem {
  exerciseId: string;
  seconds: number;
  /** Peso por mancuerna (kg), solo en ejercicios con mancuerna. */
  weight?: number;
  /**
   * Por repeticiones (en vez de por tiempo): cuántas. Sin cuenta atrás: al entrenar se toca «Hecho» al acabarlas
   * (en los ejercicios por lados, son por lado). `seconds` se conserva por si se vuelve a poner por tiempo.
   */
  reps?: number;
  /** Por tiempo: las repeticiones que tenía, para recuperarlas si se vuelve a poner por repeticiones. */
  repsSaved?: number;
  /**
   * Serie dentro del bloque: los ejercicios seguidos con el mismo `id` se repiten `rounds` veces antes de pasar al
   * siguiente (todos llevan las mismas vueltas). Sin esto, el ejercicio se hace una vez por vuelta del bloque.
   */
  series?: { id: string; rounds: number };
}

/** Tramos de un bloque: cada ejercicio suelto, o los de una serie juntos (índices `start`..`end`, ambos incluidos). */
export function blockRuns(items: readonly RoutineItem[]): Array<{ start: number; end: number; rounds: number; id?: string }> {
  const runs: Array<{ start: number; end: number; rounds: number; id?: string }> = [];
  items.forEach((it, i) => {
    const last = runs[runs.length - 1];
    if (it.series && last?.id === it.series.id && last.end === i - 1) last.end = i;
    else runs.push({ start: i, end: i, rounds: it.series ? Math.min(10, Math.max(1, Math.round(it.series.rounds))) : 1, ...(it.series ? { id: it.series.id } : {}) });
  });
  return runs;
}

/** Segundos de ejercicio de un bloque en una vuelta (las series cuentan sus vueltas). */
export function blockSeconds(items: readonly RoutineItem[], has: (id: string) => boolean = () => true): number {
  return blockRuns(items).reduce((n, r) => n + items.slice(r.start, r.end + 1).filter((i) => has(i.exerciseId)).reduce((m, i) => m + (i.reps ? repsSeconds(i.reps) : i.seconds), 0) * r.rounds, 0);
}

/** Identificador nuevo para una serie. */
export function newSeriesId(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Ejercicios en los que se pide el peso (los que usan mancuerna). */
/** Material con peso: mancuernas, pesa rusa o barra con discos (se pide con cuántos kilos). */
const WEIGHT_EQUIP = ['mancuernas', 'kettlebell', 'barra'] as const;

export function usesWeight(ex: Pick<ExerciseDef, 'motion' | 'equip'>): boolean {
  return !!ex.motion.db || !!ex.equip?.some((alts) => alts.every((a) => (WEIGHT_EQUIP as readonly string[]).includes(a)));
}

/** Con qué peso se hace: barra con discos, pesa rusa o mancuernas. */
export type WeightKind = 'mancuernas' | 'kettlebell' | 'barra';
export function weightKind(ex: Pick<ExerciseDef, 'motion' | 'equip'>): WeightKind {
  const all = (ex.equip ?? []).flat();
  if (all.includes('barra')) return 'barra';
  if (all.includes('kettlebell') && !all.includes('mancuernas')) return 'kettlebell';
  return 'mancuernas';
}

/** Cómo se cuenta el peso: por mancuerna, la pesa rusa o la barra entera (con discos). */
export function weightUnit(ex: Pick<ExerciseDef, 'motion' | 'equip'>): string {
  const all = (ex.equip ?? []).flat();
  if (all.includes('barra')) return 'barra con discos (total)';
  if (all.includes('kettlebell') && !all.includes('mancuernas')) return 'pesa rusa';
  return 'por mancuerna';
}

/** La rutina guarda los ejercicios elegidos de cada apartado en el orden en que se marcaron. */
export type Routine = Record<SectionId, RoutineItem[]>;

export const FIGURE_STYLES = ['real', 'toon', 'pieces'] as const;
export type FigureStyle = (typeof FIGURE_STYLES)[number];

/** Música de otras apps mientras habla la app. */
export type MusicMode = 'pause' | 'duck' | 'off';

export interface Settings {
  /** Pausa entre ejercicios de cada apartado (s). */
  rest: Record<SectionId, number>;
  /** Duración propuesta al marcar un ejercicio (s). */
  defaultSeconds: number;
  /** Cuenta atrás antes del primer ejercicio de cada apartado (s). */
  sectionCountdown: number;
  sound: boolean;
  voice: boolean;
  /** Mostrar la frase motivadora del día en Inicio. */
  phrases: boolean;
  /** Decir "3, 2, 1" por voz al final de cada ejercicio, pausa y cuenta atrás. */
  voiceCount: boolean;
  /** Voz elegida para los avisos (identificador de la voz del móvil); sin ella, la del sistema para el idioma. */
  voiceId?: string;
  /** App Android: bajar la música de otras apps (Spotify, radio...) mientras la app habla o pita. */
  duckMusic: boolean;
  /** App Android: qué hace la música de otras apps cuando habla la app: se baja (de serie; y la voz suena más alta),
   *  se pausa o no cambia. Sustituye a duckMusic (que se deja por los datos antiguos). */
  musicMode: MusicMode;
  /** Al empezar, preguntar por el reloj (pulsaciones) si no está conectado. */
  askWatch: boolean;
  /** Al empezar, preguntar si quieres música (abrir Spotify o la app de música). */
  askMusic: boolean;
  /** App Android: la app de música elegida la última vez (paquete), para ponerla la primera y abrirla con el botón de música. */
  musicApp?: string;
  /** Datos personales para calcular las calorías. */
  /** Aspecto del muñeco (Configuración › Personaliza el muñeco). */
  look?: Partial<import('../figure/look').Look>;
  /** Orden de la lista de ejercicios de cada apartado. */
  listSort?: 'zona' | 'musculo' | 'material' | 'az' | 'personalizada';
  profile: Profile;
  /** Idioma de la app. */
  lang: 'ca' | 'es' | 'en' | 'gl' | 'eu';
  /** Tema de la interfaz. */
  theme: 'dark' | 'light' | 'auto';
  /** Tema de color (Configuración › Pantalla): «blau» es el de siempre. */
  colorTheme?: string;
  /** Guardar los entrenamientos y el peso en Health Connect (app de Android). */
  healthConnect?: boolean;
  /** Estilo del maniquí: realista, dibujo (tonos planos y contorno) o de piezas simples. */
  figureStyle: FigureStyle;
  /** Material que tiene el usuario (los ejercicios sin material se ven siempre). */
  equipment: Equip[];
  /** Ángulo elegido para ver cada ejercicio (grados de giro respecto al de siempre). */
  angles?: Record<string, number>;
  /** Versión de los ángulos predeterminados con la que están calculados los de «angles». */
  anglesVer?: number;
  /** Recordatorios en el móvil (entrenar, pesarse y copia de seguridad). */
  reminders?: Partial<import('./reminders').ReminderSettings>;
  /** Metas de la semana en Inicio: minutos y calorías (null = lo de la semana pasada). */
  weekGoals: { minutes: number; kcal: number | null };
}

export const SEXES = ['h', 'm', 'x', 'n'] as const;
export type Sex = (typeof SEXES)[number];
/** Botones del sexo (en Mis datos y en la bienvenida). */
export const SEX_LABELS: Record<Sex, string> = { h: 'Hombre', m: 'Mujer', x: 'LGTBIQ+', n: 'Nada' };

export interface Profile {
  /** Nombre o alias con el que la app se dirige al usuario. */
  name?: string;
  age: number | null;
  /** cm */
  height?: number | null;
  /** Solo en datos antiguos: ahora el peso se anota en el histórico de peso. */
  weight?: number | null;
  /** h = hombre, m = mujer, x = LGTBIQ+, n = nada (sin indicar) */
  sex: Sex;
  /** Peso al que se quiere llegar (kg). */
  goalKg?: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  anglesVer: DEFAULT_ANGLES_VER,
  rest: { calentamiento: 5, pesas: 5, abdominales: 5, estiramientos: 5 },
  defaultSeconds: 30,
  sectionCountdown: 10,
  sound: true,
  voice: true,
  phrases: true,
  voiceCount: true,
  duckMusic: true,
  musicMode: 'duck',
  askWatch: true,
  askMusic: true,
  profile: { age: null, height: null, sex: 'h' },
  lang: 'ca',
  theme: 'light',
  figureStyle: 'pieces',
  equipment: [],
  weekGoals: { minutes: 150, kcal: null },
};

export interface HistoryEntry {
  /** Fecha y hora de inicio (ISO). */
  date: string;
  /** Tiempo real empleado (s), sin las pausas (desde esta versión). */
  durationSec: number;
  /** Tiempo en pausa (s): solo para saber la hora de fin. */
  pausedSec?: number;
  exercisesDone: number;
  exercisesPlanned: number;
  sections: SectionId[];
  completed: boolean;
  /** Nombre de la tabla con la que se hizo. */
  routineName?: string;
  /** Tabla con la que se hizo. */
  routineId?: string;
  /** Calorías calculadas al terminar, con el peso de ese día (no cambian si luego cambia el peso). */
  kcal?: number;
  kcalMethod?: 'pulso' | 'estimado';
  /** Peso con el que se calcularon (kg). */
  weightKg?: number;
  /** Pulsaciones del reloj (si estaba conectado): media, máxima y una muestra cada 5 s. */
  heart?: HeartSummary;
  /** Cuándo empezó cada bloque (segundos desde el inicio, reloj real): para marcarlo en la gráfica del pulso. */
  blocks?: Array<{ section: SectionId; at: number }>;
  /** Detalle por ejercicio (solo en entrenamientos guardados desde esta versión). */
  items?: Array<{ exerciseId: string; section: SectionId; planned: number; seconds: number; completed: boolean; weight?: number; reps?: number }>;
}

/** Una anotación del peso corporal. */
export interface WeightEntry {
  /** Fecha (ISO). */
  date: string;
  kg: number;
}

export interface HeartSummary {
  avg: number;
  max: number;
  min: number;
  /** Pulso cada 5 s durante el entrenamiento. */
  samples: number[];
  /** Segundo de cada muestra desde el inicio (reloj real, con las pausas). Sin esto (entrenamientos antiguos), cada 5 s. */
  times?: number[];
}

/** Resumen de pulsaciones a partir de las muestras (null si no hay). */
export function summarizeHeart(samples: readonly number[], times?: readonly number[]): HeartSummary | null {
  const keep = samples.map((_b, i) => i).filter((i) => samples[i] > 30 && samples[i] < 230).slice(0, 1500);
  const ok = keep.map((i) => samples[i]);
  if (!ok.length) return null;
  return {
    avg: Math.round(ok.reduce((a, b) => a + b, 0) / ok.length),
    max: Math.max(...ok),
    min: Math.min(...ok),
    samples: ok,
    ...(times && times.length === samples.length ? { times: keep.map((i) => times[i]) } : {}),
  };
}

/** Una tabla de ejercicios guardada con nombre. */
export interface SavedRoutine {
  id: string;
  name: string;
  routine: Routine;
  createdAt: string;
  /** Última vez que se entrenó con ella (ISO). */
  lastUsed?: string;
  /** Vueltas de cada apartado (1 si no se indica). */
  rounds?: Partial<Record<SectionId, number>>;
  /** Grupo en el que está (en «Mis tablas»), si se ha movido a uno. */
  group?: string;
  /** Orden de los bloques (si no está, el de siempre: calentamiento, fuerza, abdominales, estiramientos). */
  order?: SectionId[];
  /**
   * Tabla libre: una sola lista sin bloques (ejercicios de cualquier tipo, descansos y series que se repiten).
   * Si está, el entrenamiento sale de aquí; `routine` es solo un reflejo por tipos (para contar y dibujar la barra).
   */
  free?: FreeNode[];
}

/** Un ejercicio o un descanso de una tabla libre. */
export type FreeEntry = { kind: 'ex'; exerciseId: string; seconds: number; weight?: number; reps?: number; repsSaved?: number } | { kind: 'rest'; seconds: number };
/** Serie de una tabla libre: unos ejercicios (y descansos) que se repiten `rounds` veces seguidas. */
export interface FreeGroup { kind: 'group'; rounds: number; items: FreeEntry[] }
export type FreeNode = FreeEntry | FreeGroup;

/** Todos los ejercicios y descansos de una tabla libre, en orden (las series, una sola vez). */
export function freeEntries(free: readonly FreeNode[]): FreeEntry[] {
  return free.flatMap((n) => (n.kind === 'group' ? n.items : [n]));
}

/** Reflejo por tipos de una tabla libre (cada ejercicio en su apartado), para contar y para la barra de colores. */
export function freeToRoutine(free: readonly FreeNode[], sectionOf: (id: string) => SectionId | undefined): Routine {
  const r = emptyRoutine();
  for (const e of freeEntries(free)) {
    if (e.kind !== 'ex') continue;
    const s = sectionOf(e.exerciseId);
    if (s) r[s].push({ exerciseId: e.exerciseId, seconds: e.seconds, ...(e.weight ? { weight: e.weight } : {}), ...(e.reps ? { reps: e.reps } : {}) });
  }
  return r;
}

/** Pasa una tabla por bloques a libre: los bloques en su orden; uno con vueltas, como una serie. */
export function routineToFree(routine: Routine, rounds: Partial<Record<SectionId, number>> = {}, order?: readonly SectionId[]): FreeNode[] {
  const out: FreeNode[] = [];
  const entry = (i: RoutineItem): FreeEntry => ({ kind: 'ex', exerciseId: i.exerciseId, seconds: i.seconds, ...(i.weight ? { weight: i.weight } : {}), ...(i.reps ? { reps: i.reps } : {}) });
  for (const s of sectionOrder(order)) {
    const its = routine[s];
    if (!its.length) continue;
    const R = Math.round(rounds[s] ?? 1);
    const runs = blockRuns(its);
    if (R > 1) {
      // el bloque entero es una serie; sus series de dentro, con los ejercicios repetidos (no hay series dentro de series)
      out.push({ kind: 'group', rounds: R, items: runs.flatMap((r) => Array.from({ length: r.rounds }, () => its.slice(r.start, r.end + 1).map(entry)).flat()) });
    } else {
      for (const r of runs) {
        const part = its.slice(r.start, r.end + 1).map(entry);
        if (r.id && r.rounds > 1) out.push({ kind: 'group', rounds: r.rounds, items: part });
        else out.push(...part);
      }
    }
  }
  return out;
}

/** Grupo de tablas en «Mis tablas». */
export interface TableGroup {
  id: string;
  name: string;
}

export function emptyRoutine(): Routine {
  return { calentamiento: [], pesas: [], abdominales: [], estiramientos: [] };
}

/** Repeticiones: lo que se propone al pasar un ejercicio a repeticiones, y los límites. */
export const DEFAULT_REPS = 12;
export const MIN_REPS = 1;
export const MAX_REPS = 100;
/** Segundos que se calculan por repetición para estimar lo que dura (por lado en los ejercicios por lados). */
export const SECONDS_PER_REP = 3;

/** Ejercicios que se aguantan quietos (isométricos): solo por tiempo. */
const TIME_ONLY = new Set(['sentadilla-isometrica-en-la-pared', 'sentadilla-en-pared-con-fitball', 'plancha-lateral', 'plancha-frontal',
  'barquita-hollow-hold', 'plancha-con-antebrazos-en-fitball']);

/** ¿Se puede hacer por repeticiones? Los estiramientos y los que se aguantan quietos, solo por tiempo. */
export function allowsReps(ex: Pick<ExerciseDef, 'id' | 'section'>): boolean {
  return ex.section !== 'estiramientos' && !TIME_ONLY.has(ex.id);
}

/** Segundos estimados de un ejercicio por repeticiones. */
export function repsSeconds(reps: number, oneSided = false): number {
  return Math.round(reps * SECONDS_PER_REP * (oneSided ? 2 : 1));
}
