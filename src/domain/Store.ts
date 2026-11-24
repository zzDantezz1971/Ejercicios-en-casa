import { DEFAULT_ANGLES, DEFAULT_ANGLES_VER } from '../data/defaultAngles';
import { EQUIPMENT, type Equip } from './equipment';
import {
  DEFAULT_SETTINGS,
  SECTION_IDS,
  sectionOrder,
  SEXES,
  emptyRoutine,
  type FreeEntry,
  type FreeNode,
  type HistoryEntry,
  type Routine,
  type SavedRoutine,
  type SectionId,
  type Settings,
  type TableGroup,
  type WeightKind,
  type WeightEntry,
} from './types';
import { caloriesOf, type Calories } from './calories';
import { countsForMedals, earnedMedals } from './medals';

/** Reglas de las medallas: al subir este número, las medallas se recalculan una vez (se quitan las que ya no se cumplen). */
const MEDALS_VER = 3;
import { sanitizePlan, type WeekPlan } from './weekPlan';
import { remindersOf } from './reminders';

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
  /** Orden propio por apartado y tipo de orden (clave «apartado» = por zona; «apartado:tipo» = los demás). */
  order: Partial<Record<string, string[]>>;
  orderVer?: number;
  /** Versión de «ejercicios que vuelven»: los que se habían quitado de la lista y han vuelto (se enseñan una vez). */
  unhideVer?: number;
  /** Fecha de la última copia de seguridad guardada (ISO). */
  lastBackup?: string;
  /** Primer día de uso de la app (ISO): (antes se usaba para el historial de la versión gratis). */
  firstUse?: string;
  /** Ejercicios marcados como favoritos. */
  favorites: string[];
  /** Histórico del peso corporal, del más antiguo al más reciente. */
  weights: WeightEntry[];
  /** Último mes ("2026-10") cuyo resumen ya se ha visto o descartado. */
  summarySeen?: string;
  /** Última semana (lunes "2026-11-02") cuyo resumen ya se ha visto o descartado. */
  weekSeen?: string;
  /** Ya se ha pasado por la bienvenida (idioma y datos personales) de la primera vez. */
  welcomed: boolean;
  /** Medallas conseguidas: id → fecha (ISO). */
  medals?: Record<string, string>;
  /** Versión de las reglas de las medallas con que se calcularon (al cambiar, se vuelven a calcular una vez). */
  medalsVer?: number;
  /** Planes de la semana (Prémium); uno de ellos está en uso. */
  plans?: WeekPlan[];
  activePlanId?: string;
  /** Grupos de tablas de «Mis tablas». */
  groups?: TableGroup[];
}

export const STORAGE_KEY = 'ejercicios-en-casa';
export const DATA_VERSION = 2;
export const DEFAULT_ROUTINE_NAME = 'Mi rutina';
export const BACKUP_APP = 'ejercicios-en-casa';
const HISTORY_LIMIT = 500;
/** Versión del orden por defecto; al cambiar, se descartan los órdenes personalizados guardados. */
const ORDER_VER = 2;
/** Ejercicios que volvieron a las listas: si los habías quitado de la tuya, vuelven a salir (una sola vez). */
const UNHIDE: Array<[number, string[]]> = [[1, ['torsion-de-columna-con-piernas-cruzadas', 'gemelos-contra-la-pared']]];
const UNHIDE_VER = UNHIDE[UNHIDE.length - 1][0];
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

/** Guarda el orden de los bloques de una tabla (el de siempre no se guarda). */
function setOrderOf(r: SavedRoutine, order: readonly SectionId[]): void {
  const o = sectionOrder(order);
  if (o.join() === SECTION_IDS.join()) delete r.order;
  else r.order = o;
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
        .map((i) => ({
          exerciseId: i.exerciseId, seconds: i.seconds,
          ...(Number.isFinite(i.weight) && i.weight > 0 ? { weight: i.weight } : {}),
          ...(Number.isFinite(i.reps) && i.reps >= 1 ? { reps: Math.min(100, Math.round(i.reps)) } : {}),
          // serie dentro del bloque (los seguidos con el mismo id se repiten sus vueltas)
          ...(i.series && typeof i.series.id === 'string' && Number.isFinite(i.series.rounds) ? { series: { id: i.series.id, rounds: Math.min(10, Math.max(1, Math.round(i.series.rounds))) } } : {}),
        }));
    }
  }
  return out;
}

/** Comprueba la lista de una tabla libre (de una copia o de una versión anterior). */
export function sanitizeFree(input: unknown): FreeNode[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const secs = (v: unknown, max: number) => (Number.isFinite(v) ? Math.min(max, Math.max(1, Math.round(v as number))) : undefined);
  const entry = (x: unknown): FreeEntry | null => {
    const e = x as Partial<Record<string, unknown>> | null;
    if (!e) return null;
    if (e.kind === 'rest') { const t = secs(e.seconds, 900); return t ? { kind: 'rest', seconds: t } : null; }
    if (e.kind === 'ex' && typeof e.exerciseId === 'string') {
      const t = secs(e.seconds, 900);
      if (!t) return null;
      const w = Number.isFinite(e.weight) && (e.weight as number) > 0 ? { weight: e.weight as number } : {};
      const r = secs(e.reps, 100);
      return { kind: 'ex', exerciseId: e.exerciseId, seconds: t, ...w, ...(r ? { reps: r } : {}) };
    }
    return null;
  };
  const out: FreeNode[] = [];
  for (const x of input) {
    const g = x as Partial<Record<string, unknown>> | null;
    if (g && g.kind === 'group' && Array.isArray(g.items)) {
      const items = g.items.map(entry).filter((e): e is FreeEntry => !!e);
      if (items.length) out.push({ kind: 'group', rounds: Math.min(10, Math.max(1, Math.round(Number(g.rounds) || 1))), items });
    } else {
      const e = entry(x);
      if (e) out.push(e);
    }
  }
  return out;
}

const cloneFree = (free: readonly FreeNode[]): FreeNode[] => JSON.parse(JSON.stringify(free)) as FreeNode[];

/**
 * Guarda y carga los datos con número de versión. Si cambia el formato, se añade un paso
 * en `migrate` y los datos antiguos se convierten sin perderse.
 *  - v1: una sola rutina (`routine`).
 *  - v2: varias tablas con nombre (`routines`) y la activa (`activeId`).
 */
/** Clave del orden propio: el de zona usa solo el apartado (como siempre); los demás, «apartado:tipo». */
function orderKey(section: SectionId, sort: string): string {
  return sort === 'zona' ? section : `${section}:${sort}`;
}

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
    delete this.active.free;
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

  /** Crea una tabla con ejercicios (del asistente o de una tabla hecha) y la deja activa. */
  createRoutineFrom(name: string, routine: Routine, rounds: Partial<Record<SectionId, number>> = {}, order?: SectionId[]): SavedRoutine {
    const r = newRoutine(name, structuredCloneRoutine(routine));
    if (Object.keys(rounds).length) r.rounds = { ...rounds };
    if (order) r.order = sectionOrder(order);
    this.data.routines.push(r);
    this.data.activeId = r.id;
    this.persist();
    return r;
  }

  /** Llena la tabla activa (vacía) con estos ejercicios y le pone este nombre. */
  fillActive(name: string, routine: Routine, rounds: Partial<Record<SectionId, number>> = {}, order?: SectionId[]): void {
    const a = this.active;
    a.name = cleanName(name);
    a.routine = structuredCloneRoutine(routine);
    delete a.free;
    if (Object.keys(rounds).length) a.rounds = { ...rounds };
    else delete a.rounds;
    if (order) a.order = sectionOrder(order);
    else delete a.order;
    this.persist();
  }

  /** Crea una tabla con ejercicios sin cambiar la activa (las del plan de la semana). */
  addRoutine(name: string, routine: Routine, rounds: Partial<Record<SectionId, number>> = {}, order?: SectionId[]): SavedRoutine {
    const r = newRoutine(name, structuredCloneRoutine(routine));
    if (Object.keys(rounds).length) r.rounds = { ...rounds };
    if (order) r.order = sectionOrder(order);
    this.data.routines.push(r);
    this.persist();
    return r;
  }

  /** Cambia los ejercicios (y las vueltas) de una tabla cualquiera; con `order`, también el orden de sus bloques. */
  setRoutineContent(id: string, routine: Routine, rounds: Partial<Record<SectionId, number>> = {}, order?: readonly SectionId[]): void {
    const r = this.data.routines.find((x) => x.id === id);
    if (!r) return;
    r.routine = structuredCloneRoutine(routine);
    delete r.free;
    if (Object.keys(rounds).length) r.rounds = { ...rounds };
    else delete r.rounds;
    if (order) setOrderOf(r, order);
    this.persist();
  }

  /** Crea una tabla libre vacía y la deja activa. */
  createFreeRoutine(name: string): SavedRoutine {
    const r = newRoutine(name);
    r.free = [];
    this.data.routines.push(r);
    this.data.activeId = r.id;
    this.persist();
    return r;
  }

  /**
   * Cambia la lista de una tabla libre (o pasa a libre una tabla por bloques). `routine`: el reflejo por tipos.
   * Una tabla libre no tiene vueltas por bloque ni orden de bloques (las series van en la lista).
   */
  setFreeContent(id: string, free: readonly FreeNode[], routine: Routine, name?: string): void {
    const r = this.data.routines.find((x) => x.id === id);
    if (!r) return;
    r.free = cloneFree(free);
    r.routine = structuredCloneRoutine(routine);
    delete r.rounds;
    delete r.order;
    if (name) r.name = cleanName(name);
    this.persist();
  }

  /** Cambia el orden de los bloques de una tabla. */
  setSectionOrder(id: string, order: readonly SectionId[]): void {
    const r = this.data.routines.find((x) => x.id === id);
    if (!r) return;
    setOrderOf(r, order);
    this.persist();
  }

  routineById(id: string): SavedRoutine | undefined {
    return this.data.routines.find((x) => x.id === id);
  }

  /* ── Plan de la semana ── */

  /** El plan en uso (si hay alguno). */
  get plan(): WeekPlan | undefined {
    const ps = this.data.plans ?? [];
    return ps.find((p) => p.id === this.data.activePlanId) ?? ps[0];
  }

  get plans(): readonly WeekPlan[] {
    return this.data.plans ?? [];
  }

  planById(id: string): WeekPlan | undefined {
    return this.data.plans?.find((p) => p.id === id);
  }

  /** Guarda un plan (nuevo o cambiado). Uno nuevo pasa a estar en uso. */
  setPlan(plan: WeekPlan): void {
    const ps = [...(this.data.plans ?? [])];
    const i = ps.findIndex((p) => p.id === plan.id);
    if (i >= 0) ps[i] = plan;
    else { ps.push(plan); this.data.activePlanId = plan.id; }
    this.data.plans = ps;
    this.persist();
  }

  setActivePlan(id: string): void {
    if (!this.data.plans?.some((p) => p.id === id)) return;
    this.data.activePlanId = id;
    this.persist();
  }

  renamePlan(id: string, name: string): void {
    const p = this.planById(id);
    if (!p) return;
    const n = name.trim().slice(0, NAME_MAX);
    this.setPlan(n ? { ...p, name: n } : (({ name: _n, ...rest }) => rest)(p));
  }

  /** ¿Es la tabla de algún día de algún plan? */
  isPlanRoutine(id: string): boolean {
    return (this.data.plans ?? []).some((p) => p.days.some((d) => d.routineId === id));
  }

  /** Borra un plan y, si se pide, sus tablas. */
  deletePlan(id: string, withTables: boolean): void {
    const plan = this.planById(id);
    if (!plan) return;
    const ids = new Set(plan.days.map((d) => d.routineId));
    this.data.plans = (this.data.plans ?? []).filter((p) => p.id !== id);
    if (!this.data.plans.length) delete this.data.plans;
    if (this.data.activePlanId === id) {
      if (this.data.plans?.length) this.data.activePlanId = this.data.plans[0].id;
      else delete this.data.activePlanId;
    }
    if (withTables && ids.size) {
      this.data.routines = this.data.routines.filter((r) => !ids.has(r.id));
      if (this.data.routines.length === 0) this.data.routines.push(newRoutine(DEFAULT_ROUTINE_NAME));
      if (!this.data.routines.some((r) => r.id === this.data.activeId)) this.data.activeId = this.data.routines[0].id;
    }
    this.persist();
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
    if (src.rounds) copy.rounds = { ...src.rounds };
    if (src.order) copy.order = [...src.order];
    if (src.free) copy.free = cloneFree(src.free);
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

  /* ── Grupos de tablas ── */

  get groups(): readonly TableGroup[] {
    return this.data.groups ?? [];
  }

  /** Crea un grupo (vacío) y devuelve su id. */
  createGroup(name: string): string {
    const g: TableGroup = { id: newId(), name: cleanName(name) };
    this.data.groups = [...(this.data.groups ?? []), g];
    this.persist();
    return g.id;
  }

  renameGroup(id: string, name: string): void {
    const g = this.data.groups?.find((x) => x.id === id);
    if (!g) return;
    g.name = cleanName(name);
    this.persist();
  }

  /** Borra un grupo. Sus tablas vuelven a la lista o, con `withTables`, se borran también (siempre queda al menos una). */
  deleteGroup(id: string, withTables = false): void {
    this.data.groups = (this.data.groups ?? []).filter((g) => g.id !== id);
    if (withTables) {
      this.data.routines = this.data.routines.filter((r) => r.group !== id);
      if (this.data.routines.length === 0) this.data.routines.push(newRoutine(DEFAULT_ROUTINE_NAME));
      if (!this.data.routines.some((r) => r.id === this.data.activeId)) this.data.activeId = this.data.routines[0].id;
    } else {
      for (const r of this.data.routines) if (r.group === id) delete r.group;
    }
    this.persist();
  }

  /** Mete una tabla en un grupo (o la saca, con null). */
  moveToGroup(routineId: string, groupId: string | null): void {
    const r = this.data.routines.find((x) => x.id === routineId);
    if (!r) return;
    if (groupId && this.data.groups?.some((g) => g.id === groupId)) r.group = groupId;
    else delete r.group;
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

  /** Primer día de uso de la app. */
  get firstUse(): Date {
    return new Date(this.data.firstUse ?? Date.now());
  }

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
      throw new Error('El archivo no es una copia de Kasa Fit.');
    }
    const o = raw as Record<string, unknown>;
    if (!o || typeof o !== 'object' || (o.app !== BACKUP_APP && !Array.isArray(o.routines))) {
      throw new Error('El archivo no es una copia de Kasa Fit.');
    }
    const data = Store.migrate(o);
    if (typeof o.lastBackup === 'string') data.lastBackup = o.lastBackup;
    return { ...data, exportedAt: typeof o.exportedAt === 'string' ? o.exportedAt : undefined };
  }

  /* ── Orden de la lista de ejercicios ── */

  /** Orden personalizado de un apartado, o undefined si se usa el original. */
  customOrder(section: SectionId, sort = 'zona'): readonly string[] | undefined {
    return this.data.order[orderKey(section, sort)];
  }

  setOrder(section: SectionId, ids: string[], sort = 'zona'): void {
    this.data.order[orderKey(section, sort)] = [...ids];
    this.persist();
  }

  resetOrder(section: SectionId, sort = 'zona'): void {
    delete this.data.order[orderKey(section, sort)];
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
    this.onWeightAdded?.(roundKg(kg), when.toISOString());
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
  /** Con qué peso se hace cada ejercicio (lo pone la app, que tiene el catálogo): para las medallas de fuerza. */
  weightKindOf?: (exerciseId: string) => WeightKind | undefined;

  /** ¿Las medallas se calcularon con unas reglas anteriores? */
  get medalsOutdated(): boolean {
    return this.data.medalsVer !== MEDALS_VER;
  }

  checkMedals(now: Date = new Date()): string[] {
    const first = !this.data.medals;
    const have = { ...(this.data.medals ?? {}) };
    // las calorías solo de los entrenamientos que cuentan para las medallas (10 minutos o más)
    const kcal = this.data.history.filter(countsForMedals).reduce((n, e) => n + (this.caloriesFor(e)?.kcal ?? 0), 0);
    const got = earnedMedals({ history: this.data.history, weights: this.data.weights, goalKg: this.data.settings.profile.goalKg, kcal, planDays: this.plan?.days.map((d) => d.day), kindOf: this.weightKindOf });
    // reglas nuevas: se vuelven a calcular una vez; se quedan (con su fecha) las que se siguen cumpliendo,
    // se quitan las demás y las nuevas se apuntan sin celebrarlas
    if (this.data.medalsVer !== MEDALS_VER) {
      const keep: Record<string, string> = {};
      for (const id of got) keep[id] = have[id] ?? now.toISOString();
      this.data.medals = keep;
      this.data.medalsVer = MEDALS_VER;
      this.persist();
      return [];
    }
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
    this.data.settings = { ...settings, rest: { ...settings.rest }, profile: { ...settings.profile }, weekGoals: { ...settings.weekGoals } };
    this.persist();
  }

  addHistory(entry: HistoryEntry): void {
    this.data.history = [entry, ...this.data.history].slice(0, HISTORY_LIMIT);
    this.persist();
    this.onHistoryAdded?.(entry);
  }

  /** Copia un entrenamiento del historial a otra fecha y hora (p. ej. uno que se perdió). */
  copyHistoryTo(entry: HistoryEntry, date: Date): HistoryEntry {
    const copy: HistoryEntry = { ...structuredClone(entry), date: date.toISOString() };
    this.data.history = [copy, ...this.data.history]
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, HISTORY_LIMIT);
    this.persist();
    return copy;
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

  /* ── Bienvenida de la primera vez ── */

  get welcomed(): boolean {
    return this.data.welcomed;
  }

  markWelcomed(): void {
    this.data.welcomed = true;
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
    if (!SEXES.includes(settings.profile.sex)) settings.profile.sex = DEFAULT_SETTINGS.profile.sex;
    // antes eran frases propias; ahora solo se elige si se muestran
    settings.phrases = typeof known.phrases === 'boolean' ? known.phrases : true;
    if (!['ca', 'es', 'en', 'gl', 'eu'].includes(settings.lang)) settings.lang = 'ca';
    if (!['dark', 'light', 'auto'].includes(settings.theme)) settings.theme = 'dark';
    if (settings.fontSize !== 'large') settings.fontSize = 'normal';
    if (typeof settings.askMusic !== 'boolean') settings.askMusic = true;
    // antes solo había «bajar la música» (sí / no); quien lo tenía apagado sigue sin tocarla
    if (!['pause', 'duck', 'off'].includes(known.musicMode as string)) settings.musicMode = known.duckMusic === false ? 'off' : 'duck';
    // solo queda el muñeco de piezas (el realista y el de dibujo se quitaron)
    settings.figureStyle = 'pieces';
    // material: quien ya usaba la app (antes de existir esta opción) tenía mancuernas y banco
    settings.equipment = Array.isArray(known.equipment)
      ? known.equipment.filter((e): e is Equip => (EQUIPMENT as readonly string[]).includes(e))
      : Object.keys(input).length > 0 ? ['mancuernas', 'banco'] : [];
    const wg = (known.weekGoals ?? {}) as Partial<Settings['weekGoals']>;
    settings.weekGoals = {
      minutes: Number.isFinite(wg.minutes) && wg.minutes! >= 10 ? Math.round(wg.minutes!) : 150,
      kcal: Number.isFinite(wg.kcal) && wg.kcal! >= 50 ? Math.round(wg.kcal!) : null,
    };
    // v anteriores: una sola pausa para todo -> la misma en cada apartado
    const oldRest = Number.isFinite(restSeconds) ? (restSeconds as number) : undefined;
    settings.rest = Object.fromEntries(
      SECTION_IDS.map((s) => [s, Number.isFinite(known.rest?.[s]) ? known.rest![s] : (oldRest ?? DEFAULT_SETTINGS.rest[s])]),
    ) as Settings['rest'];
    // ángulos: los guardados son giros respecto al predeterminado; al cambiar los predeterminados (DEFAULT_ANGLES),
    // se recalculan una sola vez respecto a los nuevos para que se siga viendo igual (y sin sumarse dos veces)
    if (known.anglesVer !== DEFAULT_ANGLES_VER) {
      if (settings.angles) {
        const angles = { ...settings.angles };
        for (const [id, base] of Object.entries(DEFAULT_ANGLES)) {
          if (!(id in angles)) continue;
          const d = Math.round(((((angles[id] - base) % 360) + 540) % 360) - 180);
          if (Math.abs(d) < 3) delete angles[id]; else angles[id] = d;
        }
        settings.angles = angles;
      }
      settings.anglesVer = DEFAULT_ANGLES_VER;
    }
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
          ...(typeof r.group === 'string' ? { group: r.group } : {}),
          ...(Array.isArray(r.free) ? { free: sanitizeFree(r.free)! } : {}),
          ...(Array.isArray(r.order) && sectionOrder(r.order).join() === r.order.join() && r.order.join() !== SECTION_IDS.join() ? { order: [...r.order] } : {}),
        }));
    } else if (input.routine) {
      // v1 -> v2: la rutina única pasa a ser la tabla "Mi rutina"
      routines = [newRoutine(DEFAULT_ROUTINE_NAME, sanitizeRoutine(input.routine))];
    }
    if (routines.length === 0) routines = [newRoutine(DEFAULT_ROUTINE_NAME)];
    const activeId = routines.some((r) => r.id === input.activeId) ? (input.activeId as string) : routines[0].id;

    const prevUnhide = typeof input.unhideVer === 'number' ? input.unhideVer : 0;
    const back = new Set(UNHIDE.filter(([v]) => v > prevUnhide).flatMap(([, ids]) => ids));
    const hidden = Array.isArray(input.hidden) ? (input.hidden as unknown[]).filter((x): x is string => typeof x === 'string' && !back.has(x)) : [];
    const order: SavedData['order'] = {};
    const rawOrder = (input.order ?? {}) as Record<string, unknown>;
    for (const [k, o] of Object.entries(rawOrder)) {
      if (!SECTION_IDS.includes(k.split(':')[0] as SectionId) || !Array.isArray(o)) continue;
      order[k] = o.filter((x): x is string => typeof x === 'string');
    }
    const lastBackup = typeof input.lastBackup === 'string' ? input.lastBackup : undefined;
    // primer uso: si no consta, el entrenamiento más antiguo (o ahora)
    const firstTimes = [typeof input.firstUse === 'string' ? Date.parse(input.firstUse) : NaN, ...history.map((e) => Date.parse(e.date)), Date.now()]
      .filter((t) => Number.isFinite(t));
    const firstUse = new Date(Math.min(...firstTimes)).toISOString();
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
    if (input.orderVer !== ORDER_VER) for (const k of Object.keys(order)) delete order[k];
    const summarySeen = typeof input.summarySeen === 'string' ? input.summarySeen : undefined;
    const weekSeen = typeof input.weekSeen === 'string' ? input.weekSeen : undefined;
    const medals = input.medals && typeof input.medals === 'object' ? (input.medals as Record<string, string>) : undefined;
    const medalsVer = typeof input.medalsVer === 'number' ? input.medalsVer : undefined;
    // bienvenida: si no consta, solo la ve quien empieza de cero (con datos de antes, ya se da por vista)
    const welcomed = typeof input.welcomed === 'boolean' ? input.welcomed : Object.keys(input).length > 0;
    // planes de la semana (antes solo había uno: `plan`)
    const rawPlans = Array.isArray(input.plans) ? input.plans : input.plan ? [input.plan] : [];
    const seenIds = new Set<string>();
    const plans = rawPlans.map(sanitizePlan).filter((p): p is WeekPlan => !!p && !seenIds.has(p.id) && !!seenIds.add(p.id));
    const activePlanId = plans.some((p) => p.id === input.activePlanId) ? (input.activePlanId as string) : plans[0]?.id;
    // antes cada plan tenía su propio aviso; ahora hay uno solo (Entrenamiento), que puede seguir el plan en uso
    const planRemind = (plans.find((p) => p.id === activePlanId && p.remind?.on) ?? plans.find((p) => p.remind?.on))?.remind;
    if (planRemind) {
      const r = remindersOf(settings.reminders);
      settings.reminders = { ...r, train: { ...r.train, on: true, followPlan: true, ...(r.train.on ? {} : { time: planRemind.time }) } };
    }
    for (const p of plans) delete p.remind;
    // grupos de tablas: sin repetir; las tablas de un grupo que ya no existe vuelven a la lista
    const seenG = new Set<string>();
    const groups = (Array.isArray(input.groups) ? (input.groups as Array<Partial<TableGroup>>) : [])
      .filter((g): g is TableGroup => !!g && typeof g.id === 'string' && typeof g.name === 'string' && !seenG.has(g.id) && !!seenG.add(g.id))
      .map((g) => ({ id: g.id, name: cleanName(g.name) }));
    for (const r of routines) if (r.group && !seenG.has(r.group)) delete r.group;
    return {
      version: DATA_VERSION, routines, activeId, settings, history, hidden, order, orderVer: ORDER_VER, unhideVer: UNHIDE_VER, lastBackup, firstUse, favorites, weights,
      summarySeen, weekSeen, medals, medalsVer, welcomed, ...(plans.length ? { plans, activePlanId } : {}), ...(groups.length ? { groups } : {}),
    };
  }

  /** Se llama cada vez que se guardan datos (p. ej., para volver a programar los recordatorios). */
  onSaved: (() => void) | null = null;
  /** Al guardar un entrenamiento nuevo o anotar el peso (p. ej., para Health Connect). */
  onHistoryAdded: ((e: HistoryEntry) => void) | null = null;
  onWeightAdded: ((kg: number, date: string) => void) | null = null;

  private persist(): void {
    try {
      this.kv?.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Sin almacenamiento disponible: la app sigue funcionando sin guardar.
    }
    this.onSaved?.();
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
