/*
 * Un bloque de un entrenamiento del historial guarda cada ejercicio cada vez que se hizo (con las vueltas y las
 * series, uno detrás de otro). Para enseñarlo como la tabla, se reconocen las repeticiones: si todo el bloque se
 * repite (vueltas del bloque) y, dentro, los tramos que se repiten seguidos (series).
 */

/** Una fila: los índices de las veces que se hizo ese ejercicio (una por cada repetición). */
export type HistoryRow = number[];
/** Un tramo del bloque: un ejercicio suelto (times 1, una fila) o una serie (times ≥ 2, sus filas). */
export interface HistoryGroup { times: number; rows: HistoryRow[] }

/** ¿La lista a partir de `i` repite `k` veces seguidas los `p` primeros? */
function repeats(ids: readonly string[], i: number, p: number, k: number): boolean {
  for (let t = p; t < p * k; t++) if (ids[i + t] !== ids[i + (t % p)]) return false;
  return true;
}

/** Vueltas del bloque entero (si se repite todo) y su contenido agrupado en series. */
export function groupHistory(ids: readonly string[]): { rounds: number; groups: HistoryGroup[] } {
  const n = ids.length;
  // vueltas del bloque: el menor periodo que repite la lista entera
  let P = n;
  for (let p = 1; p <= n / 2; p++) if (n % p === 0 && repeats(ids, 0, p, n / p)) { P = p; break; }
  const rounds = n / P || 1;
  // cada posición de una vuelta, con sus índices en todas las vueltas
  const pos: HistoryRow[] = Array.from({ length: P }, (_, j) => Array.from({ length: rounds }, (_, r) => j + r * P));
  const pid = pos.map((rows) => ids[rows[0]]);
  // series: de izquierda a derecha, el tramo que se repite seguido y cubre más ejercicios
  const groups: HistoryGroup[] = [];
  let i = 0;
  while (i < pid.length) {
    let best: { p: number; k: number } | null = null;
    for (let p = 1; p <= (pid.length - i) / 2; p++) {
      for (let k = Math.floor((pid.length - i) / p); k >= 2; k--) {
        if (repeats(pid, i, p, k) && (!best || p * k > best.p * best.k)) { best = { p, k }; break; }
      }
    }
    if (best) {
      const rows: HistoryRow[] = Array.from({ length: best.p }, (_, j) => Array.from({ length: best!.k }, (_, r) => pos[i + j + r * best!.p]).flat().sort((a, b) => a - b));
      groups.push({ times: best.k, rows });
      i += best.p * best.k;
    } else {
      groups.push({ times: 1, rows: [pos[i]] });
      i++;
    }
  }
  return { rounds, groups };
}
