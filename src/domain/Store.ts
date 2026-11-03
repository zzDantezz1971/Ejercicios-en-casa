import {
  DEFAULT_SETTINGS,
  SECTION_IDS,
  emptyRoutine,
  type HistoryEntry,
  type Routine,
  type SavedRoutine,
  type SectionId,
  type Settings,
} from './types';

/** Todo lo que la app guarda en el móvil. */
export interface SavedData {
  version: number;
  routines: SavedRoutine[];
  activeId: string;
  settings: Settings;
  history: HistoryEntry[];
  /** Ejercicios que el usuario ha eliminado de la lista (se pueden recuperar). */
  hidden: string[];
  /** Orden personalizado de la lista de ejercicios de cada apartado (si no hay, el original). */
  order: Partial<Record<SectionId, string[]>>;
}

export const STORAGE_KEY = 'ejercicios-en-casa';
export const DATA_VERSION = 2;
export const DEFAULT_ROUTINE_NAME = 'Mi rutina';
const HISTORY_LIMIT = 500;
const NAME_MAX = 40;

/** Almacenamiento mínimo (localStorage en la app, un mapa en las pruebas). */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let idCounter = 0;
function newId(): string {
  return `t${Date.now().toString(36)}${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function newRoutine(name: string, routine: Routine = emptyRoutine()): SavedRoutine {
  return { id: newId(), name: cleanName(name), routine, createdAt: new Date().toISOString() };
}

export function cleanName(name: string): string {
  const n = name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return n || DEFAULT_ROUTINE_NAME;
}

function sanitizeRoutine(input: unknown): Routine {
  const out = emptyRoutine();
  const r = (input ?? {}) as Partial<Record<string, unknown>>;
  for (const s of SECTION_IDS) {
    const items = r[s];
    if (Array.isArray(items)) {
      out[s] = items.filter((i) => i && typeof i.exerciseId === 'string' && Number.isFinite(i.seconds));
    }
  }
  return out;
}

/**
 * Guarda y carga los datos con número de versión. Si cambia el formato, se añade un paso
 * en `migrate` y los datos antiguos se convierten sin perderse.
 *  - v1: una sola rutina (`routine`).
 *  - v2: varias tablas con nombre (`routines`) y la activa (`activeId`).
 */
export class Store {
  private data: SavedData;

  constructor(private readonly kv: KeyValue | null) {
    this.data = this.load();
  }

  /* ── Tablas ── */

  get routines(): readonly SavedRoutine[] {
    return this.data.routines;
  }

  get active(): SavedRoutine {
    return this.data.routines.find((r) => r.id === this.data.activeId) ?? this.data.routines[0];
  }

  /** Ejercicios de la tabla activa. */
  get routine(): Routine {
    return this.active.routine;
  }

  /** Guarda los ejercicios de la tabla activa. */
  saveRoutine(routine: Routine): void {
    this.active.routine = routine;
    this.persist();
  }

  setActive(id: string): void {
    if (this.data.routines.some((r) => r.id === id)) {
      this.data.activeId = id;
      this.persist();
    }
  }

  /** Crea una tabla vacía y la deja activa. */
  createRoutine(name: string): SavedRoutine {
    const r = newRoutine(name);
    this.data.routines.push(r);
    this.data.activeId = r.id;
    this.persist();
    return r;
  }

  renameRoutine(id: string, name: string): void {
    const r = this.data.routines.find((x) => x.id === id);
    if (!r) return;
    r.name = cleanName(name);
    this.persist();
  }

  /** Copia una tabla con el nombre "… (copia)" justo debajo de la original. */
  duplicateRoutine(id: string): SavedRoutine | undefined {
    const i = this.data.routines.findIndex((x) => x.id === id);
    if (i < 0) return undefined;
    const src = this.data.routines[i];
    const copy = newRoutine(`${src.name} (copia)`, structuredCloneRoutine(src.routine));
    this.data.routines.splice(i + 1, 0, copy);
    this.persist();
    return copy;
  }

  /** Borra una tabla. Siempre queda al menos una (vacía si hace falta). */
  deleteRoutine(id: string): void {
    this.data.routines = this.data.routines.filter((r) => r.id !== id);
    if (this.data.routines.length === 0) this.data.routines.push(newRoutine(DEFAULT_ROUTINE_NAME));
    if (!this.data.routines.some((r) => r.id === this.data.activeId)) this.data.activeId = this.data.routines[0].id;
    this.persist();
  }

  markUsed(id: string, when: Date = new Date()): void {
    const r = this.data.routines.find((x) => x.id === id);
    if (!r) return;
    r.lastUsed = when.toISOString();
    this.persist();
  }

  /* ── Ajustes e historial ── */

  get settings(): Settings {
    return this.data.settings;
  }
  /* ── Orden de la lista de ejercicios ── */

  /** Orden personalizado de un apartado, o undefined si se usa el original. */
  customOrder(section: SectionId): readonly string[] | undefined {
    return this.data.order[section];
  }

  setOrder(section: SectionId, ids: string[]): void {
    this.data.order[section] = [...ids];
    this.persist();
  }

  resetOrder(section: SectionId): void {
    delete this.data.order[section];
    this.persist();
  }

  /* ── Ejercicios eliminados ── */

  get hidden(): ReadonlySet<string> {
    return new Set(this.data.hidden);
  }

  /** Quita un ejercicio de la lista y de todas las tablas. */
  hideExercise(id: string): void {
    if (!this.data.hidden.includes(id)) this.data.hidden.push(id);
    for (const r of this.data.routines) {
      for (const s of SECTION_IDS) r.routine[s] = r.routine[s].filter((i) => i.exerciseId !== id);
    }
    this.persist();
  }

  /** Vuelve a mostrar un ejercicio eliminado (no lo añade a ninguna tabla). */
  restoreExercise(id: string): void {
    this.data.hidden = this.data.hidden.filter((x) => x !== id);
    this.persist();
  }

  get history(): readonly HistoryEntry[] {
    return this.data.history;
  }

  saveSettings(settings: Settings): void {
    this.data.settings = { ...settings };
    this.persist();
  }

  addHistory(entry: HistoryEntry): void {
    this.data.history = [entry, ...this.data.history].slice(0, HISTORY_LIMIT);
    this.persist();
  }

  /** Borra un entrenamiento concreto (posición en la lista, del más reciente al más antiguo). */
  deleteHistoryAt(index: number): void {
    if (index < 0 || index >= this.data.history.length) return;
    this.data.history = this.data.history.filter((_, i) => i !== index);
    this.persist();
  }

  clearHistory(): void {
    this.data.history = [];
    this.persist();
  }

  /* ── Carga y migración ── */

  private load(): SavedData {
    let raw: string | null = null;
    try {
      raw = this.kv?.getItem(STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }
    if (raw) {
      try {
        return Store.migrate(JSON.parse(raw));
      } catch {
        /* datos rotos: se empieza de cero */
      }
    }
    return Store.migrate({});
  }

  /** Convierte datos de versiones anteriores y rellena lo que falte. */
  static migrate(input: Record<string, unknown>): SavedData {
    const settings = { ...DEFAULT_SETTINGS, ...((input.settings as Partial<Settings>) ?? {}) };
    const history = Array.isArray(input.history) ? (input.history as HistoryEntry[]) : [];

    let routines: SavedRoutine[] = [];
    if (Array.isArray(input.routines)) {
      // v2
      routines = (input.routines as Array<Partial<SavedRoutine>>)
        .filter((r) => r && typeof r.id === 'string')
        .map((r) => ({
          id: r.id!,
          name: cleanName(r.name ?? ''),
          routine: sanitizeRoutine(r.routine),
          createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
          lastUsed: typeof r.lastUsed === 'string' ? r.lastUsed : undefined,
        }));
    } else if (input.routine) {
      // v1 -> v2: la rutina única pasa a ser la tabla "Mi rutina"
      routines = [newRoutine(DEFAULT_ROUTINE_NAME, sanitizeRoutine(input.routine))];
    }
    if (routines.length === 0) routines = [newRoutine(DEFAULT_ROUTINE_NAME)];
    const activeId = routines.some((r) => r.id === input.activeId) ? (input.activeId as string) : routines[0].id;

    const hidden = Array.isArray(input.hidden) ? (input.hidden as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    const order: SavedData['order'] = {};
    const rawOrder = (input.order ?? {}) as Record<string, unknown>;
    for (const s of SECTION_IDS) {
      const o = rawOrder[s];
      if (Array.isArray(o)) order[s] = o.filter((x): x is string => typeof x === 'string');
    }
    return { version: DATA_VERSION, routines, activeId, settings, history, hidden, order };
  }

  private persist(): void {
    try {
      this.kv?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Sin almacenamiento disponible: la app sigue funcionando sin guardar.
    }
  }
}

function structuredCloneRoutine(r: Routine): Routine {
  const out = emptyRoutine();
  for (const s of SECTION_IDS) out[s] = r[s].map((i) => ({ ...i }));
  return out;
}
