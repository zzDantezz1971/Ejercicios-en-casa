import { FigureView } from '../../figure/FigureView';
import { DEFAULT_LOOK, HAIR_COLORS, lookHair, setLook, SHIRT_COLORS, SHOE_COLORS, SHORTS_COLORS, SKIN_TONES, type Beard, type Body, type Bottom, type Glasses, type Hair, type Look, type Top } from '../../figure/look';
import type { ExerciseDef } from '../../domain/types';
import type { App, Screen } from '../App';
import { clear, h } from '../dom';
import { icon } from '../icons';

/** El muñeco de pie, de frente, para ver cómo queda. */
const PREVIEW: ExerciseDef = {
  id: 'preview-look', name: '', section: 'calentamiento', zone: '',
  motion: { v: 'front', az: 18, el: 10, f: [[{ uaL: 98, faL: 95, uaR: 82, faR: 85 }, 1600, 1400], [{ uaL: 100, faL: 96, uaR: 80, faR: 84, hd: -88 }, 1600, 1400]] },
};

/** Personaliza el muñeco: colores de piel y ropa (gratis); gafas y barba (prémium). */
export class LookScreen implements Screen {
  readonly el = h('main', { class: 'screen look-screen' });
  private canvas = h('canvas', { class: 'stage-canvas' });
  private view: FigureView | null = null;
  private body = h('div', { class: 'settings-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('h1', { class: 'bar-title' }, 'Personaliza el muñeco')),
      h('div', { class: 'stage look-stage' }, this.canvas, h('span', { class: 'stage-hint' }, icon('sides'), 'Arrastra para girar')),
      this.body);
  }

  private get look(): Look {
    return { ...DEFAULT_LOOK, ...(this.app.store.settings.look ?? {}) };
  }

  private set(patch: Partial<Look>): void {
    const look = { ...this.look, ...patch };
    this.app.store.saveSettings({ ...this.app.store.settings, look });
    setLook(look, () => this.app.access.premium);
    this.app.haptics.tap();
    this.rebuild();
    this.render();
  }

  /** El muñeco se vuelve a montar con el aspecto nuevo. */
  private rebuild(): void {
    this.view?.dispose();
    const c = h('canvas', { class: 'stage-canvas' }) as HTMLCanvasElement;
    this.canvas.replaceWith(c);
    this.canvas = c;
    this.view = new FigureView(c, PREVIEW);
    this.view.start();
  }

  enter(): void {
    if (!this.view) {
      this.view = new FigureView(this.canvas as HTMLCanvasElement, PREVIEW);
    }
    this.view.start();
    this.render();
  }

  leave(): void {
    this.view?.stop();
  }

  dispose(): void {
    this.view?.dispose();
    this.view = null;
  }

  private render(): void {
    const l = this.look, premium = this.app.access.premium;
    const swatches = (title: string, colors: string[], key: 'skin' | 'shirt' | 'shorts' | 'shoe' | 'hairColor', cur: string) =>
      h('div', { class: 'look-row' },
        h('strong', {}, title),
        h('div', { class: 'swatches', role: 'group', 'aria-label': title },
          ...colors.map((c) => {
            const on = cur.toLowerCase() === c.toLowerCase();
            const b = h('button', { class: 'swatch' + (on ? ' on' : ''), 'aria-pressed': String(on), 'aria-label': c, onclick: () => this.set({ [key]: c }) });
            b.style.setProperty('--c', c);
            return b;
          })));
    // opciones prémium: sin prémium se ven, pero al tocarlas lleva a hacerse prémium
    const chips = <K extends 'glasses' | 'beard' | 'hair' | 'top' | 'bottom' | 'body'>(title: string, key: K, opts: Array<[Look[K], string]>) => {
      const cur = premium ? l[key] : DEFAULT_LOOK[key];
      return h('div', { class: 'look-row' },
        h('strong', {}, title),
        h('div', { class: 'chips' + (premium ? '' : ' locked'), role: 'group', 'aria-label': title },
          ...opts.map(([v, label]) => h('button', {
            class: 'chip' + (cur === v ? ' on' : ''), 'aria-pressed': String(cur === v),
            onclick: () => (premium ? this.set({ [key]: v } as Partial<Look>) : this.app.showPremium()),
          }, label))));
    };
    const lock = premium ? null : h('span', { class: 'premium-chip' }, icon('lock'), 'Prémium');
    clear(this.body);
    this.body.append(
      h('section', { class: 'card look-card' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Colores')),
        swatches('Piel', SKIN_TONES, 'skin', l.skin),
        swatches('Pelo, cejas y barba', HAIR_COLORS, 'hairColor', lookHair(l)),
        swatches('Camiseta', SHIRT_COLORS, 'shirt', l.shirt),
        swatches('Pantalón', SHORTS_COLORS, 'shorts', l.shorts),
        swatches('Zapatillas', SHOE_COLORS, 'shoe', l.shoe)),
      h('section', { class: 'card look-card' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Cuerpo y pelo'), lock),
        chips<'body'>('Cuerpo', 'body', [['man', 'Hombre'], ['woman', 'Mujer']] as Array<[Body, string]>),
        chips<'hair'>('Peinado', 'hair', [['none', 'Sin pelo'], ['buzz', 'Rapado'], ['short', 'Corto'], ['bob', 'Media melena'], ['long', 'Melena'], ['ponytail', 'Coleta'], ['bun', 'Moño']] as Array<[Hair, string]>)),
      h('section', { class: 'card look-card' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Ropa'), lock?.cloneNode(true) ?? null),
        chips<'top'>('Camiseta', 'top', [['tee', 'Manga corta'], ['tank', 'Sin mangas'], ['long', 'Manga larga']] as Array<[Top, string]>),
        chips<'bottom'>('Pantalones', 'bottom', [['shorts', 'Corto'], ['leggings', 'Mallas largas']] as Array<[Bottom, string]>)),
      h('section', { class: 'card look-card' },
        h('div', { class: 'card-head' }, h('h3', {}, 'Complementos'), lock?.cloneNode(true) ?? null),
        chips<'glasses'>('Gafas', 'glasses', [['none', 'Sin gafas'], ['normal', 'Graduadas'], ['sun', 'De sol']] as Array<[Glasses, string]>),
        chips<'beard'>('Barba', 'beard', [['none', 'Sin barba'], ['stubble', 'De unos días'], ['full', 'Poblada']] as Array<[Beard, string]>),
        premium ? null : h('button', { class: 'btn primary block', onclick: () => this.app.showPremium() }, icon('star'), 'Hazte prémium')),
      h('button', { class: 'btn ghost block', onclick: () => this.set({ ...DEFAULT_LOOK, hairColor: undefined }) }, 'Volver al muñeco de siempre'),
      // los cambios ya se guardan al momento; el botón da la sensación de aceptar y vuelve atrás
      h('div', { class: 'look-save' },
        h('button', { class: 'btn primary block big', onclick: () => { this.app.haptics.tap(); this.app.back(); } }, icon('check'), 'Guardar')));
  }
}
