import { RoutineEditor, STEP_SECONDS } from '../../domain/RoutineEditor';
import { SECTION_IDS, type ExerciseDef, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { append, clear, h, humanDuration, plural } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { badgeList } from '../components/badges';
import { DetailScreen } from './DetailScreen';

/** Preparar rutina: elegir ejercicios por apartado (se numeran en el orden en que se marcan) y su duración. */
export class RoutineScreen implements Screen {
  readonly el = h('main', { class: 'screen routine' });
  private editor: RoutineEditor;
  private section: SectionId = 'calentamiento';
  private tabs = h('div', { class: 'tabs', role: 'tablist' });
  private list = h('div', { class: 'ex-grid' });
  private footer = h('div', { class: 'routine-footer' });
  private title = h('div', { class: 'titles' });
  private query = '';
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
        this.title),
      this.tabs,
      h('label', { class: 'search', for: 'ex-search' }, icon('search'), this.search),
      h('p', { class: 'hint' }, 'Toca un ejercicio para añadirlo: se harán en el orden en que los marques. Pulsa ', icon('info', 'ico inline'), ' para ver cómo se hace.'),
      this.list,
      this.footer,
    );
  }

  enter(): void {
    this.editor = new RoutineEditor(this.app.store.routine);
    this.title.replaceChildren(h('span', { class: 'subtitle' }, 'Editar tabla'), h('h1', {}, this.app.store.active.name));
    this.render();
  }

  dispose(): void {
    this.io.disconnect();
  }

  private save(): void {
    this.app.store.saveRoutine(this.editor.value);
  }

  private render(): void {
    this.renderTabs();
    this.renderList();
    this.renderFooter();
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
    const q = normalize(this.query.trim());
    if (q) {
      // Búsqueda en todos los apartados
      let found = 0;
      for (const sec of this.app.sections) {
        const hits = sec.exercises.filter((e) => normalize(`${e.name} ${e.zone} ${e.group ?? ''}`).includes(q));
        if (!hits.length) continue;
        found += hits.length;
        this.list.append(h('h2', { class: 'group-title' }, sec.title));
        hits.forEach((ex) => this.list.append(this.card(ex)));
      }
      if (!found) this.list.append(h('p', { class: 'empty-state' }, `No hay ejercicios que coincidan con "${this.query.trim()}".`));
      return;
    }
    const sec = this.app.sections.find((s) => s.id === this.section)!;
    let group: string | undefined;
    for (const ex of sec.exercises) {
      if (ex.group && ex.group !== group) {
        group = ex.group;
        this.list.append(h('h2', { class: 'group-title' }, group));
      }
      this.list.append(this.card(ex));
    }
  }

  private card(ex: ExerciseDef): HTMLElement {
    const pos = this.editor.position(ex.section, ex.id);
    const secs = this.editor.seconds(ex.section, ex.id);
    const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
    const fig = h('div', { class: 'thumb-box' }, img, ex.viewLabel ? h('span', { class: 'view-label' }, ex.viewLabel) : null);
    this.io.observe(fig);
    const card = h('article', { class: 'ex-card' + (pos ? ' selected' : ''), style: { '--sec': SECTION_STYLE[ex.section].color } },
      h('button', { class: 'ex-main', 'aria-pressed': String(!!pos), onclick: () => this.toggle(ex) },
        fig,
        h('span', { class: 'ex-name' }, pos ? h('span', { class: 'order' }, pos) : null, h('span', {}, ex.name)),
        h('span', { class: 'ex-zone' }, ex.zone, ex.oneSided ? h('span', { class: 'by-sides' }, icon('sides'), 'por lados') : null),
        badgeList(ex.badges)),
      h('button', { class: 'info-btn', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => this.app.push(new DetailScreen(this.app, ex)) }, icon('info')),
      pos ? h('div', { class: 'stepper' },
        h('button', { 'aria-label': 'Menos tiempo', onclick: () => this.adjust(ex, -STEP_SECONDS) }, '−'),
        h('span', { class: 'secs' }, icon('clock'), `${secs} s`),
        h('button', { 'aria-label': 'Más tiempo', onclick: () => this.adjust(ex, STEP_SECONDS) }, '+')) : null,
    );
    return card;
  }

  private loadThumb(fig: HTMLElement): void {
    this.io.unobserve(fig);
    const img = fig.querySelector('img')!;
    const ex = this.app.catalog.get(img.dataset.id!);
    if (ex) void this.app.thumbs.get(ex).then((url) => (img.src = url));
  }

  private toggle(ex: ExerciseDef): void {
    this.editor.toggle(ex.section, ex.id, this.app.store.settings.defaultSeconds);
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
    const secs = SECTION_IDS.reduce((n, s) => n + r[s].reduce((m, i) => m + i.seconds, 0), 0);
    const inSection = r[this.section].length;
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
