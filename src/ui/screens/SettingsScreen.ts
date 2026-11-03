import type { Settings } from '../../domain/types';
import type { App, Screen } from '../App';
import { append, clear, h } from '../dom';
import { icon, type IconName } from '../icons';

interface NumField {
  key: 'restSeconds' | 'defaultSeconds' | 'sectionCountdown';
  label: string;
  help: string;
  icon: IconName;
  min: number;
  max: number;
  step: number;
}

const FIELDS: NumField[] = [
  { key: 'restSeconds', icon: 'rest', label: 'Pausa entre ejercicios', help: 'Tiempo para prepararte antes del siguiente ejercicio.', min: 0, max: 60, step: 1 },
  { key: 'sectionCountdown', icon: 'hourglass', label: 'Cuenta atrás de cada apartado', help: 'Antes del primer ejercicio de cada apartado.', min: 0, max: 30, step: 1 },
  { key: 'defaultSeconds', icon: 'clock', label: 'Duración inicial de cada ejercicio', help: 'La que se pone al marcar un ejercicio. Luego puedes cambiarla.', min: 5, max: 300, step: 5 },
];

export class SettingsScreen implements Screen {
  readonly el = h('main', { class: 'screen settings' });
  readonly tab = 'ajustes' as const;
  private body = h('div', { class: 'settings-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'page-head' }, h('h1', {}, 'Ajustes')),
      this.body,
    );
  }

  enter(): void {
    this.render();
  }

  private update(patch: Partial<Settings>): void {
    this.app.store.saveSettings({ ...this.app.store.settings, ...patch });
    this.app.applySettings();
    this.render();
  }

  /** Dos tarjetas con la figura de cada maniquí para elegir. */
  private mannequinPicker(current: 1 | 2): HTMLElement {
    const opt = (n: 1 | 2, title: string, desc: string) => {
      const img = h('img', { class: 'mq-thumb', alt: '' });
      const card = h('button', {
        class: 'mq-option' + (current === n ? ' on' : ''),
        'aria-pressed': String(current === n),
        onclick: () => {
          if (current !== n) {
            this.app.haptics.tap();
            this.update({ mannequin: n });
          }
        },
      }, h('span', { class: 'mq-img' }, img), h('strong', {}, title), h('span', { class: 'muted small' }, desc),
        current === n ? h('span', { class: 'mq-check' }, icon('check')) : null);
      // vista previa: el maniquí elegido se dibuja con el ajuste actual; el otro se pide aparte
      const ex = this.app.catalog.get('curl-de-biceps');
      if (ex) void this.app.thumbs.preview(ex, n === 2).then((u) => (img.src = u));
      return card;
    };
    return h('section', { class: 'mq-picker' },
      opt(1, 'Maniquí 1', 'De piezas, con expresiones, reloj y muñequera'),
      opt(2, 'Maniquí 2', 'Realista, con cuerpo y manos humanas'));
  }

  private render(): void {
    const s = this.app.store.settings;
    clear(this.body);
    this.body.append(h('h3', { class: 'block-title' }, 'Tiempos'));
    for (const f of FIELDS) {
      const v = s[f.key];
      this.body.append(
        h('section', { class: 'card setting' },
          h('span', { class: 'set-icon' }, icon(f.icon)),
          h('div', { class: 'set-text' }, h('strong', {}, f.label), h('p', { class: 'muted small' }, f.help)),
          h('div', { class: 'stepper big' },
            h('button', { 'aria-label': 'Menos', disabled: v <= f.min, onclick: () => this.update({ [f.key]: Math.max(f.min, v - f.step) }) }, '−'),
            h('span', { class: 'secs' }, `${v} s`),
            h('button', { 'aria-label': 'Más', disabled: v >= f.max, onclick: () => this.update({ [f.key]: Math.min(f.max, v + f.step) }) }, '+'))),
      );
    }
    const toggle = (key: 'sound' | 'voice', ic: IconName, label: string, help: string) =>
      h('section', { class: 'card setting' },
        h('label', { class: 'switch-row', for: `set-${key}` },
          h('span', { class: 'set-icon' }, icon(ic)),
          h('span', { class: 'set-text' }, h('strong', {}, label), h('span', { class: 'muted block small' }, help)),
          h('input', { type: 'checkbox', id: `set-${key}`, class: 'switch', checked: s[key], onchange: (e: Event) => this.update({ [key]: (e.target as HTMLInputElement).checked }) })));
    append(this.body,
      h('h3', { class: 'block-title' }, 'Maniquí'),
      this.mannequinPicker(s.mannequin),
      h('h3', { class: 'block-title' }, 'Avisos'),
      toggle('sound', 'volume', 'Pitidos y vibración', 'Al empezar y acabar cada ejercicio, y en los últimos 3 segundos.'),
      toggle('voice', 'voice', 'Avisos por voz', 'Dice el nombre del ejercicio, el siguiente y cuándo cambiar de lado.'),
      h('button', {
        class: 'btn ghost block',
        onclick: () => {
          this.app.sounds.unlock();
          this.app.sounds.start();
          this.app.voice.unlock();
          this.app.voice.say('Así sonarán los avisos. Siguiente: curl de bíceps.');
        },
      }, icon('volume'), 'Probar sonido y voz'),
      h('p', { class: 'muted small center' }, 'Ejercicios en casa · funciona sin conexión'),
      !this.app.voice.available ? h('p', { class: 'muted' }, 'Este navegador no tiene voz disponible.') : null,
    );
  }
}
