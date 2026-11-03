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
}

export interface SkinPalette {
  skin: string; shirt: string; shorts: string; shoe: string; sock: string; lips: string; stripe: string;
}

export const SKIN_PALETTE: SkinPalette = {
  skin: '#D9A07C', shirt: '#2F5BEA', shorts: '#1E2633', shoe: '#F2A516', sock: '#F3F5F8', lips: '#B5685C', stripe: '#F3F5F8',
};

type V3 = THREE.Vector3;
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

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
    this.mesh = new THREE.SkinnedMesh(g, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;

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
      const perp = this.perp * Math.max(1, Math.sqrt(k / this.perp));
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
      sh.upper.scale.set(4.0, 3.6, 8.2);
      sh.sole.position.copy(c).addScaledVector(upDir, -2.3);
      sh.sole.quaternion.setFromRotationMatrix(basis);
      sh.sole.scale.set(4.3, 1.4, 8.6);
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
