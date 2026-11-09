import type { Step, WorkoutPlan } from '../../domain/WorkoutPlan';
import { WorkoutSession, type SessionSummary } from '../../domain/WorkoutSession';
import { SECTION_TITLES, summarizeHeart, type ExerciseDef, type HistoryEntry, type SavedRoutine, type SectionId } from '../../domain/types';
import { caloriesOf } from '../../domain/calories';
import { FigureView } from '../../figure/FigureView';
import { Coach } from '../../services/Coach';
import type { App, Screen } from '../App';
import { confirmDialog, h, kg, mmss, plural } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { SummaryScreen } from './SummaryScreen';

const NS = 'http://www.w3.org/2000/svg';
const RING_R = 52;
const RING_LEN = 2 * Math.PI * RING_R;

/** Pantalla del entrenamiento en marcha. */
export class WorkoutScreen implements Screen {
  readonly el = h('main', { class: 'screen workout' });
  private session: WorkoutSession;
  private coach: Coach;
  private view: FigureView | null = null;
  private shownExercise: string | null = null;
  private timer = 0;
  private started = false;
  private dotsFor: SectionId | null = null;
  private fadeTimer = 0;
  private pulsedAt = 0;
  /** Se está mostrando la cuenta atrás del cambio de lado. */
  private switchingShown = false;

  private ui = {
    secChip: h('span', { class: 'w-sec-chip' }),
    position: h('span', { class: 'w-position' }),
    dots: h('div', { class: 'w-dots' }),
    canvas: h('canvas', { class: 'stage-canvas' }),
    phase: h('span', { class: 'w-phase' }),
    name: h('h2', { class: 'w-name' }),
    side: h('span', { class: 'w-side' }),
    next: h('p', { class: 'w-next' }),
    time: document.createElementNS(NS, 'text'),
    ringFg: document.createElementNS(NS, 'circle'),
    pause: h('button', { class: 'ctrl main', 'aria-label': 'Pausar' }),
    breakPanel: h('div', { class: 'w-break', hidden: true }),
    hr: h('button', { class: 'hr-chip', type: 'button' }),
  };
  /** Pulso cada 5 s mientras el entrenamiento está en marcha. */
  private hrSamples: number[] = [];
  private hrLast = 0;
  private hrOff: (() => void) | null = null;

  constructor(private readonly app: App, plan: WorkoutPlan, private readonly table: SavedRoutine) {
    this.session = new WorkoutSession(plan);
    this.coach = new Coach(this.session, app.sounds, app.voice, app.haptics, { countdown: app.store.settings.voiceCount, name: app.store.settings.profile.name });
    const u = this.ui;
    u.pause.addEventListener('click', () => {
      app.haptics.tap();
      this.session.togglePause();
    });
    this.el.append(
      h('header', { class: 'w-top' },
        h('button', { class: 'icon-btn', 'aria-label': 'Terminar', onclick: () => void this.askStop() }, icon('close')),
        h('div', { class: 'w-where' }, u.secChip, u.position),
        h('span', { class: 'w-table muted small' }, table.name)),
      u.dots,
      h('div', { class: 'stage' }, u.canvas, u.phase, app.heart.available ? u.hr : null),
      h('section', { class: 'w-info' },
        this.ring(),
        h('div', { class: 'w-text' }, u.name, u.side, u.next)),
      h('nav', { class: 'w-controls' },
        h('button', { class: 'ctrl', 'aria-label': 'Anterior', onclick: () => { app.haptics.tap(); this.session.previous(); } }, icon('prev'), h('span', {}, 'Anterior')),
        u.pause,
        h('button', { class: 'ctrl', 'aria-label': 'Saltar', onclick: () => { app.haptics.tap(); this.session.next(); } }, icon('next'), h('span', {}, 'Saltar'))),
      u.breakPanel,
    );
    u.breakPanel.addEventListener('click', () => {
      app.haptics.tap();
      this.session.continue();
    });

    this.session.on('step', ({ step }) => this.onStep(step));
    this.session.on('tick', (t) => this.onTick(t.remaining, t.elapsed, t.duration, t.step, t.switching));
    this.session.on('status', (s) => this.onStatus(s));
    this.session.on('cue', (c) => {
      const step = this.session.current;
      if (c.type === 'switch' && step?.kind === 'exercise') {
        this.setSide(2);
        this.showFigure(step.exercise, 2);
      }
    });
    this.session.on('finished', (s) => this.onFinished(s));
    this.onStatus('running');
    u.hr.addEventListener('click', () => void this.connectHeart());
    this.hrOff = app.heart.onChange(() => this.paintHeart());
    this.paintHeart();
  }

  /** Anillo de progreso con el tiempo en el centro. */
  private ring(): SVGSVGElement {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 128 128');
    svg.setAttribute('class', 'w-ring');
    const bg = document.createElementNS(NS, 'circle');
    for (const [k, v] of Object.entries({ cx: '64', cy: '64', r: String(RING_R), class: 'ring-bg' })) bg.setAttribute(k, v);
    const fg = this.ui.ringFg;
    for (const [k, v] of Object.entries({ cx: '64', cy: '64', r: String(RING_R), class: 'ring-fg', 'stroke-dasharray': String(RING_LEN), 'stroke-dashoffset': String(RING_LEN), transform: 'rotate(-90 64 64)' })) fg.setAttribute(k, v);
    const t = this.ui.time;
    for (const [k, v] of Object.entries({ x: '64', y: '64', class: 'ring-time', 'text-anchor': 'middle', 'dominant-baseline': 'central' })) t.setAttribute(k, v);
    svg.append(bg, fg, t);
    return svg;
  }

  enter(): void {
    void this.app.awake.enable();
    this.view ??= new FigureView(this.ui.canvas, firstExercise(this.session.plan.steps));
    this.view.start();
    if (!this.started) {
      this.started = true;
      this.session.start();
    }
    this.timer = window.setInterval(() => {
      this.session.tick();
      this.sampleHeart();
    }, 100);
  }

  leave(): void {
    window.clearInterval(this.timer);
    this.view?.stop();
    void this.app.awake.disable();
  }

  dispose(): void {
    this.hrOff?.();
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

  /** Muestra el ejercicio; en los que van por lados, solo el lado que toca. */
  private showFigure(ex: ExerciseDef, side: 1 | 2 = 1): void {
    const s = ex.oneSided ? side : undefined;
    const key = `${ex.id}:${s ?? ''}`;
    if (this.shownExercise === key) return;
    const first = this.shownExercise === null;
    this.shownExercise = key;
    if (first || !this.view) {
      this.view?.setExercise(ex, s);
      return;
    }
    // fundido: el maniquí se desvanece, cambia de ejercicio y vuelve a aparecer
    const c = this.ui.canvas;
    c.classList.add('fading');
    window.clearTimeout(this.fadeTimer);
    this.fadeTimer = window.setTimeout(() => {
      this.view?.setExercise(ex, s);
      c.classList.remove('fading');
    }, 180);
  }

  private setSide(side: 0 | 1 | 2): void {
    const u = this.ui.side;
    u.replaceChildren();
    if (side) u.append(icon('sides'), `Lado ${side} de 2`);
  }

  private setSection(section: SectionId): void {
    const st = SECTION_STYLE[section];
    this.el.style.setProperty('--sec', st.color);
    this.ui.secChip.replaceChildren(icon(st.icon), SECTION_TITLES[section]);
  }

  /** Un punto por ejercicio del apartado: hechos, actual y pendientes. */
  private renderDots(section: SectionId, currentIndex: number): void {
    const steps = this.session.plan.steps;
    const idx = steps.map((s, i) => ({ s, i })).filter(({ s }) => s.kind === 'exercise' && s.section === section);
    if (this.dotsFor !== section || this.ui.dots.childElementCount !== idx.length) {
      this.dotsFor = section;
      this.ui.dots.replaceChildren(...idx.map(() => h('span', { class: 'dot' })));
    }
    idx.forEach(({ i }, k) => {
      const d = this.ui.dots.children[k] as HTMLElement;
      d.className = 'dot' + (i < currentIndex ? ' done' : i === currentIndex ? ' now' : '');
    });
  }

  private onStep(step: Step): void {
    const u = this.ui;
    u.breakPanel.hidden = step.kind !== 'sectionBreak';
    this.el.dataset.phase = step.kind;
    this.setSide(0);
    if (this.switchingShown) {
      this.switchingShown = false;
      this.el.classList.remove('switching');
      this.view?.freeze(false);
    }
    const index = this.session.currentIndex;
    switch (step.kind) {
      case 'countdown':
        this.setSection(step.section);
        this.renderDots(step.section, index);
        u.position.textContent = 'Prepárate';
        u.phase.replaceChildren(icon('hourglass'), 'Prepárate');
        u.name.textContent = step.next.name;
        u.next.textContent = 'Primer ejercicio del apartado';
        this.showFigure(step.next);
        this.view?.setMood('happy');
        break;
      case 'exercise':
        this.setSection(step.section);
        this.renderDots(step.section, index);
        u.position.textContent = `Ejercicio ${step.position} de ${step.totalInSection}` + (step.rounds > 1 ? ` · Vuelta ${step.round} de ${step.rounds}` : '');
        u.phase.replaceChildren();
        u.name.replaceChildren(step.exercise.name, step.weight ? h('span', { class: 'w-weight' }, icon('dumbbell'), kg(step.weight)) : '');
        if (step.switchAt !== undefined) this.setSide(1);
        u.next.textContent = nextText(this.session.plan.steps, index);
        this.showFigure(step.exercise, 1);
        this.view?.setMood(step.section === 'pesas' || step.section === 'abdominales' ? 'effort' : 'neutral');
        this.view?.restart();
        break;
      case 'rest':
        this.renderDots(step.section, index);
        u.position.textContent = 'Descanso';
        u.phase.replaceChildren(icon('rest'), 'Descanso');
        u.name.textContent = step.next.name;
        u.next.textContent = 'Prepárate para el siguiente';
        this.showFigure(step.next);
        this.view?.setMood('relaxed');
        break;
      case 'sectionBreak': {
        const done = SECTION_STYLE[step.finished], next = SECTION_STYLE[step.next];
        const count = this.session.plan.steps.filter((s) => s.kind === 'exercise' && s.section === step.next).length;
        const nextCard = h('div', { class: 'w-break-next' },
          h('span', { class: 'sec-icon big' }, icon(next.icon)),
          h('div', {}, h('span', { class: 'muted small' }, 'Siguiente apartado'), h('strong', {}, SECTION_TITLES[step.next]), h('span', { class: 'muted small' }, plural(count, 'ejercicio', 'ejercicios'))));
        nextCard.style.setProperty('--sec', next.color);
        const badge = h('span', { class: 'w-break-badge' }, icon('check'));
        badge.style.setProperty('--sec', done.color);
        u.breakPanel.replaceChildren(
          h('div', { class: 'w-break-inner' },
            badge,
            h('p', { class: 'w-break-done' }, `${SECTION_TITLES[step.finished]} completado`),
            nextCard,
            h('p', { class: 'w-break-tap' }, 'Toca la pantalla para continuar')),
        );
        break;
      }
    }
  }

  private onTick(remaining: number, elapsed: number, duration: number, step: Step, switching?: number): void {
    // cambio de lado: el tiempo está parado y el anillo muestra la cuenta atrás de 3 s
    const sw = switching !== undefined;
    if (sw !== this.switchingShown) {
      this.switchingShown = sw;
      this.el.classList.toggle('switching', sw);
      this.ui.phase.replaceChildren(...(sw ? [icon('sides'), 'Cambia de lado'] : []));
      this.view?.freeze(sw);
    }
    this.ui.time.textContent = sw ? String(Math.ceil(switching)) : step.kind === 'exercise' ? mmss(Math.ceil(remaining)) : String(Math.ceil(remaining));
    const k = Math.min(1, elapsed / duration);
    this.ui.ringFg.setAttribute('stroke-dashoffset', String(RING_LEN * (1 - k)));
    const left = sw ? switching : remaining;
    const last3 = left <= 3 && left > 0;
    this.el.classList.toggle('last3', last3);
    // un pulso del anillo con cada segundo de la cuenta atrás (final o del cambio de lado)
    const sec = Math.ceil(left) + (sw ? 100 : 0);
    if (last3 && sec !== this.pulsedAt) {
      this.pulsedAt = sec;
      const ring = this.ui.ringFg.ownerSVGElement;
      ring?.classList.remove('pulse');
      void ring?.getBoundingClientRect();
      ring?.classList.add('pulse');
    } else if (!last3) this.pulsedAt = 0;
  }

  private onStatus(s: string): void {
    const paused = s === 'paused';
    this.ui.pause.replaceChildren(icon(paused ? 'play' : 'pause'), h('span', {}, paused ? 'Seguir' : 'Pausa'));
    this.ui.pause.setAttribute('aria-label', paused ? 'Reanudar' : 'Pausar');
    this.el.classList.toggle('paused', paused);
    this.view?.freeze(paused || this.switchingShown);
  }

  /** Botón del pulso: conectar el reloj o mostrar las pulsaciones. */
  private paintHeart(): void {
    const hr = this.app.heart, b = this.ui.hr;
    const bpm = hr.current;
    b.className = 'hr-chip ' + hr.status + (bpm ? ' beat' : '');
    if (hr.status === 'on' && bpm) {
      b.replaceChildren(icon('heart'), h('strong', {}, String(bpm)), h('span', {}, 'ppm'));
      b.setAttribute('aria-label', `${bpm} pulsaciones por minuto`);
    } else if (hr.status === 'on') {
      b.replaceChildren(icon('heart'), h('span', {}, 'Esperando pulso…'));
      b.setAttribute('aria-label', 'Reloj conectado, esperando pulso');
    } else if (hr.status === 'connecting' || hr.status === 'lost') {
      b.replaceChildren(icon('heart'), h('span', {}, hr.status === 'lost' ? 'Reconectando…' : 'Conectando…'));
      b.setAttribute('aria-label', 'Conectando con el reloj');
    } else {
      b.replaceChildren(icon('heart'), h('span', {}, 'Conectar reloj'));
      b.setAttribute('aria-label', 'Conectar el reloj para ver las pulsaciones');
    }
  }

  private async connectHeart(): Promise<void> {
    const hr = this.app.heart;
    if (hr.status === 'on' || hr.status === 'connecting') return;
    try {
      await hr.connect();
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotFoundError' || name === 'AbortError') return; // se cerró la lista sin elegir
      const wasRunning = this.session.status === 'running';
      this.session.pause();
      await confirmDialog(`No se pudo conectar con el reloj. Comprueba que tiene activada la difusión de la frecuencia cardíaca y el Bluetooth del móvil encendido. (${(e as Error).message})`, 'Vale', '');
      if (wasRunning) this.session.resume();
    }
  }

  /** Guarda una muestra del pulso cada 5 s mientras se entrena. */
  private sampleHeart(): void {
    if (this.session.status !== 'running') return;
    const now = Date.now();
    if (now - this.hrLast < 5000) return;
    const bpm = this.app.heart.current;
    if (bpm) {
      this.hrSamples.push(bpm);
      this.hrLast = now;
    }
    this.paintHeart();
  }

  private onFinished(s: SessionSummary): void {
    window.clearInterval(this.timer);
    const heart = summarizeHeart(this.hrSamples);
    if (s.exercisesDone > 0) {
      const entry: HistoryEntry = {
        date: s.startedAt.toISOString(),
        durationSec: s.durationSec,
        exercisesDone: s.exercisesDone,
        exercisesPlanned: s.exercisesPlanned,
        sections: s.sections,
        completed: s.completed,
        routineName: this.table.name,
        routineId: this.table.id,
        items: s.items,
        ...(heart ? { heart } : {}),
      };
      // las calorías se guardan con el peso de hoy: no cambian si luego cambia el peso
      const weight = this.app.store.currentWeight;
      const kcal = caloriesOf(entry, { ...this.app.store.settings.profile, weight });
      if (kcal && weight) Object.assign(entry, { kcal: kcal.kcal, kcalMethod: kcal.method, weightKg: weight });
      this.app.store.addHistory(entry);
      this.app.store.markUsed(this.table.id, s.startedAt);
    }
    this.app.replace(new SummaryScreen(this.app, s, this.table.name, heart));
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
