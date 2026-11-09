import { tr } from '../i18n';
import * as THREE from 'three';
import type { SkinData } from './SkinnedFigure';

/* Maniquí "anatomía": el cuerpo realista en gris con los músculos del ejercicio coloreados
   (rojo = trabaja, turquesa = se estira). Las zonas se calculan en la postura de reposo,
   así se mueven con la piel. */

export const MUSCLES = ['pecho', 'abdominales', 'oblicuos', 'lumbar', 'espalda', 'trapecio', 'gluteos', 'deltoides', 'biceps',
  'triceps', 'antebrazo', 'cuadriceps', 'isquios', 'aductores', 'gemelos', 'cuello'] as const;
export type Muscle = (typeof MUSCLES)[number];

const MUSCLE_NAMES_ES: Record<Muscle, string> = {
  pecho: 'Pecho', abdominales: 'Abdominales', oblicuos: 'Oblicuos', lumbar: 'Zona lumbar', espalda: 'Espalda (dorsales)',
  trapecio: 'Trapecio', gluteos: 'Glúteos', deltoides: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', antebrazo: 'Antebrazos',
  cuadriceps: 'Cuádriceps', isquios: 'Isquiotibiales', aductores: 'Aductores', gemelos: 'Gemelos', cuello: 'Cuello',
};
/** Nombre de cada músculo en el idioma en uso. */
export const MUSCLE_NAMES = Object.fromEntries(Object.entries(MUSCLE_NAMES_ES).map(([k, v]) => [k, tr(v)])) as Record<Muscle, string>;

export interface MuscleToken { muscle: Muscle; kind: 'work' | 'work2' | 'stretch'; side?: 'L' | 'R' }

/** Lee "+biceps ~antebrazo -cuadriceps@R". */
export function parseMuscles(spec: string | undefined): MuscleToken[] {
  if (!spec) return [];
  return spec.trim().split(/\s+/).map((tok) => {
    const kind = tok[0] === '+' ? 'work' : tok[0] === '~' ? 'work2' : 'stretch';
    const [m, side] = tok.slice(1).split('@');
    return { muscle: m as Muscle, kind, side: side as 'L' | 'R' | undefined };
  });
}

/** Peso de cada músculo en cada lado del cuerpo (+1 trabaja, +0.55 secundario, -1 se estira). */
export function muscleWeights(spec: string | undefined, side: 1 | 2 | undefined): { L: number[]; R: number[] } {
  const L = MUSCLES.map(() => 0), R = MUSCLES.map(() => 0);
  for (const t of parseMuscles(spec)) {
    const i = MUSCLES.indexOf(t.muscle);
    if (i < 0) continue;
    const v = t.kind === 'work' ? 1 : t.kind === 'work2' ? 0.55 : -1;
    // lado 2: el lado del cuerpo se cambia; sin lado concreto (fichas): los dos
    const s = t.side && side ? (side === 2 ? (t.side === 'L' ? 'R' : 'L') : t.side) : undefined;
    if (!s || s === 'L') L[i] = v;
    if (!s || s === 'R') R[i] = v;
  }
  return { L, R };
}

function b64(s: string): Uint8Array {
  const b = atob(s);
  const o = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) o[i] = b.charCodeAt(i);
  return o;
}

const N = MUSCLES.length;

/** Material del maniquí anatomía. */
export function anatomyMaterial(g: THREE.BufferGeometry, d: SkinData, w: { L: number[]; R: number[] }): THREE.Material {
  if (!g.getAttribute('aPart') && d.part) g.setAttribute('aPart', new THREE.BufferAttribute(Float32Array.from(b64(d.part)), 1));
  const P = (k: string, i: 0 | 1) => new THREE.Vector3(...(d.rest[k][i] as [number, number, number]));
  const uniforms = {
    uWL: { value: w.L }, uWR: { value: w.R },
    uShoL: { value: P('uaL', 0) }, uShoR: { value: P('uaR', 0) }, uElL: { value: P('uaL', 1) }, uElR: { value: P('uaR', 1) },
    uWrL: { value: P('faL', 1) }, uWrR: { value: P('faR', 1) },
    uHipL: { value: P('thL', 0) }, uHipR: { value: P('thR', 0) }, uKnL: { value: P('thL', 1) }, uKnR: { value: P('thR', 1) },
    uAnL: { value: P('shL', 1) }, uAnR: { value: P('shR', 1) },
    uWaistY: { value: d.clothes?.waistY ?? 15 }, uShortT: { value: d.clothes?.shortsT ?? 0.16 },
  };
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart;\nvarying vec3 vRest;\nflat varying float vPart;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;\nvPart = aPart;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vRest;
flat varying float vPart;
uniform float uWL[${N}], uWR[${N}];
uniform vec3 uShoL, uShoR, uElL, uElR, uWrL, uWrR, uHipL, uHipR, uKnL, uKnR, uAnL, uAnR;
uniform float uWaistY, uShortT;
vec3 gHi;
float band(float v, float a, float b, float s) { return smoothstep(a - s, a + s, v) * (1.0 - smoothstep(b - s, b + s, v)); }
float along(vec3 p, vec3 a, vec3 dir) { return dot(p - a, dir) / dot(dir, dir); }
vec3 radial(vec3 p, vec3 a, vec3 dir) { float t = along(p, a, dir); return normalize(p - (a + dir * t) + vec3(1e-4)); }
// elipse suave en el plano x-y del tronco (1 dentro, 0 fuera)
float ell(vec2 p, vec2 c, vec2 r) { return 1.0 - smoothstep(0.72, 1.0, length((p - c) / r)); }
// huso a lo largo de un hueso: ancho en el centro, estrecho en los extremos; d = orientación (1 = centro del músculo)
float spindle(float t, float a, float b, float d, float wide) {
  float s = clamp((t - a) / (b - a), 0.0, 1.0);
  float prof = sin(3.14159 * s);
  float cov = mix(0.15, wide, prof);
  return smoothstep(0.0, 0.25, prof) * smoothstep(1.0 - 2.0 * cov - 0.2, 1.0 - 2.0 * cov + 0.2, d);
}
vec3 anatomy() {
  int part = int(floor(vPart + 0.5));
  vec3 p = vRest;
  gHi = vec3(0.0);
  if (part == 7) return vec3(0.55, 0.47, 0.5);
  if (part == 5) return vec3(0.95);
  float m[${N}];
  for (int i = 0; i < ${N}; i++) m[i] = 0.0;
  float ax = abs(p.x);
  vec2 q = vec2(ax, p.y);
  float front = smoothstep(-0.5, 2.5, p.z - 1.0), back = smoothstep(0.5, -2.5, p.z - 1.0);
  float lines = 0.0;
  bool shorts = false;
  // lado del cuerpo: 1 = izquierdo (x > 0), 0 = derecho
  float sideL = smoothstep(-1.5, 1.5, p.x);
  // hombro (deltoides): casquete alrededor de la articulación, en tronco y brazo
  float dl = 1.0 - smoothstep(5.5, 8.0, min(distance(p, uShoL), distance(p, uShoR)));
  if (part == 0) {
    m[0] = ell(q, vec2(8.0, 45.5), vec2(8.5, 5.8)) * front;
    float abs6 = pow(pow(ax / 6.8, 4.0) + pow(abs(p.y - 27.0) / 12.0, 4.0), 0.25);
    m[1] = (1.0 - smoothstep(0.8, 1.0, abs6)) * front;
    // separaciones de la "tableta"
    lines = m[1] * max(1.0 - smoothstep(0.0, 0.45, ax), max(1.0 - smoothstep(0.0, 0.5, abs(p.y - 23.0)), max(1.0 - smoothstep(0.0, 0.5, abs(p.y - 29.0)), 1.0 - smoothstep(0.0, 0.5, abs(p.y - 34.5)))));
    m[2] = ell(q, vec2(11.8, 26.0), vec2(4.8, 10.5)) * smoothstep(-4.0, 0.0, p.z);
    m[3] = ell(q, vec2(3.4, 21.0), vec2(3.3, 9.5)) * back;
    m[4] = ell(q, vec2(9.0 + (p.y - 38.0) * 0.12, 38.0), vec2(6.8, 10.5)) * back;
    m[5] = (1.0 - smoothstep(0.85, 1.0, ax / 12.5 + abs(p.y - 52.5) / 7.5)) * smoothstep(1.5, -1.0, p.z - 1.0);
    m[6] = ell(q, vec2(6.2, 4.5), vec2(7.0, 7.8)) * back;
    m[7] = dl;
    m[15] = ell(vec2(ax, p.y), vec2(2.5, 59.0), vec2(3.6, 3.6)) * smoothstep(-2.0, 1.0, p.z);
    shorts = p.y < uWaistY && p.y > -8.0;
  } else if (part == 1 || part == 2) {
    sideL = part == 1 ? 1.0 : 0.0;
    vec3 sho = part == 1 ? uShoL : uShoR, el = part == 1 ? uElL : uElR, wr = part == 1 ? uWrL : uWrR;
    float t = along(p, sho, el - sho);
    vec3 r = radial(p, sho, el - sho);
    float tf = along(p, el, wr - el);
    m[7] = max(dl, 1.0 - smoothstep(0.18, 0.32, t));
    m[8] = spindle(t, 0.22, 0.92, r.z, 0.42);
    m[9] = spindle(t, 0.14, 0.95, -r.z, 0.45);
    m[10] = spindle(tf, 0.0, 0.85, 1.0, 1.0) * 0.9;
  } else if (part == 3 || part == 4) {
    sideL = part == 3 ? 1.0 : 0.0;
    vec3 hip = part == 3 ? uHipL : uHipR, kn = part == 3 ? uKnL : uKnR, an = part == 3 ? uAnL : uAnR;
    float t = along(p, hip, kn - hip);
    vec3 r = radial(p, hip, kn - hip);
    float ts = along(p, kn, an - kn);
    vec3 rs = radial(p, kn, an - kn);
    float inner = part == 3 ? -r.x : r.x;
    m[11] = spindle(t, 0.05, 1.0, r.z, 0.42);
    m[12] = spindle(t, 0.12, 0.95, -r.z, 0.38);
    m[13] = spindle(t, 0.0, 0.75, inner, 0.32);
    m[14] = spindle(ts, -0.02, 0.62, -rs.z, 0.4);
    m[6] = (1.0 - smoothstep(0.1, 0.3, t)) * smoothstep(0.2, -0.6, r.z);
    shorts = t < uShortT && p.y < uWaistY;
  }
  float work = 0.0, stretch = 0.0;
  for (int i = 0; i < ${N}; i++) {
    float w = mix(uWR[i], uWL[i], sideL);
    work = max(work, m[i] * max(w, 0.0));
    stretch = max(stretch, m[i] * max(-w, 0.0));
  }
  vec3 c = shorts ? vec3(0.12, 0.15, 0.2) : vec3(0.6, 0.64, 0.7);
  vec3 red = vec3(0.9, 0.08, 0.16), teal = vec3(0.0, 0.72, 0.66);
  float k = shorts ? 0.5 : 1.0;
  float wk = clamp(work * k, 0.0, 1.0), st = clamp(stretch * k, 0.0, 1.0);
  c = mix(c, red, wk);
  c = mix(c, teal, st);
  c *= 1.0 - 0.28 * lines * max(wk, st);
  gHi = red * wk * 0.35 + teal * st * 0.3;
  return c;
}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( anatomy(), opacity );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gHi;');
  };
  return mat;
}
