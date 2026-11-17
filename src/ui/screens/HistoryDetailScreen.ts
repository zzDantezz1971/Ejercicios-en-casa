import { LOCALE, DEC } from '../../i18n';
import { SECTION_IDS, SECTION_TITLES, type SectionId, type ExerciseDef, type HeartSummary, type HistoryEntry } from '../../domain/types';
import type { App, Screen } from '../App';
import { confirmDialog, h, humanDuration, kg, mmss, plural } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { DetailScreen } from './DetailScreen';
import { blockNav } from '../components/blockNav';

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

    // como «Contenido de la tabla» en Inicio: una fila por bloque; al tocarla, sus ejercicios numerados
    const list: HTMLElement[] = [];
    const blocks = SECTION_IDS.filter((s) => items.some((i) => i.section === s));
    if (blocks.length) {
      list.push(h('section', { class: 'sections' },
        h('h3', { class: 'block-title' }, 'Contenido del entrenamiento'),
        ...blocks.map((s) => {
          const its = items.filter((i) => i.section === s);
          const st = SECTION_STYLE[s];
          const row = h('button', { class: 'sec-row', onclick: () => app.push(new HistoryBlockScreen(app, e, s)) },
            h('span', { class: 'sec-icon' }, icon(st.icon)),
            h('span', { class: 'sec-text' },
              h('strong', {}, SECTION_TITLES[s]),
              h('span', { class: 'muted small' }, `${plural(its.length, 'ejercicio', 'ejercicios')} · ${humanDuration(its.reduce((n, i) => n + i.seconds, 0))}`)),
            icon('chevron', 'ico chev'));
          row.style.setProperty('--sec', st.color);
          return row;
        })));
    }

    // entrenamiento anterior y siguiente (por fecha), para pasar de uno a otro deslizando o con las flechas
    // en la versión gratis, solo los de la semana en curso (los anteriores son de Prémium)
    const since = app.historySince();
    const all = [...app.store.history].filter((x) => !since || Date.parse(x.date) >= since.getTime()).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
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
        // pequeño y apartado, para no tocarlo sin querer (como «Borrar todo el historial»)
        h('button', { class: 'clear-history', onclick: () => void this.remove() }, icon('trash'), 'Borrar este entrenamiento')),
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


/** Un bloque de un entrenamiento del historial: sus ejercicios numerados, como «Contenido de la tabla» (solo información). */
class HistoryBlockScreen implements Screen {
  readonly el = h('main', { class: 'screen table-view' });

  constructor(app: App, entry: HistoryEntry, sec: SectionId) {
    const its = (entry.items ?? []).filter((i) => i.section === sec);
    const st = SECTION_STYLE[sec];
    const shown = its.map((i) => app.catalog.get(i.exerciseId)).filter((x): x is ExerciseDef => !!x);
    const date = new Date(entry.date).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    const head = h('div', { class: 'tv-head' },
      h('h2', { class: 'maker-sec' }, icon(st.icon), SECTION_TITLES[sec]),
      h('span', { class: 'muted small tv-meta' }, `${plural(its.length, 'ejercicio', 'ejercicios')} · ${humanDuration(its.reduce((n, i) => n + i.seconds, 0))}`));
    head.style.setProperty('--sec', st.color);
    const list = h('div', { class: 'tv-list' });
    its.forEach((it, k) => {
      const ex = app.catalog.get(it.exerciseId);
      const status = it.completed ? '' : it.seconds > 0 ? 'Saltado a medias' : 'Saltado';
      const img = h('img', { alt: '', class: 'maker-thumb' });
      if (ex) void app.thumbs.get(ex).then((url) => (img.src = url));
      const row = h(ex ? 'button' : 'div', { class: 'maker-row tv-row hd-tv' + (it.completed ? '' : ' skipped'),
        ...(ex ? { 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => app.push(new DetailScreen(app, ex, shown)) } : {}) },
        h('span', { class: 'tv-n' }, String(k + 1)),
        img,
        h('span', { class: 'maker-name' },
          h('span', { class: 'maker-title' }, ex?.name ?? 'Ejercicio eliminado'),
          h('span', { class: 'muted small tv-sub' },
            h('span', { class: 'tv-secs' }, icon('clock'), mmss(it.seconds), it.seconds < it.planned ? ` / ${mmss(it.planned)}` : ''),
            it.weight ? h('span', { class: 'tv-secs' }, icon('dumbbell'), kg(it.weight)) : null,
            ex?.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
          status ? h('span', { class: 'muted small hd-status' }, icon('next'), status) : ex ? h('span', { class: 'muted small' }, ex.zone) : null),
        ex ? icon('chevron', 'ico chev') : null);
      row.style.setProperty('--sec', st.color);
      list.append(row);
    });
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, date), h('h1', {}, SECTION_TITLES[sec]))),
      h('section', { class: 'detail-body tv-body' }, head, list,
        blockNav(SECTION_IDS.filter((x) => (entry.items ?? []).some((i) => i.section === x)), sec,
          (x, dir) => app.replace(new HistoryBlockScreen(app, entry, x), dir < 0 ? 'back' : 'forward'))));
  }
}
