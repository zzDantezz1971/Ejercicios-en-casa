/* Movimiento de los ejercicios nuevos (mismo formato que rawExercises.ts: ángulos por fotograma, ver figure/poses.ts).
   Los que no aparecen aquí siguen con "Animación en preparación". */
import type { MotionSpec } from '../../domain/types';
import { mocap, mocapCrunch } from './mocap';
import { benchLie, benchRow, KNEES, LYB, PLF, PLH, PRONE, QUAD, ROWB, SUP } from '../rawExercises';

type M = MotionSpec;

const GUARD = { ua: 62, fa: -112 }; // brazos en guardia, puños delante de la cara
const GUARD_L = { ua: 75, fa: -15 }; // brazos en L delante del cuerpo (codos abajo, antebrazos al frente)
const CHEST_ARMS = { ua: 72, fa: -20, zHL: 12, zHR: -12, zEL: 2, zER: -2 }; // brazos doblados delante del pecho
// de frente, rodillas dobladas: el muslo se acorta (la rodilla va hacia delante) y el tobillo vuelve debajo del cuerpo
const SQUAT_F = { sTh: 0.75, zAL: -22.5, zAR: -22.5, uaL: 100, faL: 70, uaR: 80, faR: 110, zEL: 8, zER: 8, zHL: 20, zHR: 20 };
const TUCK_F = { sTh: 0.62, sSh: 0.85, zAL: -48, zAR: -48, uaL: 125, faL: 110, uaR: 55, faR: 70, zEL: 4, zER: 4, zHL: 10, zHR: 10 }; // en el aire, piernas recogidas
const PLS = { tl: -167, th: 13, sn: 13, ft: 40, uaL: 90, faL: 180, uaR: -90, faR: -90, hd: -167 }; // plancha lateral (de frente)
const LUNGE_R = { thR: 15, snR: 95, thL: 115, snL: 175, ftL: 40 };
const LUNGE_L = { thL: 15, snL: 95, thR: 115, snR: 175, ftR: 40 };
// zancada hacia atrás: el pie de delante no se mueve, el cuerpo baja hacia atrás con la otra pierna
const LUNGE_BR = { ...LUNGE_R, x: -30 };
const LUNGE_BL = { ...LUNGE_L, x: -30 };
const PUSH_DOWN = { tl: -10, ua: 150, fa: 30, th: 170, sn: 170, ft: 90 }; // flexión abajo: manos bajo los hombros, codos atrás
const HIPS = { ua: 118, fa: 28 }; // manos en la cintura (vista lateral)
const SUMO = { thL: 118, snL: 118, thR: 62, snR: 62, ftL: 180, ftR: 0, uaL: 74, faL: 66, uaR: 106, faR: 114, zEL: 6, zER: 6, zHL: 14, zHR: 14 };
const SUMO_DOWN = { thL: 152, snL: 96, thR: 28, snR: 84, ftL: 180, ftR: 0, uaL: 74, faL: 66, uaR: 106, faR: 114, zEL: 6, zER: 6, zHL: 14, zHR: 14, zKL: 9, zKR: 9, lean: 16 };
const HANG = { ua: -90, fa: -90, th: 96, sn: 112 }; // colgado de la barra
// barbilla por encima de la barra: la barra queda delante de la parte alta del pecho y la cabeza algo atrás
const CHIN = { ua: 105, fa: -44, th: 96, sn: 112, hd: -100 };
const pullBar = (J: Record<string, [number, number]>, P: import('../../domain/types').PropHelpers) =>
  // barra de dominadas: de color vivo y algo más gruesa para que se vea bien sobre el fondo oscuro
  P.rect(J.haR[0] - 2.5, J.haR[1] - 3.5, 5, 5).map((o) => ({ ...o, dep: 96, color: '#F5A524' }));
// el step: 17 cm de alto y ancho de verdad (en profundidad), para que quepan los dos pies separados
const stepBox = (P: import('../../domain/types').PropHelpers, x: number, w: number) => P.rect(x, -17, w, 17).map((o) => ({ ...o, dep: 76 }));
const STEP = (x0: number) => (J: Record<string, [number, number]>, P: import('../../domain/types').PropHelpers) => stepBox(P, J.pel[0] + x0, 34);
const BAR_BACK = { ua: 158, fa: -30 }; // barra sobre la espalda alta
// barra colgando delante de los muslos (brazos algo adelantados, para que no atraviese las piernas)
const BAR_HANG = { ua: 78, fa: 66 };
const KB_CHEST = { ua: 75, fa: -60, zHL: 13, zHR: -13, zEL: 6, zER: -6 }; // pesa pegada al pecho
const ROPE_ARMS = { ua: 98, fa: 35, zHL: -7, zHR: 7, zEL: -3, zER: 3 };
const rope = (o: { back?: boolean; legs?: 'alt' | 'high'; side?: boolean }) => (t: number) => {
  const turns = o.legs || o.side ? 2 : 1, a = 360 * turns * t, rp = o.back ? -a : a;
  const k = Math.max(0, Math.cos(((a % 360) - 90) * (Math.PI / 180))) ** 2; // salto cuando la comba pasa por abajo
  const odd = Math.floor(a / 360) % 2 === 1;
  const p: Record<string, number> = { rp: rp + 90, jy: 5 * k, ft: 25 + 30 * k, th: 88, sn: 94, ...ROPE_ARMS };
  if (o.legs) {
    const lift = o.legs === 'high' ? { th: -5, sn: 80 } : { th: 70, sn: 125 };
    const s2 = odd ? 'L' : 'R';
    p['th' + s2] = 88 + (lift.th - 88) * k; p['sn' + s2] = 94 + (lift.sn - 94) * k;
  }
  if (o.side) {
    // de lado a lado (de perfil, en profundidad): los pies caen cada vez un poco a un lado y al otro
    const sd = Math.max(-1, Math.min(1, -1.4 * Math.cos((Math.PI * a) / 360)));
    p.zAL = p.zAR = 13 * sd; p.zKL = p.zKR = 7 * sd;
  }
  return p;
};
// saltos de esquiador (de frente): pies juntos, rodillas dobladas al caer y algo recogidas en el aire
const SKI_LAND = { sTh: 0.8, zAL: -18, zAR: -18, zKL: 3, zKR: 3, zEL: 4, zER: 4, zHL: 14, zHR: 14 };
const SKI_AIR = { sTh: 0.72, sSh: 0.92, zAL: -32, zAR: -32, uaL: 100, faL: 96, uaR: 80, faR: 84, zEL: 4, zER: 4, zHL: 14, zHR: 14 };
const BOX_ST = { thR: 70, snR: 106, thL: 108, snL: 104, ft: 84, lean: 6 }; // guardia: pie izquierdo delante, rodillas flexionadas
// giros de tronco (de frente): codos junto al cuerpo y manos sueltas delante de la barriga
const TWIST_ARMS = { uaL: 112, faL: -10, uaR: 68, faR: 190, zEL: 8, zER: 8, zHL: 26, zHR: 26 };
const ANGEL_LEGS = { thL: 92, snL: 92, thR: 88, snR: 88 }; // boca abajo, piernas juntas (vista desde arriba)
const SUMO_CHEST = { uaL: 112, faL: -10, uaR: 68, faR: 190, zEL: 8, zER: 8, zHL: 26, zHR: 26 }; // de frente: manos juntas delante del pecho
// plancha alta sobre dos mancuernas: los hombros, más altos que en la plancha normal
const RENEG = { tl: -22, ua: 90, fa: 90, th: 158, sn: 158, ft: 90 };
const BEAR = { tl: 3, ua: 88, fa: 88, th: 92, sn: 176, ft: 60 }; // cuadrupedia con rodillas despegadas

export const EXTRA_MOTIONS: Record<string, M> = {
  // ── Calentamiento ──
  'skipping-rodillas-arriba': { f: [
    [{ thR: -8, snR: 78, uaL: 35, faL: -45, uaR: 130, faR: 105 }, 0, 230], [{ th: 86, sn: 100, jy: 4 }, 0, 170],
    [{ thL: -8, snL: 78, uaR: 35, faR: -45, uaL: 130, faL: 105 }, 0, 230], [{ th: 86, sn: 100, jy: 4 }, 0, 170]] },
  // saltos de lado a lado con los pies juntos: cae con las rodillas dobladas, en el aire las piernas recogidas
  'saltos-de-esquiador': { v: 'front', f: [
    [{ x: -24, ...SKI_LAND, uaL: 108, faL: 74, uaR: 88, faR: 62 }, 90, 230], [{ x: 0, jy: 14, ...SKI_AIR }, 0, 230],
    [{ x: 24, ...SKI_LAND, uaR: 72, faR: 106, uaL: 92, faL: 118 }, 90, 230], [{ x: 0, jy: 14, ...SKI_AIR }, 0, 230]] },
  'circulos-de-rodillas': { plant: 'anR', per: 2200, fn: (t) => {
    const a = t * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return { tl: -30, tu: -34, hd: -58, th: 32 + 6 * c, sn: 106 - 4 * c, zK: 4 * s, ua: 95 + 3 * c, fa: 108 + 2 * c };
  } },
  'circulos-de-tobillos-y-munecas': { per: 1800, fn: (t) => {
    const a = t * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    return { thR: 84, snR: 100, ftR: 68 + 16 * s, zAR: 3 * c, ua: 58, fa: -12 + 18 * s, zH: 3 * c };
  } },
  'toques-de-puntera-alternos': { props: (J, P) => P.rect(J.pel[0] + 20, -13, 26, 13), f: [
    [{ thR: 32, snR: 96, ftR: 10, uaL: 50, faL: -20, uaR: 120, faR: 100 }, 40, 220], [{ uaL: 90, faL: 60, uaR: 90, faR: 60 }, 0, 180],
    [{ thL: 32, snL: 96, ftL: 10, uaR: 50, faR: -20, uaL: 120, faL: 100 }, 40, 220], [{ uaL: 90, faL: 60, uaR: 90, faR: 60 }, 0, 180]] },
  'paso-lateral-con-brazos': { v: 'front', f: [
    [{ x: 0 }, 100, 450],
    [{ x: -17, thL: 112, snL: 112, thR: 90, snR: 90, uaL: 182, faL: 180, uaR: -2, faR: 0 }, 100, 450],
    [{ x: -34 }, 100, 450],
    [{ x: -17, thR: 68, snR: 68, thL: 90, snL: 90, uaL: 182, faL: 180, uaR: -2, faR: 0 }, 100, 450]] },
  'sentadilla-con-brazos-arriba': { plant: 'anR', f: [
    [{ ua: -95, fa: -95, hd: -94 }, 200, 950], [{ tl: -55, th: 5, sn: 115, ua: 0, fa: 0, hd: -62 }, 200, 950]] },
  'zancada-con-giro-de-tronco': { f: [
    [{ ...CHEST_ARMS }, 150, 800], [{ ...LUNGE_R, ...CHEST_ARMS, tw: 38 }, 300, 800],
    [{ ...CHEST_ARMS }, 150, 800], [{ ...LUNGE_L, ...CHEST_ARMS, tw: -38 }, 300, 800]] },
  'gusano-inchworm': { plant: 'anR', mat: 1, handsDown: true, handsSlide: true, f: [
    [{}, 300, 1100],
    // brazos un poco más cortos: la palma queda plana en el suelo y la muñeca algo levantada
    [{ tl: 58, tu: 66, hd: 100, ua: 82, fa: 82, sa: 0.93, th: 80, sn: 97, ft: 0 }, 250, 1200],
    [{ ...PLH, ft: 70, sa: 0.93 }, 500, 1200],
    [{ tl: 58, tu: 66, hd: 100, ua: 82, fa: 82, sa: 0.93, th: 80, sn: 97, ft: 0 }, 250, 1200]] },
  'patada-frontal-alterna': { fist: true, f: [
    [{ ...GUARD_L }, 120, 380], [{ ...GUARD_L, thR: -6, snR: -8, ftR: -40, thL: 95, snL: 92, tl: -98 }, 120, 380],
    [{ ...GUARD_L }, 120, 380], [{ ...GUARD_L, thL: -6, snL: -8, ftL: -40, thR: 95, snR: 92, tl: -98 }, 120, 380]] },
  'saltos-suaves-en-el-sitio': { f: [
    [{ th: 82, sn: 99, ua: 96, fa: 80 }, 0, 200], [{ th: 90, sn: 90, ft: 58, ua: 88, fa: 86 }, 0, 200]] },
  'boxeo-con-desplazamiento': { fist: true, f: [
    [{ ...GUARD, ...BOX_ST, x: 0 }, 40, 300],
    [{ ...GUARD, ...BOX_ST, uaR: 2, faR: 0, tw: 20, x: 14 }, 60, 300],
    [{ ...GUARD, ...BOX_ST, thR: 70, snR: 104, x: 22 }, 40, 300],
    [{ ...GUARD, ...BOX_ST, uaL: 2, faL: 0, tw: -20, x: 12 }, 60, 300],
    [{ ...GUARD, ...BOX_ST, thL: 110, snL: 100, x: -4 }, 40, 300],
    [{ ...GUARD, ...BOX_ST, uaR: 2, faR: 0, tw: 20, x: -10 }, 60, 300]] },
  'rotaciones-de-hombros': { per: 2200, fn: (t) => {
    const a = t * Math.PI * 2;
    // el hombro dibuja un círculo: arriba, atrás, abajo y adelante (y el brazo cuelga de él)
    return { shu: 7 * Math.sin(a), shf: -6 * Math.cos(a), ua: 90 - 6 * Math.cos(a), fa: 90 - 6 * Math.cos(a), hd: -92 };
  } },

  // ── Abdominales ──
  'barquita-hollow-hold': { mat: 1, f: [
    [{ tl: 180, tu: 197, hd: 206, ua: 196, fa: 196, th: -14, sn: -14 }, 1400, 1000],
    [{ tl: 180, tu: 199, hd: 208, ua: 198, fa: 198, th: -17, sn: -17 }, 1400, 1000]] },
  'abdominal-en-v': { mat: 1, f: [
    [{ tl: 180, hd: 182, ua: 182, fa: 182, th: -2, sn: -2 }, 200, 950],
    [{ tl: 216, tu: 224, hd: 228, ua: 322, fa: 322, th: -46, sn: -46 }, 250, 950]] },
  // movimiento real (Mixamo, «Situps»)
  'abdominal-completo': mocap('abdominal-completo', { mat: 1 }, { seated: true, crossArms: true }),
  'patadas-de-aleteo': { mat: 1, f: [
    [{ tl: 180, tu: 186, ua: 0, fa: 0, thL: -10, snL: -10, thR: -22, snR: -22 }, 0, 230],
    [{ tl: 180, tu: 186, ua: 0, fa: 0, thR: -10, snR: -10, thL: -22, snL: -22 }, 0, 230]] },
  'limpiaparabrisas-tumbado': { v: 'top', mat: 'top', f: [
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 93, sn: 90, sTh: 0.2, sSh: 0.9 }, 150, 900],
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 40, sn: 90, sTh: 0.7, sSh: 0.9, hd: -104 }, 250, 900],
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 93, sn: 90, sTh: 0.2, sSh: 0.9 }, 150, 900],
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 140, sn: 90, sTh: 0.7, sSh: 0.9, hd: -76 }, 250, 900]] },
  'plancha-con-rodilla-al-codo': { mat: 1, anchor: { j: 'haR', y: -3 }, f: [
    // la rodilla pasa por fuera (muslo hacia el lado) para no tocar el suelo
    [PLH, 150, 300], [{ ...PLH, thR: 92, sThR: 0.42, snR: 165 }, 0, 300], [{ ...PLH, thR: 30, snR: 165, zKR: 6 }, 250, 300], [{ ...PLH, thR: 92, sThR: 0.42, snR: 165 }, 0, 300],
    [PLH, 150, 300], [{ ...PLH, thL: 92, sThL: 0.42, snL: 165 }, 0, 300], [{ ...PLH, thL: 30, snL: 165, zKL: -6 }, 250, 300], [{ ...PLH, thL: 92, sThL: 0.42, snL: 165 }, 0, 300]] },
  'plancha-con-elevacion-de-pierna': { mat: 1, f: [
    [PLF, 300, 700], [{ ...PLF, thR: 186, snR: 186 }, 700, 700],
    [PLF, 300, 700], [{ ...PLF, thL: 186, snL: 186 }, 700, 700]] },
  'plancha-lateral-con-rotacion': { v: 'front', mat: 1, f: [
    [PLS, 300, 900], [{ ...PLS, uaR: 104, faR: 118, zER: -4, zHR: -8, hd: -150 }, 400, 900]] },

  // ── Fuerza sin material ──
  flexiones: { mat: 1, plant: 'haR', handsDown: true, f: [[PLH, 200, 750], [PUSH_DOWN, 150, 850]] },
  'flexiones-con-rodillas-apoyadas': { mat: 1, plant: 'knR', handsDown: true, f: [
    [{ tl: -30, ua: 90, fa: 90, th: 149, sn: 180, ft: 180 }, 200, 750], [{ tl: -8, ua: 150, fa: 30, th: 155, sn: 180, ft: 180 }, 150, 850]] },
  'flexiones-inclinadas-en-silla': { plant: 'haR', anchor: { j: 'haR', y: -42 }, props: (J, P) => P.benchFlat(J.haR[0] - 16, J.haR[0] + 12, 42), f: [
    [{ tl: -45, ua: 90, fa: 90, th: 135, sn: 135, ft: 60 }, 200, 750], [{ tl: -32, ua: 150, fa: 30, th: 148, sn: 148, ft: 70 }, 150, 850]] },
  'flexiones-declinadas': { mat: 1, plant: 'haR', props: (J, P) => P.benchFlat(J.anR[0] - 16, J.anR[0] + 12, 40), f: [
    [{ tl: -2, ua: 90, fa: 90, th: 179, sn: 179, ft: 90 }, 200, 750], [{ tl: 10, ua: 150, fa: 30, th: 190, sn: 190, ft: 90 }, 150, 850]] },
  'flexiones-con-apertura-en-t': { mat: 1, plant: 'haR', handsDown: true, f: [
    [PLH, 100, 650], [PUSH_DOWN, 100, 750], [PLH, 100, 500], [{ ...PLH, uaL: -88, faL: -88, saL: 0.95, hd: -40 }, 450, 600],
    [PLH, 100, 650], [PUSH_DOWN, 100, 750], [PLH, 100, 500], [{ ...PLH, uaR: -88, faR: -88, saR: 0.95, hd: -40 }, 450, 600]] },
  'flexiones-en-pica': { mat: 1, plant: 'haR', f: [
    [{ tl: 42, tu: 45, hd: 72, ua: 45, fa: 45, th: 125, sn: 125, ft: 20 }, 200, 800],
    [{ tl: 58, tu: 64, hd: 92, ua: 118, fa: 62, th: 118, sn: 118, ft: 25 }, 150, 900]] },
  'flexiones-diamante': { mat: 1, plant: 'haR', handsDown: true, f: [
    [{ ...PLH, zHL: 12, zHR: -12, zEL: 4, zER: -4 }, 200, 750], [{ ...PUSH_DOWN, zHL: 12, zHR: -12, zEL: 2, zER: -2 }, 150, 850]] },
  'plancha-a-flexion-arriba-y-abajo': { mat: 1, plant: 'anR', f: [
    [PLF, 300, 450], [{ ...PLF, tl: -17, th: 163, sn: 163, uaR: 90, faR: 90 }, 80, 450], [PLH, 300, 450], [{ ...PLF, tl: -17, th: 163, sn: 163, uaL: 90, faL: 90 }, 80, 450]] },
  // vista desde arriba: los brazos barren el suelo (un poco despegados) de junto a la cadera a por encima de la cabeza
  'angeles-boca-abajo': { v: 'top', prone: true, mat: 'top', f: [
    [{ ...ANGEL_LEGS, uaL: 96, faL: 96, uaR: 84, faR: 84 }, 200, 800], [{ ...ANGEL_LEGS, uaL: 180, faL: 180, uaR: 0, faR: 0 }, 0, 800],
    [{ ...ANGEL_LEGS, uaL: 258, faL: 258, uaR: -78, faR: -78 }, 200, 800], [{ ...ANGEL_LEGS, uaL: 180, faL: 180, uaR: 0, faR: 0 }, 0, 800]] },
  'y-t-w-boca-abajo': { mat: 1, armsOut: true, anchor: { j: 'pel', y: -13.1 }, f: [
    [{ ...PRONE, ua: 2, fa: 2 }, 150, 600], [{ ...PRONE, tu: -5, hd: -12, ua: -14, fa: -14, sa: 0.8 }, 500, 600],
    [{ ...PRONE, ua: 2, fa: 2 }, 150, 600], [{ ...PRONE, tu: -5, hd: -12, ua: -90, fa: -90, sa: 0.1 }, 500, 600],
    [{ ...PRONE, ua: 2, fa: 2 }, 150, 600], [{ ...PRONE, tu: -5, hd: -12, ua: 225, fa: 315, sa: 0.45 }, 500, 600]] },
  'plancha-con-toques-de-hombro': { mat: 1, handsDown: true, f: [
    [PLH, 150, 450], [{ ...PLH, uaR: 60, faR: 175, zER: -8, zHR: -26, tl: -24 }, 250, 450],
    [PLH, 150, 450], [{ ...PLH, uaL: 60, faL: 175, zEL: 8, zHL: 26, tl: -24 }, 250, 450]] },
  'sentadilla-bulgara-con-silla': { plant: 'anR', props: (J, P) => P.benchFlat(J.anL[0] - 20, J.anL[0] + 8, 42), f: [
    [{ ...HIPS, thR: 68, snR: 120, thL: 130, snL: 194, ftL: 180 }, 200, 950],
    [{ ...HIPS, tl: -80, thR: 26, snR: 138, thL: 139, snL: 236, ftL: 200 }, 250, 950]] },
  'zancada-atras': { f: [
    [{ ...HIPS }, 150, 800], [{ ...HIPS, ...LUNGE_BR }, 250, 800], [{ ...HIPS }, 150, 800], [{ ...HIPS, ...LUNGE_BL }, 250, 800]] },
  'sentadilla-con-salto': { f: [
    [{ tl: -55, th: 5, sn: 115, ua: 120, fa: 120, hd: -62 }, 120, 380], [{ jy: 14, ft: 60, ua: -80, fa: -80, hd: -96 }, 0, 260],
    [{ ft: 20, th: 70, sn: 108, ua: 80, fa: 60 }, 0, 260]] },
  'elevacion-de-talones-de-pie': { props: (J, P) => P.wall(J.haR[0] + 3, 20 - J.haR[1], 50), f: [
    [{ uaR: 4, faR: -6, uaL: 94, faL: 90 }, 300, 700], [{ uaR: 4, faR: -6, uaL: 94, faL: 90, ft: 52 }, 600, 700]] },
  'sentadilla-isometrica-en-la-pared': { plant: 'anR', props: (J, P) => P.wall(J.pel[0] - 11), f: [
    [{ tl: -92, th: 0, sn: 90, ua: 90, fa: 30, hd: -92 }, 1400, 1100], [{ tl: -91, th: 2, sn: 90, ua: 90, fa: 28, hd: -90 }, 1400, 1100]] },
  'subida-a-silla': { props: (J, P) => P.benchFlat(J.pel[0] + 16, J.pel[0] + 46, 42), f: [
    [{ ...HIPS }, 150, 650], [{ ...HIPS, thR: -24, snR: 92, ftR: 0 }, 100, 750], [{ ...HIPS, x: 30, jy: 42 }, 250, 750],
    [{ ...HIPS, thR: -24, snR: 92, ftR: 0 }, 100, 650]] },
  'patada-de-gluteo-en-cuadrupedia': { mat: 1, handsDown: true, f: [[QUAD, 200, 700], [{ ...QUAD, thR: 186, snR: 272, ftR: 180 }, 300, 700]] },
  'abduccion-de-cadera-tumbado-de-lado': { v: 'front', mat: 1, f: [
    [{ tl: 180, hd: 186, th: 0, sn: 0, ft: -60, uaL: 182, faL: 250, uaR: 20, faR: 20 }, 200, 900],
    [{ tl: 180, hd: 186, thL: 0, snL: 0, thR: -40, snR: -40, ft: -60, uaL: 182, faL: 250, uaR: 20, faR: 20 }, 350, 900]] },
  // manos juntas delante del pecho
  'sentadilla-sumo-sin-peso': { v: 'front', f: [[{ ...SUMO, ...SUMO_CHEST }, 200, 1000], [{ ...SUMO_DOWN, ...SUMO_CHEST }, 300, 1000]] },
  'peso-muerto-a-una-pierna-sin-peso': { plant: 'anR', f: [
    [{ thL: 100, snL: 100, ua: 94, fa: 94 }, 250, 950], [{ tl: 2, tu: 4, hd: 20, thL: 182, snL: 182, ftL: 90, thR: 84, snR: 96, ua: 95, fa: 95 }, 450, 950]] },
  burpees: { mat: 1, f: [
    [{}, 100, 380], [{ tl: -40, tu: -30, hd: -10, th: 12, sn: 122, ua: 98, fa: 98 }, 80, 330],
    [{ ...PLH }, 100, 330], [{ tl: -40, tu: -30, hd: -10, th: 12, sn: 122, ua: 98, fa: 98 }, 80, 330],
    [{ jy: 14, ft: 60, ua: -84, fa: -84, hd: -96 }, 0, 330]] },
  'oso-caminando': { mat: 1, handsDown: true, handsSlide: true, f: [
    [{ ...BEAR, uaR: 72, faR: 76, thL: 80, snL: 176 }, 60, 450], [BEAR, 0, 350],
    [{ ...BEAR, uaL: 72, faL: 76, thR: 80, snR: 176 }, 60, 450], [BEAR, 0, 350]] },

  // ── Mancuernas ──
  'press-arnold': { v: 'front', db: 'both', f: [
    [{ uaL: 100, faL: 280, uaR: 80, faR: -100, zEL: 10, zER: 10, zHL: 12, zHR: 12 }, 150, 1000], [{ uaL: 260, faL: 265, uaR: -80, faR: -85 }, 150, 1000]] },
  'press-de-hombros-de-pie': { v: 'front', db: 'both', f: [
    [{ uaL: 180, faL: 270, uaR: 0, faR: -90 }, 150, 1000], [{ uaL: 260, faL: 265, uaR: -80, faR: -85 }, 150, 1000]] },
  'remo-al-menton': { v: 'front', db: 'both', f: [
    [{ uaL: 92, faL: 86, uaR: 88, faR: 94, zHL: 5, zHR: 5 }, 150, 900], [{ uaL: 160, faL: 2, uaR: 20, faR: 178, zHL: 6, zHR: 6 }, 200, 900]] },
  'press-de-suelo-con-mancuernas': { mat: 1, feetDown: true, db: 'both', f: [
    [{ tl: 180, ...KNEES, ua: -90, fa: -90 }, 150, 1000], [{ tl: 180, ...KNEES, ua: 12, fa: -90 }, 150, 1000]] },
  'aperturas-inclinadas-con-mancuernas': { db: 'both', armsOut: true, anchor: { j: 'pel', y: -40 },
    props: (J, P) => [...P.benchFlat(J.pel[0] - 16, J.pel[0] + 18), ...P.line([J.pel[0] - 8, -36], [J.pel[0] - 8 - 54 * 0.82, -36 - 54 * 0.57], 7)], f: [
    [{ tl: -145, th: 5, sn: 90, ua: -100, fa: -100 }, 150, 1000], [{ tl: -145, th: 5, sn: 90, ua: -85, fa: -75, sa: 0.22 }, 150, 1000]] },
  'press-de-banca-a-una-mano': { db: 'R', anchor: { j: 'pel', y: -40 }, props: benchLie, f: [
    [{ ...LYB, uaR: -90, faR: -90, uaL: 20, faL: -30 }, 150, 1000], [{ ...LYB, uaR: 30, faR: -90, uaL: 20, faL: -30 }, 150, 1000]] },
  'remo-inclinado-con-mancuernas': { db: 'both', plant: 'anR', f: [
    [{ tl: -28, th: 80, sn: 100, ua: 90, fa: 90, hd: -40 }, 150, 800], [{ tl: -28, th: 80, sn: 100, ua: 205, fa: 95, hd: -40 }, 200, 800]] },
  'remo-renegado': { mat: 1, db: 'both', handsDown: 10, f: [
    [RENEG, 150, 600], [{ ...RENEG, uaR: 205, faR: 100 }, 250, 600], [RENEG, 150, 600], [{ ...RENEG, uaL: 205, faL: 100 }, 250, 600]] },
  'curl-martillo': { db: 'both', hammer: true, f: [[{}, 150, 850], [{ ua: 85, fa: -50 }, 150, 850]] },
  'curl-alterno-de-biceps': { db: 'both', f: [
    [{}, 100, 750], [{ uaR: 85, faR: -50 }, 150, 750], [{}, 100, 750], [{ uaL: 85, faL: -50 }, 150, 750]] },
  'press-frances-en-el-suelo': { mat: 1, feetDown: true, db: 'both', f: [
    [{ tl: 180, ...KNEES, ua: -105, fa: -105 }, 150, 1000], [{ tl: 180, ...KNEES, ua: -105, fa: -185 }, 150, 1000]] },
  'peso-muerto-rumano-con-mancuernas': { db: 'both', plant: 'anR', f: [
    [{ th: 88, sn: 94, ua: 66, fa: 34, zHL: 4, zHR: 4 }, 250, 1100], [{ tl: -18, th: 84, sn: 96, ua: 80, fa: 72, hd: -32 }, 300, 1100]] },
  'sentadilla-goblet-con-mancuerna': { db: 'two', plant: 'anR', f: [
    [{ ua: 75, fa: -60, zHL: 13, zHR: -13, zEL: 6, zER: -6 }, 200, 1000],
    [{ tl: -62, th: 5, sn: 115, ua: 62, fa: -85, zHL: 13, zHR: -13, zEL: 4, zER: -4, hd: -70 }, 250, 1000]] },
  'zancada-atras-con-mancuernas': { db: 'both', f: [[{}, 150, 800], [LUNGE_BR, 250, 800], [{}, 150, 800], [LUNGE_BL, 250, 800]] },
  'sentadilla-bulgara-con-mancuernas': { db: 'both', plant: 'anR', props: (J, P) => P.benchFlat(J.anL[0] - 20, J.anL[0] + 8, 42), f: [
    [{ thR: 68, snR: 120, thL: 130, snL: 194, ftL: 180 }, 200, 950],
    [{ tl: -80, thR: 26, snR: 138, thL: 139, snL: 236, ftL: 200 }, 250, 950]] },
  'elevacion-de-talones-con-mancuernas': { db: 'both', f: [[{}, 300, 700], [{ ft: 52 }, 600, 700]] },
  'hip-thrust-con-mancuerna': { db: 'two', plant: 'anR', props: (J, P) => P.benchFlat(J.neck[0] - 34, J.neck[0] + 2, -J.neck[1] - 7), f: [
    [{ tl: -155, hd: -150, th: -25, sn: 80, ua: 30, fa: 20, zHL: 13, zHR: -13 }, 200, 1000],
    [{ tl: -182, hd: -170, th: 0, sn: 90, ua: 6, fa: 0, zHL: 13, zHR: -13 }, 400, 1000]] },
  'subida-al-banco-con-mancuernas': { db: 'both', props: (J, P) => P.benchFlat(J.pel[0] + 16, J.pel[0] + 46, 42), f: [
    [{}, 150, 650], [{ thR: -24, snR: 92, ftR: 0 }, 100, 750], [{ x: 30, jy: 42 }, 250, 750], [{ thR: -24, snR: 92, ftR: 0 }, 100, 650]] },
  'thruster-con-mancuernas': { db: 'both', plant: 'anR', f: [
    [{ ua: 70, fa: -112 }, 80, 650], [{ tl: -58, th: 5, sn: 115, ua: 40, fa: -140, hd: -65 }, 80, 650], [{ ua: -88, fa: -90, hd: -94 }, 250, 750]] },
  'swing-con-mancuerna': { db: 'two', plant: 'anR', f: [
    [{ tl: -22, th: 78, sn: 100, ua: 112, fa: 118, hd: -36, zHL: 13, zHR: -13 }, 80, 550], [{ ua: -4, fa: -6, zHL: 13, zHR: -13 }, 80, 550]] },
  'marcha-del-granjero': { db: 'both', f: [
    [{ thR: 55, snR: 118 }, 0, 420], [{}, 0, 420], [{ thL: 55, snL: 118 }, 0, 420], [{}, 0, 420]] },
  'giro-ruso-con-mancuerna': { v: 'front', noGround: 1, mat: 'top', db: 'two', f: [
    [{ lean: -22, tw: -55, sa: 0.8, uaL: 96, faL: 34, uaR: 84, faR: 146, zEL: 12, zER: 12, zHL: 30, zHR: 30, thL: -125, snL: 95, thR: -55, snR: 85, sTh: 0.6 }, 150, 700],
    [{ lean: -22, tw: 55, sa: 0.8, uaL: 96, faL: 34, uaR: 84, faR: 146, zEL: 12, zER: 12, zHL: 30, zHR: 30, thL: -125, snL: 95, thR: -55, snR: 85, sTh: 0.6 }, 150, 700]] },
  'lenador-con-mancuerna': { v: 'front', db: 'two', f: [
    [{ tl: -84, tu: -80, uaL: 48, faL: 48, uaR: 82, faR: 82, zHL: 8, zHR: 8, tw: 22, thL: 100, snL: 100, thR: 80, snR: 80 }, 150, 800],
    [{ tl: -94, tu: -98, uaL: -120, faL: -125, saL: 0.78, uaR: -135, faR: -140, zHL: 8, zHR: 8, tw: -22, thL: 100, snL: 100, thR: 80, snR: 80 }, 200, 800]] },
  'crunch-con-mancuerna': mocapCrunch({ tl: 180, tu: 180, hd: 184, ...KNEES, ua: -100, fa: 30, zHL: 8, zHR: -8, zEL: 10, zER: -10 },
    { tu: 203, hd: 214, ua: -77, fa: 53 }, { mat: 1, feetDown: true, db: 'two', dbAcross: true, anchor: { j: 'pel', y: -12.1 }, az: 20, el: 18 }),

  // ── Pesa rusa ──
  'swing-con-pesa-rusa': { kb: 'both', plant: 'anR', f: [
    [{ tl: -22, th: 78, sn: 100, ua: 112, fa: 118, hd: -36, zHL: 13, zHR: -13 }, 80, 550], [{ ua: -4, fa: -6, zHL: 13, zHR: -13 }, 80, 550]] },
  'swing-a-una-mano-con-pesa-rusa': { kb: 'R', plant: 'anR', f: [
    [{ tl: -22, th: 78, sn: 100, uaR: 112, faR: 118, uaL: 100, faL: 60, hd: -36, zHR: -8 }, 80, 550], [{ uaR: -4, faR: -6, uaL: 110, faL: 40 }, 80, 550]] },
  'sentadilla-goblet-con-pesa-rusa': { kb: 'both', plant: 'anR', f: [
    [{ ...KB_CHEST }, 200, 1000], [{ ...KB_CHEST, tl: -62, th: 5, sn: 115, ua: 62, fa: -85, hd: -70 }, 250, 1000]] },
  'peso-muerto-con-pesa-rusa': { kb: 'both', plant: 'anR', f: [
    [{ tl: -32, th: 58, sn: 112, ua: 92, fa: 92, hd: -40, zHL: 13, zHR: -13 }, 200, 1000], [{ ua: 90, fa: 90, zHL: 13, zHR: -13 }, 300, 1000]] },
  'sentadilla-sumo-con-pesa-rusa': { v: 'front', kb: 'both', f: [
    [{ ...SUMO, uaL: 70, faL: 72, uaR: 110, faR: 108, zEL: 4, zER: 4, zHL: 10, zHR: 10 }, 200, 1000],
    [{ ...SUMO_DOWN, uaL: 72, faL: 74, uaR: 108, faR: 106, zEL: 6, zER: 6, zHL: 13, zHR: 13 }, 300, 1000]] },
  'zancada-atras-con-pesa-rusa': { kb: 'both', f: [
    [{ ...KB_CHEST }, 150, 800], [{ ...KB_CHEST, ...LUNGE_BR }, 250, 800], [{ ...KB_CHEST }, 150, 800], [{ ...KB_CHEST, ...LUNGE_BL }, 250, 800]] },
  'remo-con-pesa-rusa': { kb: 'R', anchor: { j: 'knL', y: -38 }, props: benchRow, f: [
    [{ ...ROWB, uaR: 90, faR: 90 }, 150, 800], [{ ...ROWB, uaR: 205, faR: 100 }, 150, 800]] },
  'press-de-hombro-con-pesa-rusa': { v: 'front', kb: 'R', f: [
    [{ uaR: 30, faR: -100, zER: 8, zHR: 8 }, 150, 1000], [{ uaR: -82, faR: -86 }, 200, 1000]] },
  'cargada-con-pesa-rusa': { kb: 'R', plant: 'anR', f: [
    [{ tl: -35, th: 72, sn: 108, uaR: 100, faR: 100, uaL: 100, faL: 70, hd: -45 }, 100, 600], [{ uaR: 62, faR: -112, uaL: 100, faL: 70 }, 350, 700]] },
  'halo-con-pesa-rusa': { v: 'front', kb: 'both', per: 2600, fn: (t) => {
    const a = t * Math.PI * 2, tx = 11 * Math.sin(a), tz = 12 * Math.cos(a), ty = -24;
    const eL = [-15 + 21 * Math.cos((250 * Math.PI) / 180), 21 * Math.sin((250 * Math.PI) / 180) - 8], eR = [-eL[0], eL[1]];
    const faL = (Math.atan2(ty - eL[1], tx - eL[0]) * 180) / Math.PI, faR = (Math.atan2(ty - eR[1], tx - eR[0]) * 180) / Math.PI;
    return { uaL: 250, uaR: -70, faL, faR, zEL: 4 + tz * 0.4, zER: 4 + tz * 0.4, zHL: tz, zHR: tz };
  } },
  'molino-con-pesa-rusa': { kb: 'L', armsOut: true, f: [
    [{ uaL: -88, faL: -88, saL: 0.95, uaR: 92, faR: 92, saR: 0.08, zKL: -7, zAL: -13, zKR: 7, zAR: 13, hd: -100 }, 300, 1100],
    [{ tl: -14, tu: -6, hd: 20, uaR: 96, faR: 100, uaL: -88, faL: -88, saL: 0.95, zKL: -7, zAL: -13, zKR: 7, zAR: 13 }, 600, 1100]] },
  'ocho-con-pesa-rusa': { kb: 'both', plant: 'anR', per: 2600, fn: (t) => {
    const a = t * Math.PI * 2, z = 18 * Math.sin(a);
    return { tl: -36, th: 72, sn: 108, hd: -46, ua: 96 + 10 * Math.sin(2 * a), fa: 98 + 10 * Math.sin(2 * a), zHL: 15.5 + z, zHR: -15.5 + z, zEL: 6 + z * 0.4, zER: -6 + z * 0.4 };
  } },
  'remo-alto-con-pesa-rusa': { v: 'front', kb: 'both', f: [
    // abajo: cadera atrás y rodillas dobladas, la pesa entre las piernas; arriba: cadera extendida y codos altos
    [{ uaL: 88, faL: 88, uaR: 92, faR: 92, zHL: 10, zHR: 10, lean: 22, sTh: 0.86, zAL: -12, zAR: -12, zKL: 4, zKR: 4 }, 150, 800],
    [{ uaL: 160, faL: 0, uaR: 20, faR: 180, zHL: 6, zHR: 6 }, 200, 800]] },
  'giro-ruso-con-pesa-rusa': { v: 'front', noGround: 1, mat: 'top', kb: 'both', f: [
    [{ lean: -22, tw: -55, sa: 0.8, uaL: 100, faL: 2, uaR: 80, faR: 178, zEL: 14, zER: 14, zHL: 34, zHR: 34, thL: -125, snL: 95, thR: -55, snR: 85, sTh: 0.6 }, 150, 700],
    [{ lean: -22, tw: 55, sa: 0.8, uaL: 100, faL: 2, uaR: 80, faR: 178, zEL: 14, zER: 14, zHL: 34, zHR: 34, thL: -125, snL: 95, thR: -55, snR: 85, sTh: 0.6 }, 150, 700]] },

  // ── Barra ──
  'sentadilla-con-barra': { bar: true, plant: 'anR', f: [
    [{ ...BAR_BACK }, 200, 1000], [{ tl: -52, th: 5, sn: 114, ua: 188, fa: -2, hd: -62 }, 250, 1000]] },
  'peso-muerto-con-barra': { bar: true, plant: 'anR', f: [
    [{ tl: -30, th: 52, sn: 114, ua: 86, fa: 80, hd: -40 }, 200, 1100], [{ ...BAR_HANG }, 300, 1100]] },
  'peso-muerto-rumano-con-barra': { bar: true, plant: 'anR', f: [
    // barra delante de los muslos (de pie) y bajando pegada a las piernas por delante
    [{ th: 88, sn: 94, ua: 72, fa: 56 }, 250, 1100], [{ tl: -18, th: 84, sn: 96, ua: 82, fa: 74, hd: -32 }, 300, 1100]] },
  'zancada-con-barra': { bar: true, f: [
    [{ ...BAR_BACK }, 150, 800], [{ ...BAR_BACK, ...LUNGE_BR }, 250, 800], [{ ...BAR_BACK }, 150, 800], [{ ...BAR_BACK, ...LUNGE_BL }, 250, 800]] },
  'hip-thrust-con-barra': { bar: true, plant: 'anR', props: (J, P) => P.benchFlat(J.neck[0] - 34, J.neck[0] + 2, -J.neck[1] - 7), f: [
    [{ tl: -155, hd: -150, th: -25, sn: 80, ua: 8, fa: -10 }, 200, 1000], [{ tl: -182, hd: -170, th: 0, sn: 90, ua: -14, fa: -22 }, 400, 1000]] },
  'press-militar-con-barra': { bar: true, f: [[{ ua: 62, fa: -100, hd: -96 }, 150, 1000], [{ ua: -84, fa: -86, hd: -94 }, 200, 1000]] },
  'remo-con-barra': { bar: true, plant: 'anR', f: [
    [{ tl: -40, th: 80, sn: 100, ua: 86, fa: 82, hd: -50 }, 150, 800], [{ tl: -40, th: 80, sn: 100, ua: 168, fa: 76, hd: -50 }, 200, 800]] },
  'curl-con-barra': { bar: true, f: [[{ ...BAR_HANG }, 150, 850], [{ ua: 84, fa: -60 }, 150, 850]] },
  'encogimientos-con-barra': { bar: true, f: [[{ ...BAR_HANG }, 300, 700], [{ ...BAR_HANG, shu: 6, hd: -96 }, 500, 700]] },
  'press-de-banca-con-barra': { bar: true, anchor: { j: 'pel', y: -40 }, props: benchLie, f: [
    [{ ...LYB, ua: -90, fa: -90 }, 150, 1000], [{ ...LYB, ua: 12, fa: -96 }, 150, 1000]] },
  'press-frances-con-barra': { bar: true, anchor: { j: 'pel', y: -40 }, props: benchLie, f: [
    [{ ...LYB, ua: -105, fa: -105 }, 150, 1000], [{ ...LYB, ua: -105, fa: -190 }, 150, 1000]] },
  'buenos-dias-con-barra': { bar: true, plant: 'anR', f: [
    [{ ...BAR_BACK, th: 86, sn: 94 }, 250, 1100], [{ tl: -12, hd: -20, th: 84, sn: 96, ua: 228, fa: 38 }, 300, 1100]] },

  // ── Bandas ──
  'remo-con-banda': { mat: 1, band: 'feet', f: [
    [{ th: 0, sn: 0, ft: -80, ua: 8, fa: 8, tl: -86 }, 150, 800], [{ th: 0, sn: 0, ft: -80, ua: 125, fa: 8, tl: -94, hd: -94 }, 250, 800]] },
  'press-de-pecho-con-banda': { band: (J) => [J.neck[0] - 14, J.neck[1] + 12], f: [
    [{ ua: 122, fa: -8 }, 150, 800], [{ ua: 2, fa: 0 }, 200, 800]] },
  'aperturas-con-banda': { v: 'front', band: (J) => [J.neck[0], J.neck[1] + 10], f: [
    [{ uaL: 180, faL: 172, uaR: 0, faR: 8 }, 150, 750], [{ uaL: 180, faL: 172, uaR: 0, faR: 8, saL: -0.35, saR: -0.35 }, 200, 750]] },
  'separacion-de-banda': { v: 'front', band: 'hands', f: [
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, saL: -0.31, saR: -0.31 }, 150, 800], [{ uaL: 180, faL: 180, uaR: 0, faR: 0 }, 300, 800]] },
  'face-pull-con-banda': { band: (J) => [J.head[0] + 70, J.head[1] + 4], f: [
    [{ ua: -4, fa: -4 }, 150, 800], [{ ua: 196, fa: -22, hd: -92 }, 300, 800]] },
  'curl-con-banda': { band: 'feet', f: [[{}, 150, 850], [{ ua: 85, fa: -50 }, 150, 850]] },
  'extension-de-triceps-con-banda': { band: (J) => [J.anL[0] - 4, J.anL[1] - 2], f: [
    [{ ua: -100, fa: -250, thL: 104, snL: 100 }, 150, 1000], [{ ua: -100, fa: -95, thL: 104, snL: 100 }, 200, 1000]] },
  'press-de-hombros-con-banda': { v: 'front', band: 'feet', f: [
    [{ uaL: 180, faL: 270, uaR: 0, faR: -90 }, 150, 1000], [{ uaL: 260, faL: 265, uaR: -80, faR: -85 }, 150, 1000]] },
  'elevaciones-laterales-con-banda': { v: 'front', band: 'feet', f: [
    [{ uaL: 100, faL: 100, uaR: 80, faR: 80 }, 150, 900], [{ uaL: 180, faL: 190, uaR: 0, faR: -10 }, 150, 900]] },
  'jalon-con-banda': { mat: 1, band: (J) => [J.head[0] + 30, J.head[1] - 46], f: [
    [{ th: 90, sn: 180, ft: 180, ua: -68, fa: -68, hd: -96 }, 150, 800], [{ th: 90, sn: 180, ft: 180, ua: 115, fa: -60, hd: -92 }, 250, 800]] },
  'sentadilla-con-banda': { band: 'feet', plant: 'anR', f: [
    [{ ua: 70, fa: -112 }, 200, 1000], [{ tl: -58, th: 5, sn: 115, ua: 40, fa: -140, hd: -65 }, 250, 1000]] },
  'caminata-lateral-con-banda': { v: 'front', band: 'knees', f: [
    [{ x: 0, lean: 12, uaL: 120, faL: 30, uaR: 60, faR: 150 }, 80, 420],
    [{ x: -7, lean: 12, thL: 104, snL: 104, thR: 86, snR: 86, uaL: 120, faL: 30, uaR: 60, faR: 150 }, 80, 420],
    [{ x: -14, lean: 12, uaL: 120, faL: 30, uaR: 60, faR: 150 }, 80, 420],
    [{ x: -7, lean: 12, thL: 94, snL: 94, thR: 76, snR: 76, uaL: 120, faL: 30, uaR: 60, faR: 150 }, 80, 420]] },
  'abduccion-de-cadera-con-banda': { v: 'front', band: 'knees', anchor: { j: 'pel', y: -40 },
    props: (J, P) => [...P.rect(J.pel[0] - 26, -34, 52, 6), ...P.line([J.pel[0] - 20, -29], [J.pel[0] - 20, 0], 4), ...P.line([J.pel[0] + 20, -29], [J.pel[0] + 20, 0], 4)], f: [
    [{ thL: 100, thR: 80, sTh: 0.15, uaL: 120, faL: 60, uaR: 60, faR: 120 }, 200, 800], [{ thL: 116, thR: 64, sTh: 0.15, uaL: 120, faL: 60, uaR: 60, faR: 120 }, 500, 800]] },
  'patada-de-gluteo-con-banda': { mat: 1, band: 'ankles', handsDown: true, f: [[QUAD, 200, 700], [{ ...QUAD, thR: 182, snR: 182, ftR: 90 }, 300, 700]] },
  'puente-de-gluteos-con-banda': { mat: 1, feetDown: true, band: 'knees', f: [
    [{ ...SUP, ...KNEES, zKL: -3, zKR: 3 }, 300, 1000], [{ ...SUP, tl: 140, tu: 165, th: -18, sn: 76.5, zKL: -5, zKR: 5 }, 900, 1000]] },
  // de lado a la puerta (la banda viene del lado): manos en el pecho y se empujan rectas al frente sin girar
  'press-pallof-con-banda': { v: 'front', az: 62, band: (J) => [J.neck[0] + 75, J.neck[1] + 14], f: [
    [{ uaL: 70, faL: -40, uaR: 110, faR: 220, zEL: 6, zER: 6, zHL: 12, zHR: 12 }, 200, 800],
    [{ uaL: 25, faL: 25, uaR: 155, faR: 155, sa: 0.18, zHL: 6, zHR: 6 }, 600, 800]] },

  // ── Step ──
  // subir derecho, subir izquierdo, bajar derecho (hacia atrás) y bajar izquierdo
  'step-basico': { props: STEP(14), f: [
    [{}, 0, 380], [{ thR: 20, snR: 100, ftR: 0 }, 0, 380], [{ x: 26, jy: 17 }, 0, 380],
    [{ x: 18, jy: 12, thL: 70, snL: 100, thR: 112, snR: 98 }, 0, 300], [{ thL: 20, snL: 100, ftL: 0 }, 0, 380]] },
  // en V: cada pie sube a una esquina del step (piernas abiertas arriba) y baja al centro (pies juntos abajo)
  'step-en-v': { props: STEP(14), az: 58, f: [
    [{}, 0, 380], [{ thR: 20, snR: 100, ftR: 0, zAR: 22, zKR: 14 }, 0, 380],
    [{ x: 26, jy: 17, zAL: -22, zKL: -12, zAR: 22, zKR: 12 }, 0, 380],
    [{ x: 18, jy: 12, thL: 70, snL: 100, zAL: -22, zKL: -14, thR: 112, snR: 98 }, 0, 300], [{ thL: 20, snL: 100, ftL: 0, zAL: -22, zKL: -14 }, 0, 380]] },
  'subidas-al-step': { props: STEP(14), f: [
    [{ ...HIPS }, 150, 600], [{ ...HIPS, thR: 20, snR: 100, ftR: 0 }, 100, 650], [{ ...HIPS, x: 26, jy: 17 }, 250, 650], [{ ...HIPS, thR: 20, snR: 100, ftR: 0 }, 100, 600]] },
  'subida-al-step-con-rodilla-arriba': { props: STEP(14), f: [
    [{}, 150, 600], [{ thR: 20, snR: 100, ftR: 0, uaL: 60, faL: -30, uaR: 120, faR: 100 }, 100, 650],
    [{ x: 26, jy: 17, thL: -8, snL: 82, uaR: 45, faR: -40, uaL: 125, faL: 100 }, 250, 650], [{ thR: 20, snR: 100, ftR: 0 }, 100, 600]] },
  'zancada-atras-desde-el-step': { props: (J, P) => stepBox(P, J.anR[0] - 16, 34), plant: 'anR', f: [
    [{ ...HIPS, jy: 17 }, 150, 800], [{ ...HIPS, thR: 14, snR: 139, thL: 128, snL: 142, ftL: 40 }, 300, 800]] },
  'elevacion-de-talones-en-el-step': { props: (J, P) => [...stepBox(P, J.anR[0] - 20, 30), ...P.wall(J.haR[0] + 3, 20 - J.haR[1], 50)], f: [
    [{ jy: 17, ft: -30, uaR: 4, faR: -6 }, 300, 900], [{ jy: 22, ft: 45, uaR: 4, faR: -6 }, 500, 900]] },
  'flexiones-con-manos-en-el-step': { plant: 'haR', anchor: { j: 'haR', y: -19 }, props: (J, P) => stepBox(P, J.haR[0] - 16, 30), f: [
    [{ tl: -30, ua: 90, fa: 90, th: 150, sn: 150, ft: 70 }, 200, 750], [{ tl: -19, ua: 150, fa: 30, th: 161, sn: 161, ft: 80 }, 150, 850]] },
  'fondos-de-triceps-en-el-step': { plant: 'haR', anchor: { j: 'haR', y: -19 }, props: (J, P) => stepBox(P, J.haR[0] - 30, 33), f: [
    [{ ua: 105, fa: 100, th: 30, sn: 50 }, 150, 900], [{ ua: 165, fa: 92, th: 10, sn: 60 }, 150, 900]] },
  // cada salto: rodillas dobladas al despegar y al caer, piernas recogidas en el aire
  'saltos-laterales-sobre-el-step': { v: 'front', az: 38, props: (J, P) => stepBox(P, J.pel[0] + 15, 30), f: [
    [{ x: -30, ...SQUAT_F }, 40, 200], [{ x: -15, jy: 26, ...TUCK_F }, 0, 200], [{ x: 0, jy: 17, ...SQUAT_F }, 40, 200],
    [{ x: 15, jy: 26, ...TUCK_F }, 0, 200], [{ x: 30, ...SQUAT_F }, 40, 200], [{ x: 15, jy: 26, ...TUCK_F }, 0, 200],
    [{ x: 0, jy: 17, ...SQUAT_F }, 40, 200], [{ x: -15, jy: 26, ...TUCK_F }, 0, 200]] },
  'gemelos-en-el-step': { props: (J, P) => [...stepBox(P, J.anR[0] - 20, 30), ...P.wall(J.haR[0] + 3, 20 - J.haR[1], 50)], f: [
    [{ jy: 17, uaR: 4, faR: -6, ftR: 0 }, 300, 900], [{ jy: 17, uaR: 4, faR: -6, ftR: -35, ftL: 10 }, 1600, 900]] },

  // ── Fitball ──
  // manos junto a las orejas: codos hacia arriba y fuera, antebrazos de vuelta a la cabeza
  'crunch-en-fitball': mocapCrunch({ tl: 172, tu: 168, hd: 172, th: 40, sn: 90, ua: 232, fa: 125, zEL: -4, zER: 4 },
    { tl: 180, tu: 205, hd: 214, ua: 260, fa: 143 }, { anchor: { j: 'pel', y: -58 }, ball: (J) => [J.pel[0] - 16, -27] }),
  'puente-con-pies-en-fitball': { mat: 1, anchor: { j: 'anR', y: -52 }, ball: (J) => [J.anR[0] + 3, -27], f: [
    [{ ...SUP, th: -41, sn: -41, ft: -60 }, 200, 900], [{ ...SUP, tl: 158, th: -22, sn: -22, ft: -60 }, 600, 900]] },
  'curl-femoral-con-fitball': { mat: 1, anchor: { j: 'anR', y: -52 }, ball: (J) => [J.anR[0] + 4, -27], f: [
    [{ ...SUP, tl: 141, th: -10, sn: -10, ft: -60 }, 200, 900], [{ ...SUP, tl: 131, th: -60, sn: 45, ft: -20 }, 300, 900]] },
  'plancha-con-antebrazos-en-fitball': { anchor: { j: 'elR', y: -56 }, ball: (J) => [J.elR[0] + 8, -27], f: [
    [{ tl: -40, ua: 90, fa: 0, th: 140, sn: 140, ft: 50 }, 1300, 1000], [{ tl: -41, ua: 92, fa: 2, th: 139, sn: 139, ft: 50 }, 1300, 1000]] },
  'pase-de-fitball-manos-a-pies': { mat: 1, ball: (J, p) => {
    const h = [(J.haL[0] + J.haR[0]) / 2, (J.haL[1] + J.haR[1]) / 2], f = [(J.anL[0] + J.anR[0]) / 2, (J.anL[1] + J.anR[1]) / 2];
    const k = p.bp; return [h[0] + (f[0] - h[0]) * k, h[1] + (f[1] - h[1]) * k - 6];
  }, f: [
    [{ tl: 180, hd: 182, ua: 182, fa: 182, th: -4, sn: -4, bp: 0 }, 200, 900], [{ tl: 216, tu: 224, hd: 228, ua: 322, fa: 322, th: -46, sn: -46, bp: 0 }, 0, 250],
    [{ tl: 216, tu: 224, hd: 228, ua: 322, fa: 322, th: -46, sn: -46, bp: 1 }, 100, 900], [{ tl: 180, hd: 182, ua: 182, fa: 182, th: -8, sn: -8, bp: 1 }, 200, 900],
    [{ tl: 216, tu: 224, hd: 228, ua: 322, fa: 322, th: -46, sn: -46, bp: 1 }, 0, 250], [{ tl: 216, tu: 224, hd: 228, ua: 322, fa: 322, th: -46, sn: -46, bp: 0 }, 100, 900]] },
  // las espinillas se quedan encima de la pelota (a su altura) y la pelota rueda bajo ellas; la cadera sube
  // pelota algo más pequeña (55 cm): los empeines se quedan encima y la pelota rueda bajo ellos; la cadera sube
  'rodillas-al-pecho-en-fitball': { mat: 1, anchor: { j: 'haR', y: -3 }, ballR: 22, ball: (J) => [J.anR[0] - 3, -22], f: [
    [{ tl: 10, ua: 90, fa: 90, th: 179, sn: 179, ft: 120 }, 200, 800], [{ tl: 45, tu: 38, hd: 60, ua: 90, fa: 90, th: 60, sn: 190, ft: 200 }, 300, 800]] },
  'sentadilla-en-pared-con-fitball': { plant: 'anR', ball: (J) => [J.mid[0] - 30, J.mid[1] + 4], props: (J, P) => P.wall(J.mid[0] - 58), f: [
    [{ tl: -92, th: 62, sn: 62, ft: -10, ua: 70, fa: -112 }, 200, 1000], [{ tl: -92, th: 2, sn: 90, ua: 40, fa: -140 }, 300, 1000]] },
  'hiperextension-en-fitball': { ball: (J) => [J.pel[0] + 4, -27], f: [
    [{ tl: 40, tu: 48, hd: 70, ua: 80, fa: 80, th: 125, sn: 125, ft: 60 }, 200, 900], [{ tl: -40, tu: -45, hd: -40, ua: 160, fa: 160, th: 125, sn: 125, ft: 60 }, 400, 900]] },
  'pecho-y-abdomen-sobre-fitball': { anchor: { j: 'mid', y: -60 }, armsOut: true, ball: (J) => [J.mid[0] + 2, -27], f: [
    [{ tl: 168, tu: 160, hd: 150, ua: 165, fa: 165, sa: 0.3, th: 60, sn: 92 }, 1500, 1200], [{ tl: 166, tu: 150, hd: 140, ua: 160, fa: 160, sa: 0.25, th: 60, sn: 92 }, 1500, 1200]] },

  // ── Barra de dominadas ──
  dominadas: { fist: true, plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[HANG, 250, 1100], [CHIN, 300, 1100]] },
  'dominadas-supinas': { plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[HANG, 250, 1100], [CHIN, 300, 1100]] },
  'dominadas-negativas': { fist: true, plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[CHIN, 300, 4500], [HANG, 300, 900]] },
  'dominadas-con-banda': { fist: true, band: 'bar', plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [
    [{ ...HANG, th: 70, sn: 165 }, 250, 1100], [{ ...CHIN, th: 70, sn: 165 }, 300, 1100]] },
  'retraccion-escapular-colgado': { fist: true, plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[HANG, 300, 700], [{ ...HANG, sa: 0.9, hd: -94 }, 600, 700]] },
  'elevaciones-de-rodillas-colgado': { fist: true, plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[{ ...HANG, th: 90, sn: 92 }, 200, 900], [{ ...HANG, th: -15, sn: 80, tl: -96 }, 300, 900]] },
  'elevaciones-de-piernas-colgado': { fist: true, plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[{ ...HANG, th: 90, sn: 92 }, 200, 1000], [{ ...HANG, th: -2, sn: -2, tl: -98 }, 300, 1000]] },
  'colgarse-de-la-barra': { fist: true, plant: 'haR', anchor: { j: 'haR', y: -172 }, props: pullBar, f: [[{ ...HANG, th: 90, sn: 92 }, 1400, 1100], [{ ...HANG, th: 91, sn: 92, hd: -94 }, 1400, 1100]] },

  // ── Comba ──
  'saltar-a-la-comba': { rope: true, per: 620, fn: rope({}) },
  'comba-alternando-pies': { rope: true, per: 1240, fn: rope({ legs: 'alt' }) },
  'comba-con-rodillas-altas': { rope: true, per: 1400, fn: rope({ legs: 'high' }) },
  'comba-hacia-atras': { rope: true, per: 680, fn: rope({ back: true }) },
  'comba-con-saltos-laterales': { rope: true, az: 62, per: 1300, fn: rope({ side: true, legs: undefined }) },

  // ── Rueda abdominal ──
  'rueda-abdominal-de-rodillas': { mat: 1, wheel: true, plant: 'knR', f: [
    [{ tl: -30, ua: 85, fa: 85, th: 90, sn: 180, ft: 180 }, 200, 1100], [{ tl: -8, hd: -12, ua: 8, fa: 8, th: 152, sn: 180, ft: 180 }, 300, 1100]] },
  'rueda-abdominal-de-pie': { mat: 1, wheel: true, plant: 'anR', f: [
    [{ tl: 52, tu: 62, hd: 100, ua: 98, fa: 98, th: 84, sn: 96 }, 200, 1300], [{ tl: -4, hd: -10, ua: 6, fa: 6, th: 176, sn: 176, ft: 70 }, 300, 1300]] },
  'rueda-abdominal-en-diagonal': { mat: 1, wheel: true, plant: 'knR', f: [
    [{ tl: -30, ua: 85, fa: 85, th: 90, sn: 180, ft: 180 }, 150, 1000], [{ tl: -12, hd: -14, ua: 14, fa: 14, th: 146, sn: 180, ft: 180, zHL: 14, zHR: 14, zEL: 7, zER: 7 }, 250, 1000],
    [{ tl: -30, ua: 85, fa: 85, th: 90, sn: 180, ft: 180 }, 150, 1000], [{ tl: -12, hd: -14, ua: 14, fa: 14, th: 146, sn: 180, ft: 180, zHL: -14, zHR: -14, zEL: -7, zER: -7 }, 250, 1000]] },
  'plancha-con-rueda': { mat: 1, wheel: true, plant: 'knR', f: [
    [{ tl: -30, ua: 85, fa: 85, th: 90, sn: 180, ft: 180 }, 200, 1000], [{ tl: -16, hd: -18, ua: 40, fa: 40, th: 128, sn: 180, ft: 180 }, 1500, 1000]] },

  // ── Estiramientos ──
  'postura-de-la-paloma': { mat: 1, handsDown: true, handsSlide: true, f: [
    [{ tl: -72, tu: -78, hd: -80, ua: 98, fa: 92, thR: 6, snR: 175, sShR: 0.35, zAR: -12, thL: 174, snL: 178, ftL: 180 }, 1600, 1300],
    [{ tl: -12, tu: 4, hd: 20, ua: 34, fa: 8, thR: 6, snR: 175, sShR: 0.35, zAR: -12, thL: 174, snL: 178, ftL: 180 }, 1600, 1300]] },
  'pecho-en-el-marco-de-la-puerta': { v: 'front', props: (J, P) => [...P.wall(J.elL[0] - 7), ...P.wall(J.elR[0] + 7)], f: [
    [{ uaL: 180, faL: -92, uaR: 0, faR: -88 }, 400, 1100], [{ uaL: 180, faL: -92, uaR: 0, faR: -88, lean: 12 }, 1600, 1100]] },
  'perro-boca-abajo': { mat: 1, plant: 'haR', handsDown: true, f: [
    [{ ...QUAD, ft: 150, tl: -4 }, 500, 1300], [{ tl: 42, tu: 45, hd: 72, ua: 45, fa: 45, th: 125, sn: 125, ft: 20 }, 1700, 1300]] },
  cobra: { mat: 1, anchor: { j: 'pel', y: -13.1 }, f: [
    [{ ...PRONE, ua: 172, fa: 12 }, 400, 1200], [{ ...PRONE, tl: -6, tu: -60, hd: -64, ua: 158, fa: 36 }, 1500, 1200]] },
  'tibiales-sentado-sobre-los-talones': { mat: 1, f: [
    [{ th: 90, sn: 180, ft: 180, ua: 90, fa: 90 }, 400, 1300], [{ th: 8, sn: 182, ft: 180, tl: -88, ua: 82, fa: 58 }, 1600, 1300]] },
};

/** Ejercicios de antes (rawExercises.ts) con movimiento nuevo: sustituyen al de allí. */
export const MOTION_OVERRIDES: Record<string, M> = {
  // el tronco gira de verdad (la cadera mira al frente) y los brazos, sueltos, lo siguen: uno por delante y otro por detrás
  'giros-de-tronco': { v: 'front', el: 22, f: [
    [{ thL: 96, snL: 96, thR: 84, snR: 84, tw: 55, hd: -90, ...TWIST_ARMS }, 80, 650],
    [{ thL: 96, snL: 96, thR: 84, snR: 84, tw: -55, hd: -90, ...TWIST_ARMS }, 80, 650]] },
  // de lado a una pared (detrás, paralela a la vista), apoyado con la mano de ese lado; la otra en la cintura
  'balanceo-de-pierna-adelante-y-atras': { props: (J) => [{ t: 'rect', x: J.pel[0] - 30, y: -135, w: 60, h: 135, z: -34, dep: 4 }], f: [
    [{ uaL: 92, faL: 80, zEL: -14, zHL: -26, uaR: 118, faR: 28, thR: -25, snR: -15 }, 60, 700],
    [{ uaL: 92, faL: 80, zEL: -14, zHL: -26, uaR: 118, faR: 28, thR: 150, snR: 160 }, 60, 700]] },
  // crunch con el tramo de subida del abdominal completo de Mixamo
  // brazos cruzados sobre el pecho
  'crunch-abdominal': mocapCrunch({ tl: 180, tu: 180, hd: 184, ...KNEES, ua: -22, fa: 176, zHL: 16, zHR: -16, zEL: 6, zER: -6 }, { tu: 203, hd: 214, ua: 1, fa: 199 },
    { mat: 1, feetDown: true, anchor: { j: 'pel', y: -12.1 }, az: 20, el: 18 }),
  'crunch-con-brazos-estirados': mocapCrunch({ tl: 180, tu: 180, hd: 184, ...KNEES, ua: 178, fa: 178 }, { tu: 204, hd: 212, ua: 228, fa: 226 },
    { mat: 1, feetDown: true, anchor: { j: 'pel', y: -12.1 }, az: 20, el: 18 }),
  'crunch-con-piernas-a-90': mocapCrunch({ tl: 180, th: -90, sn: 0, ua: 10, fa: 10 }, { tu: 202, hd: 208, ua: -18, fa: -18 },
    { mat: 1, anchor: { j: 'pel', y: -12.1 } }),
};
