/* Motor de posturas.
   Cada ejercicio describe su movimiento con fotogramas de ángulos absolutos en grados
   (0 = adelante/derecha, 90 = abajo, -90 = arriba) en un plano 2D. En vista lateral la figura mira a la derecha;
   "L" es el lado lejano y "R" el cercano. El suelo está en y = 0 y hacia arriba es negativo.
   El maniquí 3D (Mannequin.ts) convierte estas articulaciones a 3D. */
import type { MotionSpec, PropHelpers, PropOp } from '../domain/types';

export type Pt = [number, number];
export type Joints = Record<string, Pt>;
export type Pose = Record<string, number>;

const D = Math.PI / 180;
const dir = (a: number): Pt => [Math.cos(a * D), Math.sin(a * D)];
const add = (p: Pt, v: Pt, l: number): Pt => [p[0] + v[0] * l, p[1] + v[1] * l];
// curva de "mínimo tirón": arranca y frena con suavidad, como un movimiento humano
const ease = (x: number) => x * x * x * (10 + x * (6 * x - 15));
const PAIRS = ['ua', 'fa', 'th', 'sn', 'ft', 'sa', 'sTh', 'sSh', 'zE', 'zH', 'zK', 'zA'];

/** Media anchura de hombros (de frente), igual que el cuerpo del maniquí. */
export const SHOULDER = 15;
/** Distancia de la base del cuello a la altura de los hombros. */
export const SHOULDER_DROP = 8;

export const LEN = { torso: 24, neck: 14, ua: 21, fa: 20.5, th: 34, sh: 33 };

function base(v: string): Pose {
  return {
    x: 0, jy: 0, rp: 0, bp: 0, shu: 0, shf: 0, tw: 0, lean: 0, zEL: 0, zER: 0, zHL: 0, zHR: 0, zKL: 0, zKR: 0, zAL: 0, zAR: 0, tl: -90,
    // brazos colgando relajados: de frente, un poco separados del cuerpo
    uaL: v === 'front' ? 97 : 90, faL: v === 'front' ? 94 : 90, uaR: v === 'front' ? 83 : 90, faR: v === 'front' ? 86 : 90, thL: 90, snL: 90, thR: 90, snR: 90,
    ftL: v === 'side' ? 0 : 150, ftR: v === 'side' ? 0 : 30, saL: 1, saR: 1, sThL: 1, sThR: 1, sShL: 1, sShR: 1,
  };
}

function resolve(v: string, p: Pose): Pose {
  const q: Pose = { ...p };
  for (const k of PAIRS) {
    if (k in q) {
      if (!(k + 'L' in q)) q[k + 'L'] = q[k];
      if (!(k + 'R' in q)) q[k + 'R'] = q[k];
      delete q[k];
    }
  }
  const o = { ...base(v), ...q };
  if (o.tu == null) o.tu = o.tl;
  if (o.hd == null) o.hd = o.tu;
  return o;
}

export function joints(v: string, o: Pose): Joints {
  const J: Joints = {};
  J.pel = [o.x, 0];
  J.mid = add(J.pel, dir(o.tl), LEN.torso);
  J.neck = add(J.mid, dir(o.tu), LEN.torso);
  J.head = add(J.neck, dir(o.hd), LEN.neck);
  // articulación del hombro: bastante por debajo de la base del cuello, como en el cuerpo real
  // shu / shf: hombros más arriba / más adelante (rotaciones de hombros, encogimientos)
  const sc = add(add(J.neck, dir(o.tu), -SHOULDER_DROP + (o.shu ?? 0)), dir(o.tu + 90), o.shf ?? 0);
  if (v === 'side') {
    J.shoL = sc; J.shoR = sc; J.hipL = J.pel; J.hipR = J.pel;
  } else {
    const n = dir(o.tu + 90), m = dir(o.tl + 90);
    J.shoL = add(sc, n, -SHOULDER); J.shoR = add(sc, n, SHOULDER); J.hipL = add(J.pel, m, -8); J.hipR = add(J.pel, m, 8);
  }
  const fl = v === 'side' ? 9 : 6;
  for (const s of ['L', 'R']) {
    J['el' + s] = add(J['sho' + s], dir(o['ua' + s]), LEN.ua * o['sa' + s]);
    J['ha' + s] = add(J['el' + s], dir(o['fa' + s]), LEN.fa * o['sa' + s]);
    J['kn' + s] = add(J['hip' + s], dir(o['th' + s]), LEN.th * o['sTh' + s]);
    J['an' + s] = add(J['kn' + s], dir(o['sn' + s]), LEN.sh * o['sSh' + s]);
    J['ti' + s] = add(J['an' + s], dir(o['ft' + s]), fl);
  }
  return J;
}

/** Pone la mano en `T` doblando el codo (el codo, del mismo lado que estaba). Si no llega, brazo estirado hacia ella. */
function handOnFloor(J: Joints, s: 'L' | 'R', T: Pt, a: number, b: number, side: boolean): void {
  const S = J['sho' + s], E0 = J['el' + s];
  const dx = T[0] - S[0], dy = T[1] - S[1];
  const d = Math.hypot(dx, dy);
  if (d < 1e-6) return;
  const ux = dx / d, uy = dy / d;
  if (d >= a + b - 1e-6) {
    J['el' + s] = [S[0] + ux * a, S[1] + uy * a];
    J['ha' + s] = [S[0] + ux * (a + b), S[1] + uy * (a + b)];
    return;
  }
  const along = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - along * along));
  const mx = S[0] + ux * along, my = S[1] + uy * along;
  const e1: Pt = [mx - uy * h, my + ux * h], e2: Pt = [mx + uy * h, my - ux * h];
  // el codo, del lado donde ya estaba doblado; con el brazo casi recto, hacia atrás (de lado) o hacia fuera (de frente)
  const sideOf = (p: Pt) => (p[0] - S[0]) * uy - (p[1] - S[1]) * ux;
  const s0 = sideOf(E0);
  let pick: Pt;
  if (Math.abs(s0) > 1.5) pick = Math.sign(sideOf(e1)) === Math.sign(s0) ? e1 : e2;
  else {
    const far = (p: Pt) => Math.abs(p[0] - J.pel[0]);
    pick = side ? (far(e1) < far(e2) ? e1 : e2) : (far(e1) > far(e2) ? e1 : e2);
  }
  J['el' + s] = pick;
  J['ha' + s] = [T[0], T[1]];
}

function lerp(a: Pose, b: Pose, k: number): Pose {
  const o: Pose = {};
  for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

export const PROPS: PropHelpers = {
  benchFlat: (x1, x2, h = 34) => [
    { t: 'rect', x: x1, y: -h, w: x2 - x1, h: 6 },
    { t: 'line', a: [x1 + 6, -h + 5], b: [x1 + 6, 0], w: 4 },
    { t: 'line', a: [x2 - 6, -h + 5], b: [x2 - 6, 0], w: 4 },
  ],
  line: (a, b, w = 6, soft) => [{ t: 'line', a, b, w, soft }],
  wall: (x, h = 150, dep) => [{ t: 'line', a: [x, 0], b: [x, -h], w: 5, dep }],
  rect: (x, y, w, h, soft) => [{ t: 'rect', x, y, w, h, soft }],
};

const ANGLES = ['tl', 'tu', 'hd', 'uaL', 'uaR', 'faL', 'faR', 'thL', 'thR', 'snL', 'snR', 'ftL', 'ftR'];
const swapSide = (k: string) => (k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k);

/** Postura del otro lado: en vista lateral se intercambian brazo/pierna cercanos y lejanos; de frente, además se refleja. */
function mirrorPose(view: string, p: Pose): Pose {
  const o: Pose = {};
  for (const k in p) o[swapSide(k)] = p[k];
  if (view !== 'side') {
    for (const k of ANGLES) if (k in o) o[k] = 180 - o[k];
    o.x = -o.x;
    if ('tw' in o) o.tw = -o.tw;
  }
  return o;
}

/** Lado que se muestra en un ejercicio por lados: 1, 2 o ambos alternando (undefined). */
export type Side = 1 | 2 | undefined;

/** Un movimiento listo para consultar la postura en cualquier instante. */
export class Motion {
  readonly view: 'side' | 'front' | 'top';
  readonly total: number;
  private frames: Array<{ p: Pose; h: number; d: number }> = [];
  private plantX = 0;
  /** Lado 2 obtenido reflejando el lado 1. */
  readonly mirrored: boolean;
  private readonly plant?: string;
  private readonly anchor?: { j: string; y: number };
  /** Manos fijas en el suelo: dónde está cada una (x) y a qué altura queda la muñeca. */
  private handsAt?: { L: number; R: number; y: number };

  constructor(readonly spec: MotionSpec, readonly side: Side = undefined) {
    this.view = spec.v ?? 'side';
    // Ejercicios con los dos lados en sus fotogramas (split): cada mitad es un lado. El resto se refleja para el lado 2.
    this.mirrored = side === 2 && !spec.split;
    this.plant = spec.plant && (this.mirrored ? swapSide(spec.plant) : spec.plant);
    this.anchor = spec.anchor && (this.mirrored ? { ...spec.anchor, j: swapSide(spec.anchor.j) } : spec.anchor);
    if (spec.fn) this.total = spec.per ?? 2000;
    else {
      let f = spec.f ?? [[{}]];
      if (side && spec.split) f = side === 1 ? f.slice(0, f.length / 2) : f.slice(f.length / 2);
      this.frames = f.map(([p, h, d]) => {
        const r = resolve(this.view, p);
        return { p: this.mirrored ? mirrorPose(this.view, r) : r, h: h ?? 300, d: d ?? 800 };
      });
      this.total = this.frames.reduce((s, x) => s + x.h + x.d, 0);
    }
    if (this.plant) this.plantX = joints(this.view, this.poseAt(0))[this.plant][0];
    if (spec.handsDown) {
      const J0 = this.place(this.poseAt(0));
      this.handsAt = { L: J0.haL[0], R: J0.haR[0], y: -(spec.handsDown === true ? 3.5 : spec.handsDown) };
    }
  }

  poseAt(ms: number): Pose {
    const T = this.total;
    if (this.spec.fn) {
      const r = resolve(this.view, this.spec.fn((((ms % T) + T) % T) / T));
      return this.mirrored ? mirrorPose(this.view, r) : r;
    }
    let t = ((ms % T) + T) % T;
    const F = this.frames, n = F.length;
    for (let i = 0; i < n; i++) {
      const f = F[i];
      if (t < f.h) return f.p;
      t -= f.h;
      if (t < f.d) return lerp(f.p, F[(i + 1) % n].p, ease(t / f.d));
      t -= f.d;
    }
    return F[0].p;
  }

  /** Articulaciones colocadas sobre el suelo (o el apoyo indicado). */
  place(pose: Pose): Joints {
    const J = joints(this.view, pose);
    let dx = 0, dy = 0;
    if (this.plant) dx = this.plantX - J[this.plant][0];
    if (this.anchor) dy = this.anchor.y - J[this.anchor.j][1];
    else if (this.view !== 'top') {
      // la cabeza, la pelvis y el pecho tienen grosor: no pueden quedar hundidos en el suelo (tumbado)
      let m = Math.max(J.head[1] + 10.5, J.pel[1] + 10.5, J.mid[1] + 10.5);
      for (const k in J) if (k !== 'head') m = Math.max(m, J[k][1]);
      dy = -2.6 - m;
    }
    // jy: salto (el cuerpo entero sube esa altura sobre su apoyo)
    dy -= pose.jy ?? 0;
    for (const k in J) J[k] = [J[k][0] + dx, J[k][1] + dy];
    if (this.handsAt) {
      const hy = this.handsAt.y;
      for (const s of ['L', 'R'] as const) {
        if (this.spec.handsDownSide && this.spec.handsDownSide !== (this.mirrored ? (s === 'L' ? 'R' : 'L') : s)) continue;
        // solo la mano que está cerca del suelo; la que se levanta (toques de hombro, apertura en T...) va libre
        const H = J['ha' + s], w = Math.min(1, Math.max(0, (H[1] - (hy - 16)) / 8));
        if (w <= 0) continue;
        const T: Pt = [this.spec.handsSlide ? H[0] : H[0] + (this.handsAt[s] - H[0]) * w, H[1] + (hy - H[1]) * w];
        handOnFloor(J, s, T, LEN.ua * pose['sa' + s], LEN.fa * pose['sa' + s], this.view === 'side');
      }
    }
    return J;
  }

  jointsAt(ms: number): { pose: Pose; J: Joints } {
    const pose = this.poseAt(ms);
    return { pose, J: this.place(pose) };
  }

  /** Accesorios (banco, pared...). Se calculan con el lado original y se reflejan si hace falta. */
  props(): PropOp[] {
    if (!this.spec.props) return [];
    if (!this.mirrored) return this.spec.props(this.place(this.poseAt(0)), PROPS);
    const base = new Motion(this.spec);
    const ops = this.spec.props(base.place(base.poseAt(0)), PROPS);
    if (this.view === 'side') return ops.map((o) => ({ ...o, z: -(o.z ?? 0) }));
    return ops.map((o) =>
      o.t === 'rect' ? { ...o, x: -(o.x + o.w) } : { ...o, a: [-o.a[0], o.a[1]] as Pt, b: [-o.b[0], o.b[1]] as Pt },
    );
  }
}
