import { Store } from '../../domain/Store';
import { SECTION_IDS, SECTION_TITLES, type Settings } from '../../domain/types';
import { pickBackupFile } from '../../services/Backup';
import { saveBackupNow } from '../components/backupPrompt';
import type { App, Screen } from '../App';
import { append, clear, confirmDialog, h, plural } from '../dom';
import { icon, SECTION_STYLE, type IconName } from '../icons';

interface NumField {
  key: 'defaultSeconds' | 'sectionCountdown';
  label: string;
  help: string;
  icon: IconName;
  min: number;
  max: number;
  step: number;
}

const FIELDS: NumField[] = [
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

  /** Pausa entre ejercicios, una por apartado. */
  private restCard(s: Settings): HTMLElement {
    return h('section', { class: 'card setting rest-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('rest')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Pausa entre ejercicios'), h('p', { class: 'muted small' }, 'Tiempo para prepararte antes del siguiente ejercicio, en cada apartado.'))),
      ...SECTION_IDS.map((sec) => {
        const v = s.rest[sec];
        const set = (n: number) => this.update({ rest: { ...s.rest, [sec]: Math.max(0, Math.min(90, n)) } });
        const row = h('div', { class: 'rest-row' },
          h('span', { class: 'sec-dot' }, icon(SECTION_STYLE[sec].icon)),
          h('span', { class: 'rest-name' }, SECTION_TITLES[sec]),
          h('div', { class: 'stepper' },
            h('button', { 'aria-label': `Menos pausa en ${SECTION_TITLES[sec]}`, disabled: v <= 0, onclick: () => set(v - 1) }, '−'),
            h('span', { class: 'secs' }, `${v} s`),
            h('button', { 'aria-label': `Más pausa en ${SECTION_TITLES[sec]}`, disabled: v >= 90, onclick: () => set(v + 1) }, '+')));
        row.style.setProperty('--sec', SECTION_STYLE[sec].color);
        return row;
      }));
  }

  /** Guardar una copia (para Drive) y restaurarla. */
  private backupSection(): HTMLElement {
    const last = this.app.store.lastBackup;
    const msg = h('p', { class: 'muted small', 'aria-live': 'polite' },
      last ? `Última copia: ${new Date(last).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Aún no has guardado ninguna copia.');
    const save = async () => {
      if (await saveBackupNow(this.app)) this.render();
    };
    const restore = async () => {
      const text = await pickBackupFile();
      if (text == null) return;
      let info;
      try {
        info = Store.inspectBackup(text);
      } catch (e) {
        await confirmDialog((e as Error).message, 'Vale', '');
        return;
      }
      const when = info.exportedAt ? ` del ${new Date(info.exportedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
      const ok = await confirmDialog(
        `¿Restaurar la copia${when}? Tiene ${plural(info.routines, 'tabla', 'tablas')} y ${plural(info.history, 'entrenamiento', 'entrenamientos')}. Se sustituirá todo lo que hay ahora en la app.`,
        'Restaurar');
      if (!ok) return;
      this.app.store.importBackup(text);
      location.reload();
    };
    return h('section', { class: 'card backup' },
      h('div', { class: 'backup-head' },
        h('span', { class: 'set-icon' }, icon('copy')),
        h('div', { class: 'set-text' },
          h('strong', {}, 'Tablas, historial y ajustes'),
          h('p', { class: 'muted small' }, 'Al guardar se abre el menú de compartir: elige Drive para tener la copia a salvo. Para recuperarla, pulsa Restaurar y elige el archivo.'))),
      msg,
      h('div', { class: 'backup-actions' },
        h('button', { class: 'btn primary', onclick: () => void save() }, icon('check'), 'Guardar copia'),
        h('button', { class: 'btn ghost', onclick: () => void restore() }, icon('back'), 'Restaurar copia')));
  }

  private render(): void {
    const s = this.app.store.settings;
    clear(this.body);
    this.body.append(h('h3', { class: 'block-title' }, 'Tiempos'), this.restCard(s));
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
      h('h3', { class: 'block-title' }, 'Copia de seguridad'),
      this.backupSection(),
      h('p', { class: 'muted small center' }, 'Ejercicios en casa · funciona sin conexión'),
      !this.app.voice.available ? h('p', { class: 'muted' }, 'Este navegador no tiene voz disponible.') : null,
    );
  }
}
