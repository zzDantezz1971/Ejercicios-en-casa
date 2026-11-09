import { DEC } from '../../i18n';
import { SEXES, SEX_LABELS, type Settings, type Sex } from '../../domain/types';
import { weightCards } from '../components/weightCard';
import { equipGrid } from '../components/equipGrid';
import { EQUIPMENT, type Equip } from '../../domain/equipment';
import { WeightScreen } from './WeightScreen';
import type { App, Screen } from '../App';
import { append, clear, h } from '../dom';

/** Mis datos: nombre, edad, altura, sexo, idioma y todo lo del peso (IMC, objetivo, histórico). */
export class ProfileScreen implements Screen {
  readonly el = h('main', { class: 'screen settings' });
  readonly tab = 'datos' as const;
  private body = h('div', { class: 'settings-body' });

  constructor(private readonly app: App) {
    this.el.append(h('header', { class: 'page-head' }, h('h1', {}, 'Mis datos')), this.body);
  }

  enter(): void {
    this.render();
  }

  private update(patch: Partial<Settings>): void {
    this.app.store.saveSettings({ ...this.app.store.settings, ...patch });
    this.app.applySettings();
    this.render();
  }

  /** Nombre, edad, altura y sexo. */
  private profileCard(s: Settings): HTMLElement {
    const p = s.profile;
    const set = (patch: Partial<Settings['profile']>) => this.update({ profile: { ...p, ...patch } });
    const stepper = (label: string, value: number | null, unit: string, start: number, step: number, min: number, max: number, onSet: (v: number) => void) => {
      const v = value ?? start;
      const fmt = (n: number) => `${String(n).replace('.', DEC)} ${unit}`;
      return h('div', { class: 'rest-row profile-row' },
        h('span', { class: 'rest-name' }, label),
        h('div', { class: 'stepper' },
          h('button', { 'aria-label': `Menos ${label.toLowerCase()}`, disabled: value !== null && v <= min, onclick: () => onSet(value === null ? start : Math.max(min, v - step)) }, '−'),
          h('span', { class: 'secs' + (value === null ? ' unset' : '') }, value === null ? '—' : fmt(v)),
          h('button', { 'aria-label': `Más ${label.toLowerCase()}`, disabled: value !== null && v >= max, onclick: () => onSet(value === null ? start : Math.min(max, v + step)) }, '+')));
    };
    const sexBtn = (v: Sex) =>
      h('button', { class: 'seg' + (p.sex === v ? ' on' : ''), 'aria-pressed': String(p.sex === v), onclick: () => set({ sex: v }) }, SEX_LABELS[v]);
    return h('section', { class: 'card setting rest-card' },
      h('div', { class: 'rest-row profile-row name-row' },
        h('label', { class: 'rest-name', for: 'set-name' }, 'Nombre o alias'),
        h('input', { id: 'set-name', class: 'text-input small', type: 'text', maxlength: 24, placeholder: 'Cómo quieres que te llame', value: p.name ?? '', autocomplete: 'off',
          onchange: (e: Event) => set({ name: (e.target as HTMLInputElement).value.replace(/\s+/g, ' ').trim() || undefined }) })),
      stepper('Edad', p.age, 'años', 50, 1, 15, 99, (v) => set({ age: v })),
      stepper('Altura', p.height ?? null, 'cm', 175, 1, 100, 230, (v) => set({ height: v })),
      h('div', { class: 'sex-wrap' }, h('div', { class: 'segmented sex-segs', role: 'group', 'aria-label': 'Sexo' }, ...SEXES.map(sexBtn)), h('p', { class: 'sex-note' }, 'Solo se usa para calcular mejor las calorías cuando entrenas con el reloj conectado.')));
  }

  /** Mi material: el que se marque decide qué ejercicios con material se ven. */
  private equipCard(s: Settings): HTMLElement {
    const sel = new Set<Equip>(s.equipment);
    return h('section', { class: 'card equip-card-box' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Mi material')),
      h('p', { class: 'muted small' }, 'Marca lo que tengas. Los ejercicios sin material los verás siempre; con más material, verás más ejercicios.'),
      equipGrid(sel, () => this.update({ equipment: EQUIPMENT.filter((e) => sel.has(e)) })));
  }

  private render(): void {
    const s = this.app.store.settings;
    clear(this.body);
    append(this.body,
      this.profileCard(s),
      this.equipCard(s),
      ...weightCards(this.app, () => this.render(), () => this.app.push(new WeightScreen(this.app))));
  }
}
