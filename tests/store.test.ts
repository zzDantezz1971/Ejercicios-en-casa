import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTINE_NAME, STORAGE_KEY, Store, type KeyValue } from '../src/domain/Store';
import { RoutineEditor } from '../src/domain/RoutineEditor';
import { DEFAULT_SETTINGS, emptyRoutine } from '../src/domain/types';

function memory(initial?: string): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial) data.set(STORAGE_KEY, initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('Store', () => {
  it('empieza con una tabla vacía "Mi rutina" y ajustes por defecto', () => {
    const store = new Store(memory());
    expect(store.settings).toEqual(DEFAULT_SETTINGS);
    expect(store.routines).toHaveLength(1);
    expect(store.active.name).toBe(DEFAULT_ROUTINE_NAME);
    expect(store.routine).toEqual(emptyRoutine());
  });

  it('guarda los cambios y los recupera al volver a abrir', () => {
    const kv = memory();
    const store = new Store(kv);
    store.saveSettings({ ...DEFAULT_SETTINGS, restSeconds: 8 });
    const r = emptyRoutine();
    r.pesas = [{ exerciseId: 'x', seconds: 30 }];
    store.saveRoutine(r);
    const again = new Store(kv);
    expect(again.settings.restSeconds).toBe(8);
    expect(again.routine.pesas).toEqual([{ exerciseId: 'x', seconds: 30 }]);
  });

  it('convierte la rutina única de la versión 1 en la tabla "Mi rutina" sin perder nada', () => {
    const v1 = {
      version: 1,
      settings: { restSeconds: 12 },
      routine: { pesas: [{ exerciseId: 'x', seconds: 30 }, { bad: 1 }] },
      history: [{ date: '2026-11-01T10:00:00Z', durationSec: 600, exercisesDone: 5, exercisesPlanned: 5, sections: ['pesas'], completed: true }],
    };
    const store = new Store(memory(JSON.stringify(v1)));
    expect(store.routines).toHaveLength(1);
    expect(store.active.name).toBe('Mi rutina');
    expect(store.routine.pesas).toEqual([{ exerciseId: 'x', seconds: 30 }]);
    expect(store.settings.restSeconds).toBe(12);
    expect(store.settings.sectionCountdown).toBe(DEFAULT_SETTINGS.sectionCountdown);
    expect(store.history).toHaveLength(1);
  });

  it('crea, renombra, duplica, cambia y borra tablas', () => {
    const kv = memory();
    const store = new Store(kv);
    const first = store.active;
    const r = emptyRoutine();
    r.abdominales = [{ exerciseId: 'a', seconds: 40 }];
    store.saveRoutine(r);

    const arms = store.createRoutine('  Día   de brazos ');
    expect(arms.name).toBe('Día de brazos');
    expect(store.active.id).toBe(arms.id);
    expect(store.routine).toEqual(emptyRoutine());

    store.renameRoutine(arms.id, 'Brazos');
    expect(store.active.name).toBe('Brazos');
    store.renameRoutine(arms.id, '   ');
    expect(store.active.name).toBe(DEFAULT_ROUTINE_NAME);

    const copy = store.duplicateRoutine(first.id)!;
    expect(copy.name).toBe(`${first.name} (copia)`);
    expect(store.routines.map((x) => x.id)).toEqual([first.id, copy.id, arms.id]);
    // la copia es independiente
    store.setActive(copy.id);
    store.saveRoutine(emptyRoutine());
    store.setActive(first.id);
    expect(store.routine.abdominales).toHaveLength(1);

    store.deleteRoutine(first.id);
    expect(store.routines.map((x) => x.id)).toEqual([copy.id, arms.id]);
    expect(store.active.id).toBe(copy.id);

    const again = new Store(kv);
    expect(again.routines.map((x) => x.name)).toEqual([`${DEFAULT_ROUTINE_NAME} (copia)`, DEFAULT_ROUTINE_NAME]);
  });

  it('siempre queda al menos una tabla', () => {
    const store = new Store(memory());
    store.deleteRoutine(store.active.id);
    expect(store.routines).toHaveLength(1);
    expect(store.routine).toEqual(emptyRoutine());
  });

  it('recuerda la última vez que se usó una tabla', () => {
    const store = new Store(memory());
    store.markUsed(store.active.id, new Date('2026-11-03T09:00:00Z'));
    expect(store.active.lastUsed).toBe('2026-11-03T09:00:00.000Z');
  });

  it('descarta datos rotos y funciona sin almacenamiento', () => {
    expect(new Store(memory('{no es json')).routine).toEqual(emptyRoutine());
    const store = new Store(null);
    store.createRoutine('X');
    expect(store.routines).toHaveLength(2);
  });
});

describe('RoutineEditor', () => {
  it('numera en el orden en que se marcan y renumera al desmarcar', () => {
    const ed = new RoutineEditor(emptyRoutine());
    ed.toggle('pesas', 'x', 30);
    ed.toggle('pesas', 'y', 30);
    ed.toggle('pesas', 'z', 30);
    expect(ed.position('pesas', 'z')).toBe(3);
    ed.toggle('pesas', 'x', 30);
    expect(ed.position('pesas', 'y')).toBe(1);
    expect(ed.position('pesas', 'z')).toBe(2);
    expect(ed.position('pesas', 'x')).toBe(0);
  });

  it('limita la duración entre 5 s y 10 min', () => {
    const ed = new RoutineEditor(emptyRoutine());
    ed.toggle('abdominales', 'a', 30);
    ed.adjust('abdominales', 'a', -100);
    expect(ed.seconds('abdominales', 'a')).toBe(5);
    ed.setSeconds('abdominales', 'a', 9999);
    expect(ed.seconds('abdominales', 'a')).toBe(600);
  });
});
