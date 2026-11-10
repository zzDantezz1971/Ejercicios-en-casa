import { WorkoutPlan, clampRounds } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { h, humanDuration, kg, plural } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { DetailScreen } from './DetailScreen';
import { RoutineScreen } from './RoutineScreen';

/**
 * Ver la tabla en uso, solo para mirar: todos sus ejercicios en el orden en que se harán, por apartados,
 * en cuadrícula con su miniatura. Tocar uno abre su ficha. Para cambiar algo, el botón Editar.
 */
export class TableViewScreen implements Screen {
  readonly el = h('main', { class: 'screen table-view' });
  private io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && this.loadThumb(e.target as HTMLElement)), { rootMargin: '300px' });
  private sections: Partial<Record<SectionId, HTMLElement>> = {};
  private first = true;

  constructor(private readonly app: App, private readonly focus?: SectionId) {}

  enter(): void {
    this.render();
    // la primera vez, ir al apartado que se tocó en el inicio
    // (el primero no: así se ve el resumen de arriba)
    const firstSec = SECTION_IDS.find((s) => this.sections[s]);
    if (this.first && this.focus && this.focus !== firstSec) {
      const target = this.sections[this.focus];
      // esperar a que la pantalla esté puesta en la página
      if (target) setTimeout(() => target.scrollIntoView({ block: 'start' }), 80);
    }
    this.first = false;
  }

  dispose(): void {
    this.io.disconnect();
  }

  private render(): void {
    const { app } = this;
    const table = app.store.active;
    const plan = WorkoutPlan.build(table.routine, app.catalog, app.store.settings, table.rounds);
    this.sections = {};
    const blocks: HTMLElement[] = [];
    let n = 0;
    for (const s of SECTION_IDS) {
      const items = table.routine[s].filter((i) => app.catalog.has(i.exerciseId));
      if (!items.length) continue;
      const st = SECTION_STYLE[s];
      const R = clampRounds(table.rounds?.[s]);
      const secs = items.reduce((t, i) => t + i.seconds, 0) * R;
      const head = h('h3', { class: 'hd-sec tv-sec' },
        h('span', { class: 'sec-dot' }, icon(st.icon)), SECTION_TITLES[s],
        h('span', { class: 'muted small' }, `${plural(items.length, 'ejercicio', 'ejercicios')}${R > 1 ? ` × ${R} vueltas` : ''} · ${humanDuration(secs)}`));
      head.style.setProperty('--sec', st.color);
      this.sections[s] = head;
      const grid = h('div', { class: 'hd-grid tv-grid' });
      for (const it of items) {
        const ex = app.catalog.get(it.exerciseId)!;
        n++;
        const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
        const fig = h('div', { class: 'thumb-box tv-thumb' }, img, h('span', { class: 'tv-num' }, String(n)));
        this.io.observe(fig);
        const tile = h('button', { class: 'card hd-row tv-tile', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => app.push(new DetailScreen(app, ex)) },
          fig,
          h('strong', { class: 'hd-name' }, ex.name),
          h('span', { class: 'muted small hd-sub' }, `${it.seconds} s`, it.weight ? ` · ${kg(it.weight)}` : '', ex.oneSided ? ' · ' : '', ex.oneSided ? h('span', { class: 'by-sides' }, 'por lados') : null));
        tile.style.setProperty('--sec', st.color);
        grid.append(tile);
      }
      blocks.push(head, grid);
    }

    this.el.replaceChildren(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, 'Contenido de la tabla'), h('h1', {}, table.name)),
        h('button', { class: 'btn ghost small', onclick: () => app.push(new RoutineScreen(app)) }, icon('edit'), 'Editar')),
      h('section', { class: 'detail-body tv-body' },
        h('div', { class: 'chips tv-chips' },
          h('span', { class: 'chip' }, icon('clock'), plan.isEmpty ? '—' : humanDuration(plan.estimatedSeconds)),
          h('span', { class: 'chip' }, icon('bolt'), plural(plan.exerciseCount, 'ejercicio', 'ejercicios'))),
        h('p', { class: 'muted small' }, 'En el orden en que se harán. Toca un ejercicio para ver cómo se hace.'),
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
