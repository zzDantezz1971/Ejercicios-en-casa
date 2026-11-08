import { LANG, LANGS } from '../../i18n';
import { flushDurable } from '../../platform/durable';
import { SEXES, SEX_LABELS, type Profile, type Sex } from '../../domain/types';
import type { App, Screen } from '../App';
import { clear, h } from '../dom';
import { icon } from '../icons';

/* Bienvenida de la primera vez: 1) idioma, 2) datos personales (todos opcionales).
   Si falta la altura o el peso, se avisa de lo que no se podrá calcular. */

interface Field {
  key: 'age' | 'height' | 'weight' | 'goal';
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals: boolean;
}

const FIELDS: Field[] = [
  { key: 'age', label: 'Edad', unit: 'años', min: 15, max: 99, decimals: false },
  { key: 'height', label: 'Altura', unit: 'cm', min: 100, max: 230, decimals: false },
  { key: 'weight', label: 'Peso actual', unit: 'kg', min: 30, max: 250, decimals: true },
  { key: 'goal', label: 'Objetivo de peso', unit: 'kg', min: 30, max: 250, decimals: true },
];

/** Lee un número escrito con coma o punto; null si está vacío; NaN si no es válido. */
function parseNum(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export class WelcomeScreen implements Screen {
  readonly el = h('main', { class: 'screen welcome' });
  private step: 1 | 2 = 1;
  private name = '';
  private sex: Profile['sex'] = 'h';
  private values: Record<Field['key'], string> = { age: '', height: '', weight: '', goal: '' };

  constructor(private readonly app: App) {
    const p = app.store.settings.profile;
    this.name = p.name ?? '';
    this.sex = p.sex;
  }

  enter(): void {
    this.render();
  }

  /** Atrás en el paso 2 vuelve al idioma. */
  async onBack(): Promise<boolean> {
    if (this.step === 2) {
      this.step = 1;
      this.render();
      return true;
    }
    return false;
  }

  private render(): void {
    clear(this.el);
    if (this.step === 1) this.renderLang();
    else this.renderData();
    window.scrollTo(0, 0);
  }

  /* ── Paso 1: idioma ── */

  private renderLang(): void {
    const pick = async (id: (typeof LANGS)[number]['id']) => {
      if (id === LANG) return;
      this.app.store.saveSettings({ ...this.app.store.settings, lang: id });
      // la app se recarga en el idioma elegido y vuelve a esta misma pantalla
      await flushDurable();
      location.reload();
    };
    this.el.append(
      h('div', { class: 'welcome-top' },
        h('img', { class: 'welcome-logo', src: `${import.meta.env.BASE_URL}icon-192.png`, alt: '' }),
        h('h1', {}, 'Te damos la bienvenida'),
        h('p', { class: 'muted' }, 'Elige el idioma de la app.')),
      h('div', { class: 'welcome-langs', 'data-no-tr': '' },
        ...LANGS.map((l) => h('button', { class: 'welcome-lang' + (l.id === LANG ? ' on' : ''), 'aria-pressed': String(l.id === LANG), lang: l.id, onclick: () => void pick(l.id) },
          h('span', {}, l.name), l.id === LANG ? h('span', { class: 'check', 'aria-hidden': 'true' }, '✓') : null))),
      h('div', { class: 'welcome-actions' },
        h('button', { class: 'btn primary block big', onclick: () => { this.step = 2; this.render(); } }, 'Continuar')),
    );
  }

  /* ── Paso 2: datos personales ── */

  private renderData(): void {
    const inputs = {} as Record<Field['key'], HTMLInputElement>;
    const errors = {} as Record<Field['key'], HTMLElement>;
    const nameInput = h('input', { id: 'wl-name', class: 'text-input', type: 'text', maxlength: 24, autocomplete: 'off', placeholder: 'Cómo quieres que te llame', value: this.name,
      oninput: (e: Event) => (this.name = (e.target as HTMLInputElement).value) }) as HTMLInputElement;
    const sexBtn = (v: Sex) =>
      h('button', { class: 'seg' + (this.sex === v ? ' on' : ''), 'aria-pressed': String(this.sex === v), onclick: () => { this.sex = v; this.render(); } }, SEX_LABELS[v]);

    const fieldRow = (f: Field) => {
      const input = h('input', { id: `wl-${f.key}`, class: 'text-input num', type: 'text', inputmode: f.decimals ? 'decimal' : 'numeric', autocomplete: 'off',
        value: this.values[f.key],
        oninput: (e: Event) => { this.values[f.key] = (e.target as HTMLInputElement).value; errors[f.key].textContent = ''; input.classList.remove('bad'); } }) as HTMLInputElement;
      inputs[f.key] = input;
      errors[f.key] = h('p', { class: 'field-error', 'aria-live': 'polite' });
      return h('div', { class: 'welcome-field' },
        h('label', { for: `wl-${f.key}` }, f.label),
        h('div', { class: 'with-unit' }, input, h('span', { class: 'unit' }, f.unit)),
        errors[f.key]);
    };

    const finish = async () => {
      // comprobar los números
      const nums = {} as Record<Field['key'], number | null>;
      let firstBad: HTMLInputElement | null = null;
      for (const f of FIELDS) {
        const v = parseNum(this.values[f.key]);
        const ok = v === null || (Number.isFinite(v) && v >= f.min && v <= f.max);
        if (!ok) {
          errors[f.key].textContent = `Escribe un valor entre ${f.min} y ${f.max} ${f.unit}.`;
          inputs[f.key].classList.add('bad');
          firstBad ??= inputs[f.key];
        }
        nums[f.key] = ok ? v : null;
      }
      if (firstBad) return void firstBad.focus();

      // si falta la altura o el peso, se avisa
      const missH = nums.height === null, missW = nums.weight === null;
      if (missH || missW) {
        const choice = await this.missingDialog(missH && missW ? 'both' : missH ? 'height' : 'weight');
        if (choice === 'add') return void (missH ? inputs.height : inputs.weight).focus();
      }

      const { store } = this.app;
      const s = store.settings;
      const name = this.name.replace(/\s+/g, ' ').trim() || undefined;
      store.saveSettings({
        ...s,
        profile: {
          ...s.profile,
          name,
          sex: this.sex,
          age: nums.age === null ? s.profile.age : Math.round(nums.age),
          height: nums.height === null ? s.profile.height : Math.round(nums.height),
          goalKg: nums.goal === null ? s.profile.goalKg : Math.round(nums.goal * 10) / 10,
        },
      });
      if (nums.weight !== null) store.addWeight(Math.round(nums.weight * 10) / 10);
      store.markWelcomed();
      this.app.openTab('inicio');
    };

    this.el.append(
      h('header', { class: 'bar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => void this.onBack() }, icon('back')),
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, 'Paso 2 de 2'), h('h1', {}, 'Tus datos'))),
      h('p', { class: 'muted welcome-intro' }, 'Con estos datos calculamos las calorías que quemas, tu IMC y la evolución de tu peso. Todo se guarda solo en tu móvil y lo puedes cambiar cuando quieras en Mis datos.'),
      h('section', { class: 'card welcome-card' },
        h('div', { class: 'welcome-field' }, h('label', { for: 'wl-name' }, 'Nombre o alias'), nameInput),
        h('div', { class: 'segmented sex-segs', role: 'group', 'aria-label': 'Sexo' }, ...SEXES.map(sexBtn)),
        h('div', { class: 'welcome-grid' }, ...FIELDS.map(fieldRow))),
      h('div', { class: 'welcome-actions' },
        h('button', { class: 'btn primary block big', onclick: () => void finish() }, 'Empezar')),
    );
  }

  /** Aviso de que falta la altura o el peso. Devuelve 'add' (volver a rellenarlo) o 'skip'. */
  private missingDialog(what: 'height' | 'weight' | 'both'): Promise<'add' | 'skip'> {
    const msg = {
      both: 'Sin la altura y el peso no podremos calcular las calorías quemadas, el IMC ni hacer el control de tu peso.',
      height: 'Sin la altura no podremos calcular tu IMC.',
      weight: 'Sin el peso no podremos calcular las calorías quemadas, el IMC ni hacer el control de tu peso.',
    }[what];
    return new Promise((resolve) => {
      const close = (v: 'add' | 'skip') => { wrap.remove(); resolve(v); };
      const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close('add') },
        h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true' },
          h('h3', {}, 'Faltan datos'),
          h('p', {}, msg),
          h('p', { class: 'muted small' }, 'Puedes añadirlos ahora o más tarde en Mis datos.'),
          h('div', { class: 'dialog-actions' },
            h('button', { class: 'btn ghost', onclick: () => close('skip') }, 'Continuar sin ellos'),
            h('button', { class: 'btn primary', onclick: () => close('add') }, 'Añadirlos ahora'))));
      document.body.append(wrap);
    });
  }
}
