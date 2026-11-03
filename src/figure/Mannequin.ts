import * as THREE from 'three';
import type { MotionSpec, PropOp } from '../domain/types';
import { Motion, type Joints, type Pose } from './poses';

/* Maniquí 3D. Convierte las articulaciones del motor de posturas a 3D:
   X = adelante (vista lateral) o lateral (vista de frente), Y = arriba, Z = lado del cuerpo / profundidad. */

type V3 = THREE.Vector3;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

export interface Palette {
  skin: string; shirt: string; shorts: string; shoe: string; sole: string; brow: string;
  iron: string; bench: string; benchLeg: string; mat: string; wall: string;
}

export const DEFAULT_PALETTE: Palette = {
  skin: '#E2A983', shirt: '#2F5BEA', shorts: '#243244', shoe: '#F2A516', sole: '#F4F1EA', brow: '#6B4A3A',
  iron: '#5A6573', bench: '#3A4250', benchLeg: '#9AA3AF', mat: '#8FA9EE', wall: '#D9DEE5',
};

const SIDE_W = { arm: 13, leg: 8.5 };

/** Lleva las articulaciones 2D a 3D según la vista del ejercicio. */
export function to3D(spec: MotionSpec, view: string, J: Joints, pose: Pose): Record<string, V3> {
  const o: Record<string, V3> = {};
  if (view === 'top') {
    const base = spec.lift ?? 6;
    const rise = (s: number, len: number) => len * Math.sqrt(Math.max(0, 1 - s * s));
    for (const k in J) o[k] = V(J[k][0], base, J[k][1]);
    for (const s of ['L', 'R']) {
      o['el' + s].y = base + rise(pose['sa' + s], 26);
      o['ha' + s].y = o['el' + s].y + rise(pose['sa' + s], 24);
      const kneeDy = rise(pose['sTh' + s], 34) * (spec.legsDown ? -1 : 1);
      o['kn' + s].y = Math.max(4, base + kneeDy);
      o['an' + s].y = Math.max(3.5, o['kn' + s].y - rise(pose['sSh' + s], 33));
      o['ti' + s].y = o['an' + s].y;
    }
    return o;
  }
  if (view === 'front' && spec.noGround) {
    // sentado en el suelo visto de frente: lo que en 2D queda "debajo" de la cadera está delante (hacia la cámara)
    const pel = J.pel, baseY = 9;
    for (const k in J) o[k] = V(J[k][0], baseY - (J[k][1] - pel[1]), 0);
    for (const s of ['L', 'R']) {
      const kn = J['kn' + s], an = J['an' + s], ti = J['ti' + s];
      const up = pel[1] - kn[1];
      o['kn' + s] = up > 4 ? V(kn[0], baseY + up * 0.9, 20) : V(kn[0], 8, 8 + Math.max(0, kn[1] - pel[1]));
      o['an' + s] = V(an[0], 4, up > 4 ? 32 : 14 + Math.max(0, an[1] - pel[1]));
      o['ti' + s] = V(ti[0], 3.5, o['an' + s].z + 3);
      o['hip' + s] = V(J['hip' + s][0], baseY, 0);
    }
    return o;
  }
  const side = view === 'side';
  for (const k in J) {
    const s = k.slice(-1);
    let z = 0;
    if (side && (s === 'L' || s === 'R')) {
      const w = /^(sho|el|ha)/.test(k) ? SIDE_W.arm : /^(hip|kn|an|ti)/.test(k) ? SIDE_W.leg : 0;
      z = (s === 'L' ? -1 : 1) * w;
    }
    o[k] = V(J[k][0], -J[k][1], z);
  }
  return o;
}

/** Escena 3D de un ejercicio: maniquí, accesorios, luces y cámara. */
export class MannequinScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(28, 1.5, 1, 3000);
  readonly motion: Motion;
  azimuth: number;
  elevation: number;
  private center = V();
  private size = V();
  private parts: Record<string, THREE.Mesh> = {};
  private dumbbells: Array<{ hand: 'L' | 'R'; bar: THREE.Mesh; p1: THREE.Mesh; p2: THREE.Mesh }> = [];
  private disposables: Array<{ dispose(): void }> = [];

  constructor(spec: MotionSpec, private readonly pal: Palette = DEFAULT_PALETTE) {
    this.motion = new Motion(spec);
    const view = this.motion.view;
    this.azimuth = spec.az ?? (view === 'side' ? 32 : view === 'top' ? 12 : 18);
    this.elevation = spec.el ?? (view === 'top' ? 48 : 14);
    this.buildLights();
    this.buildBody();
    this.buildStage();
    this.placeCamera();
  }

  private mat(color: string, rough = 0.6, metal = 0): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough, metalness: metal });
    this.disposables.push(m);
    return m;
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a93a3, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(80, 220, 160);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 10, far: 700 });
    sun.shadow.bias = -0.0008;
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-150, 80, -60);
    this.scene.add(fill);
  }

  private geo = {
    sph: new THREE.SphereGeometry(1, 24, 16),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 20, 1),
    tap: new THREE.CylinderGeometry(0.82, 1, 1, 20, 1),
    box: new THREE.BoxGeometry(1, 1, 1),
  };

  private add(g: THREE.BufferGeometry, m: THREE.Material, cast = true): THREE.Mesh {
    const x = new THREE.Mesh(g, m);
    x.castShadow = cast;
    x.receiveShadow = true;
    this.scene.add(x);
    return x;
  }

  private buildBody(): void {
    const p = this.pal, P = this.parts, G = this.geo;
    const M = {
      skin: this.mat(p.skin, 0.55), shirt: this.mat(p.shirt, 0.7), shorts: this.mat(p.shorts, 0.75),
      shoe: this.mat(p.shoe, 0.5), sole: this.mat(p.sole, 0.8), brow: this.mat(p.brow, 0.8),
      eye: this.mat('#FFFFFF', 0.3), pupil: this.mat('#1C1C1C', 0.3), iron: this.mat(p.iron, 0.35, 0.6),
    };
    for (const s of ['L', 'R']) {
      P['th' + s] = this.add(G.tap, M.shorts); P['ths' + s] = this.add(G.tap, M.skin);
      P['sh' + s] = this.add(G.tap, M.skin); P['ua' + s] = this.add(G.tap, M.skin); P['fa' + s] = this.add(G.tap, M.skin);
      P['sl' + s] = this.add(G.tap, M.shirt);
      for (const j of ['kn', 'el', 'an']) P[j + s] = this.add(G.sph, M.skin);
      P['palm' + s] = this.add(G.sph, M.skin); P['fing' + s] = this.add(G.sph, M.skin); P['thumb' + s] = this.add(G.cyl, M.skin);
      P['shoe' + s] = this.add(G.sph, M.shoe); P['sole' + s] = this.add(G.sph, M.sole);
      P['shoB' + s] = this.add(G.sph, M.shirt); P['hipB' + s] = this.add(G.sph, M.shorts);
      P['ear' + s] = this.add(G.sph, M.skin); P['eye' + s] = this.add(G.sph, M.eye, false);
      P['pupil' + s] = this.add(G.sph, M.pupil, false); P['brow' + s] = this.add(G.box, M.brow, false);
    }
    P.chest = this.add(G.sph, M.shirt); P.belly = this.add(G.sph, M.shirt); P.pelvis = this.add(G.sph, M.shorts);
    P.neck = this.add(G.cyl, M.skin); P.head = this.add(G.sph, M.skin); P.jaw = this.add(G.sph, M.skin);
    P.nose = this.add(G.sph, M.skin, false); P.mouth = this.add(G.box, M.brow, false);
    const db = this.motion.spec.db;
    const hands: Array<'L' | 'R'> = db === 'both' ? ['L', 'R'] : db ? [db] : [];
    for (const hand of hands) this.dumbbells.push({ hand, bar: this.add(G.cyl, M.iron), p1: this.add(G.cyl, M.iron), p2: this.add(G.cyl, M.iron) });
  }

  private buildStage(): void {
    const { motion } = this, spec = motion.spec, G = this.geo, view = motion.view;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.ShadowMaterial({ opacity: 0.16 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const bb = new THREE.Box3();
    for (let i = 0; i <= 40; i++) {
      const { pose, J } = motion.jointsAt((motion.total * i) / 40);
      const P3 = to3D(spec, view, J, pose);
      for (const k in P3) bb.expandByPoint(P3[k]);
    }
    bb.expandByScalar(10);
    bb.min.y = Math.min(bb.min.y, 0);

    if (spec.mat) {
      const m = this.add(G.box, this.mat(this.pal.mat, 0.9), false);
      m.position.set((bb.min.x + bb.max.x) / 2, 0.6, view === 'top' ? (bb.min.z + bb.max.z) / 2 : 0);
      m.scale.set(bb.max.x - bb.min.x + 12, 1.2, view === 'top' ? bb.max.z - bb.min.z + 12 : 62);
    }
    const benchM = this.mat(this.pal.bench, 0.6), legM = this.mat(this.pal.benchLeg, 0.4, 0.5);
    for (const o of motion.props()) this.addProp(o, view, bb, benchM, legM);

    bb.getCenter(this.center);
    bb.getSize(this.size);
  }

  private addProp(o: PropOp, view: string, bb: THREE.Box3, benchM: THREE.Material, legM: THREE.Material): void {
    const G = this.geo, z0 = o.z ?? 0, dep = o.dep ?? 22;
    if (view === 'top' && o.t === 'rect') {
      const top = (this.motion.spec.lift ?? 40) - 6;
      const m = this.add(G.box, benchM);
      m.position.set(o.x + o.w / 2, top - 3, o.y + o.h / 2);
      m.scale.set(o.w, 6, o.h);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const l = this.add(G.cyl, legM);
        this.seg(l, V(o.x + o.w / 2 + dx * (o.w / 2 - 3), top - 6, o.y + o.h / 2 + dz * (o.h / 2 - 6)), V(o.x + o.w / 2 + dx * (o.w / 2 - 3), 0, o.y + o.h / 2 + dz * (o.h / 2 - 6)), 1.8);
      }
      bb.expandByObject(m);
      return;
    }
    if (o.t === 'rect') {
      const m = this.add(G.box, benchM);
      m.position.set(o.x + o.w / 2, -(o.y + o.h / 2), z0);
      m.scale.set(o.w, o.h, dep);
      bb.expandByObject(m);
      return;
    }
    const a = V(o.a[0], -o.a[1], 0), b = V(o.b[0], -o.b[1], 0);
    if (Math.abs(a.x - b.x) < 0.5 && Math.max(a.y, b.y) > 120) {
      const m = this.add(G.box, this.mat(this.pal.wall, 0.95));
      m.position.set(a.x + 4, 75, 0);
      m.scale.set(8, 150, 220);
      bb.expandByPoint(V(a.x + 8, 0, 0));
    } else if (o.w >= 6) {
      const m = this.add(G.box, benchM);
      const d = b.clone().sub(a), L = d.length();
      m.position.copy(a).addScaledVector(d, 0.5);
      m.position.z = z0;
      m.quaternion.setFromUnitVectors(V(1, 0, 0), d.normalize());
      m.scale.set(L, o.w, dep);
      bb.expandByObject(m);
    } else {
      for (const z of [-dep / 2 + 3, dep / 2 - 3]) this.seg(this.add(G.cyl, legM), V(a.x, a.y, z0 + z), V(b.x, b.y, z0 + z), 1.8);
    }
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.placeCamera();
  }

  placeCamera(): void {
    const s = this.size, c = this.center, cam = this.camera;
    const span = Math.max(s.x * 1.08, s.y * cam.aspect * 1.08, s.z * 0.8, 150);
    const dist = (span / cam.aspect / 2 / Math.tan((cam.fov * Math.PI) / 360)) * 1.04;
    const a = (this.azimuth * Math.PI) / 180, e = (this.elevation * Math.PI) / 180;
    cam.position.set(c.x + dist * Math.sin(a) * Math.cos(e), c.y + dist * Math.sin(e), c.z + dist * Math.cos(a) * Math.cos(e));
    cam.lookAt(c);
  }

  private tmpQ = new THREE.Quaternion();
  private seg(mesh: THREE.Object3D, a: V3, b: V3, r: number): void {
    const d = b.clone().sub(a), L = Math.max(d.length(), 0.001);
    mesh.position.copy(a).addScaledVector(d, 0.5);
    this.tmpQ.setFromUnitVectors(UP, d.divideScalar(L));
    mesh.quaternion.copy(this.tmpQ);
    mesh.scale.set(r, L, r);
  }
  private ball(mesh: THREE.Object3D, p: V3, r: number): void {
    mesh.position.copy(p);
    mesh.scale.set(r, r, r);
  }
  /** Elipsoide orientado con ejes propios: largo a lo largo de `along`, ancho en `across`. */
  private oriented(mesh: THREE.Object3D, center: V3, along: V3, across: V3, rAlong: number, rAcross: number, rThick: number): void {
    const y = along.clone().normalize();
    const x = across.clone().sub(y.clone().multiplyScalar(across.dot(y))).normalize();
    if (!Number.isFinite(x.x) || x.lengthSq() < 0.01) x.set(1, 0, 0).cross(y).normalize();
    const z = x.clone().cross(y).normalize();
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    mesh.position.copy(center);
    mesh.scale.set(rAcross, rAlong, rThick);
  }

  /** Coloca el maniquí en el instante `ms` del movimiento. */
  update(ms: number): void {
    const { motion } = this, P = this.parts, view = motion.view, side = view === 'side';
    const { pose, J: J2 } = motion.jointsAt(ms);
    const J = to3D(motion.spec, view, J2, pose);
    const lateralAxis = side ? V(0, 0, 1) : view === 'top' ? V(0, 1, 0) : V(0, 0, 1);

    for (const s of ['L', 'R']) {
      const hip = J['hip' + s], kn = J['kn' + s], an = J['an' + s], ti = J['ti' + s];
      const sho = J['sho' + s], el = J['el' + s], ha = J['ha' + s];
      this.seg(P['ths' + s], hip, kn, 5.2);
      this.seg(P['th' + s], hip, hip.clone().lerp(kn, 0.55), 6.3);
      this.seg(P['sh' + s], kn, an, 4.4);
      this.ball(P['kn' + s], kn, 4.6);
      this.ball(P['an' + s], an, 3.3);
      // zapatilla con suela
      const footDir = ti.clone().sub(an);
      if (footDir.lengthSq() < 0.01) footDir.set(1, 0, 0);
      const fc = an.clone().addScaledVector(footDir.clone().normalize(), 3.2);
      this.oriented(P['shoe' + s], fc, footDir, lateralAxis, 6.4, 3.6, 3.4);
      this.oriented(P['sole' + s], fc.clone().addScaledVector(V(0, -1, 0), 1.6), footDir, lateralAxis, 6.6, 3.8, 1.4);
      // brazo
      this.seg(P['ua' + s], sho, el, 4.1);
      this.seg(P['sl' + s], sho, sho.clone().lerp(el, 0.5), 5.1);
      this.seg(P['fa' + s], el, ha, 3.4);
      this.ball(P['el' + s], el, 3.6);
      // mano: palma, dedos juntos y pulgar
      const u = ha.clone().sub(el).normalize();
      const across = side ? V(0, 0, 1) : V(0, 0, 1).cross(u).normalize();
      this.oriented(P['palm' + s], ha.clone().addScaledVector(u, 2.6), u, across, 3.4, 2.9, 1.7);
      this.oriented(P['fing' + s], ha.clone().addScaledVector(u, 6.4), u, across, 2.8, 2.6, 1.5);
      const thumbSide = across.clone().multiplyScalar(s === 'L' ? -1 : 1);
      this.seg(P['thumb' + s], ha.clone().addScaledVector(u, 1.6).addScaledVector(thumbSide, 2.2), ha.clone().addScaledVector(u, 5.2).addScaledVector(thumbSide, 3.4), 1.05);
      this.ball(P['shoB' + s], sho, 6.2);
      this.ball(P['hipB' + s], hip, 6.6);
    }

    // tronco
    const wC = side ? [9, 13.5] : [13.5, 9], wB = side ? [6.8, 10.5] : [10.5, 6.8], wP = side ? [8, 12] : [12, 8];
    const ell = (mesh: THREE.Mesh, a: V3, b: V3, rx: number, rz: number) => {
      this.seg(mesh, a, b, 1);
      const L = mesh.scale.y;
      mesh.scale.set(rx, L / 2, rz);
    };
    const T = view === 'top';
    ell(P.chest, J.mid.clone().lerp(J.neck, 0.15), J.neck.clone().lerp(J.mid, -0.08), T ? wC[1] : wC[0], T ? 9 : wC[1]);
    ell(P.belly, J.pel.clone().lerp(J.mid, 0.3), J.mid.clone().lerp(J.neck, 0.35), T ? wB[1] : wB[0], T ? 7 : wB[1]);
    ell(P.pelvis, J.pel.clone().lerp(J.mid, -0.25), J.pel.clone().lerp(J.mid, 0.55), T ? wP[1] : wP[0], T ? 8 : wP[1]);

    // cabeza: calvo, con orejas, ojos, cejas, nariz y boca
    const up = J.head.clone().sub(J.neck).normalize();
    let face: V3;
    if (side) face = V(up.y, -up.x, 0);
    else if (T) face = V(0, 1, 0);
    else face = V(0, 0, 1);
    face.sub(up.clone().multiplyScalar(face.dot(up))).normalize();
    const lat = up.clone().cross(face).normalize();
    this.seg(P.neck, J.neck.clone().addScaledVector(up, -3), J.neck.clone().addScaledVector(up, 6), 3.4);
    this.oriented(P.head, J.head, up, lat, 10, 8.6, 9.2);
    this.oriented(P.jaw, J.head.clone().addScaledVector(up, -4.5).addScaledVector(face, 2), up, lat, 5.2, 6.4, 6.4);
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? -1 : 1;
      this.oriented(P['ear' + s], J.head.clone().addScaledVector(lat, 8.5 * sg).addScaledVector(face, -0.5).addScaledVector(up, -0.5), up, face, 2.6, 1.8, 1.1);
      const eye = J.head.clone().addScaledVector(face, 7.6).addScaledVector(up, 1.4).addScaledVector(lat, 3.1 * sg);
      this.ball(P['eye' + s], eye, 1.55);
      this.ball(P['pupil' + s], eye.clone().addScaledVector(face, 1.05), 0.85);
      this.oriented(P['brow' + s], J.head.clone().addScaledVector(face, 7.9).addScaledVector(up, 4).addScaledVector(lat, 3.2 * sg), lat, up, 1.6, 0.55, 0.55);
    }
    this.oriented(P.nose, J.head.clone().addScaledVector(face, 9.3).addScaledVector(up, -1.2), up, lat, 2.0, 1.3, 1.6);
    this.oriented(P.mouth, J.head.clone().addScaledVector(face, 8.2).addScaledVector(up, -5.2), lat, up, 2.2, 0.4, 0.4);

    // mancuernas
    for (const d of this.dumbbells) {
      const h = J['ha' + d.hand], u = h.clone().sub(J['el' + d.hand]).normalize();
      const grip = h.clone().addScaledVector(u, 3.4);
      const ax = side ? V(0, 0, 1) : V(-u.y, u.x, 0).normalize();
      const a = grip.clone().addScaledVector(ax, -8), b = grip.clone().addScaledVector(ax, 8);
      this.seg(d.bar, a, b, 1.3);
      this.seg(d.p1, a.clone().addScaledVector(ax, -1.6), a.clone().addScaledVector(ax, 1.6), 5);
      this.seg(d.p2, b.clone().addScaledVector(ax, -1.6), b.clone().addScaledVector(ax, 1.6), 5);
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    Object.values(this.geo).forEach((g) => g.dispose());
  }
}
