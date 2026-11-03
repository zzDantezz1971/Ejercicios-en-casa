import { CATALOG, SECTIONS } from '../data/catalog';
import { Store } from '../domain/Store';
import { Thumbnails } from '../figure/FigureView';
import { Haptics } from '../services/Haptics';
import { ScreenAwake } from '../services/ScreenAwake';
import { Sounds } from '../services/Sounds';
import { Voice } from '../services/Voice';
import { clear, h } from './dom';
import { icon, type IconName } from './icons';

export type TabId = 'inicio' | 'tablas' | 'historial' | 'ajustes';

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'tablas', label: 'Tablas', icon: 'tables' },
  { id: 'historial', label: 'Historial', icon: 'calendar' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

/** Una pantalla de la app. */
export interface Screen {
  readonly el: HTMLElement;
  /** Si es una pantalla principal, la pestaña de la barra inferior que le corresponde. */
  readonly tab?: TabId;
  /** Se llama al mostrarla (también al volver a ella). */
  enter?(): void;
  /** Se llama al ocultarla. */
  leave?(): void;
  /** Se llama al quitarla definitivamente. */
  dispose?(): void;
  /** Botón atrás de Android: devuelve true si la pantalla lo gestiona ella misma. */
  onBack?(): boolean | Promise<boolean>;
}

/** Contexto compartido por todas las pantallas y navegación. */
export class App {
  readonly store: Store;
  readonly catalog = CATALOG;
  readonly sections = SECTIONS;
  readonly sounds = new Sounds();
  readonly voice = new Voice();
  readonly haptics = new Haptics();
  readonly awake = new ScreenAwake();
  readonly thumbs = new Thumbnails();
  private stack: Screen[] = [];
  private scroll = new WeakMap<Screen, number>();
  private view = h('div', { class: 'view' });
  private tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Secciones' });
  private tabFactory: Record<TabId, () => Screen> | null = null;

  constructor(root: HTMLElement) {
    let kv: Storage | null = null;
    try {
      kv = window.localStorage;
    } catch {
      kv = null;
    }
    this.store = new Store(kv);
    this.applySettings();
    root.append(this.view, this.tabbar);
    // Botón atrás de Android: cada pantalla nueva añade una entrada al historial del navegador.
    window.addEventListener('popstate', () => void this.handleBack());
  }

  /** Registra cómo crear cada pantalla principal (evita dependencias circulares). */
  setTabs(factory: Record<TabId, () => Screen>): void {
    this.tabFactory = factory;
  }

  /** Abre una pestaña de la barra inferior. */
  openTab(id: TabId): void {
    if (!this.tabFactory) return;
    if (this.stack.length === 1 && this.current?.tab === id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.home(this.tabFactory[id]());
  }

  applySettings(): void {
    this.sounds.enabled = this.store.settings.sound;
    this.voice.enabled = this.store.settings.voice;
    this.haptics.enabled = this.store.settings.sound;
  }

  get current(): Screen | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Muestra una pantalla encima de la actual. */
  push(screen: Screen): void {
    if (this.current) this.scroll.set(this.current, window.scrollY);
    this.current?.leave?.();
    this.stack.push(screen);
    history.pushState({ depth: this.stack.length }, '');
    this.show(screen, 'forward');
  }

  /** Sustituye la pantalla actual. */
  replace(screen: Screen): void {
    const old = this.stack.pop();
    old?.leave?.();
    old?.dispose?.();
    this.stack.push(screen);
    this.show(screen, 'fade');
  }

  /** Deja una única pantalla (una pestaña principal). */
  home(screen: Screen): void {
    while (this.stack.length) {
      const s = this.stack.pop()!;
      s.leave?.();
      s.dispose?.();
    }
    this.stack.push(screen);
    history.replaceState({ depth: 1 }, '');
    this.show(screen, 'fade');
  }

  /** Vuelve a la pantalla anterior (como el botón atrás). */
  back(): void {
    if (this.stack.length > 1) history.back();
  }

  private async handleBack(): Promise<void> {
    const cur = this.current;
    if (cur?.onBack && (await cur.onBack())) {
      history.pushState({ depth: this.stack.length }, '');
      return;
    }
    if (this.stack.length <= 1) {
      // En una pestaña que no es Inicio, atrás lleva a Inicio.
      if (cur?.tab && cur.tab !== 'inicio' && this.tabFactory) {
        history.pushState({ depth: 1 }, '');
        this.home(this.tabFactory.inicio());
      }
      return;
    }
    const old = this.stack.pop()!;
    old.leave?.();
    old.dispose?.();
    this.show(this.current!, 'back');
  }

  private show(screen: Screen, motion: 'forward' | 'back' | 'fade'): void {
    clear(this.view);
    screen.el.classList.remove('anim-forward', 'anim-back', 'anim-fade');
    void screen.el.offsetWidth; // reinicia la animación
    screen.el.classList.add(`anim-${motion}`);
    this.view.append(screen.el);
    this.renderTabbar(screen.tab);
    window.scrollTo(0, this.scroll.get(screen) ?? 0);
    screen.enter?.();
  }

  private renderTabbar(active?: TabId): void {
    document.body.classList.toggle('has-tabbar', !!active);
    this.tabbar.hidden = !active;
    if (!active) return;
    clear(this.tabbar);
    for (const t of TABS) {
      this.tabbar.append(
        h('button', {
          class: 'tab-item' + (t.id === active ? ' active' : ''),
          'aria-current': t.id === active ? 'page' : undefined,
          onclick: () => this.openTab(t.id),
        }, icon(t.icon), h('span', {}, t.label)),
      );
    }
  }
}
