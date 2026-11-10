/* Movimiento de los ejercicios nuevos (mismo formato que rawExercises.ts: ángulos por fotograma, ver figure/poses.ts).
   Los que no aparecen aquí siguen con "Animación en preparación". */
import type { MotionSpec } from '../../domain/types';
import { KNEES, PLF, PLH, PRONE, QUAD } from '../rawExercises';

type M = MotionSpec;

const GUARD = { ua: 62, fa: -112 }; // brazos en guardia, puños delante de la cara
const PLS = { tl: -162, th: 18, sn: 18, ft: 60, uaL: 90, faL: 180, uaR: -90, faR: -90, hd: -162 }; // plancha lateral (de frente)
const LUNGE_R = { thR: 15, snR: 95, thL: 115, snL: 175, ftL: 40 };
const LUNGE_L = { thL: 15, snL: 95, thR: 115, snR: 175, ftR: 40 };
const PUSH_DOWN = { tl: -10, ua: 150, fa: 30, th: 170, sn: 170, ft: 90 }; // flexión abajo: manos bajo los hombros, codos atrás
const HIPS = { ua: 118, fa: 28 }; // manos en la cintura (vista lateral)
const SUMO = { thL: 118, snL: 118, thR: 62, snR: 62, ftL: 170, ftR: 10, uaL: 74, faL: 66, uaR: 106, faR: 114, zEL: 6, zER: 6, zHL: 14, zHR: 14 };
const SUMO_DOWN = { thL: 152, snL: 96, thR: 28, snR: 84, ftL: 170, ftR: 10, uaL: 74, faL: 66, uaR: 106, faR: 114, zEL: 6, zER: 6, zHL: 14, zHR: 14, zKL: 9, zKR: 9, lean: 16 };
const BEAR = { tl: -12, ua: 88, fa: 88, th: 92, sn: 168, ft: 90 }; // cuadrupedia con rodillas despegadas

export const EXTRA_MOTIONS: Record<string, M> = {
  // ── Calentamiento ──
  'skipping-rodillas-arriba': { f: [
    [{ thR: -8, snR: 78, uaL: 35, faL: -45, uaR: 130, faR: 105 }, 0, 250], [{ th: 88, sn: 96 }, 0, 190],
    [{ thL: -8, snL: 78, uaR: 35, faR: -45, uaL: 130, faL: 105 }, 0, 250], [{ th: 88, sn: 96 }, 0, 190]] },
  'saltos-de-esquiador': { v: 'front', f: [
    [{ x: -13, thL: 99, snL: 93, thR: 93, snR: 87, tl: -86, uaL: 104, faL: 70, uaR: 84, faR: 58, zEL: 4, zER: 4, zHL: 14, zHR: 14 }, 110, 380],
    [{ x: 13, thR: 81, snR: 87, thL: 87, snL: 93, tl: -94, uaR: 76, faR: 110, uaL: 96, faL: 122, zEL: 4, zER: 4, zHL: 14, zHR: 14 }, 110, 380]] },
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
    [{ x: -11, thL: 106, snL: 106, thR: 86, snR: 86, uaL: 182, faL: 180, uaR: -2, faR: 0 }, 100, 450],
    [{ x: -20 }, 100, 450],
    [{ x: -9, thR: 74, snR: 74, thL: 94, snL: 94, uaL: 182, faL: 180, uaR: -2, faR: 0 }, 100, 450]] },
  'sentadilla-con-brazos-arriba': { plant: 'anR', f: [
    [{ ua: -95, fa: -95, hd: -94 }, 200, 950], [{ tl: -55, th: 5, sn: 115, ua: 0, fa: 0, hd: -62 }, 200, 950]] },
  'zancada-con-giro-de-tronco': { f: [
    [{ ua: 70, fa: -170 }, 150, 800], [{ ...LUNGE_R, ua: 70, fa: -170, tw: 38 }, 300, 800],
    [{ ua: 70, fa: -170 }, 150, 800], [{ ...LUNGE_L, ua: 70, fa: -170, tw: -38 }, 300, 800]] },
  'gusano-inchworm': { plant: 'anR', mat: 1, f: [
    [{}, 300, 1100],
    [{ tl: 52, tu: 62, hd: 100, ua: 98, fa: 98, th: 84, sn: 96, ft: 0 }, 250, 1200],
    [{ ...PLH, ft: 70 }, 500, 1200],
    [{ tl: 52, tu: 62, hd: 100, ua: 98, fa: 98, th: 84, sn: 96, ft: 0 }, 250, 1200]] },
  'patada-frontal-alterna': { f: [
    [{ ...GUARD }, 120, 380], [{ ...GUARD, thR: -6, snR: -8, ftR: -40, thL: 95, snL: 92, tl: -98 }, 120, 380],
    [{ ...GUARD }, 120, 380], [{ ...GUARD, thL: -6, snL: -8, ftL: -40, thR: 95, snR: 92, tl: -98 }, 120, 380]] },
  'saltos-suaves-en-el-sitio': { f: [
    [{ th: 82, sn: 99, ua: 96, fa: 80 }, 0, 200], [{ th: 90, sn: 90, ft: 58, ua: 88, fa: 86 }, 0, 200]] },
  'boxeo-con-desplazamiento': { f: [
    [{ ...GUARD, thR: 76, snR: 100, thL: 104, snL: 96, x: 0 }, 60, 300],
    [{ ...GUARD, uaR: 2, faR: 0, tw: 20, thR: 76, snR: 100, thL: 104, snL: 96, x: 4 }, 60, 300],
    [{ ...GUARD, thR: 76, snR: 100, thL: 104, snL: 96, x: 6 }, 60, 300],
    [{ ...GUARD, uaL: 2, faL: 0, tw: -20, thR: 76, snR: 100, thL: 104, snL: 96, x: 2 }, 60, 300]] },
  'rotaciones-de-hombros': { per: 2200, fn: (t) => {
    const a = t * Math.PI * 2;
    return { sa: 0.93 + 0.06 * Math.cos(a), ua: 90 + 9 * Math.sin(a), fa: 90 + 9 * Math.sin(a), hd: -92 };
  } },

  // ── Abdominales ──
  'barquita-hollow-hold': { mat: 1, f: [
    [{ tl: 180, tu: 197, hd: 206, ua: 196, fa: 196, th: -14, sn: -14 }, 1400, 1000],
    [{ tl: 180, tu: 199, hd: 208, ua: 198, fa: 198, th: -17, sn: -17 }, 1400, 1000]] },
  'abdominal-en-v': { mat: 1, f: [
    [{ tl: 180, hd: 182, ua: 182, fa: 182, th: -2, sn: -2 }, 200, 950],
    [{ tl: 216, tu: 224, hd: 228, ua: 322, fa: 322, th: -46, sn: -46 }, 250, 950]] },
  'abdominal-completo': { mat: 1, f: [
    [{ tl: 180, hd: 184, ...KNEES, ua: -20, fa: 195 }, 250, 1100],
    [{ tl: 252, hd: 256, ...KNEES, ua: 52, fa: 267 }, 250, 1100]] },
  'patadas-de-aleteo': { mat: 1, f: [
    [{ tl: 180, tu: 186, ua: 0, fa: 0, thL: -10, snL: -10, thR: -22, snR: -22 }, 0, 230],
    [{ tl: 180, tu: 186, ua: 0, fa: 0, thR: -10, snR: -10, thL: -22, snL: -22 }, 0, 230]] },
  'limpiaparabrisas-tumbado': { v: 'top', mat: 'top', f: [
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 93, sn: 90, sTh: 0.2, sSh: 0.9 }, 150, 900],
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 40, sn: 90, sTh: 0.7, sSh: 0.9, hd: -104 }, 250, 900],
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 93, sn: 90, sTh: 0.2, sSh: 0.9 }, 150, 900],
    [{ uaL: 180, faL: 180, uaR: 0, faR: 0, th: 140, sn: 90, sTh: 0.7, sSh: 0.9, hd: -76 }, 250, 900]] },
  'plancha-con-rodilla-al-codo': { mat: 1, f: [
    [PLH, 150, 600], [{ ...PLH, thR: 52, snR: 150, zKR: 6 }, 250, 600],
    [PLH, 150, 600], [{ ...PLH, thL: 52, snL: 150, zKL: -6 }, 250, 600]] },
  'plancha-con-elevacion-de-pierna': { mat: 1, f: [
    [PLF, 300, 700], [{ ...PLF, thR: 186, snR: 186 }, 700, 700],
    [PLF, 300, 700], [{ ...PLF, thL: 186, snL: 186 }, 700, 700]] },
  'plancha-lateral-con-rotacion': { v: 'front', mat: 1, f: [
    [PLS, 300, 900], [{ ...PLS, uaR: 104, faR: 118, zER: -4, zHR: -8, hd: -150 }, 400, 900]] },

  // ── Fuerza sin material ──
  flexiones: { mat: 1, plant: 'haR', f: [[PLH, 200, 750], [PUSH_DOWN, 150, 850]] },
  'flexiones-con-rodillas-apoyadas': { mat: 1, plant: 'knR', f: [
    [{ tl: -30, ua: 90, fa: 90, th: 149, sn: 180, ft: 180 }, 200, 750], [{ tl: -8, ua: 150, fa: 30, th: 155, sn: 180, ft: 180 }, 150, 850]] },
  'flexiones-inclinadas-en-silla': { plant: 'haR', anchor: { j: 'haR', y: -42 }, props: (J, P) => P.benchFlat(J.haR[0] - 16, J.haR[0] + 12, 42), f: [
    [{ tl: -45, ua: 90, fa: 90, th: 135, sn: 135, ft: 60 }, 200, 750], [{ tl: -32, ua: 150, fa: 30, th: 148, sn: 148, ft: 70 }, 150, 850]] },
  'flexiones-declinadas': { mat: 1, plant: 'haR', props: (J, P) => P.benchFlat(J.anR[0] - 16, J.anR[0] + 12, 40), f: [
    [{ tl: -2, ua: 90, fa: 90, th: 179, sn: 179, ft: 90 }, 200, 750], [{ tl: 10, ua: 150, fa: 30, th: 190, sn: 190, ft: 90 }, 150, 850]] },
  'flexiones-con-apertura-en-t': { mat: 1, plant: 'haR', f: [
    [PLH, 100, 650], [PUSH_DOWN, 100, 750], [PLH, 100, 500], [{ ...PLH, uaL: -88, faL: -88, saL: 0.95, hd: -40 }, 450, 600],
    [PLH, 100, 650], [PUSH_DOWN, 100, 750], [PLH, 100, 500], [{ ...PLH, uaR: -88, faR: -88, saR: 0.95, hd: -40 }, 450, 600]] },
  'flexiones-en-pica': { mat: 1, plant: 'haR', f: [
    [{ tl: 42, tu: 45, hd: 72, ua: 45, fa: 45, th: 125, sn: 125, ft: 20 }, 200, 800],
    [{ tl: 58, tu: 64, hd: 92, ua: 118, fa: 62, th: 118, sn: 118, ft: 25 }, 150, 900]] },
  'flexiones-diamante': { mat: 1, plant: 'haR', f: [
    [{ ...PLH, zHL: 12, zHR: -12, zEL: 4, zER: -4 }, 200, 750], [{ ...PUSH_DOWN, zHL: 12, zHR: -12, zEL: 2, zER: -2 }, 150, 850]] },
  'plancha-a-flexion-arriba-y-abajo': { mat: 1, plant: 'anR', f: [
    [PLF, 300, 450], [{ ...PLF, tl: -17, th: 163, sn: 163, uaR: 90, faR: 90 }, 80, 450], [PLH, 300, 450], [{ ...PLF, tl: -17, th: 163, sn: 163, uaL: 90, faL: 90 }, 80, 450]] },
  'angeles-boca-abajo': { mat: 1, armsOut: true, anchor: { j: 'pel', y: -13.1 }, f: [
    [{ ...PRONE, tu: -4, hd: -12, ua: 182, fa: 182 }, 200, 800], [{ ...PRONE, tu: -4, hd: -12, ua: 270, fa: 270, sa: 0.1 }, 0, 800],
    [{ ...PRONE, tu: -4, hd: -12, ua: 358, fa: 358 }, 200, 800], [{ ...PRONE, tu: -4, hd: -12, ua: 270, fa: 270, sa: 0.1 }, 0, 800]] },
  'y-t-w-boca-abajo': { mat: 1, armsOut: true, anchor: { j: 'pel', y: -13.1 }, f: [
    [{ ...PRONE, ua: 2, fa: 2 }, 150, 600], [{ ...PRONE, tu: -5, hd: -12, ua: -14, fa: -14, sa: 0.8 }, 500, 600],
    [{ ...PRONE, ua: 2, fa: 2 }, 150, 600], [{ ...PRONE, tu: -5, hd: -12, ua: -90, fa: -90, sa: 0.1 }, 500, 600],
    [{ ...PRONE, ua: 2, fa: 2 }, 150, 600], [{ ...PRONE, tu: -5, hd: -12, ua: 225, fa: 315, sa: 0.45 }, 500, 600]] },
  'plancha-con-toques-de-hombro': { mat: 1, f: [
    [PLH, 150, 450], [{ ...PLH, uaR: 60, faR: 175, zER: -8, zHR: -26, tl: -24 }, 250, 450],
    [PLH, 150, 450], [{ ...PLH, uaL: 60, faL: 175, zEL: 8, zHL: 26, tl: -24 }, 250, 450]] },
  'sentadilla-bulgara-con-silla': { plant: 'anR', props: (J, P) => P.benchFlat(J.anL[0] - 20, J.anL[0] + 8, 42), f: [
    [{ ...HIPS, thR: 68, snR: 120, thL: 130, snL: 194, ftL: 180 }, 200, 950],
    [{ ...HIPS, tl: -80, thR: 26, snR: 138, thL: 139, snL: 236, ftL: 200 }, 250, 950]] },
  'zancada-atras': { f: [
    [{ ...HIPS }, 150, 800], [{ ...HIPS, ...LUNGE_R }, 250, 800], [{ ...HIPS }, 150, 800], [{ ...HIPS, ...LUNGE_L }, 250, 800]] },
  'sentadilla-con-salto': { f: [
    [{ tl: -55, th: 5, sn: 115, ua: 120, fa: 120, hd: -62 }, 120, 380], [{ jy: 14, ft: 60, ua: -80, fa: -80, hd: -96 }, 0, 260],
    [{ ft: 20, th: 70, sn: 108, ua: 80, fa: 60 }, 0, 260]] },
  'elevacion-de-talones-de-pie': { props: (J, P) => P.wall(J.haR[0] + 3), f: [
    [{ uaR: 4, faR: -6, uaL: 94, faL: 90 }, 300, 700], [{ uaR: 4, faR: -6, uaL: 94, faL: 90, ft: 52 }, 600, 700]] },
  'sentadilla-isometrica-en-la-pared': { plant: 'anR', props: (J, P) => P.wall(J.pel[0] - 11), f: [
    [{ tl: -92, th: 0, sn: 90, ua: 90, fa: 30, hd: -92 }, 1400, 1100], [{ tl: -91, th: 2, sn: 90, ua: 90, fa: 28, hd: -90 }, 1400, 1100]] },
  'subida-a-silla': { props: (J, P) => P.benchFlat(J.pel[0] + 16, J.pel[0] + 46, 42), f: [
    [{ ...HIPS }, 150, 650], [{ ...HIPS, thR: -24, snR: 92, ftR: 0 }, 100, 750], [{ ...HIPS, x: 30, jy: 42 }, 250, 750],
    [{ ...HIPS, thR: -24, snR: 92, ftR: 0 }, 100, 650]] },
  'patada-de-gluteo-en-cuadrupedia': { mat: 1, f: [[QUAD, 200, 700], [{ ...QUAD, thR: 186, snR: 272, ftR: 180 }, 300, 700]] },
  'abduccion-de-cadera-tumbado-de-lado': { v: 'front', mat: 1, f: [
    [{ tl: 180, hd: 186, th: 0, sn: 0, ft: -60, uaL: 182, faL: 250, uaR: 20, faR: 20 }, 200, 900],
    [{ tl: 180, hd: 186, thL: 0, snL: 0, thR: -40, snR: -40, ft: -60, uaL: 182, faL: 250, uaR: 20, faR: 20 }, 350, 900]] },
  'sentadilla-sumo-sin-peso': { v: 'front', f: [[SUMO, 200, 1000], [SUMO_DOWN, 300, 1000]] },
  'peso-muerto-a-una-pierna-sin-peso': { plant: 'anR', f: [
    [{ thL: 100, snL: 100, ua: 94, fa: 94 }, 250, 950], [{ tl: 2, tu: 4, hd: 20, thL: 182, snL: 182, ftL: 90, thR: 84, snR: 96, ua: 95, fa: 95 }, 450, 950]] },
  burpees: { mat: 1, f: [
    [{}, 100, 380], [{ tl: -40, tu: -30, hd: -10, th: 12, sn: 122, ua: 98, fa: 98 }, 80, 330],
    [{ ...PLH }, 100, 330], [{ tl: -40, tu: -30, hd: -10, th: 12, sn: 122, ua: 98, fa: 98 }, 80, 330],
    [{ jy: 14, ft: 60, ua: -84, fa: -84, hd: -96 }, 0, 330]] },
  'oso-caminando': { mat: 1, f: [
    [{ ...BEAR, uaR: 72, faR: 76, thL: 80, snL: 160 }, 60, 450], [BEAR, 0, 350],
    [{ ...BEAR, uaL: 72, faL: 76, thR: 80, snR: 160 }, 60, 450], [BEAR, 0, 350]] },

  // ── Estiramientos ──
  'postura-de-la-paloma': { mat: 1, f: [
    [{ tl: -72, tu: -78, hd: -80, ua: 98, fa: 92, thR: 30, snR: 165, sShR: 0.35, zAR: -12, thL: 174, snL: 178, ftL: 180 }, 1600, 1300],
    [{ tl: -24, tu: -8, hd: 8, ua: 8, fa: 4, thR: 30, snR: 165, sShR: 0.35, zAR: -12, thL: 174, snL: 178, ftL: 180 }, 1600, 1300]] },
  'pecho-en-el-marco-de-la-puerta': { v: 'front', props: (J, P) => [...P.wall(J.elL[0] - 7), ...P.wall(J.elR[0] + 7)], f: [
    [{ uaL: 180, faL: -92, uaR: 0, faR: -88 }, 400, 1100], [{ uaL: 180, faL: -92, uaR: 0, faR: -88, lean: 12 }, 1600, 1100]] },
  'perro-boca-abajo': { mat: 1, plant: 'haR', f: [
    [{ ...QUAD, ft: 150 }, 500, 1300], [{ tl: 42, tu: 45, hd: 72, ua: 45, fa: 45, th: 125, sn: 125, ft: 20 }, 1700, 1300]] },
  cobra: { mat: 1, anchor: { j: 'pel', y: -13.1 }, f: [
    [{ ...PRONE, ua: 172, fa: 12 }, 400, 1200], [{ ...PRONE, tl: -6, tu: -60, hd: -64, ua: 158, fa: 36 }, 1500, 1200]] },
  'tibiales-sentado-sobre-los-talones': { mat: 1, f: [
    [{ th: 90, sn: 180, ft: 180, ua: 90, fa: 90 }, 400, 1300], [{ th: 8, sn: 182, ft: 180, tl: -88, ua: 82, fa: 58 }, 1600, 1300]] },
};
