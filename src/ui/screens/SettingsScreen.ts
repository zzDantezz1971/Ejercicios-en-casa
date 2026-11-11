import { LANG, LANGS, LOCALE } from '../../i18n';
import { applyTheme } from '../../platform/theme';
import { flushDurable } from '../../platform/durable';
import { showUpdateDialog } from '../components/updateDialog';
import { BUILD_TIME, checkForUpdate, updateReady } from '../../services/Updates';
import { IS_NATIVE } from '../../platform/native';
import { Store } from '../../domain/Store';
import { SECTION_IDS, SECTION_TITLES, type Settings } from '../../domain/types';
import { pickBackupFile } from '../../services/Backup';
import { BACKUP_EVERY_DAYS, saveBackupNow } from '../components/backupPrompt';
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

  /** Fecha y hora de la versión instalada y botón para buscar una nueva. */
  private versionSection(): HTMLElement {
    const d = new Date(BUILD_TIME);
    const when = `${d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}, ${d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}`;
    if (IS_NATIVE) {
      // en la app Android las versiones nuevas llegan por Google Play
      return h('section', { class: 'card version-card' },
        h('div', { class: 'set-text' },
          h('strong', {}, 'Versión de la app'),
          h('p', { class: 'muted small' }, `Del ${when}`),
          h('p', { class: 'muted small' }, 'Las actualizaciones llegan desde Google Play.')));
    }
    const status = h('p', { class: 'muted small', 'aria-live': 'polite' }, updateReady() ? 'Hay una versión nueva lista.' : '');
    const btn = h('button', { class: 'btn ghost small' }, updateReady() ? 'Actualizar ahora' : 'Buscar actualización');
    btn.addEventListener('click', async () => {
      if (updateReady()) return void showUpdateDialog();
      btn.disabled = true;
      status.textContent = 'Buscando…';
      const found = await checkForUpdate();
      btn.disabled = false;
      if (found) {
        status.textContent = 'Hay una versión nueva lista.';
        btn.textContent = 'Actualizar ahora';
      } else {
        status.textContent = navigator.onLine ? 'Ya tienes la última versión.' : 'Sin conexión: no se puede comprobar ahora.';
      }
    });
    return h('section', { class: 'card version-card' },
      h('div', { class: 'set-text' },
        h('strong', {}, 'Versión de la app'),
        h('p', { class: 'muted small' }, `Del ${when}`)),
      btn,
      status);
  }

  /** Idioma de la app: al cambiarlo se recarga para pintarlo todo de nuevo. */
  /** Modo oscuro, claro o el del sistema. */
  private themeCard(s: Settings): HTMLElement {
    const pick = (t: Settings['theme']) => {
      this.update({ theme: t });
      applyTheme(t);
    };
    const opt = (t: Settings['theme'], label: string) =>
      h('button', { class: 'seg' + (s.theme === t ? ' on' : ''), 'aria-pressed': String(s.theme === t), onclick: () => pick(t) }, label);
    return h('section', { class: 'card setting rest-card lang-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('sun')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Modo de la pantalla'), h('p', { class: 'muted small' }, 'Automático usa el mismo modo que tu móvil.'))),
      h('div', { class: 'segmented lang-segs' }, opt('dark', 'Oscuro'), opt('light', 'Claro'), opt('auto', 'Automático')));
  }

  private langCard(): HTMLElement {
    const pick = async (id: Settings['lang']) => {
      if (id === LANG) return;
      this.app.store.saveSettings({ ...this.app.store.settings, lang: id });
      // en la app Android, que el idioma quede guardado antes de recargar
      await flushDurable();
      location.reload();
    };
    return h('section', { class: 'card setting rest-card lang-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('globe')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Idioma'))),
      h('div', { class: 'segmented lang-segs', 'data-no-tr': '' },
        ...LANGS.map((l) => h('button', { class: 'seg' + (l.id === LANG ? ' on' : ''), 'aria-pressed': String(l.id === LANG), lang: l.id, onclick: () => void pick(l.id) }, l.name))));
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
    const days = this.app.store.daysSinceBackup();
    // la fecha bien visible; en naranja si no hay copia o tiene una semana o más (como el aviso de Inicio)
    const old = days >= BACKUP_EVERY_DAYS;
    // días de calendario (una copia de anteayer por la noche es «Hace 2 días», aunque no hayan pasado 48 h)
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const cal = last ? Math.round((midnight(new Date()) - midnight(new Date(last))) / 864e5) : 0;
    const ago = cal <= 0 ? 'Hoy' : cal === 1 ? 'Ayer' : `Hace ${cal} días`;
    const msg = h('div', { class: `backup-last${old ? ' old' : ''}`, 'aria-live': 'polite' },
      icon(old ? 'info' : 'check'),
      last
        ? h('div', {}, h('strong', {}, `Última copia: ${new Date(last).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}`),
          h('span', { class: 'small' }, old ? `${ago}. Conviene hacer otra.` : ago))
        : h('strong', {}, 'Aún no has guardado ninguna copia.'));
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
      const when = info.exportedAt ? ` del ${new Date(info.exportedAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
      const ok = await confirmDialog(
        `¿Restaurar la copia${when}? Tiene ${plural(info.routines, 'tabla', 'tablas')} y ${plural(info.history, 'entrenamiento', 'entrenamientos')}. Se sustituirá todo lo que hay ahora en la app.`,
        'Restaurar');
      if (!ok) return;
      this.app.store.importBackup(text);
      await flushDurable();
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

  /** Estilo del maniquí: realista, dibujo o de piezas. */
  private figureCard(s: Settings): HTMLElement {
    const opt = (t: Settings['figureStyle'], label: string) =>
      h('button', { class: 'seg' + (s.figureStyle === t ? ' on' : ''), 'aria-pressed': String(s.figureStyle === t), onclick: () => this.update({ figureStyle: t }) }, label);
    return h('section', { class: 'card setting rest-card lang-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('user')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Estilo del muñeco'),
          h('p', { class: 'muted small' }, 'Cómo se ve el muñeco que hace los ejercicios. El de piezas no colorea los músculos.'))),
      h('div', { class: 'segmented lang-segs' }, opt('real', 'Realista'), opt('toon', 'Dibujo'), opt('pieces', 'Piezas')));
  }

  private render(): void {
    const s = this.app.store.settings;
    clear(this.body);
    this.body.append(
      h('h3', { class: 'block-title' }, 'Apariencia'), this.themeCard(s), this.figureCard(s),
      h('h3', { class: 'block-title' }, 'Idioma'), this.langCard(),
      h('h3', { class: 'block-title' }, 'Tiempos'), this.restCard(s));
    // cuenta atrás y duración inicial: en una sola tarjeta, con el título y el contador en la misma fila
    this.body.append(h('section', { class: 'card setting-list' },
      ...FIELDS.map((f) => {
        const v = s[f.key];
        return h('div', { class: 'set-compact' },
          h('span', { class: 'set-icon' }, icon(f.icon)),
          h('strong', { class: 'sc-title' }, f.label),
          h('div', { class: 'stepper inline sc-step' },
            h('button', { 'aria-label': 'Menos', disabled: v <= f.min, onclick: () => this.update({ [f.key]: Math.max(f.min, v - f.step) }) }, '−'),
            h('span', { class: 'secs' }, `${v} s`),
            h('button', { 'aria-label': 'Más', disabled: v >= f.max, onclick: () => this.update({ [f.key]: Math.min(f.max, v + f.step) }) }, '+')),
          h('p', { class: 'muted small sc-help' }, f.help));
      })));
    const toggle = (key: 'sound' | 'voice' | 'voiceCount' | 'phrases', ic: IconName, label: string, help: string) =>
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
          this.app.voice.say({
            es: 'Así sonarán los avisos. Siguiente: curl de bíceps.',
            ca: 'Així sonaran els avisos. Següent: curl de bíceps.',
            en: 'This is how the alerts will sound. Next up: bicep curl.',
          }[this.app.voice.lang]);
        },
      }, icon('volume'), 'Probar sonido y voz'),
      h('h3', { class: 'block-title' }, 'Inicio'),
      toggle('phrases', 'bolt', 'Frases motivadoras', 'Una frase distinta cada día en Inicio.'),
      h('h3', { class: 'block-title' }, 'Reloj'),
      this.watchSection(),
      h('h3', { class: 'block-title' }, 'Copia de seguridad'),
      this.backupSection(),
      this.versionSection(),
      !this.app.voice.available ? h('p', { class: 'muted' }, 'Este navegador no tiene voz disponible.') : null,
    );
  }
}
