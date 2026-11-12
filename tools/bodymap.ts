/* Herramienta de desarrollo: genera los datos de los mapas de músculos de los resúmenes a partir del maniquí realista
   (así la app no tiene que descargarlo). Uso: npm run dev, abrir /tools/bodymap.html y guardar las imágenes
   con tools/bodymap.cjs (que las empaqueta en public/mapa-musculos-*.png). */
import * as THREE from 'three';
import { MannequinScene } from '../src/figure/Mannequin';
import type { MotionSpec } from '../src/domain/types';
import type { SkinData } from '../src/figure/SkinnedFigure';
import { MUSCLES } from '../src/figure/anatomy';

const BODY_SPEC: MotionSpec = { v: 'front', f: [[{ uaL: 100, faL: 96, uaR: 80, faR: 84 }]] };
const q = new URLSearchParams(location.search);
// &res=3: más resolución (solo para mirar de cerca, no para empaquetar)
const RES = Number(q.get('res') ?? 1);
// &rest=1: el cuerpo en su postura de reposo (sin mover huesos)
const REST = q.get('rest') === '1';
const W = 220 * RES, H = 330 * RES;
// cuerpo con cara de adulto (tools/bodymap/adult_face.py); &skin=new para el original
const skin: SkinData = await (await fetch(`./skin_${q.get('skin') ?? 'map'}.json`)).json();
// datos sin suavizado (son números); la imagen con luces, suavizada como en la app
const mk = (aa: boolean) => {
  const c = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: aa, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(W * 2, H * 2, false);
  return r;
};
const rData = mk(false), rLit = mk(true);
// &test=0:1,11:0.3 : además, el mapa de verdad con esos pesos (para comprobar)
const test = q.get('test');
const zero = MUSCLES.map(() => 0);

/** Cambia el cuerpo deformado por huesos por una malla fija ya colocada, con la luz calculada sobre esa forma
 *  (deformada por huesos, la luz salía torcida en algunos puntos: anillos en el pecho). */
function bake(scene: THREE.Object3D): void {
  let sm: THREE.SkinnedMesh | undefined;
  scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) sm = o as THREE.SkinnedMesh; });
  if (!sm) return;
  scene.updateMatrixWorld(true);
  sm.skeleton.update();
  // &export=1: matrices de los huesos en esta postura (las usa tools/bodymap/map_body.py)
  if (q.get('export') === '1') {
    (window as unknown as { bones: unknown }).bones = {
      names: sm.skeleton.bones.map((b) => b.name), bind: Array.from(sm.bindMatrix.elements),
      bindInv: Array.from(sm.bindMatrixInverse.elements), mats: Array.from(sm.skeleton.boneMatrices!),
    };
  }
  // cuerpo ya colocado por tools/bodymap/map_body.py (pose aplicada antes de subdividir): se usa tal cual
  const pre = (skin as unknown as { posed?: string }).posed;
  const g0 = sm.geometry, pos0 = g0.getAttribute('position') as THREE.BufferAttribute, n = pos0.count;
  const out = new Float32Array(n * 3), v = new THREE.Vector3();
  if (pre) {
    const b = atob(pre), u8 = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
    out.set(new Float32Array(u8.buffer));
  } else {
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos0, i);
      if (!REST) sm.applyBoneTransform(i, v);
      out.set([v.x, v.y, v.z], i * 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(out, 3));
  g.setAttribute('aRest', pos0.clone());
  if (g0.getAttribute('aPart')) g.setAttribute('aPart', g0.getAttribute('aPart'));
  g.setIndex(g0.getIndex());
  g.computeVertexNormals();
  const mat = sm.material as THREE.Material;
  (mat.userData.anatomyUniforms as { uUseRest: { value: number } }).uUseRest.value = 1;
  const m = new THREE.Mesh(g, mat);
  m.matrixAutoUpdate = false;
  m.matrix.copy(sm.matrixWorld);
  m.castShadow = sm.castShadow;
  scene.add(m);
  sm.visible = false;
}
const out: Record<string, string> = {};
for (const back of [false, true]) {
  for (const debug of [0, 2, 3, 4, ...(test ? [9] : [])]) {
    const r = debug === 0 || debug === 9 ? rLit : rData, c = r.domElement;
    const w = debug === 9 ? MUSCLES.map((_, i) => Number(test!.split(',').find((t) => t.startsWith(i + ':'))?.split(':')[1] ?? 0)) : zero;
    const sc = new MannequinScene(BODY_SPEC, undefined, undefined, skin, { L: w, R: w, map: true, debug: debug === 9 ? 0 : debug });
    sc.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
      // sin sombra en el suelo, y el cuerpo sin sombras sobre sí mismo (dejaban manchas en anillos en el pecho y la cabeza)
      o.receiveShadow = false;
      if (m instanceof THREE.ShadowMaterial) o.visible = false;
      // ojos: el blanco, gris claro (con blanco puro la mirada parecía de niño)
      else if (!(o as THREE.SkinnedMesh).isSkinnedMesh && m?.color && m.color.getHex() === 0xffffff) m.color.set('#B9BEC6');
    });
    sc.azimuth = q.get('az') ? Number(q.get('az')) : back ? 180 : 0;
    sc.elevation = 6;
    sc.setAspect(W / H);
    sc.placeCamera();
    sc.update(0);
    bake(sc.scene);
    r.setClearColor(0x000000, 0);
    r.render(sc.scene, sc.camera);
    out[`${back ? 'detras' : 'delante'}_${debug}`] = c.toDataURL('image/png');
    sc.dispose();
  }
}
(window as unknown as { maps: unknown }).maps = out;
document.body.dataset.done = '1';
