/* Herramienta de desarrollo: genera los datos de los mapas de músculos de los resúmenes a partir del maniquí realista
   (así la app no tiene que descargarlo). Uso: npm run dev, abrir /tools/bodymap.html y guardar las imágenes
   con tools/bodymap.cjs (que las empaqueta en public/mapa-musculos-*.png). */
import * as THREE from 'three';
import { MannequinScene } from '../src/figure/Mannequin';
import type { MotionSpec } from '../src/domain/types';
import type { SkinData } from '../src/figure/SkinnedFigure';
import { MUSCLES } from '../src/figure/anatomy';

const BODY_SPEC: MotionSpec = { v: 'front', f: [[{ uaL: 100, faL: 96, uaR: 80, faR: 84 }]] };
const W = 220, H = 330;
const skin: SkinData = await (await fetch('./skin_new.json')).json();
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
const test = new URLSearchParams(location.search).get('test');
const zero = MUSCLES.map(() => 0);
const out: Record<string, string> = {};
for (const back of [false, true]) {
  for (const debug of [0, 2, 3, 4, ...(test ? [9] : [])]) {
    const r = debug === 0 || debug === 9 ? rLit : rData, c = r.domElement;
    const w = debug === 9 ? MUSCLES.map((_, i) => Number(test!.split(',').find((t) => t.startsWith(i + ':'))?.split(':')[1] ?? 0)) : zero;
    const sc = new MannequinScene(BODY_SPEC, undefined, undefined, skin, { L: w, R: w, map: true, debug: debug === 9 ? 0 : debug });
    sc.scene.traverse((o) => { if ((o as THREE.Mesh).material instanceof THREE.ShadowMaterial) o.visible = false; });
    sc.azimuth = back ? 180 : 0;
    sc.elevation = 6;
    sc.setAspect(W / H);
    sc.placeCamera();
    sc.update(0);
    r.setClearColor(0x000000, 0);
    r.render(sc.scene, sc.camera);
    out[`${back ? 'detras' : 'delante'}_${debug}`] = c.toDataURL('image/png');
    sc.dispose();
  }
}
(window as unknown as { maps: unknown }).maps = out;
document.body.dataset.done = '1';
