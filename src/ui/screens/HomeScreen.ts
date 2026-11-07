import { LOCALE } from '../../i18n';
import { WorkoutPlan, clampRounds } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { addDays, dayKey, greeting, startOfWeek, streak, trainedDays, WEEKDAY_LETTERS } from '../dates';
import { clear, h, humanDuration, plural } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { RoutineScreen } from './RoutineScreen';
import { startWorkout } from '../components/startWorkout';
import { MonthScreen } from './MonthScreen';
import { addMonths, addWeeks, monthKey, monthStart, weekKey, weekStart, weekStats } from '../../domain/monthSummary';
import { randomPhrase } from '../../domain/phrases';

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
    const date = now.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    this.el.append(
      h('header', { class: 'home-head' },
        h('p', { class: 'eyebrow' }, date),
        h('h1', {}, greeting(now, app.store.settings.profile.name)),
        app.store.settings.phrases ? h('p', { class: 'daily-phrase' }, randomPhrase(app.store.settings.profile.name)) : null),
    );

    // Aviso: ya está el resumen del mes pasado
    const prevMonth = addMonths(monthStart(now), -1);
    const prevKey = monthKey(prevMonth);
    const hadPrev = app.store.history.some((e) => monthKey(new Date(e.date)) === prevKey);
    if (hadPrev && app.store.summarySeen !== prevKey) {
      const name = prevMonth.toLocaleDateString(LOCALE, { month: 'long' });
      const card: HTMLElement = h('section', { class: 'card month-banner' },
        icon('calendar'),
        h('div', { class: 'mb-text' }, h('strong', {}, `Ya tienes el resumen de ${name}`), h('span', { class: 'muted small' }, 'Días, tiempo, calorías, peso y récords del mes.')),
        h('button', { class: 'btn primary small', onclick: () => app.push(new MonthScreen(app, prevMonth)) }, 'Ver'),
        h('button', { class: 'icon-btn small', 'aria-label': 'Cerrar aviso', onclick: () => { app.store.markSummarySeen(prevKey); card.remove(); } }, icon('close')));
      this.el.append(card);
    } else {
      // o el de la semana pasada (de lunes a domingo)
      const prevWeek = addWeeks(weekStart(now), -1);
      const wk = weekKey(prevWeek);
      const hadWeek = app.store.history.some((e) => weekKey(new Date(e.date)) === wk);
      if (hadWeek && app.store.weekSeen !== wk) {
        const card: HTMLElement = h('section', { class: 'card month-banner' },
          icon('calendar'),
          h('div', { class: 'mb-text' }, h('strong', {}, 'Ya tienes el resumen de la semana pasada'), h('span', { class: 'muted small' }, 'Días, tiempo, calorías, peso y músculos.')),
          h('button', { class: 'btn primary small', onclick: () => app.push(new MonthScreen(app, undefined, 'week', prevWeek)) }, 'Ver'),
          h('button', { class: 'icon-btn small', 'aria-label': 'Cerrar aviso', onclick: () => { app.store.markWeekSeen(wk); card.remove(); } }, icon('close')));
        this.el.append(card);
      }
    }

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

    this.el.append(this.rings(now));

    // Apartados de la tabla
    this.el.append(
      h('section', { class: 'sections' },
        h('h3', { class: 'block-title' }, 'Contenido de la tabla'),
        ...SECTION_IDS.map((s) => this.sectionRow(s))),
    );
  }

  /** Anillos de la semana (de lunes a domingo): días, minutos y calorías. */
  private rings(now: Date): HTMLElement {
    const st = this.app.store;
    const k = (e: Parameters<typeof st.caloriesFor>[0]) => st.caloriesFor(e)?.kcal ?? null;
    const cur = weekStats(st.history, st.weights, weekStart(now), k);
    const prev = weekStats(st.history, st.weights, addWeeks(weekStart(now), -1), k);
    const mins = Math.round(cur.seconds / 60);
    const kcalGoal = Math.max(300, prev.kcal ?? 0);
    const items = [
      { v: cur.days / 7, color: 'var(--sec-warm)', label: 'Días', value: `${cur.days} de 7` },
      { v: mins / 150, color: 'var(--accent)', label: 'Minutos', value: `${mins} de 150`, hint: '150 min a la semana es lo recomendado' },
      { v: cur.kcal != null ? cur.kcal / kcalGoal : 0, color: 'var(--sec-stretch)', label: 'Calorías', value: cur.kcal != null ? `${cur.kcal} de ${kcalGoal} kcal` : '—', hint: prev.kcal ? 'Meta: lo de la semana pasada' : undefined },
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('class', 'rings');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', items.map((i) => `${i.label}: ${i.value}`).join(', '));
    items.forEach((it, i) => {
      const r = 52 - i * 15, len = 2 * Math.PI * r;
      const bg = document.createElementNS(NS, 'circle');
      for (const [a, b] of Object.entries({ cx: 60, cy: 60, r, class: 'ring-track' })) bg.setAttribute(a, String(b));
      bg.style.setProperty('--c', it.color);
      const fg = document.createElementNS(NS, 'circle');
      for (const [a, b] of Object.entries({ cx: 60, cy: 60, r, class: 'ring-val', 'stroke-dasharray': len, 'stroke-dashoffset': len, transform: 'rotate(-90 60 60)' })) fg.setAttribute(a, String(b));
      fg.style.setProperty('--c', it.color);
      fg.style.setProperty('--to', String(len * (1 - Math.min(1, it.v))));
      svg.append(bg, fg);
    });
    // se dibujan con una pequeña animación al entrar
    requestAnimationFrame(() => requestAnimationFrame(() => svg.querySelectorAll<SVGCircleElement>('.ring-val').forEach((c) => c.setAttribute('stroke-dashoffset', c.style.getPropertyValue('--to')))));
    return h('section', { class: 'card rings-card' },
      svg as unknown as HTMLElement,
      h('div', { class: 'rings-legend' },
        h('h3', {}, 'Tu semana'),
        ...items.map((it) => {
          const row = h('div', { class: 'rl-row' }, h('span', { class: 'rl-dot' }), h('div', {}, h('strong', {}, it.label), h('span', { class: 'muted small' }, ` ${it.value}`), it.hint ? h('span', { class: 'muted small block' }, it.hint) : null));
          row.style.setProperty('--c', it.color);
          return row;
        })));
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
  const time = d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  if (same(d, today)) return `hoy a las ${time}`;
  if (same(d, yesterday)) return `ayer a las ${time}`;
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}
