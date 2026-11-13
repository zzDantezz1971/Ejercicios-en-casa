import { LOCALE } from '../../i18n';
import type { App } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { backupDue, saveBackupNow } from './backupPrompt';
import { fmtKg } from './weightCard';
import { remindersOf } from '../../domain/reminders';

/** ¿Toca recordar el peso? Solo si el recordatorio de peso está activado y han pasado las semanas elegidas. */
function weightDue(app: App): boolean {
  const r = remindersOf(app.store.settings.reminders).weigh;
  return r.on && app.store.daysSinceWeight() >= (r.every ?? 1) * 7;
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });

/** ¿Hay algún recordatorio pendiente (los que estén activados en Ajustes › Recordatorios)? */
export function remindersDue(app: App): boolean {
  return weightDue(app) || backupDue(app);
}

/**
 * Ventana compacta con los recordatorios pendientes (al pulsar «Volver al inicio» tras un entrenamiento):
 * el del peso lleva a Mis datos; el de la copia la hace en ese momento.
 */
export function showReminders(app: App): void {
  const st = app.store;
  const rows: HTMLElement[] = [];
  const close = () => wrap.remove();

  const wDays = st.daysSinceWeight();
  if (weightDue(app)) {
    const last = st.weights.at(-1);
    rows.push(h('div', { class: 'rm-row' },
      h('span', { class: 'bp-icon' }, icon('trophy')),
      h('div', { class: 'rm-text' },
        h('strong', {}, wDays === Infinity ? 'Aún no has anotado tu peso' : `Hace ${wDays} días que no te pesas`),
        h('span', { class: 'muted small' }, 'Pésate para llevar un mejor control de tu evolución.'),
        last ? h('span', { class: 'muted small' }, `Último peso: ${fmtKg(last.kg)} (${fmtDay(last.date)}).`) : null),
      h('button', { class: 'btn primary small', onclick: () => { close(); goToWeight(app); } }, 'Ir a Mis datos')));
  }

  if (backupDue(app)) {
    const bDays = st.daysSinceBackup();
    const last = st.lastBackup;
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
