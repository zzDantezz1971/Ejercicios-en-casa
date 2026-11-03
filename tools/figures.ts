/* Herramienta de desarrollo: dibuja cada ejercicio en 4 instantes del movimiento.
   Uso: npm run dev y abrir /tools/figures.html?s=estiramientos (o ?ids=a,b; &side=1|2 para un lado). */
import * as THREE from 'three';
import { SECTIONS } from '../src/data/catalog';
import { MannequinScene } from '../src/figure/Mannequin';

const q = new URLSearchParams(location.search);
const ids = q.get('ids')?.split(',');
const sec = q.get('s');
const side = q.get('side') ? (Number(q.get('side')) as 1 | 2) : undefined;
const list = SECTIONS.flatMap((s) => s.exercises).filter((e) => (ids ? ids.includes(e.id) : !sec || e.section === sec));
const canvas = document.createElement('canvas');
const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
r.shadowMap.enabled = true;
r.setSize(480, 320, false);
const out = document.getElementById('out')!;
for (const ex of list) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<b>${ex.id}</b>`;
  out.append(row);
  for (const t of [0, 0.25, 0.5, 0.75]) {
    const sc = new MannequinScene(ex.motion, undefined, side);
    sc.setAspect(1.5);
    sc.update(sc.motion.total * t);
    r.render(sc.scene, sc.camera);
    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    row.append(img);
    sc.dispose();
  }
}
document.body.dataset.done = '1';
