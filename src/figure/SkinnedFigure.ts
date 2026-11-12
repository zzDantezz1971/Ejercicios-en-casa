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
  /** El modelo ya tiene el volumen bueno: no ensanchar brazos y piernas. */
  noBulk?: boolean;
  /** Añadir zapatillas encima del pie (si la malla tiene el pie descalzo). */
  shoes?: boolean;
  /** Parte del cuerpo de cada vértice: 0 tronco/cabeza, 1-2 brazo L/R, 3-4 pierna L/R, 5 pie, 6 mano, 7 labios. */
  part?: string;
  /** Mano cerrada (puño) como forma alternativa: vértices que cambian y su desplazamiento. */
  fist?: { idx: string; d: string };
  /** Cortes de la ropa en la postura de reposo. */
  clothes?: { collarY: number; waistY: number; sleeve: number; shorts: number; sock: number; shoeTop: number; sleeveStripe?: number; shortsT?: number };
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

/** Cuánto se levanta la punta del pie (radianes); 0: planos en el suelo (mapa de músculos). */
const FOOT_LIFT = 0;

/** Articulaciones 3D tal como las da el motor (pel, mid, neck, head, shoL, elL, haL, hipL, knL, anL, tiL...). */
export type Joints3D = Record<string, V3>;

export class SkinnedFigure {
  readonly mesh: THREE.SkinnedMesh;
  private bones: THREE.Bone[] = [];
  private restFrames: Record<string, { a: V3; b: V3; len: number; dir: V3; F: THREE.Matrix4; inv: THREE.Matrix4 }> = {};
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
      this.restFrames[name] = { a, b: c, len: a.distanceTo(c), dir: c.clone().sub(a).normalize(), F, inv: F.clone().invert() };
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
   * (vista de frente: el lado "R" del motor es el izquierdo anatómico). `now` (ms) da la respiración.
   */
  update(J: Joints3D, swap: boolean, now = 0): void {
    if (!this.data.bones.includes('spine')) return this.updateFlat(J, swap);
    const S = (s: 'L' | 'R') => (swap ? (s === 'L' ? 'R' : 'L') : s);
    const RF = this.restFrames;
    // lateral actual (de R a L anatómicos, como +x en reposo) de cadera y de hombros
    const latOf = (a: V3, b: V3, fb: V3) => {
      const v = a.clone().sub(b);
      return v.lengthSq() < 1e-6 ? fb : v.normalize();
    };
    const hipX0 = latOf(J['hip' + S('L')], J['hip' + S('R')], V(0, 0, -1));
    const shoX0 = latOf(J['sho' + S('L')], J['sho' + S('R')], hipX0);
    const rot = new Map<string, THREE.Matrix4>();
    const scaleAll = this.perp;

    /** Coloca un hueso con rotación R (reposo → ahora), empezando en `a` y con longitud `len`. */
    const place = (name: string, R: THREE.Matrix4, a: V3, len: number, thick = 1) => {
      const rf = RF[name];
      const k = len / rf.len;
      const perp = scaleAll * Math.max(1, Math.sqrt(k / scaleAll)) * (this.data.noBulk ? 1 : (BULK[name.slice(0, 2)] ?? 1)) * thick;
      const Sc = new THREE.Matrix4().makeScale(perp, k, perp);
      const M = new THREE.Matrix4().makeTranslation(a.x, a.y, a.z).multiply(R).multiply(rf.F).multiply(Sc).multiply(rf.inv)
        .multiply(new THREE.Matrix4().makeTranslation(-rf.a.x, -rf.a.y, -rf.a.z));
      this.bones[this.data.bones.indexOf(name)].matrixWorld.copy(M);
      rot.set(name, R);
      if (name === 'head') this.headMatrix.copy(M);
    };
    /** Rotación de un hueso del tronco: su eje va de a a b y su lateral sigue `X`. */
    const trunkRot = (name: string, a: V3, b: V3, X: V3) => {
      const rf = RF[name];
      const cur = frameMatrix(b.clone().sub(a), X.clone().negate());
      return cur.multiply(rf.inv);
    };
    /**
     * Rotación de un hueso de brazo o pierna: la del padre más el "giro corto" que lleva su dirección
     * de reposo a la de ahora, medido desde una dirección neutra (así el hueso no se retuerce).
     */
    const limbRot = (name: string, parent: THREE.Matrix4, d: V3, neutral: V3) => {
      const inv = parent.clone().invert();
      const local = d.clone().normalize().transformDirection(inv);
      const q1 = new THREE.Quaternion().setFromUnitVectors(neutral, local);
      const q0 = new THREE.Quaternion().setFromUnitVectors(neutral, RF[name].dir);
      const Q = q1.multiply(q0.invert());
      return parent.clone().multiply(new THREE.Matrix4().makeRotationFromQuaternion(Q));
    };

    // ── columna: curva suave por pelvis, mitad y cuello ──
    const P0 = J.pel, P2 = J.neck, C = J.mid.clone().multiplyScalar(2).sub(P0.clone().add(P2).multiplyScalar(0.5));
    const bez = (t: number) => P0.clone().multiplyScalar((1 - t) ** 2).add(C.clone().multiplyScalar(2 * t * (1 - t))).add(P2.clone().multiplyScalar(t * t));
    const total = RF.hips.len + RF.spine.len + RF.chest.len;
    const t1 = RF.hips.len / total, t2 = (RF.hips.len + RF.spine.len) / total;
    const A1 = bez(t1), A2 = bez(t2);
    const mixX = (k: number) => hipX0.clone().lerp(shoX0, k).normalize();
    // respiración: el pecho se hincha un poco
    const breath = 1 + 0.018 * Math.sin((now / 1000) * 2 * Math.PI / 3.6);
    const Rh = trunkRot('hips', P0, A1, hipX0);
    place('hips', Rh, P0, P0.distanceTo(A1));
    const Rs = trunkRot('spine', A1, A2, mixX(0.5));
    place('spine', Rs, A1, A1.distanceTo(A2), (1 + breath) / 2);
    const Rc = trunkRot('chest', A2, P2, shoX0);
    place('chest', Rc, A2, A2.distanceTo(P2), breath);

    // ── cuello y cabeza ──
    const chestDir = P2.clone().sub(A2).normalize();
    const headVec = J.head.clone().sub(P2);
    const hLen = headVec.length();
    const fNeck = RF.neck.len / (RF.neck.len + RF.head.len);
    const neckDir = chestDir.clone().add(headVec.clone().normalize()).normalize();
    const N2 = P2.clone().addScaledVector(neckDir, hLen * fNeck);
    const Rn = trunkRot('neck', P2, N2, shoX0);
    place('neck', Rn, P2, P2.distanceTo(N2));
    const Rhd = trunkRot('head', N2, J.head, shoX0);
    place('head', Rhd, N2, N2.distanceTo(J.head));

    for (const side of ['L', 'R'] as const) {
      const m = S(side);
      // ── clavícula y hombro: al subir el brazo por encima del hombro, el hombro sube un poco ──
      const sho = J['sho' + m].clone();
      const up = chestDir;
      const armDir = J['el' + m].clone().sub(J['sho' + m]).normalize();
      const lift = Math.max(0, armDir.dot(up) + 0.15);
      sho.addScaledVector(up, 2.2 * lift);
      const claA = RF['cla' + side].a.clone().applyMatrix4(new THREE.Matrix4().copy(this.bones[this.data.bones.indexOf('chest')].matrixWorld));
      const Rcl = limbRot('cla' + side, Rc, sho.clone().sub(claA), RF['cla' + side].dir);
      place('cla' + side, Rcl, claA, claA.distanceTo(sho));
      // ── brazo ──
      const el = J['el' + m].clone().addScaledVector(up, 2.2 * lift * 0.6), ha = J['ha' + m];
      const Rua = limbRot('ua' + side, Rc, el.clone().sub(sho), RF['ua' + side].dir);
      place('ua' + side, Rua, sho, sho.distanceTo(el));
      const Rfa = limbRot('fa' + side, Rua, ha.clone().sub(el), RF['ua' + side].dir);
      place('fa' + side, Rfa, el, el.distanceTo(ha));
      // mano: sigue al antebrazo; apoyada en el suelo, se queda plana con los dedos hacia delante
      let Rhn = Rfa.clone();
      const faDir = ha.clone().sub(el).normalize();
      const support = Math.min(1, Math.max(0, (13 - ha.y) / 5)) * Math.min(1, Math.max(0, (-faDir.y - 0.35) / 0.3));
      if (support > 0) {
        // hacia donde mira el cuerpo (de la línea de la cadera), aunque el tronco esté boca abajo
        const fwd = hipX0.clone().cross(V(0, 1, 0)); fwd.y = 0;
        if (fwd.lengthSq() < 1e-4) fwd.set(1, 0, 0);
        fwd.normalize();
        const handNow = RF['hand' + side].dir.clone().transformDirection(Rfa);
        const target = fwd.clone().multiplyScalar(0.95).add(V(0, -0.3, 0)).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(handNow, target);
        const qFull = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeRotationFromQuaternion(q).multiply(Rfa));
        const qFa = new THREE.Quaternion().setFromRotationMatrix(Rfa);
        Rhn = new THREE.Matrix4().makeRotationFromQuaternion(qFa.slerp(qFull, support));
      }
      place('hand' + side, Rhn, ha, RF['hand' + side].len * scaleAll);
      // ── pierna ──
      const hip = J['hip' + m], kn = J['kn' + m], an = J['an' + m], ti = J['ti' + m];
      const Rth = limbRot('th' + side, Rh, kn.clone().sub(hip), V(0, -1, 0));
      place('th' + side, Rth, hip, hip.distanceTo(kn));
      const Rsh = limbRot('sh' + side, Rth, an.clone().sub(kn), RF['th' + side].dir);
      place('sh' + side, Rsh, kn, kn.distanceTo(an));
      // el pie, con la punta un poco levantada (el del modelo acaba en punta y parecía de puntillas)
      const fDir = ti.clone().sub(an).normalize();
      const fLat = fDir.clone().cross(V(0, 1, 0));
      if (fLat.lengthSq() > 1e-4) fDir.applyAxisAngle(fLat.normalize(), -FOOT_LIFT);
      const Rft = limbRot('foot' + side, Rsh, fDir, RF['sh' + side].dir);
      // más largo y ancho que el que da el motor (a medida del muñeco de piezas), que se veía muy pequeño
      place('foot' + side, Rft, an, RF['foot' + side].len * scaleAll * 1.12, 1.3);
    }
    this.afterBones(J, S);
  }

  /** Maniquís antiguos de 15 huesos: cada hueso se orienta solo con el lateral del cuerpo. */
  private updateFlat(J: Joints3D, swap: boolean): void {
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
      const perp = this.perp * Math.max(1, Math.sqrt(k / this.perp)) * (this.data.noBulk ? 1 : (BULK[name.slice(0, 2)] ?? 1));
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
    this.afterBones(J, S);
  }

  /** Zapatillas y ojos, que siguen a los huesos ya colocados. */
  private afterBones(J: Joints3D, S: (s: 'L' | 'R') => string): void {
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
