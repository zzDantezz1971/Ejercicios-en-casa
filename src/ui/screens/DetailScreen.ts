import { MUSCLE_NAMES, parseMuscles } from '../../figure/anatomy';
import { exerciseWeights, weightSuggestion } from '../../domain/weights';
import { weightChart } from '../components/weightCard';
import { RoutineEditor } from '../../domain/RoutineEditor';
import { usesWeight, type ExerciseDef } from '../../domain/types';
import { FigureView } from '../../figure/FigureView';
import type { App, Screen } from '../App';
import { badgeList, equipChips } from '../components/badges';
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

  /**
   * @param list ejercicios de la lista desde la que se abrió, en su orden: deslizando el dedo a los lados
   * se pasa al siguiente o al anterior.
   */
  constructor(private readonly app: App, private readonly ex: ExerciseDef, private readonly list: readonly ExerciseDef[] = []) {
    this.paintFav();
    const d = ex.description;
    this.el.style.setProperty('--sec', SECTION_STYLE[ex.section].color);
    const sectionTitle = app.sections.find((s) => s.id === ex.section)?.title ?? '';
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'w-sec-chip' }, icon(SECTION_STYLE[ex.section].icon), sectionTitle),
        this.favBtn),
      h('div', { class: 'stage' }, this.canvas, ex.pending ? null : h('span', { class: 'stage-hint' }, icon('sides'), 'Arrastra para girar')),
      h('section', { class: 'detail-body' },
        h('h2', {}, ex.name),
        h('p', { class: 'muted' }, ex.zone),
        ex.oneSided ? h('p', { class: 'by-sides' }, icon('sides'), 'por lados') : null,
        badgeList(ex.badges),
        ex.equip?.length ? h('div', { class: 'detail-equip' }, h('strong', {}, 'Necesita'), equipChips(ex.equip, new Set<string>(app.store.settings.equipment)))
          : h('div', { class: 'detail-equip' }, h('span', { class: 'equip-chip' }, 'Sin material')),
        musclesInfo(ex.muscles),
        ex.oneSided ? h('p', { class: 'note' }, icon('sides'), 'Se hace por lados: a mitad del tiempo el reloj se para, se avisa del cambio de lado y hay una cuenta atrás de 3 segundos.') : null,
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
    const nav = this.neighbours();
    if (nav.prev || nav.next) {
      this.el.querySelector('.detail-body')!.prepend(h('div', { class: 'detail-pager' },
        h('button', { class: 'icon-btn small', 'aria-label': 'Anterior', disabled: !nav.prev, onclick: () => this.go(-1) }, icon('prev')),
        h('span', { class: 'muted small' }, `${nav.pos} / ${nav.total}`, ' · ', 'Desliza para cambiar de ejercicio'),
        h('button', { class: 'icon-btn small', 'aria-label': 'Siguiente', disabled: !nav.next, onclick: () => this.go(1) }, icon('next'))));
      this.swipe();
    }
  }

  /** Ejercicios de al lado en la lista (sin contar los bloqueados ni los eliminados). */
  private neighbours(): { prev?: ExerciseDef; next?: ExerciseDef; pos: number; total: number } {
    const usable = this.list.filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i && this.app.access.canUse(e.id) && !this.app.store.hidden.has(e.id));
    const i = usable.findIndex((e) => e.id === this.ex.id);
    if (i < 0) return { pos: 0, total: 0 };
    return { prev: usable[i - 1], next: usable[i + 1], pos: i + 1, total: usable.length };
  }

  /** Pasa al ejercicio anterior (-1) o al siguiente (1) de la lista (con las flechas: la hoja se pasa sola). */
  private go(dir: -1 | 1): void {
    const n = this.neighbours();
    const to = dir < 0 ? n.prev : n.next;
    if (!to || this.turning) return;
    if (reducedMotion()) return this.open(to, dir, 'fade');
    const peek = this.peek(to, dir);
    this.turn(dir, to, peek, 0);
  }

  private turning = false;

  /** Abre la ficha de al lado en lugar de esta. */
  private open(to: ExerciseDef, dir: -1 | 1, motion: 'fade' | 'none'): void {
    this.app.haptics.tap();
    window.scrollTo(0, 0);
    this.app.replace(new DetailScreen(this.app, to, this.list), motion === 'fade' ? (dir < 0 ? 'back' : 'forward') : 'none');
  }

  /** Coloca la hoja según lo arrastrado: se desplaza con el dedo, gira un poco en 3D y se oscurece en el borde. */
  private place(dx: number, shade: HTMLElement | null): void {
    const w = window.innerWidth || 400;
    const p = Math.max(-1, Math.min(1, dx / w));
    this.el.style.transform = `perspective(1400px) translateX(${dx}px) rotateY(${p * 28}deg) scale(${1 - Math.abs(p) * 0.06})`;
    this.el.style.transformOrigin = dx < 0 ? 'right center' : 'left center';
    if (shade) {
      shade.style.opacity = String(Math.abs(p) * 0.9);
      shade.style.background = `linear-gradient(${dx < 0 ? 'to left' : 'to right'}, rgba(0,0,0,0) 30%, rgba(0,0,0,.55))`;
    }
  }

  /** El ejercicio de al lado, debajo de la hoja: una imagen fija (el muñeco animado sale al soltar). */
  private peek(to: ExerciseDef, dir: -1 | 1): { el: HTMLElement; shade: HTMLElement; set: (p: number) => void } {
    const img = h('img', { alt: '', class: 'thumb' });
    void this.app.thumbs.get(to).then((url) => (img.src = url));
    const el = h('div', { class: 'page-peek detail', 'aria-hidden': 'true' },
      h('div', { class: 'peek-inner detail-body' },
        h('div', { class: 'stage peek-stage' }, img),
        h('h2', {}, to.name),
        h('p', { class: 'muted' }, to.zone)));
    el.style.setProperty('--sec', SECTION_STYLE[to.section].color);
    document.body.append(el);
    const shade = h('div', { class: 'page-shade' });
    this.el.append(shade);
    this.el.classList.add('page-lifted');
    const set = (p: number) => {
      el.style.opacity = String(0.35 + p * 0.65);
      el.style.transform = `translateX(${(1 - p) * 40 * dir}px) scale(${0.92 + p * 0.08})`;
    };
    set(0);
    return { el, shade, set };
  }

  /** Termina de pasar la hoja (hacia el lado de dir) y abre el ejercicio de al lado. */
  private turn(dir: -1 | 1, to: ExerciseDef, peek: ReturnType<DetailScreen['peek']>, from: number): void {
    this.turning = true;
    const w = window.innerWidth || 400;
    const ease = 'cubic-bezier(.3, .7, .3, 1)';
    this.place(from, peek.shade);
    void this.el.offsetWidth;
    this.el.style.transition = `transform .32s ${ease}, opacity .32s ease-in`;
    peek.el.style.transition = `transform .32s ${ease}, opacity .32s ease-out`;
    peek.shade.style.transition = 'opacity .32s ease-in';
    requestAnimationFrame(() => {
      this.place(-dir * w * 1.05, peek.shade);
      this.el.style.opacity = '0';
      peek.set(1);
    });
    window.setTimeout(() => {
      this.open(to, dir, 'none');
      // la imagen fija se va cuando el muñeco animado ya está en su sitio
      window.setTimeout(() => {
        peek.el.style.transition = 'opacity .18s ease-out';
        peek.el.style.opacity = '0';
        window.setTimeout(() => peek.el.remove(), 200);
      }, 60);
    }, 330);
  }

  /** La hoja vuelve a su sitio (no se ha pasado). */
  private settle(peek: ReturnType<DetailScreen['peek']> | null): void {
    this.el.style.transition = 'transform .28s cubic-bezier(.2, .9, .3, 1.2)';
    this.el.style.transform = '';
    if (peek) {
      peek.el.style.transition = 'opacity .28s ease, transform .28s ease';
      peek.set(0);
      peek.el.style.opacity = '0';
      peek.shade.style.transition = 'opacity .28s ease';
      peek.shade.style.opacity = '0';
    }
    window.setTimeout(() => {
      this.el.style.transition = '';
      this.el.style.transformOrigin = '';
      this.el.classList.remove('page-lifted');
      peek?.el.remove();
      peek?.shade.remove();
    }, 300);
  }

  /**
   * Deslizar el dedo a los lados (fuera del muñeco, que se gira arrastrando): la hoja sigue al dedo y, debajo,
   * asoma el ejercicio de al lado. Izquierda, el siguiente; derecha, el anterior. En el primero y el último
   * la hoja se estira un poco y vuelve.
   */
  private swipe(): void {
    let x0 = 0, y0 = 0, t0 = 0, on = false, horiz = false, dx = 0, lastX = 0, lastT = 0, vx = 0;
    let peek: ReturnType<DetailScreen['peek']> | null = null, peekDir = 0;
    const reset = () => { on = false; horiz = false; dx = 0; };
    this.el.addEventListener('touchstart', (ev) => {
      const t = ev.touches[0];
      on = ev.touches.length === 1 && !this.turning && !(ev.target as Element).closest?.('.stage');
      horiz = false; dx = 0; vx = 0;
      x0 = lastX = t.clientX; y0 = t.clientY; t0 = lastT = Date.now();
    }, { passive: true });
    this.el.addEventListener('touchmove', (ev) => {
      if (!on) return;
      const t = ev.touches[0];
      const mx = t.clientX - x0, my = t.clientY - y0;
      if (!horiz) {
        if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { reset(); return; }
        if (Math.abs(mx) < 10) return;
        horiz = true;
        if (reducedMotion()) return;
      }
      const now = Date.now();
      if (now > lastT) vx = (t.clientX - lastX) / (now - lastT);
      lastX = t.clientX; lastT = now;
      if (reducedMotion()) { dx = mx; return; }
      const dir = mx < 0 ? 1 : -1;
      const n = this.neighbours();
      const to = dir > 0 ? n.next : n.prev;
      if (!to) {
        // no hay más: se estira un poco
        dx = mx * 0.22;
        if (peek) { peek.el.remove(); peek.shade.remove(); peek = null; }
        this.place(dx, null);
        return;
      }
      if (!peek || peekDir !== dir) {
        if (peek) { peek.el.remove(); peek.shade.remove(); }
        peek = this.peek(to, dir as -1 | 1);
        peekDir = dir;
      }
      dx = mx;
      this.el.style.transition = '';
      this.place(dx, peek.shade);
      peek.set(Math.min(1, Math.abs(dx) / (window.innerWidth || 400)));
    }, { passive: true });
    const end = () => {
      if (!on) return;
      const wasHoriz = horiz;
      on = false;
      if (!wasHoriz) return;
      const w = window.innerWidth || 400;
      const dir: -1 | 1 = dx < 0 ? 1 : -1;
      const n = this.neighbours();
      const to = dir > 0 ? n.next : n.prev;
      const fast = Math.abs(vx) > 0.45 && Math.sign(vx) === Math.sign(dx) && Math.abs(dx) > 30 && Date.now() - t0 < 900;
      const pass = !!to && (Math.abs(dx) > w * 0.33 || fast);
      if (reducedMotion()) {
        if (pass && to) this.open(to, dir, 'fade');
        return;
      }
      if (pass && to && peek) {
        const p = peek; peek = null;
        this.turn(dir, to, p, dx);
      } else {
        this.settle(peek);
        peek = null;
      }
      dx = 0;
    };
    this.el.addEventListener('touchend', end, { passive: true });
    this.el.addEventListener('touchcancel', end, { passive: true });
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

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
