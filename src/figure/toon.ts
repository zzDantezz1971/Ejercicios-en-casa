import * as THREE from 'three';

/* Estilo «dibujo» del maniquí: luz en dos tonos planos y contorno oscuro alrededor del cuerpo. */

let ramp: THREE.DataTexture | null = null;
function gradient(): THREE.DataTexture {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 255, 255, 255, 255]), 2, 1);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
}

let outline: THREE.MeshBasicMaterial | null = null;
function outlineMaterial(): THREE.MeshBasicMaterial {
  if (!outline) {
    outline = new THREE.MeshBasicMaterial({ color: '#05070A', side: THREE.BackSide });
    // la misma malla, un poco hinchada y vista por detrás: asoma como una línea alrededor
    outline.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 1.1;');
    };
  }
  return outline;
}

/** Cambia los materiales de la escena por los de dibujo. Devuelve los materiales nuevos (para liberarlos después). */
export function toonify(scene: THREE.Object3D): THREE.Material[] {
  const made: THREE.Material[] = [];
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    const old = m.material as THREE.MeshStandardMaterial;
    if (Array.isArray(old) || !old.isMeshStandardMaterial) continue; // la sombra del suelo se queda igual
    const nm = new THREE.MeshToonMaterial({
      color: old.color, map: old.map, vertexColors: old.vertexColors, transparent: old.transparent, opacity: old.opacity, side: old.side, gradientMap: gradient(),
    });
    // el maniquí anatomía pinta los músculos en el shader: se mantiene
    if (old.onBeforeCompile) nm.onBeforeCompile = old.onBeforeCompile;
    m.material = nm;
    made.push(nm);
    const sk = m as THREE.SkinnedMesh;
    if (sk.isSkinnedMesh) {
      const o = new THREE.SkinnedMesh(sk.geometry, outlineMaterial());
      o.bind(sk.skeleton, sk.bindMatrix);
      o.frustumCulled = false;
      m.add(o);
    }
  }
  return made;
}
