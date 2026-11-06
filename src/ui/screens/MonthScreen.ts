import { loadWeights, muscleLoad } from '../../domain/muscleLoad';
import { addMonths, addWeeks, monthKey, monthStart, monthStats, weekKey, weekStart, weekStats, type MonthStats } from '../../domain/monthSummary';
import { MUSCLE_NAMES, MUSCLES } from '../../figure/anatomy';
import type { App, Screen } from '../App';
import { bodyMaps } from '../components/bodyMaps';
import { fmtDiff, fmtKg } from '../components/weightCard';
import { append, clear, h, humanDuration, kg } from '../dom';
import { icon, type IconName } from '../icons';

/** Resumen de una semana (de lunes a domingo) o de un mes, comparado con el periodo anterior. */
export class MonthScreen implements Screen {
  readonly el = h('main', { class: 'screen month-screen' });
  private body = h('div', { class: 'history-body' });
  private month: Date;
  private week: Date;

  constructor(private readonly app: App, month: Date = monthStart(new Date()), private mode: 'week' | 'month' = 'month', week: Date = weekStart(new Date())) {
    this.month = monthStart(month);
    this.week = weekStart(week);
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'bar-title' }, 'Resumen')),
      this.body);
  }

  enter(): void {
    if (this.mode === 'month') this.app.store.markSummarySeen(monthKey(addMonths(monthStart(new Date()), -1)));
    else this.app.store.markWeekSeen(weekKey(addWeeks(weekStart(new Date()), -1)));
    this.render();
  }

  private stats(m: Date): MonthStats {
    const st = this.app.store;
    const k = (e: Parameters<typeof st.caloriesFor>[0]) => st.caloriesFor(e)?.kcal ?? null;
    return this.mode === 'week' ? weekStats(st.history, st.weights, m, k) : monthStats(st.history, st.weights, m, k);
  }

  private render(): void {
    clear(this.body);
    const W = this.mode === 'week';
    const start = W ? this.week : this.month;
    const prevStart = W ? addWeeks(this.week, -1) : addMonths(this.month, -1);
    const cur = this.stats(start), prev = this.stats(prevStart);
    const isNow = W ? weekKey(this.week) === weekKey(new Date()) : monthKey(this.month) === monthKey(new Date());
    let title: string;
    if (W) {
      const end = addWeeks(this.week, 1);
      end.setDate(end.getDate() - 1);
      const f = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-ES', o);
      title = this.week.getMonth() === end.getMonth()
        ? `Del ${this.week.getDate()} al ${f(end, { day: 'numeric', month: 'long' })}`
        : `Del ${f(this.week, { day: 'numeric', month: 'short' })} al ${f(end, { day: 'numeric', month: 'short' })}`;
    } else {
      const t0 = this.month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      title = t0.charAt(0).toUpperCase() + t0.slice(1);
    }
    const go = (d: number) => {
      if (W) this.week = addWeeks(this.week, d);
      else this.month = addMonths(this.month, d);
      this.render();
      window.scrollTo(0, 0);
    };
    const seg = (m: 'week' | 'month', label: string) =>
      h('button', { class: 'seg' + (this.mode === m ? ' on' : ''), 'aria-pressed': String(this.mode === m), onclick: () => { this.mode = m; this.render(); } }, label);
    this.body.append(h('div', { class: 'segmented period-seg' }, seg('week', 'Semana'), seg('month', 'Mes')));
    append(this.body,
      h('div', { class: 'card-head month-nav' },
        h('button', { class: 'icon-btn small', 'aria-label': W ? 'Semana anterior' : 'Mes anterior', onclick: () => go(-1) }, icon('back')),
        h('h2', { class: 'cal-title' }, title),
        h('button', { class: 'icon-btn small', 'aria-label': W ? 'Semana siguiente' : 'Mes siguiente', disabled: isNow, onclick: () => go(1) }, icon('chevron'))),
      isNow ? h('p', { class: 'muted small center' }, `${W ? 'Semana' : 'Mes'} en curso: se completa a medida que entrenas.`) : null,
    );
    if (!cur.sessions) {
      this.body.append(h('div', { class: 'empty-state' }, icon('calendar', 'ico big'), h('p', {}, W ? 'No hay entrenamientos en esta semana.' : 'No hay entrenamientos en este mes.')));
      return;
    }
    const prevName = W ? 'la semana anterior' : addMonths(this.month, -1).toLocaleDateString('es-ES', { month: 'long' });
    const cmp = (a: number, b: number, unit: (n: number) => string) => {
      if (!prev.sessions) return h('span', { class: 'muted small' }, W ? 'sin datos de la semana anterior' : 'sin datos del mes anterior');
      const d = a - b;
      if (Math.abs(d) < 1e-9) return h('span', { class: 'delta same' }, `igual que ${prevName}`);
      return h('span', { class: 'delta ' + (d > 0 ? 'up' : 'down') }, `${d > 0 ? '↑' : '↓'} ${unit(Math.abs(d))} ${d > 0 ? 'más' : 'menos'} que ${prevName}`);
    };
    const tile = (ic: IconName, value: string, label: string, delta: HTMLElement) =>
      h('div', { class: 'stat month-stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label), delta);
    this.body.append(
      h('section', { class: 'stats-row four' },
        tile('calendar', String(cur.days), cur.days === 1 ? 'día entrenado' : 'días entrenados', cmp(cur.days, prev.days, (n) => `${n} ${n === 1 ? 'día' : 'días'}`)),
        tile('clock', humanDuration(cur.seconds), 'en total', cmp(cur.seconds, prev.seconds, (n) => humanDuration(n))),
        tile('flame', cur.kcal != null ? String(cur.kcal) : '—', 'kcal', cur.kcal != null && prev.kcal != null ? cmp(cur.kcal, prev.kcal, (n) => `${n} kcal`) : h('span', { class: 'muted small' }, cur.kcal == null ? 'anota tu peso' : '')),
        tile('bolt', String(cur.sessions), cur.sessions === 1 ? 'entrenamiento' : 'entrenamientos', cmp(cur.sessions, prev.sessions, (n) => String(n)))),
    );

    // Peso
    if (cur.weight) {
      const d = cur.weight.to - cur.weight.from;
      this.body.append(h('section', { class: 'card month-weight' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Peso')),
        h('div', { class: 'wc-now' }, h('strong', {}, fmtKg(cur.weight.to)),
          h('span', { class: 'wc-diff' + (d < 0 ? ' down' : d > 0 ? ' up' : '') }, `${fmtDiff(d)} ${W ? 'esta semana' : 'este mes'}`)),
        h('p', { class: 'muted small' }, `Empezaste ${W ? 'la semana' : 'el mes'} con ${fmtKg(cur.weight.from)}.`)));
    }

    // Músculos
    const load = muscleLoad(cur.entries, (id) => this.app.catalog.get(id)?.muscles);
    const worked = MUSCLES.filter((m) => load.work[m] > 0).sort((a, b) => load.work[b] - load.work[a]);
    if (worked.length || MUSCLES.some((m) => load.stretch[m] > 0)) {
      const w = loadWeights(load);
      const img = (back: boolean) => {
        const el = h('img', { class: 'mm-img', alt: back ? 'Músculos de espaldas' : 'Músculos de frente' });
        void bodyMaps().bodyMap(w, back).then((u) => { if (u) el.src = u; else el.remove(); });
        return h('figure', { class: 'mm-fig' }, el, h('figcaption', { class: 'muted small' }, back ? 'Detrás' : 'Delante'));
      };
      const minutes = (s: number) => (s >= 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
      this.body.append(h('section', { class: 'card muscle-map' },
        h('div', { class: 'card-head' }, h('h3', {}, W ? 'Músculos de la semana' : 'Músculos del mes')),
        h('div', { class: 'mm-figs' }, img(false), img(true)),
        worked.length ? h('p', { class: 'mm-line' }, h('span', { class: 'mu-dot work' }), h('strong', {}, 'Más trabajados: '),
          worked.slice(0, 5).map((m) => `${MUSCLE_NAMES[m]} (${minutes(load.work[m])})`).join(', ')) : null));
    }

    // Récords de peso
    if (cur.records.length) {
      this.body.append(h('section', { class: 'card' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Récords de peso'), h('span', { class: 'muted small' }, 'por mancuerna')),
        h('ul', { class: 'records' }, ...cur.records.map((r) => h('li', {},
          icon('trophy'), h('span', { class: 'rec-name' }, this.app.catalog.get(r.exerciseId)?.name ?? ''),
          h('span', { class: 'rec-kg' }, r.from != null ? `${kg(r.from)} → ${kg(r.to)}` : kg(r.to)))))));
    }

    // Racha y tabla
    append(this.body, h('section', { class: 'card month-extra' },
      h('p', {}, icon('flame'), h('strong', {}, 'Mejor racha: '), `${cur.bestStreak} ${cur.bestStreak === 1 ? 'día' : 'días seguidos'}`),
      cur.topTable ? h('p', {}, icon('tables'), h('strong', {}, 'Tabla más usada: '), `${cur.topTable.name} (${cur.topTable.times} ${cur.topTable.times === 1 ? 'vez' : 'veces'})`) : null));
  }
}
