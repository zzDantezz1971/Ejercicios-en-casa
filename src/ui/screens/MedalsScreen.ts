import { medalsCard } from '../components/medals';
import type { App, Screen } from '../App';
import { clear, h } from '../dom';

/** Medallas conseguidas y por conseguir. */
export class MedalsScreen implements Screen {
  readonly el = h('main', { class: 'screen medals-screen' });
  readonly tab = 'medallas' as const;
  private body = h('div', { class: 'history-body' });

  constructor(private readonly app: App) {
    this.el.append(h('header', { class: 'page-head' }, h('h1', {}, 'Medallas')), this.body);
  }

  enter(): void {
    clear(this.body);
    const card = medalsCard(this.app);
    card.querySelector('.card-head h3')?.remove(); // el título ya está arriba
    this.body.append(card);
  }
}
