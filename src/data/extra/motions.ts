/* Movimiento de los ejercicios nuevos (mismo formato que rawExercises.ts: ángulos por fotograma, ver figure/poses.ts).
   Los que no aparecen aquí siguen con "Animación en preparación". */
import type { MotionSpec } from '../../domain/types';
import { KNEES, PLF, PLH, PRONE, QUAD } from '../rawExercises';

type M = MotionSpec;

const GUARD = { ua: 62, fa: -112 }; // brazos en guardia, puños delante de la cara
const PLS = { tl: -162, th: 18, sn: 18, ft: 60, uaL: 90, faL: 180, uaR: -90, faR: -90, hd: -162 }; // plancha lateral (de frente)
const LUNGE_R = { thR: 15, snR: 95, thL: 115, snL: 175, ftL: 40 };
const LUNGE_L = { thL: 15, snL: 95, thR: 115, snR: 175, ftR: 40 };

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
