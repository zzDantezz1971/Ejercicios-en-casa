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
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
const PAIRS = ['ua', 'fa', 'th', 'sn', 'ft', 'sa', 'sTh', 'sSh'];

export const LEN = { torso: 24, neck: 14, ua: 26, fa: 24, th: 34, sh: 33 };

function base(v: string): Pose {
  return {
    x: 0, tl: -90, uaL: 90, faL: 90, uaR: 90, faR: 90, thL: 90, snL: 90, thR: 90, snR: 90,
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
  const sc = add(J.neck, dir(o.tu), -3);
  if (v === 'side') {
    J.shoL = sc; J.shoR = sc; J.hipL = J.pel; J.hipR = J.pel;
  } else {
    const n = dir(o.tu + 90), m = dir(o.tl + 90);
    J.shoL = add(sc, n, -12); J.shoR = add(sc, n, 12); J.hipL = add(J.pel, m, -8); J.hipR = add(J.pel, m, 8);
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
  wall: (x) => [{ t: 'line', a: [x, 0], b: [x, -150], w: 5 }],
  rect: (x, y, w, h, soft) => [{ t: 'rect', x, y, w, h, soft }],
};

/** Un movimiento listo para consultar la postura en cualquier instante. */
export class Motion {
  readonly view: 'side' | 'front' | 'top';
  readonly total: number;
  private frames: Array<{ p: Pose; h: number; d: number }> = [];
  private plantX = 0;

  constructor(readonly spec: MotionSpec) {
    this.view = spec.v ?? 'side';
    if (spec.fn) this.total = spec.per ?? 2000;
    else {
      this.frames = (spec.f ?? [[{}]]).map(([p, h, d]) => ({ p: resolve(this.view, p), h: h ?? 300, d: d ?? 800 }));
      this.total = this.frames.reduce((s, f) => s + f.h + f.d, 0);
    }
    if (spec.plant) this.plantX = joints(this.view, this.poseAt(0))[spec.plant][0];
  }

  poseAt(ms: number): Pose {
    const T = this.total;
    if (this.spec.fn) return resolve(this.view, this.spec.fn((((ms % T) + T) % T) / T));
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
    const s = this.spec;
    if (s.plant) dx = this.plantX - J[s.plant][0];
    if (s.anchor) dy = s.anchor.y - J[s.anchor.j][1];
    else if (this.view !== 'top') {
      let m = J.head[1] + 10.5;
      for (const k in J) if (k !== 'head') m = Math.max(m, J[k][1]);
      dy = -2.6 - m;
    }
    for (const k in J) J[k] = [J[k][0] + dx, J[k][1] + dy];
    return J;
  }

  jointsAt(ms: number): { pose: Pose; J: Joints } {
    const pose = this.poseAt(ms);
    return { pose, J: this.place(pose) };
  }

  props(): PropOp[] {
    return this.spec.props ? this.spec.props(this.place(this.poseAt(0)), PROPS) : [];
  }
}
