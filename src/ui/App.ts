import { CATALOG, SECTIONS } from '../data/catalog';
import { Store } from '../domain/Store';
import { Thumbnails } from '../figure/FigureView';
import { ScreenAwake } from '../services/ScreenAwake';
import { Sounds } from '../services/Sounds';
import { Voice } from '../services/Voice';
import { clear } from './dom';

/** Una pantalla de la app. */
export interface Screen {
  readonly el: HTMLElement;
  /** Se llama al mostrarla (también al volver a ella). */
  enter?(): void;
  /** Se llama al ocultarla. */
  leave?(): void;
  /** Se llama al quitarla definitivamente. */
  dispose?(): void;
  /** Botón atrás de Android: devuelve true si la pantalla lo gestiona ella misma. */
  onBack?(): boolean | Promise<boolean>;
}

/** Contexto compartido por todas las pantallas. */
export class App {
  readonly store: Store;
  readonly catalog = CATALOG;
  readonly sections = SECTIONS;
  readonly sounds = new Sounds();
  readonly voice = new Voice();
  readonly awake = new ScreenAwake();
  readonly thumbs = new Thumbnails();
  private stack: Screen[] = [];
  private scroll = new WeakMap<Screen, number>();

  constructor(private readonly root: HTMLElement) {
    let kv: Storage | null = null;
    try {
      kv = window.localStorage;
    } catch {
      kv = null;
    }
    this.store = new Store(kv);
    this.applySettings();
    // Botón atrás de Android: cada pantalla nueva añade una entrada al historial del navegador.
    window.addEventListener('popstate', () => void this.handleBack());
  }

  applySettings(): void {
    this.sounds.enabled = this.store.settings.sound;
    this.voice.enabled = this.store.settings.voice;
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
    this.show(screen);
  }

  /** Sustituye la pantalla actual. */
  replace(screen: Screen): void {
    const old = this.stack.pop();
    old?.leave?.();
    old?.dispose?.();
    this.stack.push(screen);
    this.show(screen);
  }

  /** Vuelve a la pantalla de inicio. */
  home(screen: Screen): void {
    while (this.stack.length) {
      const s = this.stack.pop()!;
      s.leave?.();
      s.dispose?.();
    }
    this.stack.push(screen);
    history.replaceState({ depth: 1 }, '');
    this.show(screen);
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
    if (this.stack.length <= 1) return;
    const old = this.stack.pop()!;
    old.leave?.();
    old.dispose?.();
    this.show(this.current!);
  }

  private show(screen: Screen): void {
    clear(this.root);
    this.root.append(screen.el);
    window.scrollTo(0, this.scroll.get(screen) ?? 0);
    screen.enter?.();
  }
}
