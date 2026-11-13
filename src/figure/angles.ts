/**
 * Ángulo elegido para cada ejercicio: al girar el muñeco con el dedo, se recuerda ese giro
 * (en grados respecto al ángulo de siempre) y se usa en la ficha, el entrenamiento y las miniaturas.
 * Quien lo guarda (los ajustes de la app) se conecta con setAngleStore.
 */
export interface AngleStore {
  get(id: string): number | undefined;
  set(id: string, deg: number | undefined): void;
}

let store: AngleStore | null = null;

export function setAngleStore(s: AngleStore): void {
  store = s;
}

/** Giro guardado del ejercicio (0 si no se ha girado). */
export function savedAngle(id: string): number {
  return store?.get(id) ?? 0;
}

/** Guarda el giro (si vuelve casi al de siempre, se olvida). Los muñecos de muestra no se guardan. */
export function saveAngle(id: string, deg: number): void {
  if (!store || id.startsWith('preview')) return;
  const d = Math.round((((deg % 360) + 540) % 360) - 180);
  store.set(id, Math.abs(d) < 3 ? undefined : d);
}
