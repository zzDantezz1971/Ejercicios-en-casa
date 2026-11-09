import type { Badge, SectionId } from '../../domain/types';
import type { ExT } from '../../i18n/ex1';

/**
 * Ejercicio nuevo (todavía sin animación del muñeco).
 * s = apartado, g = subgrupo (zona) dentro del apartado, n/z = nombre y zona en castellano,
 * eq = material ("mancuernas+banco", "banco|step"; vacío = sin material), m = músculos (ver data/muscles.ts),
 * one = se hace por lados, es = [posición inicial, movimiento, consejo, errores, versión fácil],
 * ca/en = traducciones [nombre, zona, posición inicial, movimiento, consejo, errores, versión fácil].
 */
export interface ExtraEx {
  s: SectionId;
  g?: string;
  n: string;
  z: string;
  eq?: string;
  m: string;
  one?: true;
  b?: Badge[];
  es: [string, string, string, string, string];
  ca: ExT;
  en: ExT;
}

/** Forma corta de escribir un ejercicio nuevo. */
export function x(
  s: SectionId, g: string | undefined, n: string, z: string, eq: string, m: string, one: boolean,
  es: [string, string, string, string, string], ca: ExT, en: ExT, b?: Badge[],
): ExtraEx {
  return { s, g, n, z, eq: eq || undefined, m, one: one ? true : undefined, es, ca, en, b };
}
