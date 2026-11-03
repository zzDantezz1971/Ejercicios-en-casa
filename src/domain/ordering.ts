import type { ExerciseDef } from './types';

/**
 * Aplica un orden personalizado a la lista de un apartado.
 * Los ejercicios que no están en el orden guardado (por ejemplo, nuevos) van al final, en su orden original.
 */
export function applyOrder(exercises: readonly ExerciseDef[], order: readonly string[] | undefined): ExerciseDef[] {
  if (!order) return [...exercises];
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const out: ExerciseDef[] = [];
  for (const id of order) {
    const e = byId.get(id);
    if (e) {
      out.push(e);
      byId.delete(id);
    }
  }
  for (const e of exercises) if (byId.has(e.id)) out.push(e);
  return out;
}

/** Mueve un elemento de `from` a `to` (devuelve una lista nueva). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const [x] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, x);
  return out;
}
