import type { SessionSummary } from '../../domain/WorkoutSession';
import { SECTION_TITLES } from '../../domain/types';
import type { App, Screen } from '../App';
import { h, humanDuration } from '../dom';
import { HomeScreen } from './HomeScreen';

export class SummaryScreen implements Screen {
  readonly el = h('main', { class: 'screen summary' });

  constructor(private readonly app: App, s: SessionSummary) {
    this.el.append(
      h('div', { class: 'summary-card' },
        h('p', { class: 'eyebrow' }, s.completed ? 'Entrenamiento completado' : 'Entrenamiento terminado antes'),
        h('h1', {}, s.completed ? '¡Buen trabajo!' : s.exercisesDone ? 'Bien hecho' : 'Sin ejercicios completados'),
        h('dl', { class: 'stats' },
          h('div', {}, h('dt', {}, 'Tiempo'), h('dd', {}, humanDuration(s.durationSec))),
          h('div', {}, h('dt', {}, 'Ejercicios'), h('dd', {}, `${s.exercisesDone} de ${s.exercisesPlanned}`))),
        s.sections.length ? h('p', { class: 'muted' }, s.sections.map((x) => SECTION_TITLES[x]).join(' · ')) : null,
        s.exercisesDone ? h('p', { class: 'muted' }, 'Guardado en el historial.') : null,
        h('button', { class: 'btn primary block', onclick: () => this.app.home(new HomeScreen(this.app)) }, 'Volver al inicio')),
    );
  }

  onBack(): boolean {
    this.app.home(new HomeScreen(this.app));
    return true;
  }
}
