import { tr, LOCALE } from '../i18n';
import type { ExerciseDef } from '../domain/types';
import { EQUIPMENT, EQUIP_INFO } from '../domain/equipment';
import { MUSCLE_NAMES, parseMuscles, type Muscle } from '../figure/anatomy';
import { icon, zoneIcon, type IconName } from './icons';

/*
 * Cómo se agrupa una lista de ejercicios según el orden elegido (zona, músculo, material o A-Z). Lo usan la lista de
 * crear una tabla y la de añadir ejercicios al editarla, para que las dos agrupen igual.
 */
export type GroupSort = 'zona' | 'musculo' | 'material' | 'az' | 'personalizada';

/** Músculos de la cabeza a los pies (orden «Por músculo»). */
const HEAD_TO_TOE: Muscle[] = ['cuello', 'trapecio', 'deltoides', 'pecho', 'espalda', 'biceps', 'triceps', 'antebrazo',
  'abdominales', 'oblicuos', 'lumbar', 'gluteos', 'aductores', 'cuadriceps', 'isquios', 'gemelos'];
/** Donde lo buscaría la gente aunque el primer músculo sea otro (coincide con su zona). */
const MAIN_MUSCLE: Record<string, Muscle> = { 'mesa-invertida': 'pecho', 'esfinge': 'lumbar', 'cobra': 'lumbar' };
/** Músculo principal: el primero que trabaja (o, si solo estira, el primero). */
export function mainMuscle(e: ExerciseDef): Muscle | undefined {
  if (MAIN_MUSCLE[e.id]) return MAIN_MUSCLE[e.id];
  const t = parseMuscles(e.muscles);
  return (t.find((x) => x.kind === 'work') ?? t[0])?.muscle;
}

/** Orden alfabético del idioma de la app (en castellano, la ñ va después de la n; los acentos no cuentan). */
export const collator = new Intl.Collator(LOCALE, { sensitivity: 'base' });
export const byName = (a: ExerciseDef, b: ExerciseDef) => collator.compare(tr(a.name), tr(b.name));

/** Grupo de cada ejercicio, grupos en orden, título e icono. */
export interface Grouping { keyOf: (e: ExerciseDef) => string; keys: string[]; title: (k: string) => string; icon: (k: string) => SVGSVGElement }

/** Grupos de un apartado (`exercises`: todos los del apartado, en el orden del catálogo) en un tipo de orden. */
export function listGrouping(exercises: readonly ExerciseDef[], sort: GroupSort): Grouping {
  let keyOf: (e: ExerciseDef) => string;
  let rank: (k: string) => number = () => 0;
  let title: (k: string) => string = (k) => k;
  let ico: (k: string) => SVGSVGElement = (k) => zoneIcon(k);
  if (sort === 'zona') {
    const first: string[] = [];
    for (const e of exercises) if (!first.includes(e.group ?? '')) first.push(e.group ?? '');
    keyOf = (e) => e.group ?? '';
    rank = (k) => first.indexOf(k);
  } else if (sort === 'musculo') {
    keyOf = (e) => mainMuscle(e) ?? '-';
    rank = (k) => (k === '-' ? 99 : HEAD_TO_TOE.indexOf(k as Muscle));
    title = (k) => (k === '-' ? 'Otros' : MUSCLE_NAMES[k as Muscle]);
    ico = (k) => zoneIcon(k === '-' ? '' : k);
  } else if (sort === 'material') {
    // el material de cada ejercicio, siempre en el mismo orden (así «Bandas + Barra» va justo después de «Bandas»)
    const eqOf = (e: ExerciseDef) => (e.equip ?? []).map((g) => g[0] as (typeof EQUIPMENT)[number]).sort((a, b) => EQUIPMENT.indexOf(a) - EQUIPMENT.indexOf(b));
    keyOf = (e) => eqOf(e).join('+') || '-';
    rank = (k) => {
      if (k === '-') return -1;
      const eq = k.split('+') as Array<(typeof EQUIPMENT)[number]>;
      return Math.min(...eq.map((x) => EQUIPMENT.indexOf(x))) * 10 + eq.length;
    };
    title = (k) => (k === '-' ? 'Sin material' : k.split('+').map((x) => tr(EQUIP_INFO[x as (typeof EQUIPMENT)[number]].name)).join(' + '));
    ico = (k) => icon((k === '-' ? 'check' : EQUIP_INFO[k.split('+')[0] as (typeof EQUIPMENT)[number]].icon) as IconName);
  } else {
    // A-Z y personalizada: una sola lista, sin títulos
    keyOf = () => '';
  }
  const keys = [...new Set(exercises.map(keyOf))].sort((x, y) => rank(x) - rank(y) || collator.compare(title(x), title(y)));
  return { keyOf, keys, title, icon: ico };
}

/** Los ejercicios por grupos (en el orden de los grupos) y, dentro de cada grupo, alfabético. */
export function groupedList(exercises: readonly ExerciseDef[], all: readonly ExerciseDef[], sort: GroupSort): Array<{ key: string; items: ExerciseDef[] }> {
  const gr = listGrouping(all, sort);
  const segs = new Map<string, ExerciseDef[]>(gr.keys.map((k) => [k, []]));
  for (const e of [...exercises].sort(byName)) segs.get(gr.keyOf(e))?.push(e);
  return [...segs.entries()].filter(([, items]) => items.length).map(([key, items]) => ({ key, items }));
}
