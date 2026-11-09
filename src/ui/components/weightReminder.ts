import { LOCALE } from '../../i18n';
import type { App } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { backupDue, saveBackupNow } from './backupPrompt';
import { fmtKg } from './weightCard';

/** Cada cuántos días se recuerda anotar el peso al acabar un entrenamiento. */
export const WEIGHT_EVERY_DAYS = 15;

/** Datos inventados para el enlace de prueba (?probar=avisos). */
export interface FakeReminders {
  weight: { days: number; kg: number; date: string };
  backup: { days: number; last: string };
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });

/** ¿Hay algún recordatorio pendiente (peso cada 15 días, copia cada 7)? */
export function remindersDue(app: App): boolean {
  return app.store.daysSinceWeight() >= WEIGHT_EVERY_DAYS || backupDue(app);
}

/**
 * Ventana compacta con los recordatorios pendientes (al pulsar «Volver al inicio» tras un entrenamiento):
 * el del peso lleva a Mis datos; el de la copia la hace en ese momento. `fake` es para el enlace de prueba.
 */
export function showReminders(app: App, fake?: FakeReminders): void {
  const st = app.store;
  const rows: HTMLElement[] = [];
  const close = () => wrap.remove();

  const wDays = fake?.weight.days ?? st.daysSinceWeight();
  if (fake || wDays >= WEIGHT_EVERY_DAYS) {
    const last = fake ? fake.weight : st.weights.at(-1);
    rows.push(h('div', { class: 'rm-row' },
      h('span', { class: 'bp-icon' }, icon('trophy')),
      h('div', { class: 'rm-text' },
        h('strong', {}, wDays === Infinity ? 'Aún no has anotado tu peso' : `Hace ${wDays} días que no te pesas`),
        h('span', { class: 'muted small' }, 'Pésate para llevar un mejor control de tu evolución.'),
        last ? h('span', { class: 'muted small' }, `Último peso: ${fmtKg(last.kg)} (${fmtDay(last.date)}).`) : null),
      h('button', { class: 'btn primary small', onclick: () => { close(); goToWeight(app); } }, 'Ir a Mis datos')));
  }

  if (fake || backupDue(app)) {
    const bDays = fake?.backup.days ?? st.daysSinceBackup();
    const last = fake?.backup.last ?? st.lastBackup;
    const btn = h('button', {
      class: 'btn primary small',
      onclick: async () => {
        if (await saveBackupNow(app)) btn.replaceWith(h('span', { class: 'bp-done' }, icon('check'), 'Hecha'));
      },
    }, 'Hacer copia');
    rows.push(h('div', { class: 'rm-row' },
      h('span', { class: 'bp-icon' }, icon('copy')),
      h('div', { class: 'rm-text' },
        h('strong', {}, bDays === Infinity ? 'Aún no has hecho ninguna copia de seguridad' : `Hace ${bDays} días que no haces copia de seguridad`),
        h('span', { class: 'muted small' }, 'Hazla para no perder tus tablas e historial.'),
        last ? h('span', { class: 'muted small' }, `Última copia: ${fmtDay(last)}.`) : null),
      btn));
  }
  if (!rows.length) return;

  const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close() },
    h('div', { class: 'dialog reminders', role: 'dialog', 'aria-modal': 'true' },
      fake ? h('p', { class: 'muted small rm-test' }, 'Prueba: no se ha guardado nada.') : null,
      ...rows,
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn ghost small', onclick: close }, 'Cancelar'))));
  document.body.append(wrap);
}

/** Abre Mis datos y baja hasta el apartado del peso. */
export function goToWeight(app: App): void {
  app.openTab('datos');
  // cuando la pantalla ya está pintada; con un pequeño margen arriba
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>('.weight-card');
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
  }, 150);
}
