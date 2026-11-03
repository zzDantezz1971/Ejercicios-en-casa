import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES } from '../../domain/types';
import type { App, Screen } from '../App';
import { clear, h, humanDuration, plural } from '../dom';
import { HistoryScreen } from './HistoryScreen';
import { RoutineScreen } from './RoutineScreen';
import { SettingsScreen } from './SettingsScreen';
import { TablesScreen } from './TablesScreen';
import { WorkoutScreen } from './WorkoutScreen';

export class HomeScreen implements Screen {
  readonly el = h('main', { class: 'screen home' });

  constructor(private readonly app: App) {}

  enter(): void {
    this.render();
  }

  private render(): void {
    const { app } = this;
    const plan = WorkoutPlan.build(app.store.routine, app.catalog, app.store.settings);
    const last = app.store.history[0];
    clear(this.el);

    const rows = SECTION_IDS.map((s) => {
      const items = app.store.routine[s].filter((i) => app.catalog.has(i.exerciseId));
      const secs = items.reduce((n, i) => n + i.seconds, 0);
      return h('li', { class: items.length ? '' : 'empty' },
        h('span', { class: 'sec-name' }, SECTION_TITLES[s]),
        h('span', { class: 'sec-meta' }, items.length ? `${plural(items.length, 'ejercicio', 'ejercicios')} · ${humanDuration(secs)}` : 'Sin ejercicios'));
    });

    this.el.append(
      h('header', { class: 'home-head' },
        h('h1', {}, 'Ejercicios en casa'),
        h('p', { class: 'muted' }, last ? `Último entrenamiento: ${formatDate(last.date)}` : 'Prepara tu rutina y empieza cuando quieras.')),
      h('section', { class: 'card routine-card' },
        h('div', { class: 'active-routine' },
          h('span', { class: 'label' }, 'Tabla'),
          h('h2', {}, app.store.active.name)),
        h('div', { class: 'routine-total' },
          h('span', { class: 'big' }, plan.isEmpty ? '—' : humanDuration(plan.estimatedSeconds)),
          h('span', { class: 'muted' }, plan.isEmpty ? 'Rutina vacía' : plural(plan.exerciseCount, 'ejercicio', 'ejercicios'))),
        h('ul', { class: 'section-list' }, ...rows),
        h('button', { class: 'btn primary block', disabled: plan.isEmpty, onclick: () => this.start(plan) }, 'Empezar'),
        h('button', { class: 'btn ghost block', onclick: () => app.push(new RoutineScreen(app)) }, plan.isEmpty ? 'Elegir ejercicios' : 'Editar tabla'),
        h('button', { class: 'btn ghost block', onclick: () => app.push(new TablesScreen(app)) },
          app.store.routines.length > 1 ? `Cambiar de tabla (${app.store.routines.length})` : 'Mis tablas')),
      h('nav', { class: 'home-nav' },
        h('button', { class: 'btn ghost', onclick: () => app.push(new HistoryScreen(app)) }, 'Historial'),
        h('button', { class: 'btn ghost', onclick: () => app.push(new SettingsScreen(app)) }, 'Ajustes')),
    );
  }

  private start(plan: WorkoutPlan): void {
    // El sonido y la voz solo se activan desde un toque del usuario.
    this.app.sounds.unlock();
    this.app.voice.unlock();
    this.app.push(new WorkoutScreen(this.app, plan, this.app.store.active));
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 864e5);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (same(d, today)) return `hoy a las ${time}`;
  if (same(d, yesterday)) return `ayer a las ${time}`;
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
