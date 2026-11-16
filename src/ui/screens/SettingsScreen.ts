import { LANG, LANGS, LOCALE } from '../../i18n';
import { applyColor, applyTheme, COLOR_INFO, COLOR_THEMES, FREE_COLORS, type ColorTheme } from '../../platform/theme';
import { flushDurable } from '../../platform/durable';
import { showUpdateDialog } from '../components/updateDialog';
import { BUILD_TIME, checkForUpdate, updateReady } from '../../services/Updates';
import { IS_NATIVE } from '../../platform/native';
import { healthStatus, installHealth, requestHealth } from '../../services/Health';
import { REMINDER_KINDS, remindersOf, type ReminderKind } from '../../domain/reminders';
import { dayName, EVERY, RemindersScreen, WEEK } from './RemindersScreen';
import { Store } from '../../domain/Store';
import { SECTION_IDS, SECTION_TITLES, type Settings } from '../../domain/types';
import { HAS_BACKUP, pickBackupFile } from '../../services/Backup';
import { BACKUP_EVERY_DAYS, saveBackupNow } from '../components/backupPrompt';
import type { App, Screen } from '../App';
import { LookScreen } from './LookScreen';
import { GuideScreen } from './GuideScreen';
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
  /** Personaliza el muñeco: abre su pantalla. */
  private lookCard(): HTMLElement {
    return h('button', { class: 'card setting rest-card look-open', onclick: () => this.app.push(new LookScreen(this.app)) },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('user')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Personaliza el muñeco'), h('p', { class: 'muted small' }, 'Colores de piel, pelo y ropa, peinado, gafas y barba.')),
        icon('chevron')));
  }

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

  /** Tema de color de la app: un círculo por tema (el elegido, con ✓). */
  private colorCard(s: Settings): HTMLElement {
    const saved = ((COLOR_THEMES as readonly string[]).includes(s.colorTheme ?? '') ? s.colorTheme : 'blau') as ColorTheme;
    const cur = this.app.access.premium || FREE_COLORS.has(saved) ? saved : 'blau';
    const premium = this.app.access.premium;
    const pick = (c: ColorTheme) => {
      if (!premium && !FREE_COLORS.has(c)) return this.app.showPremium();
      this.update({ colorTheme: c });
      applyColor(c);
      this.render();
    };
    return h('section', { class: 'card setting rest-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('star')),
        h('div', { class: 'set-text' }, h('strong', {}, 'Tema de color'), h('p', { class: 'muted small' }, h('span', {}, COLOR_INFO[cur].name)))),
      h('div', { class: 'color-themes', role: 'group', 'aria-label': 'Tema de color' },
        ...COLOR_THEMES.map((c) => {
          const locked = !premium && !FREE_COLORS.has(c);
          const b = h('button', { class: 'color-dot' + (c === cur ? ' on' : '') + (locked ? ' locked' : ''), 'aria-label': COLOR_INFO[c].name, 'aria-pressed': String(c === cur), onclick: () => pick(c) },
            c === cur ? icon('check') : locked ? icon('lock') : '');
          b.style.background = `linear-gradient(140deg, ${COLOR_INFO[c].swatch[0]}, ${COLOR_INFO[c].swatch[1]})`;
          return b;
        })));
  }

  private langCard(): HTMLElement {
    const pick = async (id: Settings['lang']) => {
      if (id === LANG) return;
      this.app.store.saveSettings({ ...this.app.store.settings, lang: id });
      // en la app Android, que el idioma quede guardado antes de recargar
      await flushDurable();
      // al volver a abrir, en Ajustes (no en Inicio)
      try { sessionStorage.setItem('abrir-ajustes', '1'); } catch { /* sin almacenamiento */ }
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
  /**
   * Health Connect (app de Android): guardar los entrenamientos y el peso. Se pinta cuando se sabe si el móvil lo tiene;
   * si no es compatible, no sale nada. Se vuelve a comprobar al volver a la app (p. ej., después de instalarlo).
   */
  private healthSection(): HTMLElement {
    const wrap = h('div', { class: 'health-wrap' });
    const paint = async () => {
      const st = await healthStatus();
      let on = !!this.app.store.settings.healthConnect;
      // si se ha quitado el permiso (o ya no está Health Connect), se apaga
      if (on && !(st.status === 'available' && st.granted)) {
        on = false;
        this.app.store.saveSettings({ ...this.app.store.settings, healthConnect: false });
      }
      clear(wrap);
      if (st.status === 'unsupported') return;
      const head = h('div', { class: 'backup-head' },
        h('span', { class: 'set-icon health-icon' }, icon('heart')),
        h('div', { class: 'set-text' },
          h('strong', {}, 'Health Connect'),
          h('p', { class: 'muted small' }, 'Tus entrenamientos (tiempo, calorías y pulsaciones del reloj) y tu peso aparecen en Samsung Health, Google Fit, Fitbit y otras apps de salud. Kasa Fit solo escribe: nunca lee tus datos de salud.')));
      if (st.status === 'install') {
        wrap.append(h('h3', { class: 'block-title' }, 'Apps de salud'), h('section', { class: 'card health-card' }, head,
          h('p', { class: 'muted small' }, 'Para usarlo, instala la app gratuita Health Connect de Google.'),
          h('button', { class: 'btn primary block', onclick: () => installHealth() }, icon('download'), 'Instalar Health Connect')));
        return;
      }
      const box = h('input', { type: 'checkbox', id: 'set-health', class: 'switch', checked: on, onchange: async () => {
        if (!box.checked) {
          this.app.store.saveSettings({ ...this.app.store.settings, healthConnect: false });
          return;
        }
        const r = st.granted ? st : await requestHealth();
        if (r.status === 'available' && r.granted) {
          this.app.store.saveSettings({ ...this.app.store.settings, healthConnect: true });
          this.app.haptics.tap();
        } else {
          box.checked = false;
          await confirmDialog('Sin el permiso de Health Connect no se pueden guardar los entrenamientos. Puedes darlo cuando quieras volviendo a activar esta opción.', 'Vale', '');
        }
        void paint();
      } });
      wrap.append(h('h3', { class: 'block-title' }, 'Apps de salud'), h('section', { class: 'card health-card' }, head,
        h('label', { class: 'switch-row', for: 'set-health' },
          h('span', { class: 'set-text' }, h('strong', {}, 'Guardar los entrenamientos en Health Connect'),
            h('span', { class: 'muted block small' }, 'Desde ahora, al acabar cada entrenamiento y al anotar el peso.')),
          box)));
    };
    void paint();
    const onVisible = () => {
      if (!wrap.isConnected) { document.removeEventListener('visibilitychange', onVisible); return; }
      if (document.visibilityState === 'visible') void paint();
    };
    document.addEventListener('visibilitychange', onVisible);
    return wrap;
  }

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
      // relojes Wear OS (Samsung, Pixel...): no emiten el pulso solos; con una app del reloj, sí
      ((): HTMLElement => {
        // la pregunta en blanco y, al lado, «Haz clic aquí» (en azul) para ver las instrucciones
        const steps = h('div', { class: 'watch-steps', hidden: true },
        h('p', { class: 'small' }, 'Estos relojes (y otros con Wear OS) no envían el pulso a otras apps por sí solos. Para usarlos con Kasa Fit:'),
        h('ol', { class: 'small' },
          h('li', {}, 'En el reloj, abre Play Store e instala una app gratuita que emita el pulso por Bluetooth. Búscala como «Heart Rate Broadcast» o «HR broadcast».'),
          h('li', {}, 'Antes de entrenar, ábrela en el reloj y activa la emisión del pulso.'),
          h('li', {}, 'En Kasa Fit, toca «Conectar reloj» y elige el reloj en la lista.')),
        h('p', { class: 'muted small' }, 'Funciona con Galaxy Watch 4 o posterior, Pixel Watch y otros Wear OS. No sirve para Apple Watch, Fitbit ni los Samsung antiguos (Galaxy Watch 3, Active 2 o anteriores).'));
        const link = h('button', { class: 'link-btn watch-link', 'aria-expanded': 'false', onclick: () => {
          steps.hidden = !steps.hidden;
          link.setAttribute('aria-expanded', String(!steps.hidden));
        } }, 'Haz clic aquí');
        return h('div', { class: 'watch-help' }, h('p', { class: 'watch-q' }, h('span', {}, '¿Tienes un Samsung Galaxy Watch o un Pixel Watch?'), ' ', link), steps);
      })(),
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
        ? h('div', {}, h('strong', {}, `Última copia: ${new Date(last).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}, ${new Date(last).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}`),
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
        `¿Restaurar la copia${when}? Tiene ${plural(info.routines, 'tabla', 'tablas')} y ${plural(info.history, 'entrenamiento', 'entrenamientos')}. Se borrará todo lo que hay ahora en la app (tablas, planes, historial, peso, medallas y ajustes) y se sustituirá por la copia. No se puede deshacer.`,
        'Borrar y restaurar', 'Cancelar', true);
      if (!ok) return;
      this.app.store.importBackup(text);
      await flushDurable();
      // al volver a abrir, en Ajustes (no en Inicio)
      try { sessionStorage.setItem('abrir-ajustes', '1'); } catch { /* sin almacenamiento */ }
      location.reload();
    };
    return h('section', { class: 'card backup' },
      h('div', { class: 'backup-head' },
        h('span', { class: 'set-icon' }, icon('copy')),
        h('div', { class: 'set-text' },
          h('strong', {}, 'Tablas, historial y ajustes'),
          h('p', { class: 'muted small' }, IS_NATIVE
            ? 'La app ya guarda tus datos en la copia automática de Google. Aquí puedes restaurar una copia que hiciste en la web o en otro móvil (pulsa Restaurar y elige el archivo), o guardar una a mano.'
            : 'Al guardar se abre el menú de compartir: elige Drive para tener la copia a salvo. Para recuperarla, pulsa Restaurar y elige el archivo.'))),
      msg,
      h('div', { class: 'backup-actions' },
        h('button', { class: 'btn primary', onclick: () => void save() }, icon('check'), 'Guardar copia'),
        h('button', { class: 'btn ghost', onclick: () => void restore() }, icon('back'), 'Restaurar copia')));
  }

  /** Recordatorios: abre su pantalla; debajo, un resumen de los que están activos. */
  private remindersCard(): HTMLElement {
    const r = remindersOf(this.app.store.settings.reminders);
    const names: Record<ReminderKind, string> = { train: 'Entrenamiento', weigh: 'Peso', backup: 'Copia de seguridad' };
    const active = REMINDER_KINDS.filter((k) => r[k].on && r[k].days.length && (k !== 'backup' || (HAS_BACKUP && this.app.access.premium)));
    // con alguno activo: campana encendida con el número de recordatorios y la tarjeta resaltada
    return h('button', { class: 'card setting rest-card look-open rem-open' + (active.length ? ' on' : ''), onclick: () => this.app.push(new RemindersScreen(this.app)) },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon rem-bell' }, icon('bell'), active.length ? h('span', { class: 'rem-count', 'aria-label': `${active.length}` }, String(active.length)) : null),
        h('div', { class: 'set-text' }, h('strong', {}, 'Recordatorios'),
          active.length
            ? h('p', { class: 'muted small rem-summary' }, ...active.map((k) => h('span', { class: 'block' }, h('span', {}, names[k]), ': ', h('span', { 'data-no-tr': '' }, `${WEEK.filter((d) => r[k].days.includes(d)).map(dayName).join(', ')} · ${r[k].time}`), (r[k].every ?? 1) > 1 ? h('span', { 'data-no-tr': '' }, ' · ') : null, (r[k].every ?? 1) > 1 ? h('span', { class: 'rem-lc' }, EVERY[(r[k].every ?? 1) - 1][1]) : null)))
            : h('p', { class: 'muted small' }, HAS_BACKUP ? 'Entrenamiento, peso y copia de seguridad, los días y a la hora que elijas.' : 'Entrenamiento y peso, los días y a la hora que elijas.')),
        icon('chevron')));
  }

  /** Suscripción de la app de Google Play (o acceso con código); en la web, la vista previa de la versión gratis. */
  private accessCard(): HTMLElement {
    const a = this.app.access;
    if (!IS_NATIVE) {
      const on = a.previewing;
      return h('section', { class: 'card setting rest-card lang-card' },
        h('div', { class: 'rest-head' },
          h('span', { class: 'set-icon' }, icon('lock')),
          h('div', { class: 'set-text' }, h('strong', {}, 'Vista previa de la versión gratis'),
            h('p', { class: 'muted small' }, 'Solo en este navegador: verás la app como alguien sin suscripción, con un ejercicio gratis de cada apartado. En la web no se paga nada.'))),
        h('div', { class: 'segmented lang-segs' },
          h('button', { class: 'seg' + (on ? '' : ' on'), 'aria-pressed': String(!on), onclick: () => { a.setPreview(false); this.app.applySettings(); this.render(); } }, 'Todo desbloqueado'),
          h('button', { class: 'seg' + (on ? ' on' : ''), 'aria-pressed': String(on), onclick: () => { a.setPreview(true); this.app.applySettings(); this.render(); } }, 'Versión gratis')),
        on ? h('button', { class: 'btn ghost block', onclick: () => this.app.showPremium() }, icon('star'), 'Ver la pantalla de Prémium') : null);
    }
    const sub = a.kind === 'sub';
    return h('section', { class: 'card setting rest-card' },
      h('div', { class: 'rest-head' },
        h('span', { class: 'set-icon' }, icon('star')),
        h('div', { class: 'set-text' },
          h('strong', {}, sub ? 'Suscripción activa' : a.kind === 'code' ? 'Acceso con código' : 'Versión gratis'),
          h('p', { class: 'muted small' }, sub
            ? 'Puedes cambiar de plan o cancelarla en Google Play.'
            : a.kind === 'code' ? `Código: ${a.codeName ?? ''}. No se te cobra nada.` : 'Dos ejercicios de cada apartado. Hazte prémium para tenerlos todos.'))),
      sub ? h('button', { class: 'btn ghost block', onclick: () => void a.manage() }, 'Gestionar en Google Play')
        : a.kind === 'none' ? h('button', { class: 'btn primary block', onclick: () => this.app.showPremium() }, icon('star'), 'Hazte prémium') : null);
  }

  private render(): void {
    const s = this.app.store.settings;
    clear(this.body);
    this.body.append(
      // guía de todo lo que hace la app, la primera
      h('button', { class: 'card setting rest-card look-open guide-open', onclick: () => this.app.push(new GuideScreen(this.app)) },
        h('div', { class: 'rest-head' },
          h('span', { class: 'set-icon' }, icon('info')),
          h('div', { class: 'set-text' }, h('strong', {}, 'Guía de la app'), h('p', { class: 'muted small' }, 'Todo lo que puede hacer Kasa Fit, explicado paso a paso.')),
          icon('chevron'))),
      h('h3', { class: 'block-title' }, IS_NATIVE ? 'Suscripción' : 'Prémium'), this.accessCard(),
      h('h3', { class: 'block-title' }, 'Idioma'), this.langCard(),
      h('h3', { class: 'block-title' }, 'Pantalla'), this.themeCard(s), this.colorCard(s),
      h('h3', { class: 'block-title' }, 'Muñeco'), this.lookCard(),
      h('h3', { class: 'block-title' }, 'Tiempos de los ejercicios'), this.restCard(s));
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
    const toggle = (key: 'sound' | 'voice' | 'voiceCount' | 'phrases' | 'duckMusic', ic: IconName, label: string, help: string) =>
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
      s.voice && this.app.voice.available ? this.voiceCard() : null,
      IS_NATIVE ? toggle('duckMusic', 'music', 'Bajar la música mientras habla la app', 'Si escuchas música (Spotify, la radio...), baja el volumen durante la voz y los pitidos y luego vuelve a subir.') : null,
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
      h('h3', { class: 'block-title' }, 'Motivación'),
      toggle('phrases', 'bolt', 'Frases motivadoras', 'Una frase distinta cada día en Inicio.'),
      h('h3', { class: 'block-title' }, 'Recordatorios'),
      this.remindersCard(),
      h('h3', { class: 'block-title' }, 'Smartwatch'),
      this.watchSection(),
      this.healthSection(),
      // copia a mano solo en la web (en la app de Android los datos van en la copia automática de Google)
      // en la app de Android también: para traer la copia de la web (o de otro móvil) y guardar una a mano
      h('h3', { class: 'block-title' }, 'Copia de seguridad'),
      this.backupSection(),
      this.versionSection(),
      !this.app.voice.available ? h('p', { class: 'muted' }, 'Este navegador no tiene voz disponible.') : null,
    );
    this.groupify();
  }

  /**
   * Elegir la voz de los avisos entre las del móvil para el idioma de la app (Android no dice si son de hombre o de
   * mujer: cada una tiene ▶ para escucharla). «Automática» es la de siempre del sistema.
   */
  private voiceCard(): HTMLElement {
    const list = h('div', { class: 'voice-list' }, h('p', { class: 'muted small' }, 'Buscando las voces del móvil…'));
    const card = h('section', { class: 'card setting voice-card' },
      h('div', { class: 'set-head-row' },
        h('span', { class: 'set-icon' }, icon('voice')),
        h('span', { class: 'set-text' }, h('strong', {}, 'Voz'), h('span', { class: 'muted block small' }, 'Escucha las voces de tu móvil con ▶ y elige la que más te guste (de hombre o de mujer).'))),
      list);
    const sample = { es: 'Hola, así sonarán los avisos.', ca: 'Hola, així sonaran els avisos.', en: 'Hi, this is how the alerts will sound.' }[this.app.voice.lang];
    void this.app.voice.voices().then((voices) => {
      let cur = this.app.store.settings.voiceId ?? '';
      // los nombres técnicos de Android (es-es-x-eed-local…) no dicen nada: «Voz 1, 2, 3…»; los del navegador sí
      const readable = (n: string) => !/^[a-z]{2,3}[-_][a-z]{2,3}[-_]x[-_]/i.test(n) && !/#/.test(n);
      const opts: Array<{ id: string; label: string; sub?: string }> = [
        ...voices.map((v, i) => ({ id: v.id, label: `Voz ${i + 1}`, sub: readable(v.name) ? v.name : undefined })),
      ];
      clear(list);
      // con una sola voz (o ninguna) no hay nada que elegir: «Automática» sería la misma
      if (voices.length < 2) {
        list.append(h('p', { class: 'muted small voice-one' }, IS_NATIVE
          ? 'Este móvil solo tiene una voz para este idioma. Puedes instalar otras en los ajustes del móvil (Texto a voz › Motor de voz de Google › Instalar datos de voz).'
          : 'El navegador solo ofrece una voz para este idioma. En la app de Android podrás elegir entre las voces que tenga instaladas el móvil.'));
        return;
      }
      // sin ninguna elegida (o la elegida ya no está), la primera: así lo marcado es lo que suena
      if (!voices.some((v) => v.id === cur)) {
        cur = voices[0].id;
        this.app.store.saveSettings({ ...this.app.store.settings, voiceId: cur });
        void this.app.voice.useVoice(cur);
      }
      for (const o of opts) {
        const on = o.id === cur;
        list.append(h('div', { class: 'voice-row' + (on ? ' on' : '') },
          h('button', { class: 'icon-btn small voice-play', 'aria-label': `Escuchar: ${o.label}`, onclick: () => { this.app.voice.unlock(); void this.app.voice.preview(o.id || undefined, sample); } }, icon('play')),
          h('button', { class: 'voice-pick', 'aria-pressed': String(on), onclick: () => {
            this.update({ voiceId: o.id || undefined });
            void this.app.voice.useVoice(o.id || undefined);
            void this.app.voice.preview(o.id || undefined, sample);
          } },
            h('span', { class: 'voice-radio' }, on ? icon('check') : null),
            h('span', { class: 'set-text' }, h('strong', {}, o.label), o.sub ? h('span', { class: 'muted block small', 'data-no-tr': o.id ? '' : null }, o.sub) : null))));
      }
    });
    return card;
  }

  /**
   * Grupos abiertos. Al entrar en Ajustes, todos cerrados (al volver de una pantalla de dentro, como Recordatorios,
   * siguen como estaban); con atrás, se cierran.
   */
  private open = new Set<string>();

  onBack(): boolean {
    if (!this.open.size) return false;
    this.open.clear();
    this.render();
    window.scrollTo({ top: 0 });
    return true;
  }

  /**
   * Cada título de apartado pasa a ser un botón que abre y cierra su grupo (cerrados de entrada): así Ajustes se ve
   * corto y ordenado. Lo que va después del último grupo (la versión) queda fuera.
   */
  private groupify(): void {
    const kids = [...this.body.children] as HTMLElement[];
    let content: HTMLElement | null = null;
    for (const el of kids) {
      if (el.matches('h3.block-title')) {
        const key = el.textContent ?? '';
        const isOpen = this.open.has(key);
        const box = h('div', { class: 'set-group-body', hidden: !isOpen });
        const btn: HTMLElement = h('button', { class: 'set-group-head' + (isOpen ? ' open' : ''), 'aria-expanded': String(isOpen), onclick: () => {
          const now = box.hidden;
          box.hidden = !now;
          btn.classList.toggle('open', now);
          btn.setAttribute('aria-expanded', String(now));
          if (now) this.open.add(key); else this.open.delete(key);
        } },
          h('span', { class: 'set-icon' }, icon(GROUP_ICON[key] ?? 'settings')),
          h('span', { class: 'set-group-title' }, key),
          icon('chevron', 'ico set-group-chev'));
        el.replaceWith(h('section', { class: 'card set-group' }, btn, box));
        content = box;
      } else if (content && !el.matches('.version-card') && !el.matches('.guide-open')) {
        content.append(el);
      } else if (el.matches('.version-card')) {
        content = null;
      }
    }
  }
}

/** Icono de cada grupo de Ajustes (por su título). */
const GROUP_ICON: Record<string, IconName> = {
  'Suscripción': 'star', 'Prémium': 'star', 'Idioma': 'globe', 'Pantalla': 'sun', 'Muñeco': 'user', 'Tiempos de los ejercicios': 'clock',
  'Avisos': 'volume', 'Motivación': 'bolt', 'Recordatorios': 'bell', 'Smartwatch': 'heart', 'Copia de seguridad': 'copy',
};
