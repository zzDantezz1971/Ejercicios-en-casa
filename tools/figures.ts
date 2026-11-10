/* Herramienta de desarrollo: dibuja cada ejercicio en 4 instantes del movimiento.
   Uso: npm run dev y abrir /tools/figures.html?s=estiramientos (o ?ids=a,b; &side=1|2 para un lado; &mood=effort; &w=960; &t=0,0.5). */
import * as THREE from 'three';
import { SECTIONS } from '../src/data/catalog';
import { MannequinScene } from '../src/figure/Mannequin';
import type { SkinData } from '../src/figure/SkinnedFigure';
import { muscleWeights } from '../src/figure/anatomy';

const q = new URLSearchParams(location.search);
const ids = q.get('ids')?.split(',');
const sec = q.get('s');
const mood = (q.get('mood') ?? 'relaxed') as 'neutral' | 'effort' | 'relaxed' | 'happy';
const W = Number(q.get('w') ?? 480);
const times = q.get('t') ? q.get('t')!.split(',').map(Number) : [0, 0.25, 0.5, 0.75];
const side = q.get('side') ? (Number(q.get('side')) as 1 | 2) : undefined;
const list = SECTIONS.flatMap((s) => s.exercises).filter((e) => (ids ? ids.includes(e.id) : !sec || e.section === sec))
  // &anim=1: solo los ejercicios que ya tienen animación
  .filter((e) => !q.get('anim') || !!e.motion.fn || (e.motion.f?.length ?? 0) > 1);
const canvas = document.createElement('canvas');
const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
r.shadowMap.enabled = true;
r.setSize(W, (W * 2) / 3, false);
const out = document.getElementById('out')!;
const skinName = q.get('skin');
const skin: SkinData | undefined = skinName ? await (await fetch(`./skin_${skinName}.json`)).json() : undefined;
for (const ex of list) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<b>${ex.id}</b>`;
  out.append(row);
  for (const t of times) {
    const sc = new MannequinScene(ex.motion, undefined, side, skin, skin && q.get('anat') ? muscleWeights(q.get('mus') ?? ex.muscles, side) : undefined);
    sc.setAspect(1.5);
    sc.mood = mood;
    sc.update(sc.motion.total * t);
    if (q.get('az')) { sc.azimuth = Number(q.get('az')); sc.placeCamera(); }
    if (q.get('el')) { sc.elevation = Number(q.get('el')); sc.placeCamera(); }
    r.render(sc.scene, sc.camera);
    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    row.append(img);
    sc.dispose();
  }
}
document.body.dataset.done = '1';
