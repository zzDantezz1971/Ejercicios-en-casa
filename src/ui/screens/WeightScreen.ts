import type { App, Screen } from '../App';
import { actionSheet, bodyWeightDialog, clear, confirmDialog, h } from '../dom';
import { icon } from '../icons';
import { askWeight, fmtDiff, fmtKg, weightChart } from '../components/weightCard';

/** Histórico del peso: gráfica y lista de anotaciones (se pueden cambiar o borrar). */
export class WeightScreen implements Screen {
  readonly el = h('main', { class: 'screen weight-screen' });
  private body = h('div', { class: 'history-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'bar-title' }, 'Peso')),
      this.body);
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    clear(this.body);
    const ws = this.app.store.weights;
    const add = h('button', { class: 'btn primary block', onclick: async () => { if (await askWeight(this.app)) this.render(); } }, icon('plus'), 'Anotar peso de hoy');
    if (!ws.length) {
      this.body.append(h('p', { class: 'muted' }, 'Aún no has anotado tu peso.'), add);
      return;
    }
    this.body.append(h('section', { class: 'card' }, weightChart(ws) as unknown as HTMLElement), add);
    for (let i = ws.length - 1; i >= 0; i--) {
      const w = ws[i];
      const prev = ws[i - 1];
      const d = new Date(w.date);
      const diff = prev ? w.kg - prev.kg : null;
      this.body.append(h('button', { class: 'card weight-row', onclick: () => void this.menu(i) },
        h('div', { class: 'h-main' },
          h('strong', {}, fmtKg(w.kg)),
          h('span', { class: 'muted small' }, d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))),
        diff !== null ? h('span', { class: 'wc-diff' + (diff < 0 ? ' down' : diff > 0 ? ' up' : '') }, fmtDiff(diff)) : h('span', { class: 'muted small' }, 'inicio')));
    }
  }

  private async menu(i: number): Promise<void> {
    const w = this.app.store.weights[i];
    const when = new Date(w.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    const c = await actionSheet(`${fmtKg(w.kg)} · ${when}`, [
      { id: 'edit', label: 'Cambiar el peso' },
      { id: 'delete', label: 'Borrar esta anotación', danger: true },
    ]);
    if (c === 'edit') {
      const kg = await bodyWeightDialog(`Peso del ${when}`, w.kg);
      if (kg !== null) this.app.store.updateWeightAt(i, kg);
    } else if (c === 'delete' && (await confirmDialog(`¿Borrar la anotación del ${when}?`, 'Borrar'))) {
      this.app.store.deleteWeightAt(i);
    }
    this.render();
  }
}
