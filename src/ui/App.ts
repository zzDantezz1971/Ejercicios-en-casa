import { setAngleStore } from '../figure/angles';
import { rescheduleReminders } from '../services/Reminders';
import { setFigureStyle } from '../figure/skinAsset';
import { setLook } from '../figure/look';
import { HeartRate } from '../services/HeartRate';
import { Access } from '../services/Access';
import { durableStorage } from '../platform/durable';
import { CATALOG, SECTIONS } from '../data/catalog';
import { Store } from '../domain/Store';
import { SECTION_IDS, type Routine } from '../domain/types';
import { Thumbnails } from '../figure/FigureView';
import { Haptics } from '../services/Haptics';
import { ScreenAwake } from '../services/ScreenAwake';
import { Sounds } from '../services/Sounds';
import { Voice } from '../services/Voice';
import { clear, h } from './dom';
import { icon, type IconName } from './icons';

export type TabId = 'inicio' | 'tablas' | 'medallas' | 'historial' | 'datos' | 'ajustes';

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'tablas', label: 'Tablas', icon: 'tables' },
  { id: 'medallas', label: 'Medallas', icon: 'trophy' },
  { id: 'historial', label: 'Historial', icon: 'calendar' },
  { id: 'datos', label: 'Mis datos', icon: 'user' },
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
  readonly heart = new HeartRate();
  /** Suscripción o código (solo en la app de Google Play). */
  readonly access = new Access();
  private paywall: (() => Screen) | null = null;
  private stack: Screen[] = [];
  private scroll = new WeakMap<Screen, number>();
  private view = h('div', { class: 'view' });
  private tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Secciones' });
  private tabFactory: Record<TabId, () => Screen> | null = null;

  constructor(root: HTMLElement) {
    this.store = new Store(durableStorage());
    // ejercicios que han cambiado de apartado en una versión nueva
    this.store.fixSections((id) => this.catalog.get(id)?.section);
    // la primera vez se apuntan las medallas que ya se tenían, sin celebrarlas
    if (!Object.keys(this.store.medals).length) this.store.checkMedals();
    this.applySettings();
    // el ángulo en que dejas cada muñeco se guarda en los ajustes
    setAngleStore({
      get: (id) => this.store.settings.angles?.[id],
      set: (id, deg) => {
        const angles = { ...(this.store.settings.angles ?? {}) };
        if (deg === undefined) delete angles[id];
        else angles[id] = deg;
        this.store.saveSettings({ ...this.store.settings, angles });
      },
    });
    // recordatorios del móvil: se recalculan al abrir la app, al volver a ella y cada vez que cambia algo
    const remind = () => rescheduleReminders(this.store, () => this.access.premium);
    this.store.onSaved = remind;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') remind(); });
    window.setTimeout(remind, 3000);
    root.append(this.view, this.tabbar);
    // Botón atrás de Android: cada pantalla nueva añade una entrada al historial del navegador.
    window.addEventListener('popstate', () => void this.handleBack());
  }

  /** Registra cómo crear cada pantalla principal (evita dependencias circulares). */
  setTabs(factory: Record<TabId, () => Screen>): void {
    this.tabFactory = factory;
  }

  /** Pantalla de suscripción (se registra desde main para no tener dependencias circulares). */
  setPaywall(factory: () => Screen): void {
    this.paywall = factory;
  }

  /** Abre la pantalla para hacerse prémium. */
  showPremium(): void {
    if (this.paywall && !this.current?.el.classList.contains('paywall')) this.push(this.paywall());
  }

  /** La tabla con solo los ejercicios que se pueden hacer (en la versión gratis, los gratis). */
  playable(routine: Routine): Routine {
    if (this.access.premium) return routine;
    const out = { ...routine };
    for (const s of SECTION_IDS) out[s] = routine[s].filter((i) => this.access.canUse(i.exerciseId));
    return out;
  }

  /** Abre una pestaña de la barra inferior. Sin suscripción ni código, la de suscribirse. */
  openTab(id: TabId): void {
    if (!this.tabFactory) return;
    if (this.stack.length === 1 && this.current?.tab === id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.home(this.tabFactory[id]());
  }

  applySettings(): void {
    setFigureStyle(this.store.settings.figureStyle);
    // aspecto del muñeco (las gafas y la barba, solo con prémium)
    setLook(this.store.settings.look, () => this.access.premium);
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
  replace(screen: Screen, motion: 'forward' | 'back' | 'fade' | 'none' = 'fade'): void {
    const old = this.stack.pop();
    old?.leave?.();
    old?.dispose?.();
    this.stack.push(screen);
    this.show(screen, motion);
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

  private show(screen: Screen, motion: 'forward' | 'back' | 'fade' | 'none'): void {
    clear(this.view);
    screen.el.classList.remove('anim-forward', 'anim-back', 'anim-fade');
    void screen.el.offsetWidth; // reinicia la animación
    if (motion !== 'none') screen.el.classList.add(`anim-${motion}`);
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
