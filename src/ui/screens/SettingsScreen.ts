import type { Settings } from '../../domain/types';
import type { App, Screen } from '../App';
import { append, clear, h } from '../dom';

interface NumField {
  key: 'restSeconds' | 'defaultSeconds' | 'sectionCountdown';
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: NumField[] = [
  { key: 'restSeconds', label: 'Pausa entre ejercicios', help: 'Tiempo para prepararte antes del siguiente ejercicio.', min: 0, max: 60, step: 1 },
  { key: 'sectionCountdown', label: 'Cuenta atrás de cada apartado', help: 'Antes del primer ejercicio de cada apartado.', min: 0, max: 30, step: 1 },
  { key: 'defaultSeconds', label: 'Duración inicial de cada ejercicio', help: 'La que se pone al marcar un ejercicio. Luego puedes cambiarla.', min: 5, max: 300, step: 5 },
];

export class SettingsScreen implements Screen {
  readonly el = h('main', { class: 'screen settings' });
  private body = h('div', { class: 'settings-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, '‹'),
        h('h1', {}, 'Ajustes')),
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

  private render(): void {
    const s = this.app.store.settings;
    clear(this.body);
    for (const f of FIELDS) {
      const v = s[f.key];
      this.body.append(
        h('section', { class: 'card setting' },
          h('div', {}, h('strong', {}, f.label), h('p', { class: 'muted' }, f.help)),
          h('div', { class: 'stepper big' },
            h('button', { 'aria-label': 'Menos', disabled: v <= f.min, onclick: () => this.update({ [f.key]: Math.max(f.min, v - f.step) }) }, '−'),
            h('span', { class: 'secs' }, `${v} s`),
            h('button', { 'aria-label': 'Más', disabled: v >= f.max, onclick: () => this.update({ [f.key]: Math.min(f.max, v + f.step) }) }, '+'))),
      );
    }
    const toggle = (key: 'sound' | 'voice', label: string, help: string) =>
      h('section', { class: 'card setting' },
        h('label', { class: 'switch-row', for: `set-${key}` },
          h('span', {}, h('strong', {}, label), h('span', { class: 'muted block' }, help)),
          h('input', { type: 'checkbox', id: `set-${key}`, class: 'switch', checked: s[key], onchange: (e: Event) => this.update({ [key]: (e.target as HTMLInputElement).checked }) })));
    append(this.body,
      toggle('sound', 'Pitidos', 'Al empezar y acabar cada ejercicio, y en los últimos 3 segundos.'),
      toggle('voice', 'Avisos por voz', 'Dice el nombre del ejercicio, el siguiente y cuándo cambiar de lado.'),
      h('button', {
        class: 'btn ghost block',
        onclick: () => {
          this.app.sounds.unlock();
          this.app.sounds.start();
          this.app.voice.unlock();
          this.app.voice.say('Así sonarán los avisos. Siguiente: curl de bíceps.');
        },
      }, 'Probar sonido y voz'),
      !this.app.voice.available ? h('p', { class: 'muted' }, 'Este navegador no tiene voz disponible.') : null,
    );
  }
}
