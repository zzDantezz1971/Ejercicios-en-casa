import { Emitter } from './Emitter';
import type { Step, WorkoutPlan } from './WorkoutPlan';
import type { SectionId } from './types';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'waiting' | 'finished';

export type Cue =
  | { type: 'count'; n: number } // 3, 2, 1
  | { type: 'start' } // empieza un ejercicio
  | { type: 'end' } // termina un ejercicio
  | { type: 'switch' }; // cambio de lado

export interface SessionSummary {
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
  private startedAtMs = 0;
  private startedAt = new Date();
  private done = new Set<number>();
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
    const elapsed = (this.now() - this.stepStart - this.pausedTotal) / 1000;
    const remaining = Math.max(0, step.seconds - elapsed);

    const whole = Math.ceil(remaining);
    if (whole < this.lastCount) {
      if (whole >= 1 && whole <= 3) this.emit('cue', { type: 'count', n: whole });
      this.lastCount = whole;
    }
    if (step.kind === 'exercise' && step.switchAt !== undefined && !this.switched && elapsed >= step.switchAt) {
      this.switched = true;
      this.emit('cue', { type: 'switch' });
    }
    this.emit('tick', { step, elapsed: Math.min(elapsed, step.seconds), remaining, duration: step.seconds });

    if (remaining <= 0) {
      if (step.kind === 'exercise') {
        this.done.add(this.index);
        this.emit('cue', { type: 'end' });
      }
      this.goTo(this.index + 1);
    }
  }

  private goTo(i: number): void {
    if (i >= this.plan.steps.length) return this.finish(true);
    this.index = Math.max(0, i);
    this.stepStart = this.now();
    this.pausedAt = null;
    this.pausedTotal = 0;
    this.lastCount = Infinity;
    this.switched = false;
    const step = this.plan.steps[this.index];
    this.setStatus(step.kind === 'sectionBreak' ? 'waiting' : 'running');
    this.emit('step', { index: this.index, step });
    if (step.kind === 'exercise') this.emit('cue', { type: 'start' });
  }

  private finish(completed: boolean): void {
    const sections = new Set<SectionId>();
    this.done.forEach((i) => {
      const st = this.plan.steps[i];
      if (st.kind === 'exercise') sections.add(st.section);
    });
    this.setStatus('finished');
    this.emit('finished', {
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
