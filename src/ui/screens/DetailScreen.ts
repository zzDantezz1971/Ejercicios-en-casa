import { RoutineEditor } from '../../domain/RoutineEditor';
import type { ExerciseDef } from '../../domain/types';
import { FigureView } from '../../figure/FigureView';
import type { App, Screen } from '../App';
import { badgeList } from '../components/badges';
import { clear, h } from '../dom';
import { icon, SECTION_STYLE } from '../icons';

/** Ficha de un ejercicio: animación grande que se puede girar y la explicación. */
export class DetailScreen implements Screen {
  readonly el = h('main', { class: 'screen detail' });
  private canvas = h('canvas', { class: 'stage-canvas' });
  private view: FigureView | null = null;
  private action = h('div', { class: 'detail-action' });

  constructor(private readonly app: App, private readonly ex: ExerciseDef) {
    const d = ex.description;
    this.el.style.setProperty('--sec', SECTION_STYLE[ex.section].color);
    const sectionTitle = app.sections.find((s) => s.id === ex.section)?.title ?? '';
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'w-sec-chip' }, icon(SECTION_STYLE[ex.section].icon), sectionTitle)),
      h('div', { class: 'stage' }, this.canvas, h('span', { class: 'stage-hint' }, icon('sides'), 'Arrastra para girar')),
      h('section', { class: 'detail-body' },
        h('h2', {}, ex.name),
        h('p', { class: 'muted' }, ex.zone, ex.viewLabel ? ` · ${ex.viewLabel.toLowerCase()}` : ''),
        badgeList(ex.badges),
        ex.oneSided ? h('p', { class: 'note' }, icon('sides'), 'Se hace por lados: a mitad del tiempo oirás el aviso para cambiar de lado.') : null,
        d
          ? h('div', { class: 'howto' },
              how('target', 'Posición inicial', d.start),
              how('bolt', 'Movimiento', d.move),
              how('check', 'Consejo', d.tip),
              d.mistakes ? how('close', 'Errores comunes', d.mistakes) : null,
              d.easier ? how('chevron', 'Versión fácil', d.easier) : null)
          : h('p', { class: 'muted' }, 'Descripción en preparación.'),
        this.action),
    );
  }

  enter(): void {
    this.view ??= new FigureView(this.canvas, this.ex);
    this.view.start();
    this.renderAction();
  }

  leave(): void {
    this.view?.stop();
  }

  dispose(): void {
    this.view?.dispose();
    this.view = null;
  }

  private renderAction(): void {
    clear(this.action);
    const editor = new RoutineEditor(this.app.store.routine);
    const pos = editor.position(this.ex.section, this.ex.id);
    this.action.append(
      h('button', {
        class: 'btn block ' + (pos ? 'ghost' : 'primary'),
        onclick: () => {
          editor.toggle(this.ex.section, this.ex.id, this.app.store.settings.defaultSeconds);
          this.app.store.saveRoutine(editor.value);
          this.renderAction();
        },
      }, pos ? icon('check') : icon('plus'), pos ? `En la tabla (n.º ${pos}) · Quitar` : 'Añadir a la tabla'),
    );
  }
}

function how(ic: Parameters<typeof icon>[0], title: string, text: string): HTMLElement {
  return h('div', { class: 'how' }, h('span', { class: 'how-icon' }, icon(ic)), h('div', {}, h('h4', {}, title), h('p', {}, text)));
}
