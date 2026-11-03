import { SECTION_IDS, type ExerciseDef, type Routine, type SectionId, type Settings } from './types';

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
    }
  | { kind: 'rest'; section: SectionId; seconds: number; next: ExerciseDef }
  | { kind: 'sectionBreak'; finished: SectionId; next: SectionId };

export type Catalog = ReadonlyMap<string, ExerciseDef>;

/** Convierte la rutina en la lista ordenada de pasos. */
export class WorkoutPlan {
  readonly steps: readonly Step[];

  private constructor(steps: Step[]) {
    this.steps = steps;
  }

  static build(routine: Routine, catalog: Catalog, settings: Settings): WorkoutPlan {
    const steps: Step[] = [];
    let previous: SectionId | null = null;

    for (const section of SECTION_IDS) {
      const items = routine[section]
        .map((item) => ({ item, ex: catalog.get(item.exerciseId) }))
        .filter((x): x is { item: (typeof routine)[SectionId][number]; ex: ExerciseDef } => !!x.ex && x.item.seconds > 0);
      if (items.length === 0) continue;

      if (previous) steps.push({ kind: 'sectionBreak', finished: previous, next: section });
      if (settings.sectionCountdown > 0) {
        steps.push({ kind: 'countdown', section, seconds: settings.sectionCountdown, next: items[0].ex });
      }
      items.forEach(({ item, ex }, i) => {
        steps.push({
          kind: 'exercise',
          section,
          exercise: ex,
          seconds: item.seconds,
          switchAt: ex.oneSided ? Math.round(item.seconds / 2) : undefined,
          position: i + 1,
          totalInSection: items.length,
        });
        const following = items[i + 1];
        if (following && settings.restSeconds > 0) {
          steps.push({ kind: 'rest', section, seconds: settings.restSeconds, next: following.ex });
        }
      });
      previous = section;
    }
    return new WorkoutPlan(steps);
  }

  get isEmpty(): boolean {
    return this.steps.length === 0;
  }

  get exerciseCount(): number {
    return this.steps.filter((s) => s.kind === 'exercise').length;
  }

  /** Duración estimada en segundos (sin contar las esperas entre apartados). */
  get estimatedSeconds(): number {
    return this.steps.reduce((sum, s) => sum + ('seconds' in s ? s.seconds : 0), 0);
  }
}
