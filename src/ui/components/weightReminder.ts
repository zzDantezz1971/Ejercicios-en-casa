import { LOCALE } from '../../i18n';
import type { App } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { fmtKg } from './weightCard';

/** Cada cuántos días se recuerda anotar el peso al acabar un entrenamiento. */
export const WEIGHT_EVERY_DAYS = 15;

/** Recordatorio para pesarse: cuánto hace, el último peso, y botones Cancelar / Ir a Mis datos.
    `fake` sirve para la pantalla de prueba (?probar=avisos). */
export function weightReminder(app: App, fake?: { days: number; kg: number; date: string }): HTMLElement {
  const st = app.store;
  const d = fake?.days ?? st.daysSinceWeight();
  const last = fake ? { kg: fake.kg, date: fake.date } : st.weights.at(-1);
  const when = last ? new Date(last.date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' }) : '';
  const card: HTMLElement = h('section', { class: 'card backup-prompt weight-prompt' },
    h('div', { class: 'bp-head' },
      h('span', { class: 'bp-icon' }, icon('trophy')),
      h('div', {},
        h('strong', {}, d === Infinity ? 'Aún no has anotado tu peso' : `Hace ${d} días que no te pesas`),
        h('p', { class: 'muted small' }, 'Para llevar un mejor control de tu evolución y de las calorías, deberías pesarte.'),
        last ? h('p', { class: 'muted small' }, `Último peso: ${fmtKg(last.kg)} (${when}).`) : null)),
    h('div', { class: 'bp-actions' },
      h('button', { class: 'btn ghost small', onclick: () => card.remove() }, 'Cancelar'),
      h('button', { class: 'btn primary small', onclick: () => goToWeight(app) }, icon('chevron'), 'Ir a Mis datos')));
  return card;
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
