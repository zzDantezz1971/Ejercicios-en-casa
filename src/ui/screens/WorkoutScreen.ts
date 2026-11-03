import type { Step, WorkoutPlan } from '../../domain/WorkoutPlan';
import { WorkoutSession, type SessionSummary } from '../../domain/WorkoutSession';
import { SECTION_TITLES, type ExerciseDef } from '../../domain/types';
import { FigureView } from '../../figure/FigureView';
import { Coach } from '../../services/Coach';
import type { App, Screen } from '../App';
import { confirmDialog, h, icon, mmss } from '../dom';
import { SummaryScreen } from './SummaryScreen';

/** Pantalla del entrenamiento en marcha. */
export class WorkoutScreen implements Screen {
  readonly el = h('main', { class: 'screen workout' });
  private session: WorkoutSession;
  private coach: Coach;
  private view: FigureView | null = null;
  private shownExercise: string | null = null;
  private timer = 0;
  private started = false;

  private ui = {
    section: h('span', { class: 'w-section' }),
    position: h('span', { class: 'w-position' }),
    canvas: h('canvas', { class: 'stage-canvas' }),
    phase: h('span', { class: 'w-phase' }),
    name: h('h2', { class: 'w-name' }),
    side: h('span', { class: 'w-side' }),
    time: h('div', { class: 'w-time', 'aria-live': 'off' }),
    bar: h('div', { class: 'w-bar-fill' }),
    next: h('p', { class: 'w-next' }),
    pause: h('button', { class: 'ctrl main', 'aria-label': 'Pausar' }),
    breakPanel: h('div', { class: 'w-break', hidden: true }),
  };

  constructor(private readonly app: App, plan: WorkoutPlan) {
    this.session = new WorkoutSession(plan);
    this.coach = new Coach(this.session, app.sounds, app.voice);
    const u = this.ui;
    u.pause.addEventListener('click', () => this.session.togglePause());
    this.el.append(
      h('header', { class: 'w-top' },
        h('button', { class: 'icon-btn', 'aria-label': 'Terminar', onclick: () => void this.askStop() }, '✕'),
        h('div', { class: 'w-where' }, u.section, u.position)),
      h('div', { class: 'stage' }, u.canvas, u.phase),
      h('section', { class: 'w-info' },
        h('div', { class: 'w-title' }, u.name, u.side),
        u.time,
        h('div', { class: 'w-bar' }, u.bar),
        u.next),
      h('nav', { class: 'w-controls' },
        h('button', { class: 'ctrl', 'aria-label': 'Anterior', onclick: () => this.session.previous() }, icon('prev'), h('span', {}, 'Anterior')),
        u.pause,
        h('button', { class: 'ctrl', 'aria-label': 'Saltar', onclick: () => this.session.next() }, icon('next'), h('span', {}, 'Saltar'))),
      u.breakPanel,
    );
    u.breakPanel.addEventListener('click', () => this.session.continue());

    this.session.on('step', ({ step }) => this.onStep(step));
    this.session.on('tick', (t) => this.onTick(t.remaining, t.elapsed, t.duration, t.step));
    this.session.on('status', (s) => this.onStatus(s));
    this.session.on('cue', (c) => {
      if (c.type === 'switch') this.ui.side.textContent = 'Lado 2';
    });
    this.session.on('finished', (s) => this.onFinished(s));
    this.onStatus('running');
  }

  enter(): void {
    void this.app.awake.enable();
    this.view ??= new FigureView(this.ui.canvas, firstExercise(this.session.plan.steps));
    this.view.start();
    if (!this.started) {
      this.started = true;
      this.session.start();
    }
    this.timer = window.setInterval(() => this.session.tick(), 100);
  }

  leave(): void {
    window.clearInterval(this.timer);
    this.view?.stop();
    void this.app.awake.disable();
  }

  dispose(): void {
    this.coach.dispose();
    this.app.voice.stop();
    this.view?.dispose();
    this.view = null;
  }

  async onBack(): Promise<boolean> {
    await this.askStop();
    return true;
  }

  private async askStop(): Promise<void> {
    if (this.session.status === 'finished') return;
    const wasRunning = this.session.status === 'running';
    this.session.pause();
    const ok = await confirmDialog('¿Terminar el entrenamiento? Se guardará en el historial lo que hayas hecho.', 'Terminar', 'Seguir');
    if (ok) this.session.stop();
    else if (wasRunning) this.session.resume();
  }

  private showFigure(ex: ExerciseDef): void {
    if (this.shownExercise === ex.id) return;
    this.shownExercise = ex.id;
    this.view?.setExercise(ex);
  }

  private onStep(step: Step): void {
    const u = this.ui;
    u.breakPanel.hidden = step.kind !== 'sectionBreak';
    this.el.dataset.phase = step.kind;
    u.side.textContent = '';
    switch (step.kind) {
      case 'countdown':
        u.section.textContent = SECTION_TITLES[step.section];
        u.position.textContent = 'Prepárate';
        u.phase.textContent = 'Prepárate';
        u.name.textContent = step.next.name;
        u.next.textContent = 'Primer ejercicio del apartado';
        this.showFigure(step.next);
        break;
      case 'exercise':
        u.section.textContent = SECTION_TITLES[step.section];
        u.position.textContent = `Ejercicio ${step.position} de ${step.totalInSection}`;
        u.phase.textContent = '';
        u.name.textContent = step.exercise.name;
        u.side.textContent = step.switchAt !== undefined ? 'Lado 1' : '';
        u.next.textContent = nextText(this.session.plan.steps, this.session.currentIndex);
        this.showFigure(step.exercise);
        this.view?.restart();
        break;
      case 'rest':
        u.position.textContent = 'Descanso';
        u.phase.textContent = 'Descanso';
        u.name.textContent = step.next.name;
        u.next.textContent = 'Siguiente ejercicio';
        this.showFigure(step.next);
        break;
      case 'sectionBreak':
        u.breakPanel.replaceChildren(
          h('div', { class: 'w-break-inner' },
            h('p', { class: 'w-break-done' }, `${SECTION_TITLES[step.finished]} terminado`),
            h('p', { class: 'w-break-next' }, `Siguiente: ${SECTION_TITLES[step.next]}`),
            h('p', { class: 'w-break-tap' }, 'Toca la pantalla para continuar')),
        );
        break;
    }
  }

  private onTick(remaining: number, elapsed: number, duration: number, step: Step): void {
    this.ui.time.textContent = step.kind === 'exercise' ? mmss(Math.ceil(remaining)) : String(Math.ceil(remaining));
    this.ui.bar.style.width = `${Math.min(100, (elapsed / duration) * 100)}%`;
  }

  private onStatus(s: string): void {
    const paused = s === 'paused';
    this.ui.pause.replaceChildren(icon(paused ? 'play' : 'pause'), h('span', {}, paused ? 'Seguir' : 'Pausa'));
    this.ui.pause.setAttribute('aria-label', paused ? 'Reanudar' : 'Pausar');
    this.el.classList.toggle('paused', paused);
    this.view?.freeze(paused);
  }

  private onFinished(s: SessionSummary): void {
    window.clearInterval(this.timer);
    if (s.exercisesDone > 0) {
      this.app.store.addHistory({
        date: s.startedAt.toISOString(),
        durationSec: s.durationSec,
        exercisesDone: s.exercisesDone,
        exercisesPlanned: s.exercisesPlanned,
        sections: s.sections,
        completed: s.completed,
      });
    }
    this.app.replace(new SummaryScreen(this.app, s));
  }
}

function firstExercise(steps: readonly Step[]): ExerciseDef {
  for (const s of steps) {
    if (s.kind === 'exercise') return s.exercise;
  }
  throw new Error('Rutina vacía');
}

function nextText(steps: readonly Step[], index: number): string {
  for (let i = index + 1; i < steps.length; i++) {
    const s = steps[i];
    if (s.kind === 'exercise') return `Siguiente: ${s.exercise.name}`;
    if (s.kind === 'sectionBreak') return `Después: ${SECTION_TITLES[s.next]}`;
  }
  return 'Último ejercicio';
}
