import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { backupCard } from '../components/backupPrompt';
import { weightReminder } from '../components/weightReminder';

/**
 * Pantalla de prueba de los recordatorios (se abre con ?probar=avisos): enseña los dos avisos
 * como si hiciera 20 días del último peso y 10 de la última copia. No guarda ni cambia nada;
 * los botones sí funcionan (ir a Mis datos, hacer la copia).
 */
export class RemindersTestScreen implements Screen {
  readonly el = h('main', { class: 'screen summary' });

  constructor(app: App) {
    const ago = (days: number) => new Date(Date.now() - days * 864e5).toISOString();
    const lastKg = app.store.currentWeight ?? 75;
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.openTab('inicio') }, icon('back')),
        h('span', { class: 'bar-title' }, 'Prueba de avisos')),
      h('section', { class: 'detail-body' },
        h('p', { class: 'note' }, icon('info'), 'Esto es una prueba: así salen los recordatorios al acabar un entrenamiento. No se ha guardado nada.'),
        weightReminder(app, { days: 20, kg: lastKg, date: ago(20) }),
        backupCard(app, { days: 10, last: ago(10) }),
        h('button', { class: 'btn primary block big', onclick: () => app.openTab('inicio') }, 'Volver al inicio')),
    );
  }
}
