import { allowsReps, blockRuns, freeEntries, repsSeconds, sectionOrder, type ExerciseDef, type FreeEntry, type FreeNode, type Routine, type SavedRoutine, type SectionId, type Settings } from './types';

/** Cambio de lado en los ejercicios por lados: con el tiempo parado, primero se anuncia
    («Cambio de lado») y luego hay una cuenta atrás de 3 s. */
export const SWITCH_ANNOUNCE = 2;
export const SWITCH_PAUSE = 3;
/** Segundos totales que el reloj está parado en el cambio de lado. */
export const SWITCH_TOTAL = SWITCH_ANNOUNCE + SWITCH_PAUSE;

/** Un paso del entrenamiento. La sesión recorre la lista de pasos en orden. */
export type Step =
  | { kind: 'countdown'; section: SectionId; seconds: number; next: ExerciseDef }
  | {
      kind: 'exercise';
      section: SectionId;
      exercise: ExerciseDef;
      seconds: number;
      /** Segundos transcurridos en los que se avisa del cambio de lado. */
      switchAt?: number;
      /** Posición dentro del apartado (1..total). */
      position: number;
      totalInSection: number;
      /** Peso por mancuerna (kg). */
      weight?: number;
      /** Vuelta actual y total de vueltas del apartado. */
      round: number;
      rounds: number;
      /** Por repeticiones: cuántas (por lado en los por lados). Sin cuenta atrás: se pasa al tocar «Hecho».
       *  `seconds` es entonces lo que se calcula que dura (para el tiempo estimado). */
      reps?: number;
      /** Serie dentro del bloque: vuelta de la serie, total, y si es su primer ejercicio. */
      set?: number;
      sets?: number;
      setStart?: boolean;
    }
  | { kind: 'rest'; section: SectionId; seconds: number; next: ExerciseDef }
  | { kind: 'sectionBreak'; finished: SectionId; next: SectionId };

export type Catalog = ReadonlyMap<string, ExerciseDef>;

export const MAX_ROUNDS = 10;

export function clampRounds(n: number | undefined): number {
  return Math.min(MAX_ROUNDS, Math.max(1, Math.round(n ?? 1)));
}

/** Convierte la rutina en la lista ordenada de pasos. */
export class WorkoutPlan {
  readonly steps: readonly Step[];
  /** De una tabla libre (sin bloques). */
  readonly free: boolean;

  private constructor(steps: Step[], free = false) {
    this.steps = steps;
    this.free = free;
  }

  /** `order`: orden de los bloques de la tabla (sin él, el de siempre). */
  static build(routine: Routine, catalog: Catalog, settings: Settings, rounds: Partial<Record<SectionId, number>> = {}, order?: readonly SectionId[]): WorkoutPlan {
    const steps: Step[] = [];
    let previous: SectionId | null = null;

    for (const section of sectionOrder(order)) {
      const items = routine[section]
        .map((item) => ({ item, ex: catalog.get(item.exerciseId) }))
        .filter((x): x is { item: (typeof routine)[SectionId][number]; ex: ExerciseDef } => !!x.ex && x.item.seconds > 0);
      if (items.length === 0) continue;

      if (previous) steps.push({ kind: 'sectionBreak', finished: previous, next: section });
      if (settings.sectionCountdown > 0) {
        steps.push({ kind: 'countdown', section, seconds: settings.sectionCountdown, next: items[0].ex });
      }
      const R = clampRounds(rounds[section]);
      const rest = settings.rest[section] ?? 0;
      // una vuelta del bloque: los ejercicios sueltos una vez y las series, sus vueltas seguidas
      type One = { item: (typeof items)[number]['item']; ex: ExerciseDef; position: number; set?: number; sets?: number; setStart?: boolean };
      const seq: One[] = [];
      const kept = items.map((x) => x.item);
      for (const run of blockRuns(kept)) {
        const part = items.slice(run.start, run.end + 1);
        for (let k = 1; k <= run.rounds; k++) {
          part.forEach(({ item, ex }, j) => seq.push({ item, ex, position: run.start + j + 1,
            ...(run.id && run.rounds > 1 ? { set: k, sets: run.rounds, setStart: j === 0 } : {}) }));
        }
      }
      for (let r = 1; r <= R; r++) {
        seq.forEach(({ item, ex, position, set, sets, setStart }, i) => {
          const reps = item.reps && allowsReps(ex) ? item.reps : undefined;
          steps.push({
            kind: 'exercise',
            section,
            exercise: ex,
            seconds: reps ? repsSeconds(reps, ex.oneSided) : item.seconds,
            ...(reps ? { reps } : {}),
            switchAt: ex.oneSided && !reps ? Math.round(item.seconds / 2) : undefined,
            position,
            totalInSection: items.length,
            weight: item.weight,
            round: r,
            rounds: R,
            ...(sets ? { set, sets, setStart } : {}),
          });
          const following = seq[i + 1] ?? (r < R ? seq[0] : undefined);
          if (following && rest > 0) {
            steps.push({ kind: 'rest', section, seconds: rest, next: following.ex });
          }
        });
      }
      previous = section;
    }
    return new WorkoutPlan(steps);
  }

  /** El plan de una tabla guardada (libre o por bloques). */
  static forTable(t: Pick<SavedRoutine, 'routine' | 'rounds' | 'order' | 'free'>, catalog: Catalog, settings: Settings): WorkoutPlan {
    return t.free ? WorkoutPlan.buildFree(t.free, catalog, settings) : WorkoutPlan.build(t.routine, catalog, settings, t.rounds ?? {}, t.order);
  }

  /**
   * Tabla libre: los ejercicios en el orden de la lista, sin bloques. Las series se repiten sus vueltas seguidas.
   * Entre dos ejercicios, la pausa corta de Ajustes (la del tipo del siguiente); donde hay un descanso, ese descanso.
   */
  static buildFree(free: readonly FreeNode[], catalog: Catalog, settings: Settings): WorkoutPlan {
    type Ex = { kind: 'ex'; item: Extract<FreeEntry, { kind: 'ex' }>; ex: ExerciseDef; position: number; round: number; rounds: number };
    type Rest = { kind: 'rest'; seconds: number };
    const ok = (e: FreeEntry): boolean => (e.kind === 'ex' ? !!catalog.get(e.exerciseId) && e.seconds > 0 : e.seconds > 0);
    // posición de cada ejercicio en la lista (las vueltas de una serie repiten la misma)
    const total = freeEntries(free).filter((e) => e.kind === 'ex' && ok(e)).length;
    let pos = 0;
    const seq: Array<Ex | Rest> = [];
    for (const n of free) {
      const items = n.kind === 'group' ? n.items.filter(ok) : ok(n) ? [n] : [];
      // una serie sin ejercicios no se hace (un descanso suelto, sí)
      if (n.kind === 'group' && !items.some((e) => e.kind === 'ex')) continue;
      const R = n.kind === 'group' ? clampRounds(n.rounds) : 1;
      const first = pos;
      for (let r = 1; r <= R; r++) {
        pos = first;
        for (const e of items) {
          if (e.kind === 'rest') { seq.push({ kind: 'rest', seconds: e.seconds }); continue; }
          pos++;
          seq.push({ kind: 'ex', item: e, ex: catalog.get(e.exerciseId)!, position: pos, round: r, rounds: R });
        }
      }
    }
    const steps: Step[] = [];
    const exs = seq.filter((x): x is Ex => x.kind === 'ex');
    if (!exs.length) return new WorkoutPlan(steps, true);
    if (settings.sectionCountdown > 0) steps.push({ kind: 'countdown', section: exs[0].ex.section, seconds: settings.sectionCountdown, next: exs[0].ex });
    const nextEx = (i: number): Ex | undefined => seq.slice(i + 1).find((x): x is Ex => x.kind === 'ex');
    seq.forEach((x, i) => {
      const next = nextEx(i);
      if (x.kind === 'rest') {
        // un descanso al final (sin nada después) no se hace
        if (next) steps.push({ kind: 'rest', section: next.ex.section, seconds: x.seconds, next: next.ex });
        return;
      }
      const reps = x.item.reps && allowsReps(x.ex) ? x.item.reps : undefined;
      steps.push({
        kind: 'exercise', section: x.ex.section, exercise: x.ex, seconds: reps ? repsSeconds(reps, x.ex.oneSided) : x.item.seconds,
        ...(reps ? { reps } : {}),
        switchAt: x.ex.oneSided && !reps ? Math.round(x.item.seconds / 2) : undefined,
        position: x.position, totalInSection: total, weight: x.item.weight, round: x.round, rounds: x.rounds,
      });
      // pausa corta hasta el siguiente ejercicio (si no viene un descanso)
      const after = seq[i + 1];
      const gap = settings.rest[next?.ex.section ?? x.ex.section] ?? 0;
      if (next && after?.kind === 'ex' && gap > 0) steps.push({ kind: 'rest', section: next.ex.section, seconds: gap, next: next.ex });
    });
    return new WorkoutPlan(steps, true);
  }

  get isEmpty(): boolean {
    return this.steps.length === 0;
  }

  /** Ejercicios que se hacen en total (con las vueltas y las series, cada vez cuenta). */
  /** ¿Hay algún ejercicio por repeticiones? (entonces el tiempo es aproximado) */
  get hasReps(): boolean {
    return this.steps.some((s) => s.kind === 'exercise' && !!s.reps);
  }

  get exerciseCount(): number {
    return this.steps.filter((s) => s.kind === 'exercise').length;
  }

  /** Ejercicios distintos (cada uno una vez, aunque se repita). */
  get distinctCount(): number {
    return new Set(this.steps.flatMap((s) => (s.kind === 'exercise' ? [s.exercise.id] : []))).size;
  }

  /** El plan de un solo bloque de la tabla (con sus vueltas y series). */
  static forSection(routine: Routine, section: SectionId, catalog: Catalog, settings: Settings, rounds: Partial<Record<SectionId, number>> = {}): WorkoutPlan {
    const only = { calentamiento: [], pesas: [], abdominales: [], estiramientos: [], [section]: routine[section] } as Routine;
    return WorkoutPlan.build(only, catalog, settings, { [section]: rounds[section] });
  }

  /** Duración estimada en segundos (sin contar las esperas entre apartados). */
  get estimatedSeconds(): number {
    // los ejercicios por lados suman la cuenta atrás del cambio de lado
    return this.steps.reduce((sum, s) => sum + ('seconds' in s ? s.seconds : 0) + (s.kind === 'exercise' && s.switchAt !== undefined ? SWITCH_TOTAL : 0), 0);
  }
}
