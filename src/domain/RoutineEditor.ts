import { SECTION_IDS, type Routine, type SectionId } from './types';

export const MIN_SECONDS = 5;
export const MAX_SECONDS = 600;
export const STEP_SECONDS = 5;

/** Cambios sobre la rutina: marcar/desmarcar ejercicios y ajustar su duración. */
export class RoutineEditor {
  constructor(private routine: Routine) {}

  get value(): Routine {
    return this.routine;
  }

  /** Posición (1..n) del ejercicio en su apartado, o 0 si no está marcado. */
  position(section: SectionId, exerciseId: string): number {
    return this.routine[section].findIndex((i) => i.exerciseId === exerciseId) + 1;
  }

  seconds(section: SectionId, exerciseId: string): number | undefined {
    return this.routine[section].find((i) => i.exerciseId === exerciseId)?.seconds;
  }

  weight(section: SectionId, exerciseId: string): number | undefined {
    return this.routine[section].find((i) => i.exerciseId === exerciseId)?.weight;
  }

  /** Marca al final de la lista (con su peso, si lo tiene) o desmarca (los demás se renumeran solos). */
  toggle(section: SectionId, exerciseId: string, defaultSeconds: number, weight?: number): void {
    const list = this.routine[section];
    const pos = list.findIndex((i) => i.exerciseId === exerciseId);
    const item = { exerciseId, seconds: clamp(defaultSeconds), ...(weight ? { weight: cleanWeight(weight) } : {}) };
    this.routine = {
      ...this.routine,
      [section]: pos >= 0 ? list.filter((_, i) => i !== pos) : [...list, item],
    };
  }

  /** Cambia el peso por mancuerna (0 o nada = sin peso). */
  setWeight(section: SectionId, exerciseId: string, weight: number | undefined): void {
    this.routine = {
      ...this.routine,
      [section]: this.routine[section].map((i) => {
        if (i.exerciseId !== exerciseId) return i;
        const { weight: _w, ...rest } = i;
        return weight ? { ...rest, weight: cleanWeight(weight) } : rest;
      }),
    };
  }

  setSeconds(section: SectionId, exerciseId: string, seconds: number): void {
    this.routine = {
      ...this.routine,
      [section]: this.routine[section].map((i) => (i.exerciseId === exerciseId ? { ...i, seconds: clamp(seconds) } : i)),
    };
  }

  adjust(section: SectionId, exerciseId: string, delta: number): void {
    const s = this.seconds(section, exerciseId);
    if (s !== undefined) this.setSeconds(section, exerciseId, s + delta);
  }

  /** Cambia de sitio un ejercicio elegido (de la posición `from` a `to`, empezando en 0). */
  move(section: SectionId, from: number, to: number): void {
    const list = [...this.routine[section]];
    if (from < 0 || from >= list.length) return;
    const t = Math.max(0, Math.min(list.length - 1, to));
    const [item] = list.splice(from, 1);
    list.splice(t, 0, item);
    this.routine = { ...this.routine, [section]: list };
  }

  clearSection(section: SectionId): void {
    this.routine = { ...this.routine, [section]: [] };
  }

  get totalExercises(): number {
    return SECTION_IDS.reduce((n, s) => n + this.routine[s].length, 0);
  }
}

export const MAX_WEIGHT = 50;
export const WEIGHT_STEP = 0.5;

/** Peso en pasos de 0,5 kg entre 0,5 y 50. */
function cleanWeight(w: number): number {
  return Math.min(MAX_WEIGHT, Math.max(WEIGHT_STEP, Math.round(w / WEIGHT_STEP) * WEIGHT_STEP));
}

function clamp(s: number): number {
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(s)));
}
