import { tr } from '../../i18n';
import { RoutineEditor, STEP_SECONDS } from '../../domain/RoutineEditor';
import { clampRounds, MAX_ROUNDS } from '../../domain/WorkoutPlan';
import { blockSeconds, SECTION_IDS, SECTION_TITLES, usesWeight, weightUnit, type ExerciseDef, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { actionSheet, append, clear, h, humanDuration, kg, plural, promptDialog, weightDialog } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { badgeList, equipMarks } from '../components/badges';
import { canDo } from '../../domain/equipment';
import { sortableList, type SortableRow } from '../components/sortable';
import { moveItem } from '../../domain/ordering';
import { DetailScreen } from './DetailScreen';
import { byName, listGrouping, type Grouping } from '../listGrouping';

export type ListSort = 'zona' | 'musculo' | 'material' | 'az' | 'personalizada';
const SORT_LABELS: Record<ListSort, string> = { zona: 'Zona del cuerpo', musculo: 'Por músculo (de cabeza a pies)', material: 'Por material', az: 'Alfabético (A-Z)', personalizada: 'Personalizada' };
/** Ejercicio tal como sale en la lista: con el grupo bajo el que se ve (según el orden elegido). */
type Listed = ExerciseDef & { listGroup: string };
/** Preparar rutina: elegir ejercicios por apartado (se numeran en el orden en que se marcan) y su duración. */
export class RoutineScreen implements Screen {
  readonly el = h('main', { class: 'screen routine' });
  private editor: RoutineEditor;
  private section: SectionId = 'calentamiento';
  /** Todos los ejercicios, solo los elegidos (en su orden) o reordenando la lista. */
  private mode: 'all' | 'fav' | 'pilates' | 'chosen' | 'sorting' = 'all';
  private toolbar = h('div', { class: 'routine-toolbar' });
  /** Buscador y, a su lado, el botón de ordenar. */
  private searchRow!: HTMLElement;
  private sortSlot = h('div', { class: 'sort-slot' });
  private hint = h('p', { class: 'hint' });
  private tabs = h('div', { class: 'tabs', role: 'tablist' });
  private list = h('div', { class: 'ex-grid' });
  private footer = h('div', { class: 'routine-footer' });
  private title = h('div', { class: 'titles' });
  private query = '';
  /** Ver también los ejercicios que necesitan material que no se tiene. */
  private search = h('input', { type: 'search', id: 'ex-search', class: 'search-input', placeholder: 'Buscar un ejercicio', 'aria-label': 'Buscar un ejercicio o una zona', autocomplete: 'off', enterkeyhint: 'search' });
  private io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && this.loadThumb(e.target as HTMLElement)), { rootMargin: '300px' });

  constructor(private readonly app: App, section?: SectionId) {
    this.editor = new RoutineEditor(app.store.routine);
    if (section) this.section = section;
    this.search.addEventListener('input', () => {
      this.query = this.search.value;
      this.renderList();
    });
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        this.title,
        h('button', { class: 'icon-btn rename-btn', 'aria-label': 'Cambiar nombre', title: 'Cambiar nombre', onclick: () => void this.rename() }, icon('edit'))),
      this.tabs,
      this.toolbar,
      (this.searchRow = h('div', { class: 'search-row' }, h('label', { class: 'search', for: 'ex-search' }, icon('search'), this.search), this.sortSlot)),
      this.hint,
      this.list,
      this.footer,
    );
    // alto de los apartados (fijos arriba), para dejar la barra de ordenar justo debajo
    new ResizeObserver(() => this.el.style.setProperty('--tabs-h', `${this.tabs.offsetHeight}px`)).observe(this.tabs);
  }

  enter(): void {
    this.editor = new RoutineEditor(this.app.store.routine);
    this.title.replaceChildren(h('span', { class: 'subtitle' }, 'Editar tabla'), h('h1', {}, this.app.store.active.name));
    this.render();
  }

  /** Cambiar el nombre de la tabla que se está editando. */
  private async rename(): Promise<void> {
    const t = this.app.store.active;
    const name = await promptDialog('Nuevo nombre', t.name, 'Guardar');
    if (!name) return;
    this.app.store.renameRoutine(t.id, name);
    this.title.querySelector('h1')!.textContent = this.app.store.active.name;
  }

  dispose(): void {
    this.io.disconnect();
  }

  private save(): void {
    this.app.store.saveRoutine(this.editor.value);
  }

  private render(): void {
    this.renderTabs();
    this.renderToolbar();
    this.renderList();
    this.renderFooter();
  }

  /** Selector Todos / Elegidos y botón para ordenar la lista. */
  private renderToolbar(): void {
    clear(this.toolbar);
    // mientras se ordena, la barra (Restablecer / Listo) se queda fija bajo los apartados
    this.toolbar.classList.toggle('sticky-sort', this.mode === 'sorting');
    const n = this.editor.value[this.section].length;
    const title = this.app.sections.find((s) => s.id === this.section)!.title;
    this.searchRow.hidden = this.mode !== 'all';
    this.hint.hidden = false;
    this.sortSlot.replaceChildren();
    if (this.mode === 'sorting') {
      this.toolbar.append(
        h('div', { class: 'sorting-bar' },
          h('span', { class: 'sorting-title' }, icon('tables'), h('span', {}, `Ordenando ${title}`)),
          this.app.store.customOrder(this.section, 'personalizada') || this.app.store.customOrder(this.section)
            ? h('button', { class: 'btn ghost small', onclick: () => {
              this.app.store.resetOrder(this.section, 'personalizada');
              this.app.store.resetOrder(this.section);
              this.refresh();
            } }, 'Restablecer')
            : null,
          h('button', { class: 'btn primary small', onclick: () => { this.mode = 'all'; this.refresh(); } }, icon('check'), 'Listo')),
      );
      this.hint.replaceChildren('Arrastra cada ejercicio por el asa ', icon('tables', 'ico inline'), ' o usa las flechas para colocarlo donde quieras. Este orden es el de la lista, igual para todas tus tablas.');
      return;
    }
    const seg = (m: 'all' | 'fav' | 'pilates' | 'chosen', label: string | Node) =>
      h('button', { class: 'seg' + (this.mode === m ? ' on' : ''), 'aria-pressed': String(this.mode === m), onclick: () => { this.mode = m; this.clearSearch(); window.scrollTo(0, 0); this.render(); } }, label);
    // orden: Todos/Favoritos/Elegidos; después el tipo de orden, Ordenar lista y Vueltas (el buscador va debajo)
    this.toolbar.append(h('div', { class: 'segmented' }, seg('all', 'Todos'), seg('fav', h('span', { class: 'seg-fav' }, icon('starFill'), 'Favoritos')),
      // solo los de pilates de este bloque (si tiene alguno)
      this.pilatesIn(this.section) ? seg('pilates', 'Pilates') : null, seg('chosen', `Elegidos (${n})`)));
    if (this.mode === 'all') {
      // ordenar la lista por zona, músculo, material o nombre (cada uno con su propio orden personalizado):
      // botón «Ordenar» al lado del buscador, que abre la lista de órdenes
      const cur = this.sort;
      this.sortSlot.append(h('button', { class: 'sort-btn', 'aria-label': 'Ordenar por', onclick: async () => {
        const v = await actionSheet<ListSort>('Ordenar por', (Object.entries(SORT_LABELS) as Array<[ListSort, string]>)
          .map(([id, label]) => ({ id, label: (id === cur ? '✓ ' : '') + tr(label) })));
        if (!v) return;
        this.sortNow = v;
        // al elegir «Personalizada» se abre la lista entera para ordenarla
        if (v === 'personalizada') { this.mode = 'sorting'; this.clearSearch(); }
        window.scrollTo(0, 0);
        this.render();
      } }, icon('sort'), h('span', {}, 'Ordenar')));
      append(this.toolbar,
        // con «Personalizada», para volver a cambiar tu orden
        cur === 'personalizada' ? h('button', { class: 'btn ghost small', onclick: () => {
          this.mode = 'sorting'; this.clearSearch(); window.scrollTo(0, 0); this.render();
        } }, icon('tables'), 'Ordenar lista') : null);
    }
    if (this.mode === 'pilates') {
      this.hint.replaceChildren('Ejercicios de pilates de este bloque. Pulsa Seleccionar para añadirlo a la tabla.');
    } else if (this.mode === 'fav') {
      this.hint.replaceChildren(this.favs().length
        ? 'Tus ejercicios favoritos de este bloque. Pulsa Seleccionar para añadirlo a la tabla.'
        : h('span', {}, 'Aún no tienes favoritos en este bloque. Toca un ejercicio y pulsa la estrella ', icon('star', 'ico inline'), '.'));
    } else if (this.mode === 'chosen') {
      this.hint.replaceChildren(n
        ? h('span', {}, 'Este es el orden en que se harán. Arrastra por el asa ', icon('tables', 'ico inline'), ' o usa las flechas para cambiarlo.')
        : 'Aún no has elegido ejercicios en este bloque. Márcalos en "Todos".');
    } else {
      // en «Todos» no hace falta la ayuda: ocupa sitio y se entiende sola
      this.hint.hidden = true;
    }
  }

  /** Vueltas del bloque (repetir todos sus ejercicios 2, 3… veces seguidas): botón pequeño y, al tocarlo, el control. */
  private roundsOpen = false;
  private roundsControl(): HTMLElement[] {
    const r = clampRounds(this.app.store.active.rounds?.[this.section]);
    const set = (v: number) => { this.app.store.setRounds(this.section, v); this.refresh(); };
    const panel = h('div', { class: 'rounds-ctl', hidden: !this.roundsOpen },
      h('span', { class: 'rounds-label' }, 'Vueltas'),
      h('div', { class: 'stepper inline' },
        h('button', { 'aria-label': 'Menos vueltas', disabled: r <= 1, onclick: () => set(r - 1) }, '−'),
        h('span', { class: 'secs' }, `x${r}`),
        h('button', { 'aria-label': 'Más vueltas', disabled: r >= MAX_ROUNDS, onclick: () => set(r + 1) }, '+')),
      h('p', { class: 'rounds-tip' }, 'Cuántas veces seguidas se repiten todos los ejercicios de este bloque. Con x2, por ejemplo, se hace la lista entera dos veces.'));
    const chip = h('button', { class: 'rounds-chip' + (r > 1 ? ' on' : ''), 'aria-expanded': String(this.roundsOpen), 'aria-label': `Vueltas: x${r}`, onclick: () => {
      this.roundsOpen = !this.roundsOpen;
      panel.hidden = !this.roundsOpen;
      chip.setAttribute('aria-expanded', String(this.roundsOpen));
    } }, icon('swap'), h('span', {}, 'Vueltas'), h('strong', {}, `x${r}`));
    return [chip, panel];
  }

  /** Orden de la lista mientras estás en esta pantalla; al volver a entrar, otra vez «por zona» (no se recuerda). */
  private sortNow: ListSort = 'zona';

  /** Ejercicios visibles de un apartado, en el orden elegido. */
  private get sort(): ListSort {
    return this.sortNow;
  }

  /** Grupos de la lista en un tipo de orden (en A-Z no hay: un único grupo sin título). */
  private grouping(sectionId: SectionId, sort: ListSort = this.sort): Grouping {
    return listGrouping(this.app.sections.find((s) => s.id === sectionId)!.exercises, sort);
  }

  /**
   * Ejercicios visibles de un apartado en el tipo de orden elegido: por grupos y, dentro de cada grupo,
   * alfabético; o, si lo has ordenado tú, en tu orden y en el grupo donde dejaste cada uno.
   */
  private ordered(sectionId: SectionId, sort: ListSort = this.sort): Listed[] {
    const sec = this.app.sections.find((s) => s.id === sectionId)!;
    const hidden = this.app.store.hidden;
    const visible = sec.exercises.filter((e) => !hidden.has(e.id)).sort(byName);
    if (sort === 'personalizada') {
      // tu orden, una sola lista sin grupos; de entrada (o los que falten), el orden por zona
      const base = this.ordered(sectionId, 'zona');
      const saved = this.app.store.customOrder(sectionId, 'personalizada')
        // de una versión anterior: el orden propio que se hizo con «Zona del cuerpo»
        ?? this.app.store.customOrder(sectionId, 'zona');
      const left = new Map(base.map((e) => [e.id, e]));
      const out: Listed[] = [];
      for (const t of saved ?? []) {
        const e = left.get(t);
        if (!e) continue;
        left.delete(t);
        out.push({ ...e, listGroup: '' });
      }
      for (const e of left.values()) out.push({ ...e, listGroup: '' });
      return out;
    }
    // los demás órdenes son automáticos: por grupos y, dentro de cada grupo, alfabético
    const gr = this.grouping(sectionId, sort);
    const segs = new Map<string, Listed[]>(gr.keys.map((k) => [k, []]));
    for (const e of visible) segs.get(gr.keyOf(e))!.push({ ...e, listGroup: gr.keyOf(e) });
    return [...segs.values()].flat();
  }

  /** Aviso al final de la lista: cuántos ejercicios necesitan material que no tiene (para verlos, añadirlo en Mis datos). */
  private equipNote(sectionId: SectionId): HTMLElement | null {
    const owned = new Set<string>(this.app.store.settings.equipment);
    const n = this.ordered(sectionId).filter((e) => !canDo(e.equip, owned)).length;
    if (!n) return null;
    return h('div', { class: 'equip-note' },
      icon('dumbbell'),
      h('span', {}, h('span', {}, plural(n, 'ejercicio necesita material que no tienes.', 'ejercicios necesitan material que no tienes.')), ' ',
        h('span', {}, 'Para verlos, añade ese material en Mis datos › Mi material.')));
  }

  /** ¿Tiene ejercicios de pilates este bloque? */
  private pilatesIn(sectionId: SectionId): boolean {
    return !!this.app.sections.find((s) => s.id === sectionId)?.exercises.some((e) => e.pilates && !this.app.store.hidden.has(e.id));
  }

  /** Favoritos del apartado, en el orden de la lista. */
  private favs(): ExerciseDef[] {
    const f = this.app.store.favorites;
    return this.ordered(this.section).filter((e) => f.has(e.id));
  }

  /** Miniatura pequeña para las filas ordenables. */
  private miniThumb(ex: ExerciseDef): HTMLElement {
    const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
    const fig = h('div', { class: 'thumb-box mini' }, img);
    this.io.observe(fig);
    return fig;
  }

  /** Lista de la tabla en orden de ejecución, para reordenar. */
  private renderChosen(): void {
    const items = this.editor.value[this.section];
    if (!items.length) return;
    const rows = items.map((it, i) => {
      const ex = this.app.catalog.get(it.exerciseId)!;
      this.shown.push(ex);
      const content = h('div', { class: 'row-ex' },
        h('span', { class: 'order' }, i + 1),
        // tocar la miniatura o el nombre abre la ficha (cómo se hace)
        h('button', { class: 'row-open', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => this.open(ex) }, this.miniThumb(ex)),
        h('div', { class: 'row-text' },
          h('button', { class: 'row-open row-name', onclick: () => this.open(ex) }, h('strong', {}, ex.name)),
          ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null,
          h('div', { class: 'stepper inline' },
            h('button', { 'aria-label': 'Menos tiempo', onclick: () => this.adjust(ex, -STEP_SECONDS) }, '−'),
            h('span', { class: 'secs' }, `${it.seconds} s`),
            h('button', { 'aria-label': 'Más tiempo', onclick: () => this.adjust(ex, STEP_SECONDS) }, '+'),
            h('button', { class: 'remove-btn', 'aria-label': `Quitar ${ex.name} de la tabla`, onclick: () => void this.toggle(ex) }, icon('close'))),
          usesWeight(ex) ? this.weightButton(ex, it.weight) : null));
      content.style.setProperty('--sec', SECTION_STYLE[ex.section].color);
      return { content, label: ex.name };
    });
    this.list.append(sortableList(rows, (from, to) => {
      this.editor.move(this.section, from, to);
      this.save();
      this.refresh();
    }));
  }

  /** Lista del apartado para cambiar su orden (sin subgrupos). */
  private renderSorting(): void {
    // una sola lista con los títulos de grupo fijos: puedes llevar un ejercicio a cualquier grupo
    // se ordena la lista «Personalizada»: entera, sin grupos
    const exs = this.ordered(this.section, 'personalizada');
    const rows: Array<SortableRow & { tok: string }> = exs.map((ex) => ({
      tok: ex.id, label: ex.name,
      content: h('div', { class: 'row-ex' }, this.miniThumb(ex), h('div', { class: 'row-text' }, h('strong', {}, ex.name), h('span', { class: 'muted small' }, ex.zone), ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null)),
    }));
    this.list.append(sortableList(rows, (from, to) => {
      const toks = moveItem(rows.map((r) => r.tok), from, to);
      this.app.store.setOrder(this.section, toks, 'personalizada');
      this.refresh();
    }));
  }

  private renderTabs(): void {
    clear(this.tabs);
    // cuadro con los cuatro apartados y un título claro
    this.tabs.append(h('p', { class: 'tabs-title' }, icon('tables'), 'Elige el bloque'));
    for (const s of this.app.sections) {
      // solo se ve cuántos ejercicios has elegido en cada apartado (si hay alguno)
      const n = this.editor.value[s.id].length;
      this.tabs.append(
        h('button', {
          class: 'tab' + (s.id === this.section ? ' active' : ''), role: 'tab', 'aria-selected': String(s.id === this.section),
          style: { '--sec': SECTION_STYLE[s.id].color },
          onclick: () => { this.section = s.id; this.clearSearch(); window.scrollTo(0, 0); this.render(); },
        }, icon(SECTION_STYLE[s.id].icon), s.title, n ? h('span', { class: 'tab-count' }, n) : null),
      );
    }
    this.el.style.setProperty('--sec', SECTION_STYLE[this.section].color);
    requestAnimationFrame(() => this.tabs.querySelector('.tab.active')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  }

  private clearSearch(): void {
    this.query = '';
    this.search.value = '';
  }

  /** Lista de ejercicios y, a la derecha del primer título de grupo, el botón pequeño de las vueltas. */
  private renderList(): void {
    // se repinta sin moverse de sitio (en Android, al vaciar la lista la pantalla volvía arriba)
    const y = window.scrollY;
    this.renderListInner();
    this.placeRounds();
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  /** Vueltas: botón pequeño («↻ Vueltas x1») a la derecha del primer título de la lista; al tocarlo se abre debajo el control. */
  private placeRounds(): void {
    if (this.mode === 'sorting') return;
    const [chip, panel] = this.roundsControl();
    const first = this.list.querySelector('.group-title');
    if (first) {
      first.classList.add('with-rounds');
      first.append(chip);
      first.after(panel);
    } else {
      const row = h('div', { class: 'rounds-row' }, chip);
      this.list.prepend(row);
      row.after(panel);
    }
  }

  private renderListInner(): void {
    this.io.disconnect();
    clear(this.list);
    this.shown = [];
    this.list.className = this.mode === 'all' || this.mode === 'fav' || this.mode === 'pilates' ? 'ex-grid' : 'ex-rows';
    if (this.mode === 'fav') {
      this.favs().forEach((ex) => this.list.append(this.card(ex)));
      return;
    }
    if (this.mode === 'pilates') {
      // los de pilates del bloque, en el orden de la lista (los que piden material que no tienes, no)
      const owned = new Set<string>(this.app.store.settings.equipment);
      this.ordered(this.section).filter((e) => e.pilates && canDo(e.equip, owned)).forEach((ex) => this.list.append(this.card(ex)));
      return;
    }
    if (this.mode === 'chosen') return this.renderChosen();
    if (this.mode === 'sorting') return this.renderSorting();
    const q = normalize(this.query.trim());
    if (q) {
      // Búsqueda en todos los apartados
      // se busca en el nombre que se ve (traducido), en castellano (el identificador) y en la zona;
      // también salen los que piden material que no tienes (al final de cada apartado)
      const match = (e: ExerciseDef) => normalize(`${e.name} ${tr(e.name)} ${e.id.replace(/-/g, ' ')} ${e.zone} ${tr(e.zone)} ${e.group ? tr(e.group) : ''}`).includes(q);
      const owned = new Set<string>(this.app.store.settings.equipment);
      let found = 0;
      for (const sec of this.app.sections) {
        const all = this.ordered(sec.id).filter(match);
        const hits = [...all.filter((e) => canDo(e.equip, owned)), ...all.filter((e) => !canDo(e.equip, owned))];
        if (!hits.length) continue;
        found += hits.length;
        this.list.append(h('h2', { class: 'group-title' }, sec.title));
        hits.forEach((ex) => this.list.append(this.card(ex)));
      }
      if (!found) {
        this.list.append(h('p', { class: 'empty-state' }, `No hay ejercicios que coincidan con "${this.query.trim()}".`));
        // los que se han eliminado de la lista no salen, pero se avisa
        const gone = this.app.sections.flatMap((sec) => sec.exercises).filter((e) => this.app.store.hidden.has(e.id) && match(e));
        if (gone.length) this.list.append(h('p', { class: 'muted small empty-state' }, `Lo eliminaste de la lista: ${gone.map((e) => e.name).join(', ')}.`));
      }
      return;
    }
    const sort = this.sort;
    const owned = new Set<string>(this.app.store.settings.equipment);
    const gr = this.grouping(this.section, sort);
    const all = this.ordered(this.section, sort);
    // cada grupo con su título (en A-Z no hay)
    const put = (list: Listed[]) => {
      let g: string | undefined;
      for (const ex of list) {
        if (ex.listGroup && ex.listGroup !== g) {
          g = ex.listGroup;
          this.list.append(h('h2', { class: 'group-title zone-title' }, gr.icon(g), gr.title(g)));
        }
        this.list.append(this.card(ex));
      }
    };
    put(all.filter((e) => canDo(e.equip, owned)));
    const note = this.equipNote(this.section);
    if (note) this.list.append(note);
    // los que necesitan material que no se tiene van aparte, al final (también con sus grupos)
  }

  /** Abre la ficha del ejercicio. */
  private open(ex: ExerciseDef): void {
    this.app.push(new DetailScreen(this.app, ex, this.shown));
  }

  /** Ejercicios de la lista que se ve, en su orden (para pasar de uno a otro en la ficha). */
  private shown: ExerciseDef[] = [];

  private card(ex: ExerciseDef): HTMLElement {
    this.shown.push(ex);
    const pos = this.editor.position(ex.section, ex.id);
    const secs = this.editor.seconds(ex.section, ex.id);
    const owned = new Set<string>(this.app.store.settings.equipment);
    const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
    const fig = h('div', { class: 'thumb-box' + (ex.pending ? ' pending' : '') }, img, ex.pending ? h('span', { class: 'pending-label' }, 'Animación en preparación') : null,
      equipMarks(ex.equip, owned),
      h('span', { class: 'sec-mark', title: SECTION_TITLES[ex.section], 'aria-label': SECTION_TITLES[ex.section] }, icon(SECTION_STYLE[ex.section].icon)));
    this.io.observe(fig);
    const card = h('article', { class: 'ex-card' + (pos ? ' selected' : ''), style: { '--sec': SECTION_STYLE[ex.section].color } },
      // toda la ficha (menos sus botones) abre el ejercicio: muñeco y cómo se hace
      h('button', { class: 'ex-main', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => this.open(ex) },
        fig,
        h('span', { class: 'ex-name' }, pos ? h('span', { class: 'order' }, pos) : null, h('span', {}, ex.name, this.app.store.favorites.has(ex.id) ? icon('starFill', 'ico fav-star') : null)),
        h('span', { class: 'ex-zone' }, h('span', {}, ex.zone), ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
        badgeList(ex.badges)),
      h('div', { class: 'ex-actions' },
        pos ? h('div', { class: 'stepper' },
          h('button', { 'aria-label': 'Menos tiempo', onclick: () => this.adjust(ex, -STEP_SECONDS) }, '−'),
          h('span', { class: 'secs' }, icon('clock'), `${secs} s`),
          h('button', { 'aria-label': 'Más tiempo', onclick: () => this.adjust(ex, STEP_SECONDS) }, '+')) : null,
        pos && usesWeight(ex) ? this.weightButton(ex, this.editor.weight(ex.section, ex.id)) : null,
        h('button', { class: 'select-btn' + (pos ? ' on' : ''), 'aria-pressed': String(!!pos), onclick: () => void this.toggle(ex) },
          ...(pos ? [icon('check'), h('span', {}, 'Seleccionado')] : [icon('plus'), h('span', {}, 'Seleccionar')]))),
    );
    return card;
  }

  /** Botón con el peso por mancuerna; al tocarlo se cambia. */
  private weightButton(ex: ExerciseDef, weight: number | undefined): HTMLElement {
    return h('button', {
      class: 'weight-btn' + (weight ? '' : ' none'),
      'aria-label': `Peso de ${ex.name}: ${weight ? kg(weight) + ' por mancuerna' : 'sin peso'}. Cambiar`,
      onclick: async () => {
        const w = await weightDialog(ex.name, weight ?? this.app.store.lastWeight(ex.id) ?? (/barra/.test(weightUnit(ex)) ? 20 : 5), weightUnit(ex));
        if (w === null) return;
        this.editor.setWeight(ex.section, ex.id, w || undefined);
        this.save();
        this.refresh();
      },
    }, icon('dumbbell'), weight ? kg(weight) : 'Sin peso', h('span', { class: 'wb-edit' }, icon('edit')));
  }

  private loadThumb(fig: HTMLElement): void {
    this.io.unobserve(fig);
    const img = fig.querySelector('img')!;
    const ex = this.app.catalog.get(img.dataset.id!);
    if (ex) void this.app.thumbs.get(ex).then((url) => (img.src = url));
  }

  private async toggle(ex: ExerciseDef): Promise<void> {
    let weight: number | undefined;
    if (!this.editor.position(ex.section, ex.id) && usesWeight(ex)) {
      // al elegir un ejercicio con mancuerna se pide el peso (propone el último usado)
      const w = await weightDialog(ex.name, this.app.store.lastWeight(ex.id) ?? (/barra/.test(weightUnit(ex)) ? 20 : 5), weightUnit(ex));
      if (w === null) return;
      weight = w || undefined;
    }
    this.editor.toggle(ex.section, ex.id, this.app.store.settings.defaultSeconds, weight);
    this.app.haptics.tap();
    this.save();
    this.refresh();
  }

  private adjust(ex: ExerciseDef, delta: number): void {
    this.editor.adjust(ex.section, ex.id, delta);
    this.save();
    this.refresh();
  }

  /** Repinta sin perder la posición de la lista. */
  private refresh(): void {
    const y = window.scrollY;
    this.render();
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  private renderFooter(): void {
    clear(this.footer);
    const r = this.editor.value;
    const count = SECTION_IDS.reduce((n, s) => n + r[s].length, 0);
    const rounds = this.app.store.active.rounds ?? {};
    const secs = SECTION_IDS.reduce((n, s) => n + blockSeconds(r[s]) * clampRounds(rounds[s]), 0);
    const inSection = r[this.section].length;
    if (this.mode === 'sorting') {
      this.footer.hidden = true;
      return;
    }
    this.footer.hidden = false;
    append(this.footer,
      h('div', { class: 'footer-info' },
        h('strong', {}, count ? `${plural(count, 'ejercicio', 'ejercicios')} · ${humanDuration(secs)}` : 'Ningún ejercicio elegido'),
        h('span', { class: 'muted' }, inSection ? `${inSection} en este bloque` : 'Nada en este bloque')),
      inSection ? h('button', { class: 'btn ghost small', onclick: () => { this.editor.clearSection(this.section); this.save(); this.refresh(); } }, 'Quitar todos') : null,
      h('button', { class: 'btn primary small', onclick: () => this.app.back() }, icon('check'), 'Hecho'),
    );
  }
}

function normalize(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘´`]/g, "'").replace(/·/g, '').toLowerCase();
}

