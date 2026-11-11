import * as THREE from 'three';
import type { MotionSpec, PropOp } from '../domain/types';
import { LEN, Motion, type Joints, type Pose, type Side } from './poses';
import { anatomyMaterial } from './anatomy';
import { getFigureStyle } from './skinAsset';
import { toonify } from './toon';
import { SkinnedFigure, type SkinData } from './SkinnedFigure';

/* Maniquí 3D. Convierte las articulaciones del motor de posturas a 3D:
   X = adelante (vista lateral) o lateral (vista de frente), Y = arriba, Z = lado del cuerpo / profundidad. */

type V3 = THREE.Vector3;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

export interface Palette {
  skin: string; shirt: string; shorts: string; shoe: string; sole: string; brow: string;
  stripe: string; band: string;
  iron: string; bench: string; benchLeg: string; mat: string; wall: string;
}

/** Expresión de la cara. */
export type Mood = 'neutral' | 'effort' | 'relaxed' | 'happy';

const SMILE_ARC = Math.PI * 0.75;

/** Componente de `v` perpendicular a `axis`, normalizada. */
function ortho(v: THREE.Vector3, axis: THREE.Vector3): THREE.Vector3 {
  const a = axis.clone().normalize();
  const o = v.clone().sub(a.multiplyScalar(v.dot(a)));
  if (o.lengthSq() < 1e-6) {
    const alt = Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    return alt.sub(axis.clone().normalize().multiplyScalar(alt.dot(axis.clone().normalize()))).normalize();
  }
  return o.normalize();
}

export const DEFAULT_PALETTE: Palette = {
  skin: '#E2A983', shirt: '#2F5BEA', shorts: '#1E2633', shoe: '#F2A516', sole: '#F4F1EA', brow: '#6B4A3A',
  stripe: '#F3F5F8', band: '#FF7A33',
  iron: '#C9D0DA', bench: '#2B323D', benchLeg: '#8893A3', mat: '#26365C', wall: '#262E39',
};

const SIDE_W = { arm: 15.5, leg: 8.5 };

/** Lleva las articulaciones 2D a 3D según la vista del ejercicio. */
export function to3D(spec: MotionSpec, view: string, J: Joints, pose: Pose): Record<string, V3> {
  const o: Record<string, V3> = {};
  if (view === 'top') {
    const base = spec.lift ?? 6;
    const rise = (s: number, len: number) => len * Math.sqrt(Math.max(0, 1 - s * s));
    for (const k in J) o[k] = V(J[k][0], base, J[k][1]);
    for (const s of ['L', 'R']) {
      o['el' + s].y = base + rise(pose['sa' + s], LEN.ua);
      o['ha' + s].y = o['el' + s].y + rise(pose['sa' + s], LEN.fa);
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
  }
  const side = view === 'side';
  // sentado de frente (noGround) ya está colocado: solo le faltan la profundidad a mano y los giros de abajo
  if (!(view === 'front' && spec.noGround)) {
  for (const k in J) {
    const s = k.slice(-1);
    let z = 0;
    if (side && (s === 'L' || s === 'R')) {
      const w = /^(sho|el|ha)/.test(k) ? SIDE_W.arm : /^(hip|kn|an|ti)/.test(k) ? SIDE_W.leg : 0;
      z = (s === 'L' ? -1 : 1) * w;
    }
    o[k] = V(J[k][0], -J[k][1], z);
  }
  // Un brazo o muslo "acortado" en 2D (escala < 1) apunta en realidad hacia la cámara o hacia el lado:
  // se recupera esa profundidad para que en 3D se mueva de verdad en vez de encogerse.
  const depth = (scale: number, len: number) => len * Math.sqrt(Math.max(0, 1 - scale * scale));
  for (const s of ['L', 'R']) {
    const sign = side ? (s === 'L' ? -1 : 1) : 1;
    const sa = pose['sa' + s];
    // brazos colgando: un poco separados del cuerpo (de lado, hacia fuera)
    if (side) {
      const down = Math.max(0, Math.sin((pose['ua' + s] * Math.PI) / 180));
      const fdown = Math.max(0, Math.sin((pose['fa' + s] * Math.PI) / 180));
      o['el' + s].z += sign * 2.2 * down;
      o['ha' + s].z += sign * (2.2 * down + 2.6 * fdown * down);
    }
    if (Math.abs(sa) < 1 && (!side || spec.armsOut)) {
      o['el' + s].z += sign * depth(sa, LEN.ua);
      o['ha' + s].z += sign * depth(sa, LEN.ua + LEN.fa);
    }
    const sTh = pose['sTh' + s], sSh = pose['sSh' + s];
    if (sTh < 1) {
      const dk = sign * depth(sTh, 34);
      o['kn' + s].z += dk;
      // en vista lateral la espinilla vuelve hacia el centro (pierna cruzada); de frente sigue hacia delante
      const ds = (side ? -sign : 1) * depth(sSh, 33);
      o['an' + s].z += dk + ds;
      o['ti' + s].z += dk + ds;
    }
  }
  }
  // Una mancuerna cogida con las dos manos (de lado): las manos se juntan en el centro
  if ((spec.db === 'two' || spec.clasp) && view !== 'top') {
    const c = o.haL.clone().add(o.haR).multiplyScalar(0.5);
    for (const s of ['L', 'R']) {
      const k = s === 'L' ? -1 : 1;
      o['ha' + s] = side ? V(c.x, c.y, k * 2.5) : V(c.x + (o['ha' + s].x < c.x ? -2.5 : 2.5), c.y, c.z);
      if (side) o['el' + s].z *= 0.7;
    }
  }
  // Profundidad a mano (hacia la cámara de frente; hacia el lado cercano de lado): codo, mano, rodilla y pie.
  for (const s of ['L', 'R']) {
    o['el' + s].z += pose['zE' + s] ?? 0;
    o['ha' + s].z += pose['zH' + s] ?? 0;
    o['kn' + s].z += pose['zK' + s] ?? 0;
    o['an' + s].z += pose['zA' + s] ?? 0;
    o['ti' + s].z += pose['zA' + s] ?? 0;
  }
  // Inclinación del tronco hacia delante (lean, grados), útil en la vista de frente.
  const lean = pose.lean ?? 0;
  if (lean) {
    const a = (lean * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    const py = o.pel.y, pz = o.pel.z;
    const tilt = (k: string, f = 1) => {
      const p = o[k];
      if (!p) return;
      const cc = f === 1 ? c : Math.cos(a * f), ss = f === 1 ? sn : Math.sin(a * f);
      const dy = p.y - py, dz = p.z - pz;
      p.y = py + dy * cc - dz * ss;
      p.z = pz + dy * ss + dz * cc;
    };
    tilt('mid', 0.5);
    for (const k of ['neck', 'head', 'shoL', 'shoR', 'elL', 'elR', 'haL', 'haR']) tilt(k);
  }
  // Giro del tronco sobre el eje vertical (tw, grados): hombros, brazos y cabeza giran; la cadera no.
  const tw = pose.tw ?? 0;
  if (tw) {
    const a = (tw * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    const px = o.pel.x, pz = o.pel.z;
    const turn = (k: string, f = 1) => {
      const p = o[k];
      if (!p) return;
      const cc = f === 1 ? c : Math.cos(a * f), ss = f === 1 ? sn : Math.sin(a * f);
      const dx = p.x - px, dz = p.z - pz;
      p.x = px + dx * cc + dz * ss;
      p.z = pz - dx * ss + dz * cc;
    };
    turn('mid', 0.5);
    for (const k of ['neck', 'head', 'shoL', 'shoR', 'elL', 'elR', 'haL', 'haR']) turn(k);
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
  private dumbbells: Array<{ hand: 'L' | 'R' | 'two'; bar: THREE.Mesh; p1: THREE.Mesh; p2: THREE.Mesh }> = [];
  private disposables: Array<{ dispose(): void }> = [];
  private skinData?: SkinData;

  /** Maniquí de una sola pieza con piel (si se le pasan datos de malla). */
  private skinned: SkinnedFigure | null = null;

  /** Agarra algo con las manos (mancuernas, barra, banda, comba...): puño cerrado. */
  private readonly grips: boolean;

  constructor(spec: MotionSpec, private readonly pal: Palette = DEFAULT_PALETTE, side: Side = undefined, skin?: SkinData, anatomy?: { L: number[]; R: number[]; map?: boolean }) {
    this.motion = new Motion(spec, side);
    this.grips = !!(spec.fist || spec.db || spec.kb || spec.bar || spec.band === 'hands' || spec.band === 'feet' || typeof spec.band === 'function' || spec.rope || spec.wheel);
    this.skinData = skin;
    const view = this.motion.view;
    this.azimuth = spec.az ?? (view === 'side' ? 32 : view === 'top' ? 12 : 18);
    // De lado, el lado 2 se ve mejor desde el otro costado (si no, el brazo o pierna que trabaja queda oculto).
    if (view === 'side' && this.motion.mirrored) this.azimuth = 180 - this.azimuth;
    this.elevation = spec.el ?? (view === 'top' ? 58 : 14);
    this.buildLights();
    if (this.skinData) {
      this.skinned = new SkinnedFigure(this.skinData, undefined, this.scene);
      if (anatomy) {
        const old = this.skinned.mesh.material as THREE.Material;
        // de frente y desde arriba el cuerpo 3D tiene izquierda y derecha cambiadas respecto a la animación
        const swap = view !== 'side' && !(view === 'top' && spec.prone);
        const w = swap ? { L: anatomy.R, R: anatomy.L, map: anatomy.map } : anatomy;
        this.skinned.mesh.material = anatomyMaterial(this.skinned.mesh.geometry, this.skinData, w);
        old.dispose();
      }
      // puño para agarrar mancuernas; mano casi abierta para apoyarse
      this.skinned.setFist(this.grips ? 1 : 0.2);
      this.buildDumbbells();
      this.buildGear();
    } else this.buildBody();
    this.buildStage();
    // estilo dibujo (Configuración); el mapa de músculos de los resúmenes se queda como está
    if (this.skinData && getFigureStyle() === 'toon' && !anatomy?.map) this.disposables.push(...toonify(this.scene));
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
    ring: new THREE.TorusGeometry(1, 0.13, 8, 28),
    smile: new THREE.TorusGeometry(1, 0.17, 8, 18, SMILE_ARC),
  };
  /** Desfase del parpadeo para que no parpadeen todos a la vez. */
  private blinkOffset = Math.random() * 4000;

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
      eye: this.mat('#FFFFFF', 0.3), pupil: this.mat('#1C1C1C', 0.3), iron: this.mat(p.iron, 0.32, 0.3),
      stripe: this.mat(p.stripe, 0.6), band: this.mat(p.band, 0.6), watch: this.mat('#15181D', 0.3, 0.3),
      watchFace: this.mat('#9FB4FF', 0.2, 0.2), mouth: this.mat('#7A3B32', 0.6),
    };
    for (const s of ['L', 'R']) {
      // piernas: muslo con pantalón, músculos, rodilla, gemelo, calcetín y zapatilla
      P['th' + s] = this.add(G.tap, M.shorts); P['ths' + s] = this.add(G.tap, M.skin);
      P['quad' + s] = this.add(G.sph, M.skin); P['calf' + s] = this.add(G.sph, M.skin);
      P['sh' + s] = this.add(G.tap, M.skin);
      P['hem' + s] = this.add(G.cyl, M.stripe); P['sideStripe' + s] = this.add(G.box, M.stripe, false);
      P['sock' + s] = this.add(G.cyl, M.stripe);
      P['shoe' + s] = this.add(G.sph, M.shoe); P['sole' + s] = this.add(G.sph, M.sole);
      P['lace1' + s] = this.add(G.box, M.stripe, false); P['lace2' + s] = this.add(G.box, M.stripe, false);
      // brazos: manga con franja, bíceps, tríceps, antebrazo, muñequera o reloj
      P['ua' + s] = this.add(G.tap, M.skin); P['fa' + s] = this.add(G.tap, M.skin);
      P['bic' + s] = this.add(G.sph, M.skin); P['tri' + s] = this.add(G.sph, M.skin); P['fore' + s] = this.add(G.sph, M.skin);
      P['sl' + s] = this.add(G.tap, M.shirt); P['slStripe' + s] = this.add(G.cyl, M.stripe);
      P['wrist' + s] = this.add(G.cyl, s === 'L' ? M.watch : M.band);
      for (const j of ['kn', 'el', 'an']) P[j + s] = this.add(G.sph, M.skin);
      // mano: palma, cuatro dedos y pulgar
      P['palm' + s] = this.add(G.sph, M.skin);
      for (let f = 0; f < 4; f++) P[`fing${f}${s}`] = this.add(G.cyl, M.skin);
      P['thumb' + s] = this.add(G.cyl, M.skin);
      P['shoB' + s] = this.add(G.sph, M.shirt); P['hipB' + s] = this.add(G.sph, M.shorts); P['pec' + s] = this.add(G.sph, M.shirt);
      // cara
      P['ear' + s] = this.add(G.sph, M.skin); P['eye' + s] = this.add(G.sph, M.eye, false);
      P['pupil' + s] = this.add(G.sph, M.pupil, false); P['brow' + s] = this.add(G.box, M.brow, false);
    }
    P.watchFace = this.add(G.cyl, M.watchFace, false);
    P.chest = this.add(G.sph, M.shirt); P.belly = this.add(G.sph, M.shirt); P.pelvis = this.add(G.sph, M.shorts);
    P.traps = this.add(G.sph, M.shirt); P.glutes = this.add(G.sph, M.shorts);
    P.collar = this.add(this.geo.ring, M.stripe, false);
    P.neck = this.add(G.cyl, M.skin); P.head = this.add(G.sph, M.skin); P.jaw = this.add(G.sph, M.skin);
    P.nose = this.add(G.sph, M.skin, false);
    P.mouthFlat = this.add(G.box, M.mouth, false);
    P.mouthSmile = this.add(this.geo.smile, M.mouth, false);
    this.buildDumbbells(M.iron);
    // pesa rusa, barra, bandas, fitball, comba y rueda: también con el maniquí de piezas
    this.buildGear();
  }

  private buildDumbbells(iron: THREE.Material = this.mat(this.pal.iron, 0.32, 0.3)): void {
    const G = this.geo;
    const db = this.motion.spec.db;
    const hands: Array<'L' | 'R' | 'two'> = db === 'both' ? ['L', 'R'] : db ? [db] : [];
    for (const hand of hands) this.dumbbells.push({ hand, bar: this.add(G.cyl, iron), p1: this.add(G.cyl, iron), p2: this.add(G.cyl, iron) });
  }

  private buildStage(): void {
    const { motion } = this, spec = motion.spec, G = this.geo, view = motion.view;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.ShadowMaterial({ opacity: 0.38 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const bb = new THREE.Box3();
    for (let i = 0; i <= 40; i++) {
      const { pose, J } = motion.jointsAt((motion.total * i) / 40);
      const P3 = to3D(spec, view, J, pose);
      for (const k in P3) bb.expandByPoint(P3[k]);
      if (spec.ball) {
        const c = spec.ball(J, pose);
        const r = spec.ballR ?? 27;
        bb.expandByPoint(V(c[0] - r, -c[1] - r, 0)).expandByPoint(V(c[0] + r, -c[1] + r, 0));
      }
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
      const m = this.add(G.box, o.color ? this.mat(o.color, 0.35, 0.2) : benchM);
      const back = view === 'front' && o.soft;
      m.position.set(o.x + o.w / 2, -(o.y + o.h / 2), back ? -16 : z0);
      m.scale.set(o.w, o.h, back ? 6 : dep);
      bb.expandByObject(m);
      return;
    }
    const a = V(o.a[0], -o.a[1], 0), b = V(o.b[0], -o.b[1], 0);
    if (Math.abs(a.x - b.x) < 0.5 && Math.max(a.y, b.y) > 100) {
      // pared: alta y ancha por defecto; con dep, un panel más estrecho que no tapa al muñeco
      const m = this.add(G.box, this.mat(this.pal.wall, 0.95));
      const top = Math.max(a.y, b.y), wd = o.dep ?? 140;
      m.position.set(a.x + 4, top / 2, o.dep ? -wd / 2 + 12 : -30);
      m.scale.set(8, top, wd);
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
    const span = this.motion.view === 'top'
      ? Math.max(s.x * 1.12, s.z * cam.aspect * 0.95, 150)
      : Math.max(s.x * 1.08, s.y * cam.aspect * 1.08, s.z * 0.8, 150);
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

  /** Expresión de la cara: concentrado al hacer fuerza, relajado en el descanso, contento al prepararse. */
  mood: Mood = 'neutral';

  /**
   * Coloca el maniquí en el instante `ms` del movimiento.
   * `now` es el reloj real: la respiración, el parpadeo y los pequeños movimientos de cabeza siguen
   * aunque el ejercicio esté en pausa.
   */
  update(ms: number, now: number = performance.now()): void {
    const { motion } = this, P = this.parts, view = motion.view, side = view === 'side', T = view === 'top';
    const { pose, J: J2 } = motion.jointsAt(ms);
    const J = to3D(motion.spec, view, J2, pose);
    if (this.skinned) {
      // de frente y desde arriba (boca arriba) el lado "R" del motor es el izquierdo anatómico
      this.skinned.update(J, !side && !(T && motion.spec.prone), now);
      this.updateDumbbells(J, side);
      this.updateGear(J, J2, pose, side);
      return;
    }
    const lateralAxis = side ? V(0, 0, 1) : T ? V(0, 1, 0) : V(0, 0, 1);
    const sec = now / 1000;

    // Ejes del tronco: arriba, adelante (hacia donde mira el pecho) y lateral (hacia el lado R)
    const tUp = J.neck.clone().sub(J.pel).normalize();
    let fwd = side ? V(tUp.y, -tUp.x, 0) : T ? V(0, motion.spec.prone ? -1 : 1, 0) : V(0, 0, 1);
    fwd = ortho(fwd, tUp);
    const bodyLat = ortho(side ? V(0, 0, 1) : V(1, 0, 0), tUp);

    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? -1 : 1;
      const hip = J['hip' + s], kn = J['kn' + s], an = J['an' + s], ti = J['ti' + s];
      const sho = J['sho' + s], el = J['el' + s], ha = J['ha' + s];

      // Pierna
      const tDir = kn.clone().sub(hip), sDir = an.clone().sub(kn);
      const tLen = tDir.length();
      tDir.normalize();
      // la parte delantera del muslo/rodilla: contraria a donde se dobla la espinilla
      let legFront = sDir.clone().sub(tDir.clone().multiplyScalar(sDir.dot(tDir))).multiplyScalar(-1);
      legFront = legFront.lengthSq() > 4 ? legFront.normalize() : ortho(fwd, tDir);
      const legOut = ortho(bodyLat.clone().multiplyScalar(sg), tDir);
      this.seg(P['ths' + s], hip, kn, 5.1);
      this.seg(P['th' + s], hip, hip.clone().lerp(kn, 0.55), 6.4);
      this.seg(P['hem' + s], hip.clone().lerp(kn, 0.52), hip.clone().lerp(kn, 0.56), 6.5);
      this.oriented(P['sideStripe' + s], hip.clone().lerp(kn, 0.27).addScaledVector(legOut, 6.15), tDir, legOut, tLen * 0.5, 0.6, 1.8);
      this.oriented(P['quad' + s], hip.clone().lerp(kn, 0.66).addScaledVector(legFront, 1.7), tDir, legOut, 7.5, 4.4, 4.2);
      this.seg(P['sh' + s], kn, an, 4.0);
      const sLen = sDir.length();
      sDir.normalize();
      this.oriented(P['calf' + s], kn.clone().lerp(an, 0.32).addScaledVector(ortho(legFront, sDir), -1.8), sDir, legOut, sLen * 0.24, 3.7, 4.1);
      this.ball(P['kn' + s], kn, 4.5);
      this.ball(P['an' + s], an, 3.2);
      this.seg(P['sock' + s], an.clone().lerp(kn, -0.02), an.clone().lerp(kn, 0.17), 3.75);
      // zapatilla con suela y cordones
      const footDir = ti.clone().sub(an);
      if (footDir.lengthSq() < 0.01) footDir.set(1, 0, 0);
      footDir.normalize();
      const fc = an.clone().addScaledVector(footDir, 3.2);
      const shoeUp = ortho(V(0, 1, 0).sub(footDir.clone().multiplyScalar(footDir.y)), footDir);
      this.oriented(P['shoe' + s], fc, footDir, lateralAxis, 6.4, 3.6, 3.4);
      this.oriented(P['sole' + s], fc.clone().addScaledVector(shoeUp, -1.6), footDir, lateralAxis, 6.6, 3.8, 1.4);
      for (const [k, off] of [['lace1', 0.3], ['lace2', 2.4]] as const) {
        this.oriented(P[k + s], fc.clone().addScaledVector(footDir, off).addScaledVector(shoeUp, 3.05), footDir, lateralAxis, 0.6, 2.4, 0.5);
      }

      // Brazo
      const aDir = el.clone().sub(sho), fDir = ha.clone().sub(el);
      aDir.normalize();
      const u = fDir.clone().normalize();
      // interior del codo (donde está el bíceps): hacia donde se dobla el antebrazo
      let inner = fDir.clone().sub(aDir.clone().multiplyScalar(fDir.dot(aDir)));
      inner = inner.lengthSq() > 9 ? inner.normalize() : ortho(fwd, aDir);
      const armOut = ortho(bodyLat.clone().multiplyScalar(sg), aDir);
      this.seg(P['ua' + s], sho, el, 3.8);
      this.oriented(P['bic' + s], sho.clone().lerp(el, 0.58).addScaledVector(inner, 1.5), aDir, armOut, 7, 3.5, 3.4);
      this.oriented(P['tri' + s], sho.clone().lerp(el, 0.5).addScaledVector(inner, -1.4), aDir, armOut, 7.5, 3.4, 3.3);
      this.seg(P['sl' + s], sho, sho.clone().lerp(el, 0.5), 5.2);
      this.seg(P['slStripe' + s], sho.clone().lerp(el, 0.43), sho.clone().lerp(el, 0.49), 5.35);
      this.seg(P['fa' + s], el, ha, 3.2);
      this.oriented(P['fore' + s], el.clone().lerp(ha, 0.3), u, armOut, 6, 3.7, 3.4);
      this.ball(P['el' + s], el, 3.4);
      this.seg(P['wrist' + s], ha.clone().lerp(el, 0.05), ha.clone().lerp(el, 0.15), 3.55);

      // Mano: palma, dedos y pulgar. Sigue al antebrazo; apoyada en el suelo se dobla por la muñeca y queda
      // plana con los dedos hacia delante; si agarra algo, puño cerrado.
      let hu = u.clone();
      let across = side ? V(0, 0, 1) : V(0, 0, 1).cross(u).normalize();
      let thumbSign = sg;
      const support = this.grips ? 0 : Math.min(1, Math.max(0, (13 - ha.y) / 5)) * Math.min(1, Math.max(0, (-u.y - 0.35) / 0.3));
      if (support > 0) {
        // dedos hacia la cabeza o hacia donde mira el cuerpo, en horizontal
        let ahead = bodyLat.clone().cross(V(0, 1, 0));
        ahead.y = 0;
        if (ahead.lengthSq() < 1e-4) ahead = V(1, 0, 0);
        ahead.normalize();
        if (ahead.dot(fwd.clone().add(tUp)) < 0) ahead.negate();
        const target = ahead.multiplyScalar(0.95).add(V(0, -0.3, 0)).normalize();
        hu = u.clone().lerp(target, support).normalize();
        // palma hacia el suelo y pulgar hacia la otra mano
        let flatAcross = V(0, 1, 0).cross(hu).normalize();
        if (flatAcross.clone().cross(hu).y > 0) flatAcross.negate();
        across = across.clone().lerp(flatAcross, support);
        const toOther = J['ha' + (s === 'L' ? 'R' : 'L')].clone().sub(ha);
        const acr = ortho(across, hu);
        if (toOther.lengthSq() > 4 && support > 0.5) thumbSign = Math.sign(acr.dot(toOther)) || sg;
      } else if (!this.grips && ha.y < 13) {
        // antebrazo tumbado en el suelo (plancha de antebrazos): mano boca abajo
        const lying = Math.min(1, Math.max(0, (13 - ha.y) / 5)) * Math.min(1, Math.max(0, (0.45 - Math.abs(u.y)) / 0.2));
        if (lying > 0) {
          hu = u.clone().setY(u.y * (1 - lying)).normalize();
          const flatAcross = V(0, 1, 0).cross(hu).normalize();
          if (flatAcross.clone().cross(hu).y > 0) flatAcross.negate();
          across = across.clone().lerp(flatAcross, lying);
          const toOther = J['ha' + (s === 'L' ? 'R' : 'L')].clone().sub(ha);
          if (toOther.lengthSq() > 4 && lying > 0.5) thumbSign = Math.sign(ortho(across, hu).dot(toOther)) || sg;
        }
      }
      const acrossO = ortho(across, hu);
      const palmN = acrossO.clone().cross(hu).normalize();
      const fist = this.grips;
      this.oriented(P['palm' + s], ha.clone().addScaledVector(hu, 2.5), hu, acrossO, fist ? 2.8 : 3.1, 2.9, fist ? 1.9 : 1.6);
      for (let f = 0; f < 4; f++) {
        const off = (f - 1.5) * 1.35;
        if (fist) {
          // dedos doblados hacia la palma
          const base = ha.clone().addScaledVector(hu, 4.4).addScaledVector(acrossO, off);
          this.seg(P[`fing${f}${s}`], base.clone().addScaledVector(palmN, -0.3), base.clone().addScaledVector(hu, 0.6).addScaledVector(palmN, 2.4), 0.8);
        } else {
          const base = ha.clone().addScaledVector(hu, 4.6).addScaledVector(acrossO, off);
          const len = f === 0 || f === 3 ? 3.1 : 3.7;
          this.seg(P[`fing${f}${s}`], base, base.clone().addScaledVector(hu, len).addScaledVector(palmN, support > 0 ? 0.9 * (1 - support) : 0.9), 0.68);
        }
      }
      const thumbSide = acrossO.clone().multiplyScalar(thumbSign);
      if (fist) {
        this.seg(P['thumb' + s], ha.clone().addScaledVector(hu, 1.6).addScaledVector(thumbSide, 2.4),
          ha.clone().addScaledVector(hu, 3.6).addScaledVector(thumbSide, 0.6).addScaledVector(palmN, 2.2), 0.95);
      } else {
        this.seg(P['thumb' + s], ha.clone().addScaledVector(hu, 1.4).addScaledVector(thumbSide, 2.5),
          ha.clone().addScaledVector(hu, 4.6).addScaledVector(thumbSide, 3.5).addScaledVector(palmN, 0.8), 0.95);
      }
      if (s === 'L') {
        // esfera del reloj sobre la muñeca izquierda
        const wc = ha.clone().lerp(el, 0.1).addScaledVector(palmN, -3.3);
        this.seg(P.watchFace, wc, wc.clone().addScaledVector(palmN, -0.9), 1.9);
      }

      this.ball(P['shoB' + s], sho, 6.2);
      this.ball(P['hipB' + s], hip, 6.5);
    }

    // Tronco con respiración
    const breath = 1 + 0.035 * Math.sin(sec * (2 * Math.PI / 3.8));
    const wC = side ? [8.8, 13.2] : [13.2, 8.8], wB = side ? [6.6, 10.8] : [11, 6.6], wP = side ? [8, 11.5] : [11.4, 8];
    const ell = (mesh: THREE.Mesh, a: V3, b: V3, rx: number, rz: number) => {
      this.seg(mesh, a, b, 1);
      const L = mesh.scale.y;
      mesh.scale.set(rx, L / 2, rz);
    };
    ell(P.chest, J.mid.clone().lerp(J.pel, 0.12), J.neck.clone().lerp(J.mid, -0.08), (T ? wC[1] : wC[0]) * breath, (T ? 9 : wC[1]) * (1 + (breath - 1) * 0.5));
    ell(P.belly, J.pel.clone().lerp(J.mid, 0.3), J.mid.clone().lerp(J.neck, 0.35), T ? wB[1] : wB[0], T ? 6.5 : wB[1]);
    ell(P.pelvis, J.pel.clone().lerp(J.mid, -0.25), J.pel.clone().lerp(J.mid, 0.55), T ? wP[1] : wP[0], T ? 8 : wP[1]);
    const chestC = J.mid.clone().lerp(J.neck, 0.68);
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? -1 : 1;
      this.oriented(P['pec' + s], chestC.clone().addScaledVector(fwd, 5.7 * breath).addScaledVector(bodyLat, 4.9 * sg), tUp, bodyLat, 3.3, 6.2, 2.6);
    }
    this.oriented(P.traps, J.neck.clone().addScaledVector(tUp, -3).addScaledVector(fwd, -1.5), bodyLat, tUp, 9.5, 3.6, 4.6);
    this.oriented(P.glutes, J.pel.clone().addScaledVector(fwd, -4.6).addScaledVector(tUp, -1.5), bodyLat, tUp, 10.5, 6, 5);

    // Cabeza con pequeños movimientos naturales
    const up0 = J.head.clone().sub(J.neck).normalize();
    let face0 = side ? V(up0.y, -up0.x, 0) : T ? V(0, motion.spec.prone ? -1 : 1, 0) : V(0, 0, 1);
    face0 = ortho(face0, up0);
    const lat0 = up0.clone().cross(face0).normalize();
    const up = up0.clone()
      .addScaledVector(face0, 0.035 * Math.sin(sec * 0.9))
      .addScaledVector(lat0, 0.03 * Math.sin(sec * 0.63 + 1.3))
      .normalize();
    const face = ortho(face0, up);
    const lat = up.clone().cross(face).normalize();
    const head = J.neck.clone().addScaledVector(up, 14);
    this.seg(P.neck, J.neck.clone().addScaledVector(up0, -3), J.neck.clone().addScaledVector(up0, 6), 3.4);
    // cuello de la camiseta
    this.ringAround(P.collar, J.neck.clone().addScaledVector(tUp, -1.2), tUp, 4.6);
    this.oriented(P.head, head, up, lat, 10, 8.6, 9.2);
    this.oriented(P.jaw, head.clone().addScaledVector(up, -4.2).addScaledVector(face, 3.4), up, lat, 4.6, 5.4, 5.6);

    // Cara: parpadeo, cejas y boca según la expresión
    const blinkT = (now + this.blinkOffset) % 4300;
    const blink = blinkT < 140 ? 0.12 : 1;
    const mood = this.mood;
    const browH = mood === 'effort' ? 3.6 : mood === 'happy' ? 4.5 : 4.1;
    const browTilt = mood === 'effort' ? 0.45 : mood === 'happy' ? -0.15 : 0;
    for (const s of ['L', 'R']) {
      const sg = s === 'L' ? -1 : 1;
      this.oriented(P['ear' + s], head.clone().addScaledVector(lat, 8.5 * sg).addScaledVector(face, -0.5).addScaledVector(up, -0.5), up, face, 2.6, 1.8, 1.1);
      const eye = head.clone().addScaledVector(face, 7.6).addScaledVector(up, 1.4).addScaledVector(lat, 3.1 * sg);
      const squint = mood === 'effort' ? 0.75 : mood === 'happy' ? 0.85 : 1;
      this.oriented(P['eye' + s], eye, up, lat, 1.55 * blink * squint, 1.55, 1.55);
      this.oriented(P['pupil' + s], eye.clone().addScaledVector(face, 1.05), up, lat, 0.85 * Math.max(blink, 0.3) * squint, 0.85, 0.85);
      const browAlong = lat.clone().addScaledVector(up, sg * browTilt);
      this.oriented(P['brow' + s], head.clone().addScaledVector(face, 7.9).addScaledVector(up, browH).addScaledVector(lat, 3.2 * sg), browAlong, up, 1.7, 0.55, 0.6);
    }
    this.oriented(P.nose, head.clone().addScaledVector(face, 9.3).addScaledVector(up, -1.2), up, lat, 2.0, 1.3, 1.6);
    const mouthAt = head.clone().addScaledVector(face, 8.3).addScaledVector(up, -4.9);
    P.mouthFlat.visible = mood === 'effort';
    P.mouthSmile.visible = mood !== 'effort';
    if (mood === 'effort') {
      this.oriented(P.mouthFlat, mouthAt, lat, up, 2.7, 0.55, 0.6);
    } else {
      const R = mood === 'happy' ? 2.7 : mood === 'relaxed' ? 2.3 : 2.0;
      const curve = mood === 'neutral' ? 0.6 : 1;
      this.smileAt(P.mouthSmile, mouthAt.clone().addScaledVector(up, R * curve), lat, up, face, R, curve);
    }

    this.updateDumbbells(J, side);
    this.updateGear(J, J2, pose, side);
  }

  /** Pesa rusa, barra, bandas, fitball, comba y rueda: se crean una vez y se colocan en cada instante. */
  private gear: Record<string, THREE.Mesh[]> = {};
  private bandFrom?: V3;
  private buildGear(): void {
    const spec = this.motion.spec, G = this.geo;
    const iron = this.mat('#2E3440', 0.45, 0.35), steel = this.mat(this.pal.iron, 0.3, 0.4);
    const many = (n: number, g: THREE.BufferGeometry, m: THREE.Material) => Array.from({ length: n }, () => this.add(g, m));
    if (spec.kb) for (const h of spec.kb === 'both' ? ['L', 'R'] : [spec.kb]) this.gear['kb' + h] = [this.add(G.sph, iron), this.add(G.ring, iron)];
    if (spec.bar) this.gear.bar = [this.add(G.cyl, steel), ...many(4, G.cyl, iron)];
    if (spec.band) this.gear.band = many(2, G.cyl, this.mat(this.pal.band, 0.55));
    if (spec.ball) this.gear.ball = [this.add(G.sph, this.mat('#4F7DF0', 0.35))];
    if (spec.rope) {
      // comba de color vivo y algo brillante para que se vea sobre el fondo oscuro y sobre el cuerpo
      const rm = this.mat('#FF2E88', 0.4);
      rm.emissive = new THREE.Color('#FF2E88');
      rm.emissiveIntensity = 0.45;
      this.gear.rope = many(24, G.cyl, rm);
    }
    if (spec.wheel) this.gear.wheel = [this.add(G.cyl, iron), this.add(G.cyl, steel)];
    if (typeof spec.band === 'function') {
      const J0 = this.motion.place(this.motion.poseAt(0));
      const p = spec.band(J0);
      this.bandFrom = V(p[0], -p[1], 0);
    }
  }
  private updateGear(J: Record<string, V3>, J2: Record<string, [number, number]>, pose: Record<string, number>, side: boolean): void {
    const spec = this.motion.spec, g = this.gear;
    const grip = (h: 'L' | 'R') => {
      const u = J['ha' + h].clone().sub(J['el' + h]).normalize();
      return J['ha' + h].clone().addScaledVector(u, this.skinned ? 5.2 : 3.4);
    };
    for (const h of ['L', 'R'] as const) {
      const kb = g['kb' + h];
      if (!kb) continue;
      // con las dos manos (kb: 'both' en una sola pesa) se agarra por el centro
      const c = spec.kb === 'both' && h === 'R' ? null : spec.kb === 'both' ? grip('L').lerp(grip('R'), 0.5) : grip(h);
      kb.forEach((m) => (m.visible = !!c));
      if (!c) continue;
      kb[1].position.copy(c).add(V(0, -1.5, 0));
      kb[1].scale.setScalar(3.6);
      kb[1].rotation.set(0, side ? Math.PI / 2 : 0, 0);
      kb[0].position.copy(c).add(V(0, -8.5, 0));
      kb[0].scale.set(6.2, 5.8, 6.2);
    }
    if (g.bar) {
      const a = grip('L'), b = grip('R'), c = a.clone().lerp(b, 0.5);
      let ax = b.clone().sub(a);
      if (ax.lengthSq() < 1) ax = side ? V(0, 0, 1) : V(1, 0, 0);
      ax.normalize();
      const end = (k: number) => c.clone().addScaledVector(ax, k);
      this.seg(g.bar[0], end(-62), end(62), 1.2);
      [[-48, -44], [-44, -40], [40, 44], [44, 48]].forEach(([p, q], i) => this.seg(g.bar[1 + i], end(p), end(q), i === 0 || i === 3 ? 9 : 12));
    }
    if (g.band) {
      const pairs: Array<[V3, V3]> =
        spec.band === 'hands' ? [[grip('L'), grip('R')]]
        : spec.band === 'knees' ? [[J.knL, J.knR]]
        : spec.band === 'ankles' ? [[J.anL, J.anR]]
        : spec.band === 'bar' ? [[grip('L'), J.knR.clone().add(V(0, -3, 0))], [grip('R'), J.knR.clone().add(V(0, -3, 0))]]
        : spec.band === 'feet' ? [[grip('L'), J.anL.clone().add(V(0, -2, 0))], [grip('R'), J.anR.clone().add(V(0, -2, 0))]]
        : this.bandFrom ? [[this.bandFrom, grip('L')], [this.bandFrom, grip('R')]] : [];
      g.band.forEach((m, i) => {
        m.visible = !!pairs[i];
        if (pairs[i]) this.seg(m, pairs[i][0], pairs[i][1], 0.9);
      });
    }
    if (g.ball && spec.ball) {
      const p = spec.ball(J2, pose);
      g.ball[0].position.set(p[0], -p[1], 0);
      g.ball[0].scale.setScalar(spec.ballR ?? 27);
    }
    if (g.rope) {
      // comba: curva de una mano a la otra que pasa por un punto que gira alrededor del cuerpo
      const a = grip('L'), b = grip('R'), mid = a.clone().lerp(b, 0.5);
      const ang = ((pose.rp ?? 0) * Math.PI) / 180;
      const fwd = side ? V(1, 0, 0) : V(0, 0, 1);
      const top = J.head.y + 14, bottom = 0.6;
      const cy = (top + bottom) / 2, ry = (top - bottom) / 2;
      const P = V(mid.x, cy, mid.z).addScaledVector(fwd, 30 * Math.cos(ang));
      P.y = cy - ry * Math.sin(ang);
      const C = P.clone().multiplyScalar(2).sub(a.clone().add(b).multiplyScalar(0.5));
      const pt = (t: number) => a.clone().multiplyScalar((1 - t) ** 2).add(C.clone().multiplyScalar(2 * t * (1 - t))).add(b.clone().multiplyScalar(t * t));
      g.rope.forEach((m, i) => this.seg(m, pt(i / g.rope.length), pt((i + 1) / g.rope.length), 0.9));
    }
    if (g.wheel) {
      const c = grip('L').lerp(grip('R'), 0.5).add(V(0, -4, 0));
      const ax = side ? V(0, 0, 1) : V(1, 0, 0);
      this.seg(g.wheel[0], c.clone().addScaledVector(ax, -3.5), c.clone().addScaledVector(ax, 3.5), 9);
      this.seg(g.wheel[1], c.clone().addScaledVector(ax, -14), c.clone().addScaledVector(ax, 14), 1.1);
    }
  }

  private updateDumbbells(J: Record<string, V3>, side: boolean): void {
    for (const d of this.dumbbells) {
      if (d.hand === 'two') {
        // una sola mancuerna entre las dos manos, de pie a lo largo de los antebrazos
        const gL = J.haL.clone().addScaledVector(J.haL.clone().sub(J.elL).normalize(), this.skinned ? 4.5 : 3);
        const gR = J.haR.clone().addScaledVector(J.haR.clone().sub(J.elR).normalize(), this.skinned ? 4.5 : 3);
        const u = J.haL.clone().sub(J.elL).add(J.haR.clone().sub(J.elR)).normalize();
        const c = gL.lerp(gR, 0.5).addScaledVector(u, 2);
        const a = c.clone().addScaledVector(u, -8), b = c.clone().addScaledVector(u, 8);
        this.seg(d.bar, a, b, 1.3);
        this.seg(d.p1, a.clone().addScaledVector(u, -1.6), a.clone().addScaledVector(u, 1.6), 5);
        this.seg(d.p2, b.clone().addScaledVector(u, -1.6), b.clone().addScaledVector(u, 1.6), 5);
        continue;
      }
      const h = J['ha' + d.hand], u = h.clone().sub(J['el' + d.hand]).normalize();
      const grip = h.clone().addScaledVector(u, this.skinned ? 5.2 : 3.4);
      // martillo: la mancuerna de canto, perpendicular al antebrazo en el plano del movimiento
      const ax = this.motion.spec.hammer && side ? V(-u.y, u.x, 0).normalize() : side ? V(0, 0, 1) : V(-u.y, u.x, 0).normalize();
      const a = grip.clone().addScaledVector(ax, -8), b = grip.clone().addScaledVector(ax, 8);
      this.seg(d.bar, a, b, 1.3);
      this.seg(d.p1, a.clone().addScaledVector(ax, -1.6), a.clone().addScaledVector(ax, 1.6), 5);
      this.seg(d.p2, b.clone().addScaledVector(ax, -1.6), b.clone().addScaledVector(ax, 1.6), 5);
    }
  }

  /** Anillo plano alrededor de un eje (cuello de la camiseta). */
  private ringAround(mesh: THREE.Object3D, center: V3, axis: V3, r: number): void {
    mesh.position.copy(center);
    mesh.quaternion.setFromUnitVectors(V(0, 0, 1), axis.clone().normalize());
    mesh.scale.set(r, r, r);
  }

  /** Sonrisa: arco de toro en el plano de la cara, con la parte baja en `center - up·R`. */
  private smileAt(mesh: THREE.Object3D, center: V3, lat: V3, up: V3, face: V3, R: number, curve: number): void {
    const basis = new THREE.Matrix4().makeBasis(lat, up, face);
    mesh.quaternion.setFromRotationMatrix(basis);
    mesh.rotateZ(-Math.PI / 2 - SMILE_ARC / 2);
    mesh.position.copy(center);
    mesh.scale.set(R, R * curve, R);
  }

  dispose(): void {
    this.skinned?.dispose();
    this.disposables.forEach((d) => d.dispose());
    Object.values(this.geo).forEach((g) => g.dispose());
  }
}
