import {
  DEFAULT_SETTINGS,
  SECTION_IDS,
  emptyRoutine,
  type HistoryEntry,
  type Routine,
  type Settings,
} from './types';

/** Todo lo que la app guarda en el móvil. */
export interface SavedData {
  version: number;
  routine: Routine;
  settings: Settings;
  history: HistoryEntry[];
}

export const STORAGE_KEY = 'ejercicios-en-casa';
export const DATA_VERSION = 1;
const HISTORY_LIMIT = 500;

/** Almacenamiento mínimo (localStorage en la app, un mapa en las pruebas). */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Guarda y carga los datos con número de versión. Si en el futuro cambia el formato,
 * se añade un paso en `migrate` y los datos antiguos se convierten sin perderse.
 */
export class Store {
  private data: SavedData;

  constructor(private readonly kv: KeyValue | null) {
    this.data = this.load();
  }

  get routine(): Routine {
    return this.data.routine;
  }
  get settings(): Settings {
    return this.data.settings;
  }
  get history(): readonly HistoryEntry[] {
    return this.data.history;
  }

  saveRoutine(routine: Routine): void {
    this.data.routine = routine;
    this.persist();
  }

  saveSettings(settings: Settings): void {
    this.data.settings = { ...settings };
    this.persist();
  }

  addHistory(entry: HistoryEntry): void {
    this.data.history = [entry, ...this.data.history].slice(0, HISTORY_LIMIT);
    this.persist();
  }

  clearHistory(): void {
    this.data.history = [];
    this.persist();
  }

  private load(): SavedData {
    const fresh: SavedData = { version: DATA_VERSION, routine: emptyRoutine(), settings: { ...DEFAULT_SETTINGS }, history: [] };
    let raw: string | null = null;
    try {
      raw = this.kv?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return fresh;
    }
    if (!raw) return fresh;
    try {
      return Store.migrate(JSON.parse(raw), fresh);
    } catch {
      return fresh;
    }
  }

  /** Convierte datos de versiones anteriores y rellena lo que falte. */
  static migrate(input: Partial<SavedData> & { version?: number }, fresh: SavedData): SavedData {
    const out: SavedData = {
      version: DATA_VERSION,
      routine: emptyRoutine(),
      settings: { ...fresh.settings, ...(input.settings ?? {}) },
      history: Array.isArray(input.history) ? input.history : [],
    };
    for (const s of SECTION_IDS) {
      const items = input.routine?.[s];
      if (Array.isArray(items)) {
        out.routine[s] = items.filter((i) => i && typeof i.exerciseId === 'string' && Number.isFinite(i.seconds));
      }
    }
    // Aquí irán los pasos de migración cuando haya versión 2: if (input.version === 1) {...}
    return out;
  }

  private persist(): void {
    try {
      this.kv?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Sin almacenamiento disponible: la app sigue funcionando sin guardar.
    }
  }
}
