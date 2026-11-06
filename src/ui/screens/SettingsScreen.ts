import { Store } from '../../domain/Store';
import { SECTION_IDS, SECTION_TITLES, type Settings } from '../../domain/types';
import { pickBackupFile } from '../../services/Backup';
import { saveBackupNow } from '../components/backupPrompt';
import { askWeight, bmiRow, fmtKg } from '../components/weightCard';
import { WeightScreen } from './WeightScreen';
import type { App, Screen } from '../App';
import { append, bodyWeightDialog, clear, confirmDialog, h, plural } from '../dom';
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

  /** Edad, altura, peso y sexo: calorías e IMC. */
  private profileCard(s: Settings): HTMLElement {
    const p = s.profile;
    const cw = this.app.store.currentWeight;
    const set = (patch: Partial<Settings['profile']>) => this.update({ profile: { ...p, ...patch } });
    const stepper = (label: string, value: number | null, unit: string, start: number, step: number, min: number, max: number, onSet: (v: number) => void) => {
      const v = value ?? start;
      const fmt = (n: number) => `${String(n).replace('.', ',')} ${unit}`;
      return h('div', { class: 'rest-row profile-row' },
        h('span', { class: 'rest-name' }, label),
        h('div', { class: 'stepper' },
          h('button', { 'aria-label': `Menos ${label.toLowerCase()}`, disabled: value !== null && v <= min, onclick: () => onSet(value === null ? start : Math.max(min, v - step)) }, '−'),
          h('span', { class: 'secs' + (value === null ? ' unset' : '') }, value === null ? '—' : fmt(v)),
          h('button', { 'aria-label': `Más ${label.toLowerCase()}`, disabled: value !== null && v >= max, onclick: () => onSet(value === null ? start : Math.min(max, v + step)) }, '+')));
    };
    const sexBtn = (v: 'h' | 'm', label: string) =>
      h('button', { class: 'seg' + (p.sex === v ? ' on' : ''), 'aria-pressed': String(p.sex === v), onclick: () => set({ sex: v }) }, label);
    return h('section', { class: 'card setting rest-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('flame')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Calorías e IMC'),
          h('p', { class: 'muted small' }, 'Solo se guardan en tu móvil. Con el peso ya se estiman las calorías; con la edad y el reloj conectado, se calculan con tus pulsaciones. Cada entrenamiento guarda sus calorías con el peso de ese día. La altura sirve para el IMC.'))),
      stepper('Edad', p.age, 'años', 50, 1, 15, 99, (v) => set({ age: v })),
      stepper('Altura', p.height ?? null, 'cm', 175, 1, 100, 230, (v) => set({ height: v })),
      h('div', { class: 'rest-row profile-row' },
        h('span', { class: 'rest-name' }, 'Peso', h('span', { class: 'muted small block' }, cw ? `Último anotado: ${fmtKg(cw)}` : 'Sin anotar')),
        h('button', { class: 'btn primary small', onclick: async () => { if (await askWeight(this.app)) this.render(); } }, icon('plus'), 'Anotar peso')),
      cw && p.height ? bmiRow(cw, p.height) : null,
      h('div', { class: 'rest-row profile-row' },
        h('span', { class: 'rest-name' }, 'Objetivo de peso', h('span', { class: 'muted small block' }, p.goalKg ? fmtKg(p.goalKg) : 'Sin objetivo')),
        h('div', { class: 'goal-btns' },
          p.goalKg ? h('button', { class: 'btn ghost small', onclick: () => set({ goalKg: null }) }, 'Quitar') : null,
          h('button', { class: 'btn ghost small', onclick: async () => {
            const kg = await bodyWeightDialog('Peso al que quieres llegar', p.goalKg ?? Math.round(((cw ?? 80) - 3) * 10) / 10);
            if (kg !== null) set({ goalKg: kg });
          } }, p.goalKg ? 'Cambiar' : 'Fijar objetivo'))),
      h('button', { class: 'link-btn profile-link', onclick: () => this.app.push(new WeightScreen(this.app)) }, 'Ver histórico de peso', icon('chevron')),
      h('div', { class: 'rest-row profile-row' }, h('span', { class: 'rest-name' }, 'Sexo'), h('div', { class: 'segmented' }, sexBtn('h', 'Hombre'), sexBtn('m', 'Mujer'))));
  }

  /** Conexión con el reloj para ver las pulsaciones. */
  private watchSection(): HTMLElement {
    const hr = this.app.heart;
    const live = h('p', { class: 'hr-live', 'aria-live': 'polite' });
    const btn = h('button', { class: 'btn primary' });
    const paint = () => {
      const bpm = hr.current;
      live.replaceChildren(icon('heart'),
        hr.status === 'on' ? (bpm ? `${hr.deviceName}: ${bpm} ppm` : `${hr.deviceName}: conectado, esperando pulso…`)
          : hr.status === 'connecting' ? 'Conectando…' : hr.status === 'lost' ? 'Conexión perdida, reintentando…' : 'Sin conectar');
      live.className = 'hr-live ' + hr.status;
      btn.replaceChildren(hr.status === 'off' ? 'Probar conexión' : 'Desconectar');
      btn.className = hr.status === 'off' ? 'btn primary' : 'btn ghost';
    };
    btn.addEventListener('click', async () => {
      if (hr.status !== 'off') return hr.disconnect();
      try {
        await hr.connect();
      } catch (e) {
        const name = (e as DOMException)?.name;
        if (name !== 'NotFoundError' && name !== 'AbortError') await confirmDialog(`No se pudo conectar: ${(e as Error).message}`, 'Vale', '');
      }
    });
    const off = hr.onChange(paint);
    // deja de escuchar cuando la sección desaparece
    const obs = new MutationObserver(() => { if (!live.isConnected) { off(); obs.disconnect(); } });
    queueMicrotask(() => obs.observe(this.body, { childList: true }));
    paint();
    if (!hr.available) {
      return h('section', { class: 'card watch' }, h('p', { class: 'muted small' }, 'Este navegador no puede usar Bluetooth. Abre la app con Chrome en Android para conectar el reloj.'));
    }
    return h('section', { class: 'card watch' },
      h('div', { class: 'backup-head' },
        h('span', { class: 'set-icon hr-icon' }, icon('heart')),
        h('div', { class: 'set-text' },
          h('strong', {}, 'Pulsaciones del reloj'),
          h('p', { class: 'muted small' }, 'En el reloj, activa "Difundir frecuencia cardíaca" (suele estar en Ajustes › Ajustes de entrenamiento). Después, al empezar un entrenamiento, toca "Conectar reloj" encima del maniquí y elige tu reloj. Si no aparece, inicia un entrenamiento en el reloj y vuelve a intentarlo.'))),
      live,
      btn,
      h('label', { class: 'switch-row', for: 'set-askWatch' },
        h('span', { class: 'set-text' }, h('strong', {}, 'Preguntar al empezar'), h('span', { class: 'muted block small' }, 'Antes de cada entrenamiento, pantalla para conectar el reloj.')),
        h('input', { type: 'checkbox', id: 'set-askWatch', class: 'switch', checked: this.app.store.settings.askWatch, onchange: (e: Event) => this.update({ askWatch: (e.target as HTMLInputElement).checked }) })));
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
    const toggle = (key: 'sound' | 'voice' | 'voiceCount', ic: IconName, label: string, help: string) =>
      h('section', { class: 'card setting' },
        h('label', { class: 'switch-row', for: `set-${key}` },
          h('span', { class: 'set-icon' }, icon(ic)),
          h('span', { class: 'set-text' }, h('strong', {}, label), h('span', { class: 'muted block small' }, help)),
          h('input', { type: 'checkbox', id: `set-${key}`, class: 'switch', checked: s[key], onchange: (e: Event) => this.update({ [key]: (e.target as HTMLInputElement).checked }) })));
    append(this.body,
      h('h3', { class: 'block-title' }, 'Avisos'),
      toggle('sound', 'volume', 'Pitidos y vibración', 'Al empezar y acabar cada ejercicio, y en los últimos 3 segundos.'),
      toggle('voice', 'voice', 'Avisos por voz', 'Dice el nombre del ejercicio, el siguiente y cuándo cambiar de lado.'),
      s.voice ? toggle('voiceCount', 'hourglass', 'Cuenta atrás por voz', 'Dice "tres, dos, uno" al final de cada ejercicio, descanso y cuenta atrás.') : null,
      h('button', {
        class: 'btn ghost block',
        onclick: () => {
          this.app.sounds.unlock();
          this.app.sounds.start();
          this.app.voice.unlock();
          this.app.voice.say('Así sonarán los avisos. Siguiente: curl de bíceps.');
        },
      }, icon('volume'), 'Probar sonido y voz'),
      h('h3', { class: 'block-title' }, 'Mis datos'),
      this.profileCard(s),
      h('h3', { class: 'block-title' }, 'Reloj'),
      this.watchSection(),
      h('h3', { class: 'block-title' }, 'Copia de seguridad'),
      this.backupSection(),
      h('p', { class: 'muted small center' }, 'Ejercicios en casa · funciona sin conexión'),
      !this.app.voice.available ? h('p', { class: 'muted' }, 'Este navegador no tiene voz disponible.') : null,
    );
  }
}
