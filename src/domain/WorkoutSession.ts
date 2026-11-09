import { Emitter } from './Emitter';
import { SWITCH_PAUSE, SWITCH_TOTAL, type Step, type WorkoutPlan } from './WorkoutPlan';
import type { SectionId } from './types';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'waiting' | 'finished';

export type Cue =
  | { type: 'count'; n: number; side?: boolean } // 3, 2, 1 (side: cuenta atrás del cambio de lado)
  | { type: 'start' } // empieza un ejercicio
  | { type: 'end' } // termina un ejercicio
  | { type: 'switch' } // cambio de lado: el tiempo se para
  | { type: 'go' }; // acaba la cuenta atrás del cambio de lado y sigue el tiempo

/** Lo que se hizo de cada ejercicio de la rutina. */
export interface ExerciseLog {
  exerciseId: string;
  section: SectionId;
  /** Duración prevista (s). */
  planned: number;
  /** Tiempo realmente hecho (s). */
  seconds: number;
  /** Se llegó al final de su tiempo. */
  completed: boolean;
  /** Peso por mancuerna (kg). */
  weight?: number;
}

export interface SessionSummary {
  /** Detalle por ejercicio, en el orden de la rutina. */
  items: ExerciseLog[];
  startedAt: Date;
  durationSec: number;
  exercisesDone: number;
  exercisesPlanned: number;
  sections: SectionId[];
  completed: boolean;
}

export interface TickInfo {
  step: Step;
  elapsed: number;
  remaining: number;
  duration: number;
  /** Durante el cambio de lado: segundos que quedan de su cuenta atrás (3 mientras se anuncia). */
  switching?: number;
  /** Durante el cambio de lado: aún se está anunciando, la cuenta atrás no ha empezado. */
  announcing?: boolean;
}

type Events = {
  step: { index: number; step: Step };
  tick: TickInfo;
  cue: Cue;
  status: SessionStatus;
  finished: SessionSummary;
};

/**
 * Máquina de estados del entrenamiento. No sabe nada de pantallas:
 * se le pide `tick()` periódicamente y avisa con eventos.
 * El reloj se inyecta para poder probarla sin esperar tiempo real.
 */
export class WorkoutSession extends Emitter<Events> {
  private index = -1;
  private stepStart = 0;
  private pausedAt: number | null = null;
  private pausedTotal = 0;
  private lastCount = Infinity;
  private switched = false;
  private sideCount = Infinity;
  private resumed = false;
  private startedAtMs = 0;
  private startedAt = new Date();
  private done = new Set<number>();
  /** Segundos hechos en cada paso de ejercicio (índice → s). */
  private worked = new Map<number, number>();
  private _status: SessionStatus = 'idle';

  constructor(
    readonly plan: WorkoutPlan,
    private readonly now: () => number = () => performance.now(),
  ) {
    super();
  }

  get status(): SessionStatus {
    return this._status;
  }
  get currentIndex(): number {
    return this.index;
  }
  get current(): Step | undefined {
    return this.plan.steps[this.index];
  }

  start(): void {
    if (this._status !== 'idle' || this.plan.isEmpty) return;
    this.startedAtMs = this.now();
    this.startedAt = new Date();
    this.goTo(0);
  }

  pause(): void {
    if (this._status !== 'running') return;
    this.pausedAt = this.now();
    this.setStatus('paused');
  }

  resume(): void {
    if (this._status !== 'paused' || this.pausedAt === null) return;
    this.pausedTotal += this.now() - this.pausedAt;
    this.pausedAt = null;
    this.setStatus('running');
  }

  togglePause(): void {
    if (this._status === 'running') this.pause();
    else if (this._status === 'paused') this.resume();
  }

  /** Continúa tras la espera entre apartados. */
  continue(): void {
    if (this._status === 'waiting') this.goTo(this.index + 1);
  }

  /** Salta al siguiente ejercicio (sin pasar por la pausa). */
  next(): void {
    if (this._status === 'idle' || this._status === 'finished') return;
    const step = this.current;
    if (step?.kind === 'sectionBreak') return this.continue();
    let i = this.index + 1;
    if (step?.kind === 'exercise' && this.plan.steps[i]?.kind === 'rest') i++;
    this.goTo(i);
  }

  /** Vuelve al ejercicio anterior; si no lo hay, reinicia el paso actual. */
  previous(): void {
    if (this._status === 'idle' || this._status === 'finished') return;
    for (let i = this.index - 1; i >= 0; i--) {
      if (this.plan.steps[i].kind === 'exercise') return this.goTo(i);
    }
    this.goTo(this.index);
  }

  /** Termina antes de tiempo. */
  stop(): void {
    if (this._status === 'idle' || this._status === 'finished') return;
    this.finish(false);
  }

  /** Avanza el reloj: comprueba avisos y cambia de paso cuando se acaba el tiempo. */
  tick(): void {
    if (this._status !== 'running') return;
    const step = this.current;
    if (!step || step.kind === 'sectionBreak') return;
    const raw = (this.now() - this.stepStart - this.pausedTotal) / 1000;
    const switchAt = step.kind === 'exercise' ? step.switchAt : undefined;

    // cambio de lado: a mitad de tiempo se para el reloj y hay una cuenta atrás de 3 s
    if (switchAt !== undefined && raw >= switchAt) {
      if (!this.switched) {
        this.switched = true;
        this.emit('cue', { type: 'switch' });
      }
      const left = switchAt + SWITCH_TOTAL - raw;
      if (left > 0) {
        const announcing = left > SWITCH_PAUSE;
        const n = Math.ceil(Math.min(left, SWITCH_PAUSE));
        if (!announcing && n < this.sideCount) {
          this.emit('cue', { type: 'count', n, side: true });
          this.sideCount = n;
        }
        this.emit('tick', { step, elapsed: switchAt, remaining: step.seconds - switchAt, duration: step.seconds, switching: Math.min(left, SWITCH_PAUSE), announcing });
        return;
      }
      if (!this.resumed) {
        this.resumed = true;
        this.emit('cue', { type: 'go' });
      }
    }
    const elapsed = this.effective(step, raw);
    const remaining = Math.max(0, step.seconds - elapsed);

    const whole = Math.ceil(remaining);
    if (whole < this.lastCount) {
      if (whole >= 1 && whole <= 3) this.emit('cue', { type: 'count', n: whole });
      this.lastCount = whole;
    }
    this.emit('tick', { step, elapsed: Math.min(elapsed, step.seconds), remaining, duration: step.seconds });

    if (remaining <= 0) {
      if (step.kind === 'exercise') {
        this.done.add(this.index);
        this.worked.set(this.index, step.seconds);
        this.emit('cue', { type: 'end' });
      }
      this.goTo(this.index + 1);
    }
  }

  /** Tiempo del paso sin contar el cambio de lado (anuncio + cuenta atrás). */
  private effective(step: Step, raw: number): number {
    const at = step.kind === 'exercise' ? step.switchAt : undefined;
    if (at === undefined || raw <= at) return raw;
    return Math.max(at, raw - SWITCH_TOTAL);
  }

  /** Guarda el tiempo hecho en el ejercicio actual antes de cambiar de paso. */
  private recordCurrent(): void {
    const step = this.current;
    if (!step || step.kind !== 'exercise' || this._status === 'idle') return;
    const pausedNow = this.pausedAt !== null ? this.now() - this.pausedAt : 0;
    const elapsed = Math.min(step.seconds, Math.max(0, this.effective(step, (this.now() - this.stepStart - this.pausedTotal - pausedNow) / 1000)));
    this.worked.set(this.index, Math.max(this.worked.get(this.index) ?? 0, elapsed));
  }

  private goTo(i: number): void {
    this.recordCurrent();
    if (i >= this.plan.steps.length) return this.finish(true);
    this.index = Math.max(0, i);
    this.stepStart = this.now();
    this.pausedAt = null;
    this.pausedTotal = 0;
    this.lastCount = Infinity;
    this.switched = false;
    this.sideCount = Infinity;
    this.resumed = false;
    const step = this.plan.steps[this.index];
    this.setStatus(step.kind === 'sectionBreak' ? 'waiting' : 'running');
    this.emit('step', { index: this.index, step });
    if (step.kind === 'exercise') this.emit('cue', { type: 'start' });
  }

  private finish(completed: boolean): void {
    if (!completed) this.recordCurrent();
    const items: ExerciseLog[] = [];
    this.plan.steps.forEach((st, i) => {
      if (st.kind !== 'exercise') return;
      items.push({
        exerciseId: st.exercise.id,
        section: st.section,
        planned: st.seconds,
        seconds: Math.round(this.worked.get(i) ?? 0),
        completed: this.done.has(i),
        ...(st.weight ? { weight: st.weight } : {}),
      });
    });
    const sections = new Set<SectionId>();
    this.done.forEach((i) => {
      const st = this.plan.steps[i];
      if (st.kind === 'exercise') sections.add(st.section);
    });
    this.setStatus('finished');
    this.emit('finished', {
      items,
      startedAt: this.startedAt,
      durationSec: Math.round((this.now() - this.startedAtMs) / 1000),
      exercisesDone: this.done.size,
      exercisesPlanned: this.plan.exerciseCount,
      sections: [...sections],
      completed,
    });
  }

  private setStatus(s: SessionStatus): void {
    if (s === this._status) return;
    this._status = s;
    this.emit('status', s);
  }
}
