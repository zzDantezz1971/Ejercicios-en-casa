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
// &style=toon (dibujo: tonos planos y contorno) | flat (silueta plana, sin luces)
const style = q.get('style');
const ramp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 255, 255, 255, 255]), 2, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const outlineMat = new THREE.MeshBasicMaterial({ color: '#05070A', side: THREE.BackSide });
outlineMat.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 1.1;');
};
function stylize(scene: THREE.Scene): void {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    const old = m.material as THREE.MeshStandardMaterial;
    if (Array.isArray(old) || !(old as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue; // sombra del suelo
    const base = { color: old.color, map: old.map, vertexColors: old.vertexColors, transparent: old.transparent, opacity: old.opacity, side: old.side };
    const nm = style === 'flat' ? new THREE.MeshBasicMaterial(base) : new THREE.MeshToonMaterial({ ...base, gradientMap: ramp });
    if (old.onBeforeCompile) nm.onBeforeCompile = old.onBeforeCompile;
    m.material = nm;
    if (style !== 'toon' || !(m as THREE.SkinnedMesh).isSkinnedMesh) continue; // contorno solo en el muñeco
    // contorno: la misma malla un poco hinchada, por detrás y en oscuro
    const sk = m as THREE.SkinnedMesh;
    const o = sk.isSkinnedMesh ? new THREE.SkinnedMesh(sk.geometry, outlineMat) : new THREE.Mesh(m.geometry, outlineMat);
    if (sk.isSkinnedMesh) (o as THREE.SkinnedMesh).bind(sk.skeleton, sk.bindMatrix);
    m.add(o);
  }
}
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
    if (style) stylize(sc.scene);
    if (q.get('az')) { sc.azimuth = Number(q.get('az')); sc.placeCamera(); }
    if (q.get('el')) { sc.elevation = Number(q.get('el')); sc.placeCamera(); }
    // &crop=x,y,w (fracciones): ampliar una zona (p. ej. las manos)
    if (q.get('crop')) {
      const [cx, cy, cw] = q.get('crop')!.split(',').map(Number);
      sc.camera.setViewOffset(1500, 1000, cx * 1500, cy * 1000, cw * 1500, cw * 1000);
    }
    r.render(sc.scene, sc.camera);
    const img = document.createElement('img');
    img.src = canvas.toDataURL();
    row.append(img);
    sc.dispose();
  }
}
document.body.dataset.done = '1';
