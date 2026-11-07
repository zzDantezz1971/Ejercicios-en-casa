import {
  DEFAULT_SETTINGS,
  SECTION_IDS,
  emptyRoutine,
  type HistoryEntry,
  type Routine,
  type SavedRoutine,
  type SectionId,
  type Settings,
  type WeightEntry,
} from './types';
import { caloriesOf, type Calories } from './calories';
import { earnedMedals } from './medals';

/** Todo lo que la app guarda en el móvil. */
export interface SavedData {
  version: number;
  routines: SavedRoutine[];
  activeId: string;
  settings: Settings;
  history: HistoryEntry[];
  /** Ejercicios que el usuario ha eliminado para siempre. */
  hidden: string[];
  /** Orden personalizado de la lista de ejercicios de cada apartado (si no hay, el original). */
  order: Partial<Record<SectionId, string[]>>;
  orderVer?: number;
  /** Fecha de la última copia de seguridad guardada (ISO). */
  lastBackup?: string;
  /** Ejercicios marcados como favoritos. */
  favorites: string[];
  /** Histórico del peso corporal, del más antiguo al más reciente. */
  weights: WeightEntry[];
  /** Último mes ("2026-10") cuyo resumen ya se ha visto o descartado. */
  summarySeen?: string;
  /** Última semana (lunes "2026-11-02") cuyo resumen ya se ha visto o descartado. */
  weekSeen?: string;
  /** Medallas conseguidas: id → fecha (ISO). */
  medals?: Record<string, string>;
}

export const STORAGE_KEY = 'ejercicios-en-casa';
export const DATA_VERSION = 2;
export const DEFAULT_ROUTINE_NAME = 'Mi rutina';
export const BACKUP_APP = 'ejercicios-en-casa';
const HISTORY_LIMIT = 500;
/** Versión del orden por defecto; al cambiar, se descartan los órdenes personalizados guardados. */
const ORDER_VER = 2;
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

function sanitizeRounds(input: unknown): Partial<Record<SectionId, number>> | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const out: Partial<Record<SectionId, number>> = {};
  for (const s of SECTION_IDS) {
    const v = (input as Record<string, unknown>)[s];
    if (typeof v === 'number' && v > 1) out[s] = Math.min(10, Math.round(v));
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeRoutine(input: unknown): Routine {
  const out = emptyRoutine();
  const r = (input ?? {}) as Partial<Record<string, unknown>>;
  for (const s of SECTION_IDS) {
    const items = r[s];
    if (Array.isArray(items)) {
      out[s] = items
        .filter((i) => i && typeof i.exerciseId === 'string' && Number.isFinite(i.seconds))
        .map((i) => (Number.isFinite(i.weight) && i.weight > 0 ? { exerciseId: i.exerciseId, seconds: i.seconds, weight: i.weight } : { exerciseId: i.exerciseId, seconds: i.seconds }));
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

  /** Vueltas de un apartado de la tabla activa. */
  setRounds(section: SectionId, n: number): void {
    const r = Math.min(10, Math.max(1, Math.round(n)));
    const a = this.active;
    a.rounds = { ...(a.rounds ?? {}), [section]: r };
    if (r === 1) delete a.rounds[section];
    this.persist();
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
  /**
   * Si un ejercicio cambia de apartado en una versión nueva, lo mueve al apartado correcto en todas
   * las tablas (al final de ese apartado). Devuelve cuántos ha movido.
   */
  fixSections(sectionOf: (id: string) => SectionId | undefined): number {
    let moved = 0;
    for (const r of this.data.routines) {
      for (const s of SECTION_IDS) {
        const keep = [];
        for (const item of r.routine[s]) {
          const real = sectionOf(item.exerciseId);
          if (real && real !== s) {
            if (!r.routine[real].some((i) => i.exerciseId === item.exerciseId)) r.routine[real].push(item);
            moved++;
          } else keep.push(item);
        }
        r.routine[s] = keep;
      }
    }
    if (moved) this.persist();
    return moved;
  }

  /* ── Copia de seguridad ── */

  get lastBackup(): string | undefined {
    return this.data.lastBackup;
  }

  /** Todo lo guardado, en texto, para la copia de seguridad. */
  exportBackup(now: Date = new Date()): string {
    return JSON.stringify({ app: BACKUP_APP, exportedAt: now.toISOString(), ...this.data, lastBackup: now.toISOString() }, null, 1);
  }

  /** Anota que la copia se ha guardado. */
  markBackedUp(now: Date = new Date()): void {
    this.data.lastBackup = now.toISOString();
    this.persist();
  }

  /** Resumen de una copia sin aplicarla (para confirmar antes de restaurar). */
  static inspectBackup(text: string): { routines: number; history: number; exportedAt?: string } {
    const d = Store.parseBackup(text);
    return { routines: d.routines.length, history: d.history.length, exportedAt: d.exportedAt };
  }

  /** Sustituye todos los datos por los de la copia. */
  importBackup(text: string): void {
    const { exportedAt: _e, ...d } = Store.parseBackup(text);
    this.data = d;
    this.persist();
  }

  private static parseBackup(text: string): SavedData & { exportedAt?: string } {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('El archivo no es una copia de Ejercicios en casa.');
    }
    const o = raw as Record<string, unknown>;
    if (!o || typeof o !== 'object' || (o.app !== BACKUP_APP && !Array.isArray(o.routines))) {
      throw new Error('El archivo no es una copia de Ejercicios en casa.');
    }
    const data = Store.migrate(o);
    if (typeof o.lastBackup === 'string') data.lastBackup = o.lastBackup;
    return { ...data, exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : undefined };
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

  /* ── Peso corporal ── */

  get weights(): readonly WeightEntry[] {
    return this.data.weights;
  }

  /** Último peso anotado. */
  get currentWeight(): number | null {
    return this.data.weights.at(-1)?.kg ?? null;
  }

  /** Peso que se tenía en una fecha (el último anotado hasta entonces; si no hay, el primero). */
  weightAt(date: string): number | null {
    const t = Date.parse(date);
    let w: number | null = this.data.weights[0]?.kg ?? null;
    for (const x of this.data.weights) if (Date.parse(x.date) <= t) w = x.kg;
    return w;
  }

  /** Anota el peso (si ya hay uno ese mismo día, lo sustituye). */
  addWeight(kg: number, when: Date = new Date()): void {
    const day = when.toDateString();
    this.data.weights = this.data.weights.filter((x) => new Date(x.date).toDateString() !== day);
    this.data.weights.push({ date: when.toISOString(), kg: roundKg(kg) });
    this.data.weights.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    this.persist();
  }

  updateWeightAt(index: number, kg: number): void {
    const x = this.data.weights[index];
    if (!x) return;
    x.kg = roundKg(kg);
    this.persist();
  }

  deleteWeightAt(index: number): void {
    this.data.weights = this.data.weights.filter((_, i) => i !== index);
    this.persist();
  }

  /** Días desde la última vez que se anotó el peso (Infinity si nunca). */
  daysSinceWeight(now: Date = new Date()): number {
    const last = this.data.weights.at(-1);
    return last ? Math.floor((now.getTime() - Date.parse(last.date)) / 864e5) : Infinity;
  }

  /** Calorías de un entrenamiento: las guardadas al terminarlo o, si no las tiene, con el peso de esa fecha. */
  caloriesFor(e: HistoryEntry): Calories | null {
    if (e.kcal != null) return { kcal: e.kcal, method: e.kcalMethod ?? 'estimado' };
    return caloriesOf(e, { ...this.data.settings.profile, weight: this.weightAt(e.date) });
  }

  /** Suma de calorías (null si no se puede calcular ninguna). */
  totalCalories(list: readonly HistoryEntry[]): number | null {
    let any = false, n = 0;
    for (const e of list) {
      const c = this.caloriesFor(e);
      if (c) { any = true; n += c.kcal; }
    }
    return any || (list.length === 0 && this.currentWeight !== null) ? n : null;
  }

  /* ── Resumen del mes ── */

  get summarySeen(): string | undefined {
    return this.data.summarySeen;
  }

  get weekSeen(): string | undefined {
    return this.data.weekSeen;
  }

  markWeekSeen(key: string): void {
    if (this.data.weekSeen === key) return;
    this.data.weekSeen = key;
    this.persist();
  }

  markSummarySeen(key: string): void {
    if (this.data.summarySeen === key) return;
    this.data.summarySeen = key;
    this.persist();
  }

  /* ── Medallas ── */

  get medals(): Readonly<Record<string, string>> {
    return this.data.medals ?? {};
  }

  /**
   * Comprueba las medallas y guarda las nuevas. Devuelve las conseguidas ahora.
   * La primera vez se apuntan las que ya se tenían sin celebrarlas.
   */
  checkMedals(now: Date = new Date()): string[] {
    const first = !this.data.medals;
    const have = { ...(this.data.medals ?? {}) };
    const kcal = this.data.history.reduce((n, e) => n + (this.caloriesFor(e)?.kcal ?? 0), 0);
    const got = earnedMedals({ history: this.data.history, weights: this.data.weights, goalKg: this.data.settings.profile.goalKg, kcal });
    const fresh = got.filter((id) => !have[id]);
    if (!fresh.length && !first) return [];
    for (const id of fresh) have[id] = now.toISOString();
    this.data.medals = have;
    this.persist();
    return first ? [] : fresh;
  }

  /* ── Favoritos ── */

  get favorites(): ReadonlySet<string> {
    return new Set(this.data.favorites);
  }

  /** Marca o desmarca un favorito. Devuelve si queda como favorito. */
  toggleFavorite(id: string): boolean {
    const on = !this.data.favorites.includes(id);
    this.data.favorites = on ? [...this.data.favorites, id] : this.data.favorites.filter((x) => x !== id);
    this.persist();
    return on;
  }

  /* ── Peso ── */

  /** Último peso usado en un ejercicio: el del entrenamiento más reciente o, si no, el de alguna tabla. */
  lastWeight(id: string): number | undefined {
    for (const e of this.data.history) {
      const w = e.items?.find((i) => i.exerciseId === id && i.weight)?.weight;
      if (w) return w;
    }
    for (const r of [this.active, ...this.data.routines]) {
      for (const s of SECTION_IDS) {
        const w = r.routine[s].find((i) => i.exerciseId === id && i.weight)?.weight;
        if (w) return w;
      }
    }
    return undefined;
  }

  /** Días desde la última copia (Infinity si nunca se ha hecho). */
  daysSinceBackup(now: Date = new Date()): number {
    if (!this.data.lastBackup) return Infinity;
    return Math.floor((now.getTime() - Date.parse(this.data.lastBackup)) / 864e5);
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

  get history(): readonly HistoryEntry[] {
    return this.data.history;
  }

  saveSettings(settings: Settings): void {
    this.data.settings = { ...settings, rest: { ...settings.rest }, profile: { ...settings.profile } };
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
    const rawSettings = (input.settings ?? {}) as Partial<Settings> & { restSeconds?: number };
    const { restSeconds, mannequin: _m, ...known } = rawSettings as typeof rawSettings & { mannequin?: unknown };
    const settings: Settings = { ...DEFAULT_SETTINGS, ...known };
    settings.profile = { ...DEFAULT_SETTINGS.profile, ...(known.profile ?? {}) };
    // antes eran frases propias; ahora solo se elige si se muestran
    settings.phrases = typeof known.phrases === 'boolean' ? known.phrases : true;
    // v anteriores: una sola pausa para todo -> la misma en cada apartado
    const oldRest = Number.isFinite(restSeconds) ? (restSeconds as number) : undefined;
    settings.rest = Object.fromEntries(
      SECTION_IDS.map((s) => [s, Number.isFinite(known.rest?.[s]) ? known.rest![s] : (oldRest ?? DEFAULT_SETTINGS.rest[s])]),
    ) as Settings['rest'];
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
          rounds: sanitizeRounds(r.rounds),
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
    const lastBackup = typeof input.lastBackup === 'string' ? input.lastBackup : undefined;
    const favorites = Array.isArray(input.favorites) ? (input.favorites as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    let weights: WeightEntry[] = Array.isArray(input.weights)
      ? (input.weights as WeightEntry[]).filter((w) => w && typeof w.date === 'string' && Number.isFinite(w.kg) && w.kg > 0)
      : [];
    // versión anterior: un solo peso en Mis datos -> primera anotación del histórico
    if (!weights.length && Number.isFinite(settings.profile.weight) && settings.profile.weight! > 0) {
      weights = [{ date: new Date().toISOString(), kg: settings.profile.weight! }];
    }
    delete settings.profile.weight;
    weights.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    // nueva ordenación por zonas: se descarta una sola vez el orden personalizado anterior
    if (input.orderVer !== ORDER_VER) for (const k of Object.keys(order)) delete order[k as SectionId];
    const summarySeen = typeof input.summarySeen === 'string' ? input.summarySeen : undefined;
    const weekSeen = typeof input.weekSeen === 'string' ? input.weekSeen : undefined;
    const medals = input.medals && typeof input.medals === 'object' ? (input.medals as Record<string, string>) : undefined;
    return { version: DATA_VERSION, routines, activeId, settings, history, hidden, order, orderVer: ORDER_VER, lastBackup, favorites, weights, summarySeen, weekSeen, medals };
  }

  private persist(): void {
    try {
      this.kv?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Sin almacenamiento disponible: la app sigue funcionando sin guardar.
    }
  }
}

function roundKg(kg: number): number {
  return Math.round(Math.min(300, Math.max(20, kg)) * 10) / 10;
}

function structuredCloneRoutine(r: Routine): Routine {
  const out = emptyRoutine();
  for (const s of SECTION_IDS) out[s] = r[s].map((i) => ({ ...i }));
  return out;
}
