/* Vista previa del maniquí del usuario (Blender/MPFB) moviéndose; se publica como muestra, no forma parte de la app. */
import { CATALOG } from '../src/data/catalog';
import { FigureView } from '../src/figure/FigureView';
import type { SkinData } from '../src/figure/SkinnedFigure';
import skinNew from './maniqui/skin_glb.json';
import skinApp from './skin_app.json';

const LIST: Array<[string, string]> = [
  ['sentadillas-sin-peso', 'Sentadillas'], ['zancadas-alternas', 'Zancadas'], ['curl-de-biceps', 'Curl de bíceps'],
  ['saltos-de-tijera-jumping-jacks', 'Saltos de tijera'], ['flexion-hacia-delante-de-pie', 'Flexión delante'],
  ['press-de-hombros-sentado', 'Press de hombros'], ['puente-de-gluteos', 'Puente de glúteos'], ['crunch-abdominal', 'Crunch'],
  ['escaladores', 'Escaladores'], ['plancha-lateral', 'Plancha lateral'], ['gato-camello', 'Gato-camello'], ['bird-dog-perro-de-caza', 'Bird-dog'],
].filter(([id]) => CATALOG.get(id)) as Array<[string, string]>;

const views: FigureView[] = [];
const first = CATALOG.get(LIST[0][0])!;
for (const c of document.querySelectorAll<HTMLCanvasElement>('canvas[data-fig]')) {
  const v = new FigureView(c, first, undefined, (c.dataset.fig === 'new' ? skinNew : skinApp) as SkinData);
  v.start();
  views.push(v);
}
const chips = document.getElementById('chips')!;
LIST.forEach(([id, label], i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip-btn' + (i === 0 ? ' on' : '');
  b.textContent = label;
  b.addEventListener('click', () => {
    chips.querySelectorAll('.chip-btn').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    views.forEach((v) => v.setExercise(CATALOG.get(id)!));
  });
  chips.append(b);
});
