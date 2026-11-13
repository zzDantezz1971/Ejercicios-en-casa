import { LOCALE } from '../../i18n';
import { saveBackupFile } from '../../services/Backup';
import type { App } from '../App';
import { confirmDialog, h } from '../dom';
import { icon } from '../icons';
import { remindersOf } from '../../domain/reminders';

export const BACKUP_EVERY_DAYS = 7;

/** Guarda la copia (menú de compartir → Drive). Devuelve true si se guardó. */
export async function saveBackupNow(app: App): Promise<boolean> {
  app.haptics.tap();
  const t0 = Date.now();
  const r = await saveBackupFile(app.store.exportBackup());
  if (r === 'cancelled') {
    // Android a veces da el menú de compartir por cancelado aunque se haya guardado en Drive:
    // si el menú ha estado abierto un rato (se ha ido a otra app), se pregunta.
    if (Date.now() - t0 < 1500) return false;
    if (!(await confirmDialog('¿Se ha guardado la copia?', 'Sí, guardada', 'No'))) return false;
  }
  app.store.markBackedUp();
  if (r === 'downloaded') await confirmDialog('Copia guardada en Descargas. Puedes subirla a tu Drive desde la app de Drive.', 'Vale', '');
  return true;
}

/**
 * ¿Toca recordar la copia dentro de la app? Solo si el recordatorio de copia está activado (prémium),
 * hay entrenamientos y han pasado las semanas elegidas desde la última.
 */
export function backupDue(app: App): boolean {
  const r = remindersOf(app.store.settings.reminders).backup;
  if (!r.on || !app.access.premium) return false;
  return app.store.history.length > 0 && app.store.daysSinceBackup() >= (r.every ?? 1) * BACKUP_EVERY_DAYS;
}

/** Recordatorio de la copia: cuánto hace de la última, por qué conviene y botones Cancelar / Hacer copia ahora. */
export function backupCard(app: App): HTMLElement {
  const d = app.store.daysSinceBackup();
  const last = app.store.lastBackup;
  const when = last ? `${new Date(last).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' })}, ${new Date(last).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}` : null;
  const card: HTMLElement = h('section', { class: 'card backup-prompt', role: 'region', 'aria-label': 'Copia de seguridad' },
    h('div', { class: 'bp-head' },
      h('span', { class: 'bp-icon' }, icon('copy')),
      h('div', {},
        h('strong', {}, d === Infinity ? 'Aún no has hecho ninguna copia de seguridad' : `Hace ${d} días que no haces copia de seguridad`),
        h('p', { class: 'muted small' }, 'Para no perder tus tablas y tu historial si cambias de móvil o se borran los datos, deberías hacerla.'),
        when ? h('p', { class: 'muted small' }, `Última copia: ${when}.`) : null)),
    h('div', { class: 'bp-actions' },
      h('button', { class: 'btn ghost small', onclick: () => card.remove() }, 'Cancelar'),
      h('button', {
        class: 'btn primary small',
        onclick: async () => {
          if (await saveBackupNow(app)) card.replaceChildren(h('p', { class: 'bp-done' }, icon('check'), 'Copia guardada'));
        },
      }, icon('copy'), 'Hacer copia ahora')));
  return card;
}
