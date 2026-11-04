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

function sinceText(app: App): string {
  const d = app.store.daysSinceBackup();
  return d === Infinity ? 'Aún no has guardado ninguna copia de tus tablas e historial.' : `Hace ${d} días que no guardas copia de tus tablas e historial.`;
}

/** Tarjeta para guardar la copia; desaparece al guardarla o al pulsar "Ahora no". */
export function backupCard(app: App, opts: { question: boolean }): HTMLElement {
  const card: HTMLElement = h('section', { class: 'card backup-prompt', role: 'region', 'aria-label': 'Copia de seguridad' },
    h('div', { class: 'bp-head' },
      h('span', { class: 'bp-icon' }, icon('copy')),
      h('div', {},
        h('strong', {}, opts.question ? '¿Guardar copia de seguridad?' : 'Copia de seguridad pendiente'),
        h('p', { class: 'muted small' }, sinceText(app)))),
    h('div', { class: 'bp-actions' },
      h('button', { class: 'btn ghost small', onclick: () => card.remove() }, 'Ahora no'),
      h('button', {
        class: 'btn primary small',
        onclick: async () => {
          if (await saveBackupNow(app)) card.replaceChildren(h('p', { class: 'bp-done' }, icon('check'), 'Copia guardada'));
        },
      }, icon('check'), 'Guardar en Drive')));
  return card;
}
