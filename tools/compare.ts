/* Página de comparación de maniquís (se publica como muestra, no forma parte de la app). */
import { CATALOG } from '../src/data/catalog';
import { FigureView } from '../src/figure/FigureView';
import type { SkinData } from '../src/figure/SkinnedFigure';
import skinA from './skin_a.json';
import skinB from './skin_b.json';

const IDS = ['curl-de-biceps', 'saltos-de-tijera-jumping-jacks', 'bird-dog-perro-de-caza'];
const LABELS = ['Curl de bíceps', 'Saltos de tijera', 'Bird-dog'];

const views: FigureView[] = [];
const canvases = [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-fig]')];
const first = CATALOG.get(IDS[0])!;
for (const c of canvases) {
  const kind = c.dataset.fig;
  const skin = kind === 'a' ? (skinA as SkinData) : kind === 'b' ? (skinB as SkinData) : undefined;
  const v = new FigureView(c, first, undefined, skin);
  v.start();
  views.push(v);
}
const chips = document.getElementById('chips')!;
IDS.forEach((id, i) => {
  const b = document.createElement('button');
  b.className = 'chip-btn' + (i === 0 ? ' on' : '');
  b.textContent = LABELS[i];
  b.addEventListener('click', () => {
    chips.querySelectorAll('.chip-btn').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    const ex = CATALOG.get(id)!;
    views.forEach((v) => v.setExercise(ex));
  });
  chips.append(b);
});
