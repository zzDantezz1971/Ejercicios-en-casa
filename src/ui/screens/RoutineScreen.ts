import { RoutineEditor, STEP_SECONDS } from '../../domain/RoutineEditor';
import { SECTION_IDS, type ExerciseDef, type SectionId } from '../../domain/types';
import type { App, Screen } from '../App';
import { append, clear, h, humanDuration, plural } from '../dom';
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
  private io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && this.loadThumb(e.target as HTMLElement)), { rootMargin: '300px' });

  constructor(private readonly app: App) {
    this.editor = new RoutineEditor(app.store.routine);
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, '‹'),
        this.title),
      this.tabs,
      h('p', { class: 'hint' }, 'Toca un ejercicio para añadirlo. Se harán en el orden en que los marques. Pulsa ⓘ para ver cómo se hace.'),
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
          onclick: () => { this.section = s.id; window.scrollTo(0, 0); this.render(); },
        }, s.title, n ? h('span', { class: 'tab-count' }, n) : null),
      );
    }
    requestAnimationFrame(() => this.tabs.querySelector('.tab.active')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  }

  private renderList(): void {
    this.io.disconnect();
    clear(this.list);
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
    const pos = this.editor.position(this.section, ex.id);
    const secs = this.editor.seconds(this.section, ex.id);
    const img = h('img', { alt: '', class: 'thumb', 'data-id': ex.id });
    const fig = h('div', { class: 'thumb-box' }, img, ex.viewLabel ? h('span', { class: 'view-label' }, ex.viewLabel) : null);
    this.io.observe(fig);
    const card = h('article', { class: 'ex-card' + (pos ? ' selected' : '') },
      h('button', { class: 'ex-main', 'aria-pressed': String(!!pos), onclick: () => this.toggle(ex) },
        fig,
        h('span', { class: 'ex-name' }, pos ? h('span', { class: 'order' }, pos) : null, h('span', {}, ex.name)),
        h('span', { class: 'ex-zone' }, ex.zone, ex.oneSided ? ' · por lados' : ''),
        badgeList(ex.badges)),
      h('button', { class: 'info-btn', 'aria-label': `Cómo se hace: ${ex.name}`, onclick: () => this.app.push(new DetailScreen(this.app, ex)) }, 'ⓘ'),
      pos ? h('div', { class: 'stepper' },
        h('button', { 'aria-label': 'Menos tiempo', onclick: () => this.adjust(ex, -STEP_SECONDS) }, '−'),
        h('span', { class: 'secs' }, `${secs} s`),
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
    this.editor.toggle(this.section, ex.id, this.app.store.settings.defaultSeconds);
    this.save();
    this.refresh();
  }

  private adjust(ex: ExerciseDef, delta: number): void {
    this.editor.adjust(this.section, ex.id, delta);
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
      h('button', { class: 'btn primary small', onclick: () => this.app.back() }, 'Hecho'),
    );
  }
}
