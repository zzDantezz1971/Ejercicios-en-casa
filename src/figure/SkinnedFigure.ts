import * as THREE from 'three';

/* Maniquí de una sola pieza con piel (SkinnedMesh).
   Los datos (malla, huesos de reposo y pesos) se generan fuera de la app; aquí solo se mueven
   los 15 huesos a partir de las articulaciones 3D que calcula el motor de posturas. */

export interface SkinData {
  bones: string[];
  rest: Record<string, [number[], number[]]>;
  eyes: Record<'L' | 'R', number[]>;
  eyeRadius: number;
  count: number;
  pos: string;
  idx: string;
  idx32?: boolean;
  si: string;
  sw: string;
  reg: string;
  /** Añadir zapatillas encima del pie (si la malla tiene el pie descalzo). */
  shoes?: boolean;
  /** Parte del cuerpo de cada vértice: 0 tronco/cabeza, 1-2 brazo L/R, 3-4 pierna L/R, 5 pie, 6 mano, 7 labios. */
  part?: string;
  /** Mano cerrada (puño) como forma alternativa: vértices que cambian y su desplazamiento. */
  fist?: { idx: string; d: string };
  /** Cortes de la ropa en la postura de reposo. */
  clothes?: { collarY: number; waistY: number; sleeve: number; shorts: number; sock: number; shoeTop: number; sleeveStripe?: number };
}

export interface SkinPalette {
  skin: string; shirt: string; shorts: string; shoe: string; sock: string; lips: string; stripe: string;
}

export const SKIN_PALETTE: SkinPalette = {
  skin: '#D9A07C', shirt: '#2F5BEA', shorts: '#1E2633', shoe: '#F2A516', sock: '#F3F5F8', lips: '#B5685C', stripe: '#F3F5F8',
};

type V3 = THREE.Vector3;

/** Grosor extra de brazos y piernas (cuerpo más fuerte). */
export const BULK: Record<string, number> = (globalThis as { __BULK__?: Record<string, number> }).__BULK__ ?? { ua: 1.28, fa: 1.18, th: 1.2, sh: 1.15 };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function b64(s: string): ArrayBuffer {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function ortho(v: V3, axis: V3): V3 {
  const a = axis.clone().normalize();
  const o = v.clone().sub(a.clone().multiplyScalar(v.dot(a)));
  if (o.lengthSq() < 1e-8) {
    const alt = Math.abs(a.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    return alt.sub(a.clone().multiplyScalar(alt.dot(a))).normalize();
  }
  return o.normalize();
}

/** Matriz con columnas (lateral, a lo largo del hueso, adelante). */
function frameMatrix(dir: V3, ref: V3): THREE.Matrix4 {
  const y = dir.clone().normalize();
  const x = ortho(ref, y);
  const z = x.clone().cross(y);
  return new THREE.Matrix4().makeBasis(x, y, z);
}

/** Articulaciones 3D tal como las da el motor (pel, mid, neck, head, shoL, elL, haL, hipL, knL, anL, tiL...). */
export type Joints3D = Record<string, V3>;

export class SkinnedFigure {
  readonly mesh: THREE.SkinnedMesh;
  private bones: THREE.Bone[] = [];
  private restFrames: Record<string, { a: V3; len: number; inv: THREE.Matrix4 }> = {};
  private eyes: THREE.Mesh[] = [];
  private pupils: THREE.Mesh[] = [];
  private restEyes: Record<'L' | 'R', V3>;
  private readonly perp: number;
  private headMatrix = new THREE.Matrix4();
  private shoes: Array<{ upper: THREE.Mesh; sole: THREE.Mesh }> = [];

  constructor(private readonly data: SkinData, palette: SkinPalette = SKIN_PALETTE, scene: THREE.Scene) {
    const n = data.count;
    const pos = new Float32Array(b64(data.pos));
    const idx = data.idx32 ? new Uint32Array(b64(data.idx)) : new Uint16Array(b64(data.idx));
    const si = new Uint8Array(b64(data.si));
    const sw = new Uint8Array(b64(data.sw));
    const reg = new Uint8Array(b64(data.reg));
    const colors = new Float32Array(n * 3);
    const pal = [palette.skin, palette.shirt, palette.shorts, palette.shoe, palette.sock, palette.lips, palette.stripe].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) pal[Math.min(reg[i], 6)].toArray(colors, i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Array.from(si), 4));
    const swf = new Float32Array(sw.length);
    for (let i = 0; i < sw.length; i++) swf[i] = sw[i] / 255;
    g.setAttribute('skinWeight', new THREE.BufferAttribute(swf, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    if (data.fist) {
      const fi = new Uint16Array(b64(data.fist.idx));
      const fd = new Float32Array(b64(data.fist.d));
      const delta = new Float32Array(n * 3);
      fi.forEach((v, k) => delta.set(fd.subarray(k * 3, k * 3 + 3), v * 3));
      g.morphAttributes.position = [new THREE.BufferAttribute(delta, 3)];
      g.morphTargetsRelative = true;
    }

    const mat = data.part && data.clothes
      ? this.clothesMaterial(g, data, palette)
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
    this.mesh = new THREE.SkinnedMesh(g, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    if (data.fist) this.mesh.updateMorphTargets();

    // Huesos "planos": cada uno recibe directamente la transformación reposo → postura actual.
    for (const name of data.bones) {
      const b = new THREE.Bone();
      b.name = name;
      b.matrixAutoUpdate = false;
      this.bones.push(b);
      const [a, c] = data.rest[name].map((p) => V(p[0], p[1], p[2]));
      const lat = this.restLateral(name);
      const F = frameMatrix(c.clone().sub(a), lat);
      this.restFrames[name] = { a, len: a.distanceTo(c), inv: F.clone().invert() };
    }
    const skeleton = new THREE.Skeleton(this.bones, this.bones.map(() => new THREE.Matrix4()));
    this.mesh.bind(skeleton, new THREE.Matrix4());
    scene.add(this.mesh);
    // escala de las secciones (grosor) según la altura relativa del modelo
    const legRest = this.restFrames.thL.len + this.restFrames.shL.len;
    this.perp = 67 / legRest;

    this.restEyes = { L: V(...(data.eyes.L as [number, number, number])), R: V(...(data.eyes.R as [number, number, number])) };
    const white = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.2 });
    const sph = new THREE.SphereGeometry(1, 20, 14);
    if (data.shoes) {
      const upperM = new THREE.MeshStandardMaterial({ color: palette.shoe, roughness: 0.5 });
      const soleM = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.8 });
      for (let i = 0; i < 2; i++) {
        const upper = new THREE.Mesh(sph, upperM), sole = new THREE.Mesh(sph, soleM);
        upper.castShadow = sole.castShadow = true;
        scene.add(upper, sole);
        this.shoes.push({ upper, sole });
      }
    }
    for (let i = 0; i < 2; i++) {
      const e = new THREE.Mesh(sph, white);
      const p = new THREE.Mesh(sph, dark);
      scene.add(e, p);
      this.eyes.push(e);
      this.pupils.push(p);
    }
  }

  /**
   * Material con la ropa calculada en cada píxel a partir de la posición de reposo:
   * cortes rectos (manga, cuello, cintura, bajo del pantalón, calcetín) que se mueven con la piel.
   */
  private clothesMaterial(g: THREE.BufferGeometry, data: SkinData, pal: SkinPalette): THREE.MeshStandardMaterial {
    const part = new Uint8Array(b64(data.part!));
    g.setAttribute('aPart', new THREE.BufferAttribute(Float32Array.from(part), 1));
    const c = data.clothes!;
    const P = (k: string, i: 0 | 1) => V(...(data.rest[k][i] as [number, number, number]));
    const armDir = (s: string) => P('fa' + s, 1).sub(P('ua' + s, 0));
    const legDir = (s: string) => P('sh' + s, 1).sub(P('th' + s, 0));
    const col = (h: string) => new THREE.Color(h);
    const uniforms = {
      uSkin: { value: col(pal.skin) }, uShirt: { value: col(pal.shirt) }, uShorts: { value: col(pal.shorts) },
      uShoe: { value: col(pal.shoe) }, uSock: { value: col(pal.sock) }, uLips: { value: col(pal.lips) }, uStripe: { value: col(pal.stripe) },
      uCollarY: { value: c.collarY }, uWaistY: { value: c.waistY }, uShoeTop: { value: c.shoeTop },
      uSleeve: { value: c.sleeve }, uSleeveStripe: { value: c.sleeveStripe ?? 0.05 }, uShortsT: { value: c.shorts }, uSockT: { value: c.sock },
      uShoL: { value: P('uaL', 0) }, uShoR: { value: P('uaR', 0) }, uArmL: { value: armDir('L') }, uArmR: { value: armDir('R') },
      uHipL: { value: P('thL', 0) }, uHipR: { value: P('thR', 0) }, uLegL: { value: legDir('L') }, uLegR: { value: legDir('R') },
    };
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aPart;\nvarying vec3 vRest;\nflat varying float vPart;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;\nvPart = aPart;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vRest;
flat varying float vPart;
uniform vec3 uSkin, uShirt, uShorts, uShoe, uSock, uLips, uStripe;
uniform float uCollarY, uWaistY, uShoeTop, uSleeve, uSleeveStripe, uShortsT, uSockT;
uniform vec3 uShoL, uShoR, uArmL, uArmR, uHipL, uHipR, uLegL, uLegR;
// paso suave de 1 píxel para que los bordes salgan nítidos pero sin dientes de sierra
float edge(float d) { float w = max(fwidth(d), 1e-4); return smoothstep(-w, w, d); }
float along(vec3 p, vec3 a, vec3 dir) { return dot(p - a, dir) / dot(dir, dir); }
vec3 band(vec3 base, vec3 stripe, float t, float t0, float t1) { return mix(base, mix(stripe, base, edge(t - t1)), edge(t - t0)); }
vec3 clothes() {
  int part = int(floor(vPart + 0.5));
  vec3 p = vRest;
  if (part == 7) return uLips;
  if (p.y < uShoeTop) return uShoe;
  if (part == 5) return uSock;
  if (part == 6) return uSkin;
  if (part == 1 || part == 2) {
    float t = part == 1 ? along(p, uShoL, uArmL) : along(p, uShoR, uArmR);
    vec3 sleeve = uSleeveStripe > 0.0 ? band(uShirt, uStripe, t, uSleeve - uSleeveStripe, uSleeve) : uShirt;
    return mix(sleeve, uSkin, edge(t - uSleeve));
  }
  if (part == 3 || part == 4) {
    float t = part == 3 ? along(p, uHipL, uLegL) : along(p, uHipR, uLegR);
    vec3 c = mix(band(uShorts, uStripe, t, uShortsT - 0.022, uShortsT), uSkin, edge(t - uShortsT));
    return mix(c, uSock, edge(t - uSockT));
  }
  // tronco y cabeza: pantalón, camiseta con cuello blanco y piel
  vec3 c = mix(uShorts, uShirt, edge(p.y - uWaistY));
  c = band(c, uStripe, p.y, uCollarY - 1.0, uCollarY);
  return mix(c, uSkin, edge(p.y - uCollarY));
}`)
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( clothes(), opacity );');
    };
    return mat;
  }

  /** Cierra la mano (0 abierta, 1 puño). */
  setFist(amount: number): void {
    if (this.mesh.morphTargetInfluences) this.mesh.morphTargetInfluences[0] = amount;
  }

  /** Lateral de reposo (del lado L al R anatómico): -x en los datos. */
  private restLateral(_name: string): V3 {
    return V(-1, 0, 0);
  }

  /**
   * Coloca la figura. `J` son las articulaciones del motor; `swap` invierte L/R
   * (vista de frente: el lado "R" del motor es el izquierdo anatómico).
   */
  update(J: Joints3D, swap: boolean): void {
    const S = (s: 'L' | 'R') => (swap ? (s === 'L' ? 'R' : 'L') : s);
    // lateral actual (de L a R anatómicos) a partir de hombros y caderas
    const shoLat = J['sho' + S('R')].clone().sub(J['sho' + S('L')]);
    const hipLat = J['hip' + S('R')].clone().sub(J['hip' + S('L')]);
    let lat = shoLat.add(hipLat);
    if (lat.lengthSq() < 1e-6) lat = V(0, 0, 1);
    lat.normalize();

    const set = (name: string, a: V3, b: V3, alongLen?: number) => {
      const rf = this.restFrames[name];
      const dir = b.clone().sub(a);
      const len = alongLen ?? dir.length();
      const F = frameMatrix(dir, lat);
      const k = len / rf.len;
      const perp = this.perp * Math.max(1, Math.sqrt(k / this.perp)) * (BULK[name.slice(0, 2)] ?? 1);
      const Sc = new THREE.Matrix4().makeScale(perp, k, perp);
      const M = new THREE.Matrix4()
        .makeTranslation(a.x, a.y, a.z)
        .multiply(F)
        .multiply(Sc)
        .multiply(rf.inv)
        .multiply(new THREE.Matrix4().makeTranslation(-rf.a.x, -rf.a.y, -rf.a.z));
      const bone = this.bones[this.data.bones.indexOf(name)];
      bone.matrixWorld.copy(M);
      if (name === 'head') this.headMatrix.copy(M);
    };

    set('hips', J.pel, J.mid);
    set('chest', J.mid, J.neck);
    set('head', J.neck, J.head);
    for (const side of ['L', 'R'] as const) {
      const m = S(side);
      set('ua' + side, J['sho' + m], J['el' + m]);
      set('fa' + side, J['el' + m], J['ha' + m]);
      const u = J['ha' + m].clone().sub(J['el' + m]).normalize();
      const handLen = this.restFrames['hand' + side].len * this.perp;
      set('hand' + side, J['ha' + m], J['ha' + m].clone().addScaledVector(u, handLen), handLen);
      set('th' + side, J['hip' + m], J['kn' + m]);
      set('sh' + side, J['kn' + m], J['an' + m]);
      set('foot' + side, J['an' + m], J['ti' + m]);
    }
    this.mesh.skeleton.update();

    // zapatillas: elipsoides a lo largo del pie
    (['L', 'R'] as const).forEach((side, i) => {
      const sh = this.shoes[i];
      if (!sh) return;
      const m = S(side);
      const an = J['an' + m], ti = J['ti' + m];
      const d = ti.clone().sub(an);
      if (d.lengthSq() < 1e-4) d.set(1, 0, 0);
      d.normalize();
      const upDir = ortho(V(0, 1, 0), d);
      const sideDir = d.clone().cross(upDir).normalize();
      const basis = new THREE.Matrix4().makeBasis(sideDir, upDir, d);
      const c = an.clone().addScaledVector(d, 4.2).addScaledVector(upDir, -0.6);
      sh.upper.position.copy(c);
      sh.upper.quaternion.setFromRotationMatrix(basis);
      sh.upper.scale.set(3.5, 3.1, 7.4);
      sh.sole.position.copy(c).addScaledVector(upDir, -2.0);
      sh.sole.quaternion.setFromRotationMatrix(basis);
      sh.sole.scale.set(3.8, 1.2, 7.8);
    });

    // ojos: siguen a la cabeza
    const fwd = V(0, 0, 1).transformDirection(this.headMatrix);
    const r = this.data.eyeRadius * this.perp;
    (['L', 'R'] as const).forEach((s, i) => {
      const p = this.restEyes[s].clone().applyMatrix4(this.headMatrix);
      this.eyes[i].position.copy(p);
      this.eyes[i].scale.setScalar(r);
      this.pupils[i].position.copy(p).addScaledVector(fwd, r * 0.72);
      this.pupils[i].scale.setScalar(r * 0.5);
    });
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
