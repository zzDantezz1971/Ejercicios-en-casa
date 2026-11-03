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
}

/** La rutina guarda los ejercicios elegidos de cada apartado en el orden en que se marcaron. */
export type Routine = Record<SectionId, RoutineItem[]>;

export interface Settings {
  /** Pausa entre ejercicios (s). */
  restSeconds: number;
  /** Duración propuesta al marcar un ejercicio (s). */
  defaultSeconds: number;
  /** Cuenta atrás antes del primer ejercicio de cada apartado (s). */
  sectionCountdown: number;
  sound: boolean;
  voice: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  restSeconds: 5,
  defaultSeconds: 30,
  sectionCountdown: 10,
  sound: true,
  voice: true,
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
}

export function emptyRoutine(): Routine {
  return { calentamiento: [], pesas: [], abdominales: [], estiramientos: [] };
}
