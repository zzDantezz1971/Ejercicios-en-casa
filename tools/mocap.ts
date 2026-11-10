/* Herramienta: lee una animación de Mixamo (.fbx) y saca, fotograma a fotograma, la posición de las articulaciones.
   Uso: /tools/mocap.html?f=mixamo/Situps.fbx  → window.__mocap = { fps, names, frames: [[x,y,z]...] } */
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const q = new URLSearchParams(location.search);
const file = q.get('f')!;
const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'HeadTop_End', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'LeftHandMiddle1', 'RightHandMiddle1'];
new FBXLoader().load(file, (obj) => {
  const clip = obj.animations[0];
  const mixer = new THREE.AnimationMixer(obj);
  mixer.clipAction(clip).play();
  const find = (n: string) => { let b: THREE.Object3D | undefined; obj.traverse((o) => { if (!b && o.name.replace(/^mixamorig\d*:?/, '') === n) b = o; }); return b; };
  const bones = BONES.map(find);
  const fps = 30, n = Math.round(clip.duration * fps);
  const frames: number[][][] = [];
  for (let i = 0; i <= n; i++) {
    mixer.setTime(i / fps);
    obj.updateMatrixWorld(true);
    frames.push(bones.map((b) => (b ? b.getWorldPosition(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)) : [])));
  }
  (window as unknown as { __mocap: unknown }).__mocap = { fps, duration: clip.duration, names: BONES, missing: BONES.filter((_, i) => !bones[i]), frames };
  document.body.dataset.done = '1';
}, undefined, (e) => { document.getElementById('out')!.textContent = String(e); document.body.dataset.done = '1'; });
