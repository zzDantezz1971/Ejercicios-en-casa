import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { blockRuns, sectionOrder, SECTION_TITLES, type ExerciseDef, type FreeEntry, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { h, humanDuration, kg } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';
import { DetailScreen } from './DetailScreen';
import { neededEquip } from './MakerScreens';
import { EQUIP_INFO } from '../../domain/equipment';
import { blockNav } from '../components/blockNav';
import { countText, planText } from '../planText';

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
    const plan = WorkoutPlan.forTable(table, app.catalog, app.store.settings);
    const blocks: HTMLElement[] = [];
    // todos los ejercicios que se ven, en orden: desde la ficha se pasa de uno a otro deslizando el dedo
    const shown: ExerciseDef[] = [];
    // número de orden dentro de toda la tabla
    const order = sectionOrder(table.order);
    let n = order.slice(0, this.focus ? order.indexOf(this.focus) : 0)
      .reduce((t, s) => t + table.routine[s].filter((i) => app.catalog.has(i.exerciseId)).length, 0);
    // tabla libre: la lista tal cual (ejercicios, descansos y series), numerada
    if (table.free) {
      const list = h('div', { class: 'tv-list' });
      let k = 0;
      const exRow = (e: FreeEntry) => {
        if (e.kind === 'rest') return h('div', { class: 'maker-row tv-row free-rest' }, h('span', { class: 'tv-n' }, ''), h('span', { class: 'free-rest-ico' }, icon('hourglass')),
          h('span', { class: 'maker-name' }, h('span', { class: 'maker-title' }, 'Descanso'), h('span', { class: 'muted small tv-sub' }, h('span', { class: 'tv-secs' }, icon('clock'), `${e.seconds} s`))));
        const ex = app.catalog.get(e.exerciseId);
        if (!ex) return null;
        shown.push(ex);
        k++;
        const st = SECTION_STYLE[ex.section];
        const img = h('img', { alt: '', class: 'maker-thumb' });
        void app.thumbs.get(ex).then((url) => (img.src = url));
        const row = h('button', { class: 'maker-row tv-row', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => app.push(new DetailScreen(app, ex, shown)) },
          h('span', { class: 'tv-n' }, String(k)), img,
          h('span', { class: 'maker-name' }, h('span', { class: 'maker-title' }, ex.name),
            h('span', { class: 'muted small tv-sub' }, h('span', { class: 'tv-secs' }, icon('clock'), `${e.seconds} s`),
              ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
            h('span', { class: 'muted small' }, SECTION_TITLES[ex.section], ' · ', ex.zone)),
          icon('chevron', 'ico chev'));
        row.style.setProperty('--sec', st.color);
        return row;
      };
      for (const n of table.free) {
        if (n.kind !== 'group') { const r = exRow(n); if (r) list.append(r); continue; }
        const box = h('div', { class: 'free-group' },
          h('div', { class: 'free-group-head' }, h('div', { class: 'free-group-top' }, h('span', { class: 'free-group-title' }, h('strong', {}, 'Serie')), h('span', { class: 'sec-rounds' }, `x${n.rounds}`))));
        for (const e of n.items) { const r = exRow(e); if (r) box.append(r); }
        list.append(box);
      }
      blocks.push(list);
    }
    for (const s of table.free ? [] : order) {
      if (this.focus && s !== this.focus) continue;
      const items = table.routine[s].filter((i) => app.catalog.has(i.exerciseId));
      if (!items.length) continue;
      const st = SECTION_STYLE[s];
      const bp = WorkoutPlan.forSection(table.routine, s, app.catalog, app.store.settings, table.rounds ?? {});
      // título del apartado como en Editar (grande, con su color), con el resumen al lado
      const head = h('div', { class: 'tv-head' },
        h('h2', { class: 'maker-sec' }, icon(st.icon), SECTION_TITLES[s]),
        h('span', { class: 'muted small tv-meta' }, planText(bp)));
      head.style.setProperty('--sec', st.color);
      const need = neededEquip(app, { routine: table.routine, rounds: table.rounds ?? {} }, [s]);
      const needEl = need.length ? h('div', { class: 'sec-need small', style: `--sec: ${st.color}` }, h('span', {}, 'Necesitas:'),
        h('div', { class: 'sec-need-items' }, ...need.map(({ e, missing }) => h('span', { class: 'miss-item' + (missing ? ' missing' : '') }, icon(EQUIP_INFO[e].icon as IconName), EQUIP_INFO[e].name)))) : null;
      const list = h('div', { class: 'tv-list' });
      // las series del bloque, en un recuadro con sus vueltas
      const runs = blockRuns(items);
      let box: HTMLElement | null = null;
      items.forEach((it, k) => {
        const run = runs.find((x) => k >= x.start && k <= x.end)!;
        if (run.id && k === run.start) {
          box = h('div', { class: 'free-group' },
            h('div', { class: 'free-group-head' }, h('div', { class: 'free-group-top' }, h('span', { class: 'free-group-title' }, h('strong', {}, 'Serie')), h('span', { class: 'sec-rounds' }, `x${run.rounds}`))));
          list.append(box);
        }
        const into: HTMLElement = run.id && box ? box : list;
        const ex = app.catalog.get(it.exerciseId)!;
        shown.push(ex);
        n++;
        const img = h('img', { alt: '', class: 'maker-thumb', 'data-id': ex.id });
        void app.thumbs.get(ex).then((url) => (img.src = url));
        const row = h('button', { class: 'maker-row tv-row', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => app.push(new DetailScreen(app, ex, shown)) },
          h('span', { class: 'tv-n' }, String(n)),
          img,
          h('span', { class: 'maker-name' },
            h('span', { class: 'maker-title' }, ex.name),
            h('span', { class: 'muted small tv-sub' }, h('span', { class: 'tv-secs' }, icon('clock'), `${it.seconds} s`),
              it.weight ? h('span', { class: 'tv-secs' }, icon('dumbbell'), kg(it.weight)) : null,
              ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
            h('span', { class: 'muted small' }, ex.zone)),
          icon('chevron', 'ico chev'));
        row.style.setProperty('--sec', st.color);
        into.append(row);
      });
      blocks.push(head, ...(needEl ? [needEl] : []), list);
    }

    this.el.replaceChildren(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, table.name), h('h1', {}, this.focus ? SECTION_TITLES[this.focus] : 'Contenido de la tabla'))),
      h('section', { class: 'detail-body tv-body' },
        this.focus ? null : h('div', { class: 'chips tv-chips' },
          h('span', { class: 'chip' }, icon('clock'), plan.isEmpty ? '—' : humanDuration(plan.estimatedSeconds)),
          h('span', { class: 'chip' }, icon('bolt'), countText(plan))),
        h('p', { class: 'muted small' }, 'Toca un ejercicio para ver cómo se hace.'),
        ...blocks,
        // viendo un bloque: al final, botones al bloque anterior y al siguiente (de los que tienen ejercicios)
        this.focus ? blockNav(order.filter((x) => table.routine[x].some((i) => app.catalog.has(i.exerciseId))), this.focus,
          (x, dir) => app.replace(new TableViewScreen(app, x), dir < 0 ? 'back' : 'forward')) : null),
    );
  }

  private loadThumb(fig: HTMLElement): void {
    this.io.unobserve(fig);
    const img = fig.querySelector('img')!;
    const ex = this.app.catalog.get(img.dataset.id!);
    if (ex) void this.app.thumbs.get(ex).then((url) => (img.src = url));
  }
}
