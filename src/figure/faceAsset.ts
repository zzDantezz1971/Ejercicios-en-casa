import * as THREE from 'three';

/* Cara del usuario en el muñeco (prémium): una imagen ya recortada y pasada a dibujo (ver ui/components/faceEditor),
   con un óvalo transparente alrededor. Se pega en la parte delantera de la cabeza; el color de la piel del muñeco
   pasa a ser el de la cara. Solo vive en el móvil. */

interface Face { tex: THREE.Texture; skin: string; version: number }
let face: Face | null = null;
let current = '';
let version = 0;

/** Pone (o quita, con null) la cara. Hasta que la imagen se ha cargado, el muñeco sale con su cara de siempre. */
export function setFace(url: string | null | undefined, skin?: string): void {
  if ((url ?? '') === current) return;
  current = url ?? '';
  version++;
  if (!url) {
    face?.tex.dispose();
    face = null;
    return;
  }
  const v = version;
  const img = new Image();
  img.onload = () => {
    if (v !== version) return;
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    face?.tex.dispose();
    face = { tex, skin: skin ?? '#E2A983', version: v };
  };
  img.src = url;
}

/** Quién puede verla (prémium): se consulta cada vez, así funciona aunque cambie la suscripción. */
let gate: () => boolean = () => true;
export function setFaceGate(fn: () => boolean): void {
  gate = fn;
}

export function getFace(): Face | null {
  return face && gate() ? face : null;
}

/** Cambia cada vez que cambia la cara (para no reutilizar miniaturas dibujadas con la cara anterior). */
export function faceVersion(): number {
  return getFace()?.version ?? 0;
}

let capGeo: THREE.BufferGeometry | null = null;
/** Casquete delantero de una esfera unidad (+z hacia delante) con la imagen proyectada de frente. */
export function faceCap(): THREE.BufferGeometry {
  if (capGeo) return capGeo;
  const g = new THREE.SphereGeometry(1, 48, 36, Math.PI / 2 - 1.2, 2.4, 0.3, 2.35);
  const pos = g.getAttribute('position') as THREE.BufferAttribute, uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / 1.9, 0.5 + (pos.getY(i) + 0.04) / 1.9);
  uv.needsUpdate = true;
  capGeo = g;
  return g;
}
