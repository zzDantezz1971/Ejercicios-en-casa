import { WorkoutPlan, clampRounds } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type ExerciseDef, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { h, humanDuration, kg, plural } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { DetailScreen } from './DetailScreen';
import { neededEquip } from './MakerScreens';
import { lockedThumb, premiumPill } from '../components/badges';
import { EQUIP_INFO } from '../../domain/equipment';

/**
 * Ver la tabla en uso, solo para mirar: los ejercicios del apartado elegido (o todos), en el orden en que se harán,
 * en cuadrícula con su miniatura. Tocar uno abre su ficha.
 */
export class TableViewScreen implements Screen {
  readonly el = h('main', { class: 'screen table-view' });
  private io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && this.loadThumb(e.target as HTMLElement)), { rootMargin: '300px' });

  constructor(private readonly app: App, private readonly focus?: SectionId) {}

  enter(): void {
    this.render();
  }

  dispose(): void {
    this.io.disconnect();
  }

  private render(): void {
    const { app } = this;
    const table = app.store.active;
    const plan = WorkoutPlan.build(app.playable(table.routine), app.catalog, app.store.settings, table.rounds);
    const blocks: HTMLElement[] = [];
    // todos los ejercicios que se ven, en orden: desde la ficha se pasa de uno a otro deslizando el dedo
    const shown: ExerciseDef[] = [];
    // número de orden dentro de toda la tabla
    let n = SECTION_IDS.slice(0, this.focus ? SECTION_IDS.indexOf(this.focus) : 0)
      .reduce((t, s) => t + table.routine[s].filter((i) => app.catalog.has(i.exerciseId)).length, 0);
    for (const s of SECTION_IDS) {
      if (this.focus && s !== this.focus) continue;
      const items = table.routine[s].filter((i) => app.catalog.has(i.exerciseId));
      if (!items.length) continue;
      const st = SECTION_STYLE[s];
      const R = clampRounds(table.rounds?.[s]);
      const secs = items.reduce((t, i) => t + i.seconds, 0) * R;
      // título del apartado como en Editar (grande, con su color), con el resumen al lado
      const head = h('div', { class: 'tv-head' },
        h('h2', { class: 'maker-sec' }, icon(st.icon), SECTION_TITLES[s]),
        h('span', { class: 'muted small tv-meta' }, `${plural(items.length, 'ejercicio', 'ejercicios')}${R > 1 ? ` · x${R} vueltas` : ''} · ${humanDuration(secs)}`));
      head.style.setProperty('--sec', st.color);
      const need = neededEquip(app, { routine: table.routine, rounds: table.rounds ?? {} }, [s]);
      const needEl = need.length ? h('div', { class: 'sec-need small', style: `--sec: ${st.color}` }, h('span', {}, 'Necesitas:'),
        h('div', { class: 'sec-need-items' }, ...need.map(({ e, missing }) => h('span', { class: 'miss-item' + (missing ? ' missing' : '') }, icon(EQUIP_INFO[e].icon as IconName), EQUIP_INFO[e].name)))) : null;
      const list = h('div', { class: 'tv-list' });
      for (const it of items) {
        const ex = app.catalog.get(it.exerciseId)!;
        shown.push(ex);
        n++;
        const img = h('img', { alt: '', class: 'maker-thumb', 'data-id': ex.id });
        void app.thumbs.get(ex).then((url) => (img.src = url));
        const locked = !app.access.canUse(ex.id);
        const row = h('button', { class: 'maker-row tv-row' + (locked ? ' locked' : ''), 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => (app.access.canUse(ex.id) ? app.push(new DetailScreen(app, ex, shown)) : app.showPremium()) },
          h('span', { class: 'tv-n' }, String(n)),
          lockedThumb(img, locked),
          h('span', { class: 'maker-name' },
            h('span', { class: 'maker-title' }, ex.name),
            h('span', { class: 'muted small tv-sub' }, h('span', { class: 'tv-secs' }, icon('clock'), `${it.seconds} s`),
              it.weight ? h('span', { class: 'tv-secs' }, icon('dumbbell'), kg(it.weight)) : null,
              ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
            h('span', { class: 'muted small' }, ex.zone),
            locked ? premiumPill() : null),
          icon('chevron', 'ico chev'));
        row.style.setProperty('--sec', st.color);
        list.append(row);
      }
      blocks.push(head, ...(needEl ? [needEl] : []), list);
    }

    this.el.replaceChildren(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, table.name), h('h1', {}, this.focus ? SECTION_TITLES[this.focus] : 'Contenido de la tabla'))),
      h('section', { class: 'detail-body tv-body' },
        this.focus ? null : h('div', { class: 'chips tv-chips' },
          h('span', { class: 'chip' }, icon('clock'), plan.isEmpty ? '—' : humanDuration(plan.estimatedSeconds)),
          h('span', { class: 'chip' }, icon('bolt'), plural(plan.exerciseCount, 'ejercicio', 'ejercicios'))),
        h('p', { class: 'muted small' }, 'Toca un ejercicio para ver cómo se hace.'),
        ...blocks),
    );
  }

  private loadThumb(fig: HTMLElement): void {
    this.io.unobserve(fig);
    const img = fig.querySelector('img')!;
    const ex = this.app.catalog.get(img.dataset.id!);
    if (ex) void this.app.thumbs.get(ex).then((url) => (img.src = url));
  }
}
