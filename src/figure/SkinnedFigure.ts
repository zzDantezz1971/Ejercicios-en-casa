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
  private feet: Record<'L' | 'R', { an: V3; ti: V3 }> = { L: { an: V(), ti: V() }, R: { an: V(), ti: V() } };

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

    // material provisional: el maniquí anatomía lo sustituye por el de los músculos
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 });
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
    const has = (n: string) => !!this.restFrames[n];
    const L = (n: string) => this.restFrames[n].len * this.perp;

    /** Coloca un hueso desde `a` en la dirección de `b`, con su largo real (sin estirarlo). Devuelve su matriz y el extremo. */
    const set = (name: string, a: V3, b: V3, len = L(name)) => {
      const rf = this.restFrames[name];
      let dir = b.clone().sub(a);
      if (dir.lengthSq() < 1e-8) dir = V(0, 1, 0);
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
      return { M, end: a.clone().addScaledVector(dir.normalize(), len) };
    };
    /** Punto de reposo llevado a la postura actual con la matriz de un hueso. */
    const carry = (M: THREE.Matrix4, p: V3) => p.clone().applyMatrix4(M);

    /** Dos huesos (brazo o pierna) que llegan a `target` doblando el codo/rodilla hacia `pole`. */
    const ik = (a: V3, target: V3, pole: V3, l1: number, l2: number) => {
      const d0 = target.clone().sub(a);
      const dist = Math.min(Math.max(d0.length(), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
      const n = d0.lengthSq() > 1e-8 ? d0.normalize() : V(0, -1, 0);
      let pv = pole.clone().sub(a);
      pv.sub(n.clone().multiplyScalar(pv.dot(n)));
      if (pv.lengthSq() < 1e-6) pv = ortho(lat, n);
      pv.normalize();
      const x = (l1 * l1 + dist * dist - l2 * l2) / (2 * dist);
      const hgt = Math.sqrt(Math.max(0, l1 * l1 - x * x));
      const mid = a.clone().addScaledVector(n, x).addScaledVector(pv, hgt);
      return { mid, end: a.clone().addScaledVector(n, dist) };
    };

    // ── Columna: curva suave por la cadera, el centro y el cuello, en tres partes de largo fijo ──
    const pel = J.pel, midJ = J.mid, neckJ = J.neck;
    const ctrl = midJ.clone().multiplyScalar(2).sub(pel.clone().add(neckJ).multiplyScalar(0.5));
    const bez = (t: number) => pel.clone().multiplyScalar((1 - t) * (1 - t)).add(ctrl.clone().multiplyScalar(2 * t * (1 - t))).add(neckJ.clone().multiplyScalar(t * t));
    let chestM: THREE.Matrix4, hipsM: THREE.Matrix4, neck: V3;
    if (has('abs')) {
      const tot = L('hips') + L('abs') + L('chest');
      const h = set('hips', pel, bez(L('hips') / tot));
      const ab = set('abs', h.end, bez((L('hips') + L('abs')) / tot));
      const ch = set('chest', ab.end, neckJ);
      hipsM = h.M; chestM = ch.M; neck = ch.end;
    } else {
      const h = set('hips', pel, midJ);
      const ch = set('chest', h.end, neckJ);
      hipsM = h.M; chestM = ch.M; neck = ch.end;
    }
    set('head', neck, neck.clone().add(J.head.clone().sub(neckJ)));
    const up = neck.clone().sub(pel).normalize();

    for (const side of ['L', 'R'] as const) {
      const m = S(side);
      // ── Hombro en su sitio real del cuerpo; sube un poco al levantar el brazo ──
      let sho = carry(chestM, this.restFrames['ua' + side].a);
      const armDir = J['el' + m].clone().sub(J['sho' + m]).normalize();
      const elev = Math.max(0, armDir.dot(up) + 0.3) / 1.3;
      sho = sho.addScaledVector(up, 3.2 * elev);
      if (has('cl' + side)) set('cl' + side, carry(chestM, this.restFrames['cl' + side].a), sho, sho.distanceTo(carry(chestM, this.restFrames['cl' + side].a)));
      // ── Brazo: la mano llega a su sitio y el codo se dobla hacia donde indica la animación ──
      const arm = ik(sho, J['ha' + m], J['el' + m], L('ua' + side), L('fa' + side));
      set('ua' + side, sho, arm.mid);
      const fa = set('fa' + side, arm.mid, arm.end);
      // mano: sigue al antebrazo; apoyada en el suelo, queda plana con los dedos hacia delante
      const u = fa.end.clone().sub(arm.mid).normalize();
      let hd = u.clone();
      if (fa.end.y < 5 && u.y < -0.25) {
        hd = V(u.x, 0, u.z);
        if (hd.lengthSq() < 0.12) hd = V(up.x, 0, up.z);
        if (hd.lengthSq() < 1e-4) hd = V(1, 0, 0);
        hd.normalize().add(V(0, -0.08, 0)).normalize();
      }
      set('hand' + side, fa.end, fa.end.clone().add(hd));
      // ── Pierna: el pie llega a su sitio y la rodilla se dobla hacia donde indica la animación ──
      const hip = carry(hipsM, this.restFrames['th' + side].a);
      const leg = ik(hip, J['an' + m], J['kn' + m], L('th' + side), L('sh' + side));
      set('th' + side, hip, leg.mid);
      set('sh' + side, leg.mid, leg.end);
      const toe = leg.end.clone().add(J['ti' + m].clone().sub(J['an' + m]));
      set('foot' + side, leg.end, toe);
      this.feet[side] = { an: leg.end, ti: toe };
    }
    this.mesh.skeleton.update();

    // zapatillas: elipsoides a lo largo del pie
    (['L', 'R'] as const).forEach((side, i) => {
      const sh = this.shoes[i];
      if (!sh) return;
      const an = this.feet[side].an, ti = this.feet[side].ti;
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
