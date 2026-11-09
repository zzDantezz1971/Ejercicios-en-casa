import { LOCALE } from '../../i18n';
import { saveBackupFile } from '../../services/Backup';
import type { App } from '../App';
import { confirmDialog, h } from '../dom';
import { icon } from '../icons';

export const BACKUP_EVERY_DAYS = 7;

/** Guarda la copia (menú de compartir → Drive). Devuelve true si se guardó. */
export async function saveBackupNow(app: App): Promise<boolean> {
  app.haptics.tap();
  const r = await saveBackupFile(app.store.exportBackup());
  if (r === 'cancelled') return false;
  app.store.markBackedUp();
  if (r === 'downloaded') await confirmDialog('Copia guardada en Descargas. Puedes subirla a tu Drive desde la app de Drive.', 'Vale', '');
  return true;
}

/** ¿Toca recordar la copia? (hay entrenamientos y han pasado 7 días o más desde la última). */
export function backupDue(app: App): boolean {
  return app.store.history.length > 0 && app.store.daysSinceBackup() >= BACKUP_EVERY_DAYS;
}

/** Recordatorio de la copia: cuánto hace de la última, por qué conviene y botones Cancelar / Hacer copia ahora. */
export function backupCard(app: App, fake?: { days: number; last: string }): HTMLElement {
  const d = fake?.days ?? app.store.daysSinceBackup();
  const last = fake?.last ?? app.store.lastBackup;
  const when = last ? new Date(last).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' }) : null;
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
