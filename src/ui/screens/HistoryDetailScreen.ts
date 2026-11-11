import { LOCALE, DEC } from '../../i18n';
import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, emptyRoutine, type HeartSummary, type HistoryEntry, type SavedRoutine } from '../../domain/types';
import type { App, Screen } from '../App';
import { confirmDialog, h, humanDuration, kg, mmss } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { startWorkout } from '../components/startWorkout';
import { checkAndCelebrate } from '../components/medals';
import { DetailScreen } from './DetailScreen';

/** Detalle de un entrenamiento del historial: qué se hizo, cuánto tiempo y repetirlo. */
export class HistoryDetailScreen implements Screen {
  readonly el = h('main', { class: 'screen history-detail' });

  constructor(private readonly app: App, private readonly entry: HistoryEntry) {
    const e = entry;
    const d = new Date(e.date);
    const end = new Date(d.getTime() + (e.durationSec + (e.pausedSec ?? 0)) * 1000);
    const hm = (x: Date) => x.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
    const items = e.items ?? [];
    const activeSec = items.reduce((n, i) => n + i.seconds, 0);
    const cal = app.store.caloriesFor(e);

    const list: HTMLElement[] = [];
    for (const s of SECTION_IDS) {
      const its = items.filter((i) => i.section === s);
      if (!its.length) continue;
      const st = SECTION_STYLE[s];
      const head = h('h3', { class: 'hd-sec' }, h('span', { class: 'sec-dot' }, icon(st.icon)), SECTION_TITLES[s],
        h('span', { class: 'muted small' }, mmss(its.reduce((n, i) => n + i.seconds, 0))));
      head.style.setProperty('--sec', st.color);
      list.push(head);
      // ejercicios en cuadrícula (2 o 3 por fila); tocar uno abre su ficha (muñeco, cómo se hace, músculos…)
      const grid = h('div', { class: 'hd-grid' });
      for (const it of its) {
        const ex = app.catalog.get(it.exerciseId);
        const status = it.completed ? '' : it.seconds > 0 ? 'Saltado a medias' : 'Saltado';
        const r = h(ex ? 'button' : 'div', { class: 'card hd-row' + (it.completed ? '' : ' skipped'),
          ...(ex ? { 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => (app.access.canUse(ex.id) ? app.push(new DetailScreen(app, ex)) : app.showPremium()) } : {}) },
          h('div', { class: 'hd-top' },
            h('span', { class: 'hd-mark' }, icon(it.completed ? 'check' : 'next')),
            h('span', { class: 'hd-secs' }, mmss(it.seconds), it.seconds < it.planned ? h('span', { class: 'muted small' }, ` / ${mmss(it.planned)}`) : null)),
          h('strong', { class: 'hd-name' }, ex?.name ?? 'Ejercicio eliminado'),
          status || it.weight ? h('span', { class: 'muted small hd-sub' }, status, status && it.weight ? ' · ' : '', it.weight ? kg(it.weight) : '') : null);
        r.style.setProperty('--sec', st.color);
        grid.append(r);
      }
      list.push(grid);
    }

    const canRepeat = items.some((i) => app.catalog.has(i.exerciseId) && !app.store.hidden.has(i.exerciseId));
    // entrenamiento anterior y siguiente (por fecha), para pasar de uno a otro deslizando o con las flechas
    const all = [...app.store.history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const pos = all.findIndex((x) => x === e || x.date === e.date);
    const older = pos > 0 ? all[pos - 1] : null;
    const newer = pos >= 0 && pos < all.length - 1 ? all[pos + 1] : null;
    const short = (x: HistoryEntry) => new Date(x.date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
    this.older = older;
    this.newer = newer;
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'bar-title' }, 'Entrenamiento')),
      h('section', { class: 'detail-body hd-body' },
        e.routineName ? h('span', { class: 'h-name' }, e.routineName) : null,
        h('h2', { class: 'hd-date' }, d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        h('p', { class: 'muted' }, `De ${hm(d)} a ${hm(end)}`),
        older || newer
          ? h('nav', { class: 'hd-nav', 'aria-label': 'Otros entrenamientos' },
            h('button', { class: 'btn ghost small', disabled: !older, 'aria-label': 'Entrenamiento anterior', onclick: () => this.go(-1) }, icon('back'), older ? short(older) : ''),
            h('span', { class: 'muted small' }, 'Desliza para cambiar de día'),
            h('button', { class: 'btn ghost small', disabled: !newer, 'aria-label': 'Entrenamiento siguiente', onclick: () => this.go(1) }, newer ? short(newer) : '', icon('chevron')))
          : null,
        h('section', { class: 'stats-row hd-stats' + (items.length ? '' : ' two') },
          stat('clock', humanDuration(e.durationSec), 'duración'),
          stat('flame', cal ? `${cal.kcal} kcal` : '—', 'calorías'),
          // tiempo haciendo ejercicios (sin descansos ni cuentas atrás)
          items.length ? stat('bolt', humanDuration(activeSec), 'en ejercicio') : null),
        kcalNote(e, cal),
        !e.completed ? h('p', { class: 'note' }, icon('info'), 'Se terminó antes de acabar la tabla.') : null,
        e.heart ? heartCard(e.heart) : null,
        ...(items.length
          ? list
          : [h('p', { class: 'muted' }, 'Este entrenamiento es de una versión anterior de la app y no guarda el detalle de cada ejercicio.')]),
        canRepeat
          ? h('button', { class: 'btn primary block', onclick: () => this.repeat() }, icon('play'), 'Repetir este entrenamiento')
          : null,
        h('button', { class: 'btn ghost block', onclick: () => this.copyToDay() }, icon('copy'), 'Copiar a otro día'),
        h('button', { class: 'btn danger block', onclick: () => void this.remove() }, icon('trash'), 'Borrar este entrenamiento')),
    );
    if (older || newer) this.swipe();
  }

  private older: HistoryEntry | null = null;
  private newer: HistoryEntry | null = null;

  /** Pasa al entrenamiento anterior (-1) o al siguiente (1). */
  private go(dir: -1 | 1): void {
    const to = dir < 0 ? this.older : this.newer;
    if (!to) return;
    this.app.haptics.tap();
    this.app.replace(new HistoryDetailScreen(this.app, to), dir < 0 ? 'back' : 'forward');
  }

  /** Deslizar el dedo a los lados: hacia la izquierda, el siguiente; hacia la derecha, el anterior. */
  private swipe(): void {
    let x0 = 0, y0 = 0, t0 = 0, on = false;
    this.el.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0];
      on = ev.touches.length === 1;
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    }, { passive: true });
    this.el.addEventListener('touchend', (ev) => {
      if (!on) return;
      on = false;
      const t = ev.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      // gesto claramente horizontal, de al menos 60 px y rápido (no un arrastre lento para leer)
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - t0 > 800) return;
      this.go(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /** Crea un entrenamiento igual en otro día (para recuperar uno que no se guardó). */
  private copyToDay(): void {
    const { app, entry } = this;
    const src = new Date(entry.date);
    const next = new Date(src.getTime() + 864e5);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dayIn = h('input', { type: 'date', class: 'text-input', value: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}` });
    const timeIn = h('input', { type: 'time', class: 'text-input', value: `${pad(src.getHours())}:${pad(src.getMinutes())}` });
    const close = () => wrap.remove();
    const ok = () => {
      const [y, m, d] = dayIn.value.split('-').map(Number);
      const [hh, mm] = (timeIn.value || '12:00').split(':').map(Number);
      if (!y || !m || !d) return;
      const when = new Date(y, m - 1, d, hh, mm);
      if (when.getTime() > Date.now()) { dayIn.setCustomValidity('—'); dayIn.reportValidity(); return; }
      app.store.copyHistoryTo(entry, when);
      close();
      app.back();
      checkAndCelebrate(app);
    };
    const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close() },
      h('div', { class: 'dialog copy-day', role: 'dialog', 'aria-modal': 'true' },
        h('p', { class: 'dialog-title' }, 'Copiar a otro día'),
        h('p', { class: 'muted small' }, 'Se crea un entrenamiento igual a este (ejercicios, tiempo, calorías y pulso) en el día y la hora que elijas.'),
        h('label', { class: 'cd-field' }, h('span', { class: 'muted small' }, 'Día'), dayIn),
        h('label', { class: 'cd-field' }, h('span', { class: 'muted small' }, 'Hora de inicio'), timeIn),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost', onclick: close }, 'Cancelar'),
          h('button', { class: 'btn primary', onclick: ok }, 'Copiar'))));
    document.body.append(wrap);
  }

  /** Vuelve a hacer los mismos ejercicios, en el mismo orden y con los tiempos previstos. */
  private repeat(): void {
    const { app, entry } = this;
    const routine = emptyRoutine();
    for (const it of entry.items ?? []) {
      if (app.store.hidden.has(it.exerciseId)) continue;
      const sec = app.catalog.get(it.exerciseId)?.section;
      if (sec) routine[sec].push({ exerciseId: it.exerciseId, seconds: it.planned, ...(it.weight ? { weight: it.weight } : {}) });
    }
    const plan = WorkoutPlan.build(app.playable(routine), app.catalog, app.store.settings);
    if (plan.isEmpty) return;
    const table: SavedRoutine = app.store.routines.find((r) => r.id === entry.routineId)
      ?? { id: entry.routineId ?? 'historial', name: entry.routineName ?? 'Entrenamiento repetido', routine, createdAt: entry.date };
    void startWorkout(app, plan, { ...table, routine });
  }

  private async remove(): Promise<void> {
    if (!(await confirmDialog('¿Borrar este entrenamiento del historial? No se puede deshacer.', 'Borrar'))) return;
    const i = this.app.store.history.indexOf(this.entry);
    if (i >= 0) this.app.store.deleteHistoryAt(i);
    this.app.back();
  }
}

function kcalNote(e: HistoryEntry, c: ReturnType<App['store']['caloriesFor']>): HTMLElement {
  if (!c) return h('p', { class: 'muted small' }, 'Anota tu peso en Mis datos para ver las calorías.');
  return h('p', { class: 'muted small hd-kcal-how' },
    h('span', {}, c.method === 'pulso' ? 'Calorías calculadas con tu pulso' : 'Calorías estimadas por tipo de ejercicio y tiempo'),
    e.weightKg ? ', ' : null, e.weightKg ? h('span', {}, `con ${String(e.weightKg).replace('.', DEC)} kg`) : null);
}

/** Pulso medio, máximo y mínimo, con la gráfica de la sesión. */
function heartCard(hr: HeartSummary): HTMLElement {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 320, H = 90, pad = 6;
  const s = hr.samples;
  const lo = Math.max(40, hr.min - 8), hi = hr.max + 8;
  const x = (i: number) => pad + (s.length > 1 ? (i / (s.length - 1)) * (W - 2 * pad) : (W - 2 * pad) / 2);
  const y = (b: number) => pad + (H - 2 * pad) * (1 - (b - lo) / (hi - lo));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'hr-chart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Pulso durante el entrenamiento: de ${hr.min} a ${hr.max} pulsaciones por minuto`);
  const pts = s.map((b, i) => `${x(i).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
  const area = document.createElementNS(NS, 'polygon');
  area.setAttribute('points', `${x(0)},${H - pad} ${pts} ${x(s.length - 1)},${H - pad}`);
  area.setAttribute('class', 'hr-area');
  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('points', pts);
  line.setAttribute('class', 'hr-line');
  line.setAttribute('pathLength', '1');
  const avg = document.createElementNS(NS, 'line');
  for (const [k, v] of Object.entries({ x1: pad, x2: W - pad, y1: y(hr.avg), y2: y(hr.avg), class: 'hr-avg' })) avg.setAttribute(k, String(v));
  svg.append(area, avg, line);
  return h('section', { class: 'card hr-card' },
    h('div', { class: 'card-head' }, h('h3', {}, 'Pulsaciones'), h('span', { class: 'muted small' }, 'ppm')),
    h('div', { class: 'hr-nums' },
      h('div', {}, h('strong', {}, String(hr.avg)), h('span', { class: 'muted small' }, 'media')),
      h('div', {}, h('strong', {}, String(hr.max)), h('span', { class: 'muted small' }, 'máxima')),
      h('div', {}, h('strong', {}, String(hr.min)), h('span', { class: 'muted small' }, 'mínima'))),
    s.length > 1 ? (svg as unknown as HTMLElement) : null);
}

function stat(ic: Parameters<typeof icon>[0], value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label));
}

