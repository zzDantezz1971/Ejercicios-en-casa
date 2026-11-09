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
