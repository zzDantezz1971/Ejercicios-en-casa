import type { SessionSummary } from '../../domain/WorkoutSession';
import { SECTION_TITLES } from '../../domain/types';
import type { App, Screen } from '../App';
import { h, humanDuration } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { backupCard, backupDue } from '../components/backupPrompt';

/** Resumen al terminar, con una pequeña celebración si se completó. */
export class SummaryScreen implements Screen {
  readonly el = h('main', { class: 'screen summary' });

  constructor(private readonly app: App, s: SessionSummary, tableName: string) {
    const win = s.completed;
    const confetti = win ? h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...Array.from({ length: 36 }, (_, i) => {
      const p = h('i', {});
      p.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
      p.style.setProperty('--d', `${(Math.random() * 0.8).toFixed(2)}s`);
      p.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
      p.style.setProperty('--c', ['var(--accent)', 'var(--sec-warm)', 'var(--sec-abs)', 'var(--sec-stretch)', '#FFFFFF'][i % 5]);
      return p;
    })) : null;

    this.el.append(
      ...(confetti ? [confetti] : []),
      h('div', { class: 'summary-card' },
        h('div', { class: 'trophy' + (win ? ' win' : '') }, icon(win ? 'trophy' : 'check')),
        h('h1', {}, win ? '¡Buen trabajo!' : s.exercisesDone ? '¡Bien hecho!' : 'Sin ejercicios completados'),
        h('p', { class: 'eyebrow' }, win ? 'Entrenamiento finalizado' : s.exercisesDone ? 'Entrenamiento finalizado antes de tiempo' : 'Entrenamiento terminado'),
        h('p', { class: 'muted' }, tableName),
        h('div', { class: 'stats' },
          stat('clock', humanDuration(s.durationSec), 'Tiempo'),
          stat('bolt', `${s.exercisesDone}/${s.exercisesPlanned}`, 'Ejercicios'),
          stat('target', String(s.sections.length), s.sections.length === 1 ? 'Apartado' : 'Apartados')),
        s.sections.length
          ? h('div', { class: 'summary-secs' }, ...s.sections.map((x) => {
              const c = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[x].icon), SECTION_TITLES[x]);
              c.style.setProperty('--sec', SECTION_STYLE[x].color);
              return c;
            }))
          : null,
        s.exercisesDone ? h('p', { class: 'muted small' }, 'Guardado en el historial.') : null,
        s.exercisesDone && backupDue(app) ? backupCard(app, { question: true }) : null,
        h('button', { class: 'btn primary block big', onclick: () => this.app.openTab('inicio') }, 'Volver al inicio')),
    );
  }

  onBack(): boolean {
    this.app.openTab('inicio');
    return true;
  }
}

function stat(ic: 'clock' | 'bolt' | 'target', value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label));
}
