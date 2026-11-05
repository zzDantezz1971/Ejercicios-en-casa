import { WorkoutPlan, clampRounds } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { addDays, dayKey, greeting, startOfWeek, streak, trainedDays, WEEKDAY_LETTERS } from '../dates';
import { clear, h, humanDuration, plural } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { RoutineScreen } from './RoutineScreen';
import { startWorkout } from '../components/startWorkout';

export class HomeScreen implements Screen {
  readonly el = h('main', { class: 'screen home' });
  readonly tab = 'inicio' as const;

  constructor(private readonly app: App) {}

  enter(): void {
    this.render();
  }

  private render(): void {
    const { app } = this;
    const table = app.store.active;
    const plan = WorkoutPlan.build(table.routine, app.catalog, app.store.settings, table.rounds);
    const now = new Date();
    clear(this.el);

    // Cabecera
    const date = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    this.el.append(
      h('header', { class: 'home-head' },
        h('p', { class: 'eyebrow' }, date),
        h('h1', {}, greeting(now))),
    );

    // Tarjeta principal con la tabla en uso
    const art = h('img', { class: 'hero-art', alt: '' });
    const first = plan.steps.find((s) => s.kind === 'exercise');
    if (first && first.kind === 'exercise') void app.thumbs.get(first.exercise).then((u) => (art.src = u));
    this.el.append(
      h('section', { class: 'hero' },
        art,
        h('div', { class: 'hero-body' },
          h('span', { class: 'hero-label' }, 'Tabla en uso'),
          h('h2', { class: 'hero-title' }, table.name),
          h('div', { class: 'chips' },
            h('span', { class: 'chip' }, icon('clock'), plan.isEmpty ? '—' : humanDuration(plan.estimatedSeconds)),
            h('span', { class: 'chip' }, icon('bolt'), plural(plan.exerciseCount, 'ejercicio', 'ejercicios'))),
          plan.isEmpty
            ? h('button', { class: 'btn light block big', onclick: () => app.push(new RoutineScreen(app)) }, icon('plus'), 'Elegir ejercicios')
            : h('button', { class: 'btn light block big', onclick: () => this.start(plan) }, icon('play'), 'Empezar'),
          h('div', { class: 'hero-actions' },
            h('button', { class: 'btn glass small', onclick: () => app.push(new RoutineScreen(app)) }, icon('edit'), 'Editar'),
            h('button', { class: 'btn glass small', onclick: () => app.openTab('tablas') }, icon('swap'), 'Cambiar tabla')))),
    );

    // Semana y racha
    const days = trainedDays(app.store.history);
    const monday = startOfWeek(now);
    const todayKey = dayKey(now);
    const run = streak(app.store.history, now);
    const weekCount = WEEKDAY_LETTERS.filter((_, i) => days.has(dayKey(addDays(monday, i)))).length;
    this.el.append(
      h('section', { class: 'card week' },
        h('div', { class: 'week-head' },
          h('div', {}, h('h3', {}, 'Esta semana'), h('p', { class: 'muted small' }, plural(weekCount, 'día entrenado', 'días entrenados'))),
          h('div', { class: 'streak' + (run ? ' on' : '') }, icon('flame'), h('strong', {}, String(run)), h('span', {}, run === 1 ? 'día seguido' : 'días seguidos'))),
        h('div', { class: 'week-days' },
          ...WEEKDAY_LETTERS.map((l, i) => {
            const d = addDays(monday, i), k = dayKey(d);
            return h('div', { class: 'wd' + (days.has(k) ? ' done' : '') + (k === todayKey ? ' today' : '') + (d > now ? ' future' : '') },
              h('span', { class: 'wd-letter' }, l),
              h('span', { class: 'wd-dot' }, days.has(k) ? icon('check') : String(d.getDate())));
          }))),
    );

    // Apartados de la tabla
    this.el.append(
      h('section', { class: 'sections' },
        h('h3', { class: 'block-title' }, 'Contenido de la tabla'),
        ...SECTION_IDS.map((s) => this.sectionRow(s))),
    );
  }

  private sectionRow(s: SectionId): HTMLElement {
    const items = this.app.store.routine[s].filter((i) => this.app.catalog.has(i.exerciseId));
    const R = clampRounds(this.app.store.active.rounds?.[s]);
    const secs = items.reduce((n, i) => n + i.seconds, 0) * R;
    const st = SECTION_STYLE[s];
    const row = h('button', { class: 'sec-row' + (items.length ? '' : ' empty'), onclick: () => this.app.push(new RoutineScreen(this.app, s)) },
      h('span', { class: 'sec-icon' }, icon(st.icon)),
      h('span', { class: 'sec-text' },
        h('strong', {}, SECTION_TITLES[s]),
        h('span', { class: 'muted small' }, items.length ? `${plural(items.length, 'ejercicio', 'ejercicios')}${R > 1 ? ` × ${R} vueltas` : ''} · ${humanDuration(secs)}` : 'Sin ejercicios · toca para añadir')),
      icon('chevron', 'ico chev'));
    row.style.setProperty('--sec', st.color);
    return row;
  }

  private start(plan: WorkoutPlan): void {
    void startWorkout(this.app, plan, this.app.store.active);
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
