import type { Equip } from './equipment';
/** Apartados de la rutina, en el orden en que se hacen. */
export const SECTION_IDS = ['calentamiento', 'pesas', 'abdominales', 'estiramientos'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  calentamiento: 'Calentamiento',
  pesas: 'Fuerza',
  abdominales: 'Abdominales',
  estiramientos: 'Estiramientos',
};

export type Badge = 'lumbar' | 'caution' | 'gentle';

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
  /** Mancuernas: en una mano, en las dos, o una sola cogida con las dos manos ('two'). */
  db?: 'L' | 'R' | 'both' | 'two';
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
  kb?: 'L' | 'R' | 'both';
  /** Manos cerradas en puño (golpes, guardia). */
  fist?: boolean;
  /** Barra con discos entre las dos manos. */
  bar?: boolean;
  /** Banda elástica: de las manos a los pies, entre las manos, entre rodillas o tobillos, o a un punto fijo (2D, en la postura inicial). */
  band?: 'feet' | 'hands' | 'knees' | 'ankles' | ((j: Record<string, [number, number]>) => [number, number]);
  /** Fitball: centro (2D) según las articulaciones de cada instante. */
  ball?: (j: Record<string, [number, number]>, pose: Record<string, number>) => [number, number];
  /** Comba entre las manos; su posición la da el ángulo `rp` de la postura (grados). */
  rope?: boolean;
  /** Rueda abdominal en las manos. */
  wheel?: boolean;
  /** Ángulo de cámara preferido en 3D (grados). */
  az?: number;
  el?: number;
}

export type PropOp =
  | { t: 'rect'; x: number; y: number; w: number; h: number; soft?: boolean; z?: number; dep?: number }
  | { t: 'line'; a: [number, number]; b: [number, number]; w: number; soft?: boolean; z?: number; dep?: number };

export interface PropHelpers {
  benchFlat(x1: number, x2: number, h?: number): PropOp[];
  line(a: [number, number], b: [number, number], w?: number, soft?: boolean): PropOp[];
  wall(x: number): PropOp[];
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
}

export interface RoutineItem {
  exerciseId: string;
  seconds: number;
  /** Peso por mancuerna (kg), solo en ejercicios con mancuerna. */
  weight?: number;
}

/** Ejercicios en los que se pide el peso (los que usan mancuerna). */
export function usesWeight(ex: Pick<ExerciseDef, 'motion' | 'equip'>): boolean {
  return !!ex.motion.db || !!ex.equip?.some((alts) => alts.length === 1 && alts[0] === 'mancuernas');
}

/** La rutina guarda los ejercicios elegidos de cada apartado en el orden en que se marcaron. */
export type Routine = Record<SectionId, RoutineItem[]>;

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
  /** Al empezar, preguntar por el reloj (pulsaciones) si no está conectado. */
  askWatch: boolean;
  /** Datos personales para calcular las calorías. */
  profile: Profile;
  /** Idioma de la app. */
  lang: 'ca' | 'es' | 'en';
  /** Tema de la interfaz. */
  theme: 'dark' | 'light' | 'auto';
  /** Material que tiene el usuario (los ejercicios sin material se ven siempre). */
  equipment: Equip[];
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
  rest: { calentamiento: 5, pesas: 5, abdominales: 5, estiramientos: 5 },
  defaultSeconds: 30,
  sectionCountdown: 10,
  sound: true,
  voice: true,
  phrases: true,
  voiceCount: true,
  askWatch: true,
  profile: { age: null, height: null, sex: 'h' },
  lang: 'ca',
  theme: 'dark',
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
  /** Detalle por ejercicio (solo en entrenamientos guardados desde esta versión). */
  items?: Array<{ exerciseId: string; section: SectionId; planned: number; seconds: number; completed: boolean; weight?: number }>;
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
}

/** Resumen de pulsaciones a partir de las muestras (null si no hay). */
export function summarizeHeart(samples: readonly number[]): HeartSummary | null {
  const ok = samples.filter((b) => b > 30 && b < 230);
  if (!ok.length) return null;
  return {
    avg: Math.round(ok.reduce((a, b) => a + b, 0) / ok.length),
    max: Math.max(...ok),
    min: Math.min(...ok),
    samples: ok.slice(0, 1500),
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
}

export function emptyRoutine(): Routine {
  return { calentamiento: [], pesas: [], abdominales: [], estiramientos: [] };
}
