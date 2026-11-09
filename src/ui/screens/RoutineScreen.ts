import { tr } from '../../i18n';
import { RoutineEditor, STEP_SECONDS } from '../../domain/RoutineEditor';
import { clampRounds, MAX_ROUNDS } from '../../domain/WorkoutPlan';
import { SECTION_IDS, usesWeight, type ExerciseDef, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { append, clear, h, humanDuration, kg, plural, promptDialog, weightDialog } from '../dom';
import { icon, SECTION_STYLE, zoneIcon } from '../icons';
import { badgeList, equipChips, sidesMark } from '../components/badges';
import { canDo } from '../../domain/equipment';
import { sortableList } from '../components/sortable';
import { applyOrder, moveItem } from '../../domain/ordering';
import { DetailScreen } from './DetailScreen';

/** Preparar rutina: elegir ejercicios por apartado (se numeran en el orden en que se marcan) y su duración. */
export class RoutineScreen implements Screen {
  readonly el = h('main', { class: 'screen routine' });
  private editor: RoutineEditor;
  private section: SectionId = 'calentamiento';
  /** Todos los ejercicios, solo los elegidos (en su orden) o reordenando la lista. */
  private mode: 'all' | 'fav' | 'chosen' | 'sorting' = 'all';
  private toolbar = h('div', { class: 'routine-toolbar' });
  private searchBox: HTMLElement;
  private hint = h('p', { class: 'hint' });
  private tabs = h('div', { class: 'tabs', role: 'tablist' });
  private list = h('div', { class: 'ex-grid' });
  private footer = h('div', { class: 'routine-footer' });
  private title = h('div', { class: 'titles' });
  private query = '';
  /** Ver también los ejercicios que necesitan material que no se tiene. */
  private showAllEquip = false;
  private search = h('input', { type: 'search', id: 'ex-search', class: 'search-input', placeholder: 'Buscar ejercicio o zona', autocomplete: 'off', enterkeyhint: 'search' });
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
      (this.searchBox = h('label', { class: 'search', for: 'ex-search' }, icon('search'), this.search)),
      this.hint,
      this.list,
      this.footer,
    );
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
    const n = this.editor.value[this.section].length;
    const title = this.app.sections.find((s) => s.id === this.section)!.title;
    this.searchBox.hidden = this.mode !== 'all';
    if (this.mode === 'sorting') {
      this.toolbar.append(
        h('div', { class: 'sorting-bar' },
          h('span', { class: 'sorting-title' }, icon('tables'), `Ordenando ${title}`),
          this.app.store.customOrder(this.section)
            ? h('button', { class: 'btn ghost small', onclick: () => { this.app.store.resetOrder(this.section); this.refresh(); } }, 'Restablecer')
            : null,
          h('button', { class: 'btn primary small', onclick: () => { this.mode = 'all'; this.refresh(); } }, icon('check'), 'Listo')),
      );
      this.hint.replaceChildren('Arrastra cada ejercicio por el asa ', icon('tables', 'ico inline'), ' o usa las flechas para colocarlo donde quieras. Este orden es el de la lista, igual para todas tus tablas.');
      return;
    }
    const seg = (m: 'all' | 'fav' | 'chosen', label: string | Node) =>
      h('button', { class: 'seg' + (this.mode === m ? ' on' : ''), 'aria-pressed': String(this.mode === m), onclick: () => { this.mode = m; this.clearSearch(); window.scrollTo(0, 0); this.render(); } }, label);
    append(this.toolbar,
      h('div', { class: 'segmented' }, seg('all', 'Todos'), seg('fav', h('span', { class: 'seg-fav' }, icon('starFill'), 'Favoritos')), seg('chosen', `Elegidos (${n})`)),
      this.mode === 'all'
        ? h('button', { class: 'btn ghost small', onclick: () => { this.mode = 'sorting'; this.clearSearch(); window.scrollTo(0, 0); this.render(); } }, icon('tables'), 'Ordenar lista')
        : null,
      n ? this.roundsControl() : null,
    );
    if (this.mode === 'fav') {
      this.hint.replaceChildren(this.favs().length
        ? 'Tus ejercicios favoritos de este apartado. Toca uno para añadirlo a la tabla.'
        : h('span', {}, 'Aún no tienes favoritos en este apartado. Abre un ejercicio con ', icon('info', 'ico inline'), ' y pulsa la estrella ', icon('star', 'ico inline'), '.'));
    } else if (this.mode === 'chosen') {
      this.hint.replaceChildren(n
        ? h('span', {}, 'Este es el orden en que se harán. Arrastra por el asa ', icon('tables', 'ico inline'), ' o usa las flechas para cambiarlo.')
        : 'Aún no has elegido ejercicios en este apartado. Márcalos en "Todos".');
    } else {
      this.hint.replaceChildren('Toca un ejercicio para añadirlo al final de la tabla. Pulsa ', icon('info', 'ico inline'), ' para ver cómo se hace.');
    }
  }

  /** Vueltas del apartado: repetir todos sus ejercicios 2, 3… veces seguidas. */
  private roundsControl(): HTMLElement {
    const r = clampRounds(this.app.store.active.rounds?.[this.section]);
    const set = (v: number) => { this.app.store.setRounds(this.section, v); this.refresh(); };
    return h('div', { class: 'rounds-ctl' },
      icon('swap'),
      h('span', { class: 'rounds-label' }, 'Vueltas'),
      h('div', { class: 'stepper inline' },
        h('button', { 'aria-label': 'Menos vueltas', disabled: r <= 1, onclick: () => set(r - 1) }, '−'),
        h('span', { class: 'secs' }, `× ${r}`),
        h('button', { 'aria-label': 'Más vueltas', disabled: r >= MAX_ROUNDS, onclick: () => set(r + 1) }, '+')));
  }

  /** Ejercicios visibles de un apartado, en el orden elegido por el usuario. */
  private ordered(sectionId: SectionId): ExerciseDef[] {
    const sec = this.app.sections.find((s) => s.id === sectionId)!;
    const hidden = this.app.store.hidden;
    return applyOrder(sec.exercises, this.app.store.customOrder(sectionId)).filter((e) => !hidden.has(e.id));
  }

  /** Ejercicios que se pueden hacer con el material que tiene el usuario (o todos, si los pide ver). */
  private visible(sectionId: SectionId): ExerciseDef[] {
    const all = this.ordered(sectionId);
    if (this.showAllEquip) return all;
    const owned = new Set<string>(this.app.store.settings.equipment);
    return all.filter((e) => canDo(e.equip, owned));
  }

  /** Aviso al final de la lista: cuántos ejercicios necesitan material que no tiene, y botón para verlos. */
  private equipNote(sectionId: SectionId): HTMLElement | null {
    const owned = new Set<string>(this.app.store.settings.equipment);
    const n = this.ordered(sectionId).filter((e) => !canDo(e.equip, owned)).length;
    if (!n) return null;
    return h('div', { class: 'equip-note' },
      icon('dumbbell'),
      h('span', {}, this.showAllEquip ? 'Se muestran también los que necesitan material que no tienes.' : plural(n, 'ejercicio necesita material que no tienes.', 'ejercicios necesitan material que no tienes.')),
      h('button', { class: 'link-btn', onclick: () => { this.showAllEquip = !this.showAllEquip; this.renderList(); } }, this.showAllEquip ? 'Ocultarlos' : 'Mostrarlos'));
  }

  /** Favoritos del apartado, en el orden de la lista. */
  private favs(): ExerciseDef[] {
    const f = this.app.store.favorites;
    return this.ordered(this.section).filter((e) => f.has(e.id));
  }

  /** Miniatura pequeña para las filas ordenables. */
  private miniThumb(ex: ExerciseDef): HTMLElement {
    const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
    const fig = h('div', { class: 'thumb-box mini' }, img, ex.oneSided ? sidesMark(true) : null);
    this.io.observe(fig);
    return fig;
  }

  /** Lista de la tabla en orden de ejecución, para reordenar. */
  private renderChosen(): void {
    const items = this.editor.value[this.section];
    if (!items.length) return;
    const rows = items.map((it, i) => {
      const ex = this.app.catalog.get(it.exerciseId)!;
      const content = h('div', { class: 'row-ex' },
        h('span', { class: 'order' }, i + 1),
        this.miniThumb(ex),
        h('div', { class: 'row-text' },
          h('strong', {}, ex.name),
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
    const exs = this.ordered(this.section);
    const rows = exs.map((ex) => ({
      content: h('div', { class: 'row-ex' }, this.miniThumb(ex), h('div', { class: 'row-text' }, h('strong', {}, ex.name), h('span', { class: 'muted small' }, ex.zone))),
      label: ex.name,
    }));
    this.list.append(sortableList(rows, (from, to) => {
      // el orden guardado incluye también los eliminados, en su sitio relativo al final
      const ids = moveItem(exs.map((e) => e.id), from, to);
      const all = this.app.sections.find((s) => s.id === this.section)!.exercises.map((e) => e.id);
      this.app.store.setOrder(this.section, [...ids, ...all.filter((id) => !ids.includes(id))]);
      this.refresh();
    }));
  }

  private renderTabs(): void {
    clear(this.tabs);
    for (const s of this.app.sections) {
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

  private renderList(): void {
    this.io.disconnect();
    clear(this.list);
    this.list.className = this.mode === 'all' || this.mode === 'fav' ? 'ex-grid' : 'ex-rows';
    if (this.mode === 'fav') {
      this.favs().forEach((ex) => this.list.append(this.card(ex)));
      return;
    }
    if (this.mode === 'chosen') return this.renderChosen();
    if (this.mode === 'sorting') return this.renderSorting();
    const q = normalize(this.query.trim());
    if (q) {
      // Búsqueda en todos los apartados
      let found = 0;
      for (const sec of this.app.sections) {
        const hits = this.visible(sec.id).filter((e) => normalize(`${e.name} ${e.zone} ${e.group ? tr(e.group) : ''}`).includes(q));
        if (!hits.length) continue;
        found += hits.length;
        this.list.append(h('h2', { class: 'group-title' }, sec.title));
        hits.forEach((ex) => this.list.append(this.card(ex)));
      }
      if (!found) this.list.append(h('p', { class: 'empty-state' }, `No hay ejercicios que coincidan con "${this.query.trim()}".`));
      return;
    }
    // con orden personalizado no hay subgrupos: la lista es libre
    const custom = !!this.app.store.customOrder(this.section);
    let group: string | undefined;
    for (const ex of this.visible(this.section)) {
      if (!custom && ex.group && ex.group !== group) {
        group = ex.group;
        this.list.append(h('h2', { class: 'group-title zone-title' }, zoneIcon(group), group));
      }
      this.list.append(this.card(ex));
    }
    const note = this.equipNote(this.section);
    if (note) this.list.append(note);
  }

  private card(ex: ExerciseDef): HTMLElement {
    const pos = this.editor.position(ex.section, ex.id);
    const secs = this.editor.seconds(ex.section, ex.id);
    const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
    const fig = h('div', { class: 'thumb-box' + (ex.pending ? ' pending' : '') }, img, ex.pending ? h('span', { class: 'pending-label' }, 'Animación en preparación') : null,
      ex.viewLabel && !ex.pending ? h('span', { class: 'view-label' }, ex.viewLabel) : null, ex.oneSided ? sidesMark() : null);
    this.io.observe(fig);
    const card = h('article', { class: 'ex-card' + (pos ? ' selected' : ''), style: { '--sec': SECTION_STYLE[ex.section].color } },
      h('button', { class: 'ex-main', 'aria-pressed': String(!!pos), onclick: () => void this.toggle(ex) },
        fig,
        h('span', { class: 'ex-name' }, pos ? h('span', { class: 'order' }, pos) : null, h('span', {}, ex.name, this.app.store.favorites.has(ex.id) ? icon('starFill', 'ico fav-star') : null)),
        h('span', { class: 'ex-zone' }, ex.zone, ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
        equipChips(ex.equip, new Set<string>(this.app.store.settings.equipment)),
        badgeList(ex.badges)),
      h('button', { class: 'info-btn', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => this.app.push(new DetailScreen(this.app, ex)) }, icon('info')),
      pos ? h('div', { class: 'stepper' },
        h('button', { 'aria-label': 'Menos tiempo', onclick: () => this.adjust(ex, -STEP_SECONDS) }, '−'),
        h('span', { class: 'secs' }, icon('clock'), `${secs} s`),
        h('button', { 'aria-label': 'Más tiempo', onclick: () => this.adjust(ex, STEP_SECONDS) }, '+')) : null,
      pos && usesWeight(ex) ? this.weightButton(ex, this.editor.weight(ex.section, ex.id)) : null,
    );
    return card;
  }

  /** Botón con el peso por mancuerna; al tocarlo se cambia. */
  private weightButton(ex: ExerciseDef, weight: number | undefined): HTMLElement {
    return h('button', {
      class: 'weight-btn' + (weight ? '' : ' none'),
      'aria-label': `Peso de ${ex.name}: ${weight ? kg(weight) + ' por mancuerna' : 'sin peso'}. Cambiar`,
      onclick: async () => {
        const w = await weightDialog(ex.name, weight ?? this.app.store.lastWeight(ex.id) ?? 5);
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
      const w = await weightDialog(ex.name, this.app.store.lastWeight(ex.id) ?? 5);
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
  }

  private renderFooter(): void {
    clear(this.footer);
    const r = this.editor.value;
    const count = SECTION_IDS.reduce((n, s) => n + r[s].length, 0);
    const rounds = this.app.store.active.rounds ?? {};
    const secs = SECTION_IDS.reduce((n, s) => n + r[s].reduce((m, i) => m + i.seconds, 0) * clampRounds(rounds[s]), 0);
    const inSection = r[this.section].length;
    if (this.mode === 'sorting') {
      this.footer.hidden = true;
      return;
    }
    this.footer.hidden = false;
    append(this.footer,
      h('div', { class: 'footer-info' },
        h('strong', {}, count ? `${plural(count, 'ejercicio', 'ejercicios')} · ${humanDuration(secs)}` : 'Ningún ejercicio elegido'),
        h('span', { class: 'muted' }, inSection ? `${inSection} en este apartado` : 'Nada en este apartado')),
      inSection ? h('button', { class: 'btn ghost small', onclick: () => { this.editor.clearSection(this.section); this.save(); this.refresh(); } }, 'Quitar todos') : null,
      h('button', { class: 'btn primary small', onclick: () => this.app.back() }, icon('check'), 'Hecho'),
    );
  }
}

function normalize(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

