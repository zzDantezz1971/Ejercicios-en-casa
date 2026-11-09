import type { ExT } from '../../i18n/ex1';
import type { ExtraEx } from './types';

/* Ejercicios nuevos por material (todavía sin animación). */
export const EXTRAS: ExtraEx[] = [];

/** Grupos nuevos de los apartados (traducciones). */
export const EXTRA_GROUPS: Record<string, { ca: string; en: string }> = {};

export function extraId(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Traducciones de los ejercicios nuevos, en el mismo formato que i18n/ex1..4. */
export const EXTRA_T: Record<string, { ca: ExT; en: ExT }> = Object.fromEntries(EXTRAS.map((e) => [extraId(e.n), { ca: e.ca, en: e.en }]));
