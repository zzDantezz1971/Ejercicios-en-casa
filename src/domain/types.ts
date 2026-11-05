/** Apartados de la rutina, en el orden en que se hacen. */
export const SECTION_IDS = ['calentamiento', 'pesas', 'abdominales', 'estiramientos'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TITLES: Record<SectionId, string> = {
  calentamiento: 'Calentamiento',
  pesas: 'Pesas',
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
  db?: 'L' | 'R' | 'both';
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
  /** Subgrupo dentro del apartado (solo estiramientos). */
  group?: string;
  /** Se hace primero con un lado y luego con el otro: aviso de cambio a mitad del tiempo. */
  oneSided?: boolean;
  badges?: Badge[];
  description?: ExerciseDescription;
  motion: MotionSpec;
  /** Texto que indica desde dónde se ve la figura, si no es de lado. */
  viewLabel?: string;
}

export interface RoutineItem {
  exerciseId: string;
  seconds: number;
  /** Peso por mancuerna (kg), solo en ejercicios con mancuerna. */
  weight?: number;
}

/** Ejercicios en los que se pide el peso (los que usan mancuerna). */
export function usesWeight(ex: Pick<ExerciseDef, 'motion'>): boolean {
  return !!ex.motion.db;
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
  /** Maniquí: 1 = de piezas (con expresiones), 2 = realista. */
  mannequin: 1 | 2;
  /** Al empezar, preguntar por el reloj (pulsaciones) si no está conectado. */
  askWatch: boolean;
  /** Datos personales para calcular las calorías. */
  profile: Profile;
}

export interface Profile {
  age: number | null;
  /** Solo en datos antiguos: ahora el peso se anota en el histórico de peso. */
  weight?: number | null;
  /** h = hombre, m = mujer */
  sex: 'h' | 'm';
}

export const DEFAULT_SETTINGS: Settings = {
  rest: { calentamiento: 5, pesas: 5, abdominales: 5, estiramientos: 5 },
  defaultSeconds: 30,
  sectionCountdown: 10,
  sound: true,
  voice: true,
  mannequin: 2,
  askWatch: true,
  profile: { age: null, sex: 'h' },
};

export interface HistoryEntry {
  /** Fecha y hora de inicio (ISO). */
  date: string;
  /** Tiempo real empleado (s). */
  durationSec: number;
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
}

export function emptyRoutine(): Routine {
  return { calentamiento: [], pesas: [], abdominales: [], estiramientos: [] };
}
