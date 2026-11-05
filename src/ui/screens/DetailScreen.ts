import { MUSCLE_NAMES, parseMuscles } from '../../figure/anatomy';
import { exerciseWeights, weightSuggestion } from '../../domain/weights';
import { weightChart } from '../components/weightCard';
import { RoutineEditor } from '../../domain/RoutineEditor';
import { usesWeight, type ExerciseDef } from '../../domain/types';
import { FigureView } from '../../figure/FigureView';
import type { App, Screen } from '../App';
import { badgeList, sidesMark } from '../components/badges';
import { clear, confirmDialog, h, kg } from '../dom';
import { icon, SECTION_STYLE } from '../icons';

/** Ficha de un ejercicio: animación grande que se puede girar y la explicación. */
export class DetailScreen implements Screen {
  readonly el = h('main', { class: 'screen detail' });
  private canvas = h('canvas', { class: 'stage-canvas' });
  private view: FigureView | null = null;
  private action = h('div', { class: 'detail-action' });

  private weights = h('div', { class: 'ex-weights-wrap' });
  private favBtn = h('button', { class: 'icon-btn fav-btn', onclick: () => this.toggleFav() });

  private paintFav(): void {
    const on = this.app.store.favorites.has(this.ex.id);
    this.favBtn.classList.toggle('on', on);
    this.favBtn.setAttribute('aria-pressed', String(on));
    this.favBtn.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Añadir a favoritos');
    this.favBtn.replaceChildren(icon(on ? 'starFill' : 'star'));
  }

  private toggleFav(): void {
    this.app.haptics.tap();
    this.app.store.toggleFavorite(this.ex.id);
    this.paintFav();
  }

  constructor(private readonly app: App, private readonly ex: ExerciseDef) {
    this.paintFav();
    const d = ex.description;
    this.el.style.setProperty('--sec', SECTION_STYLE[ex.section].color);
    const sectionTitle = app.sections.find((s) => s.id === ex.section)?.title ?? '';
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'w-sec-chip' }, icon(SECTION_STYLE[ex.section].icon), sectionTitle),
        this.favBtn),
      h('div', { class: 'stage' }, this.canvas, ex.oneSided ? sidesMark() : null, h('span', { class: 'stage-hint' }, icon('sides'), 'Arrastra para girar')),
      h('section', { class: 'detail-body' },
        h('h2', {}, ex.name),
        h('p', { class: 'muted' }, ex.zone, ex.viewLabel ? ` · ${ex.viewLabel.toLowerCase()}` : ''),
        badgeList(ex.badges),
        musclesInfo(ex.muscles),
        ex.oneSided ? h('p', { class: 'note' }, icon('sides'), 'Se hace por lados: a mitad del tiempo oirás el aviso para cambiar de lado.') : null,
        this.weights,
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
    this.renderWeights();
  }

  leave(): void {
    this.view?.stop();
  }

  /** Kilos usados en este ejercicio a lo largo del tiempo y propuesta de subir peso. */
  private renderWeights(): void {
    const { app, ex } = this;
    this.weights.replaceChildren();
    if (!usesWeight(ex)) return;
    const ws = exerciseWeights(app.store.history, ex.id);
    if (!ws.length) return;
    const last = ws[ws.length - 1].kg, max = Math.max(...ws.map((w) => w.kg));
    const sug = weightSuggestion(app.store.history, ex.id);
    const pos = app.store.routine[ex.section].findIndex((i) => i.exerciseId === ex.id);
    const inTable = pos >= 0 ? app.store.routine[ex.section][pos] : undefined;
    this.weights.append(h('section', { class: 'card hr-card ex-weights' },
      h('div', { class: 'card-head' }, h('h3', {}, 'Tus pesos'), h('span', { class: 'muted small' }, 'por mancuerna')),
      h('p', { class: 'muted small' }, `Último: ${kg(last)} · Máximo: ${kg(max)} · ${ws.length} ${ws.length === 1 ? 'sesión' : 'sesiones'}`),
      ws.length > 1 ? (weightChart(ws) as unknown as HTMLElement) : null,
      sug ? h('div', { class: 'note tip' }, icon('bolt'),
        h('div', {},
          h('p', {}, `Llevas ${sug.sessions} sesiones completas con ${kg(sug.kg)}. ¿Probamos con ${kg(sug.next)}?`),
          inTable && (inTable.weight ?? 0) < sug.next
            ? h('button', { class: 'btn primary small', onclick: () => {
                const ed = new RoutineEditor(app.store.routine);
                ed.setWeight(ex.section, ex.id, sug.next);
                app.store.saveRoutine(ed.value);
                this.renderWeights();
              } }, `Poner ${kg(sug.next)} en mi tabla`)
            : null)) : null));
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
      h('button', { class: 'btn danger block delete-ex', onclick: () => void this.remove() }, icon('trash'), 'Eliminar ejercicio'),
    );
  }

  /** Elimina el ejercicio de la lista y de todas las tablas para siempre. */
  private async remove(): Promise<void> {
    const ok = await confirmDialog(
      `¿Eliminar "${this.ex.name}"? Desaparecerá para siempre de la lista y de todas tus tablas, y no se podrá recuperar.`,
      'Eliminar',
    );
    if (!ok) return;
    this.app.store.hideExercise(this.ex.id);
    this.app.back();
  }

}

/** Músculos que trabaja y que estira, con los mismos colores que el maniquí anatomía. */
function musclesInfo(spec: string | undefined): HTMLElement | null {
  const toks = parseMuscles(spec);
  if (!toks.length) return null;
  const names = (kinds: string[]) => [...new Set(toks.filter((t) => kinds.includes(t.kind)).map((t) => MUSCLE_NAMES[t.muscle]))];
  const main = names(['work']), second = names(['work2']).filter((n) => !main.includes(n)), stretch = names(['stretch']);
  const line = (cls: string, label: string, list: string[], extra?: string[]) => list.length || extra?.length
    ? h('p', { class: 'mu-line ' + cls }, h('span', { class: 'mu-dot' }), h('strong', {}, label + ' '), [...list, ...(extra ?? []).map((x) => `${x} (suave)`)].join(', '))
    : null;
  return h('div', { class: 'muscles' },
    line('work', 'Trabaja:', main, second),
    line('stretch', 'Estira:', stretch));
}

function how(ic: Parameters<typeof icon>[0], title: string, text: string): HTMLElement {
  return h('div', { class: 'how' }, h('span', { class: 'how-icon' }, icon(ic)), h('div', {}, h('h4', {}, title), h('p', {}, text)));
}
