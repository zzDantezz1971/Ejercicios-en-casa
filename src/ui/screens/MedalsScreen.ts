import { medalsBoard } from '../components/medals';
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
    this.body.append(...medalsBoard(this.app));
  }
}
