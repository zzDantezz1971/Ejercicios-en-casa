import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTINE_NAME, STORAGE_KEY, Store, type KeyValue } from '../src/domain/Store';
import { RoutineEditor } from '../src/domain/RoutineEditor';
import { DEFAULT_SETTINGS, emptyRoutine } from '../src/domain/types';
import { applyOrder, moveItem } from '../src/domain/ordering';

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
    store.saveSettings({ ...DEFAULT_SETTINGS, rest: { ...DEFAULT_SETTINGS.rest, pesas: 8 } });
    const r = emptyRoutine();
    r.pesas = [{ exerciseId: 'x', seconds: 30 }];
    store.saveRoutine(r);
    const again = new Store(kv);
    expect(again.settings.rest.pesas).toBe(8);
    expect(again.settings.rest.estiramientos).toBe(5);
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
    expect(store.settings.rest).toEqual({ calentamiento: 12, pesas: 12, abdominales: 12, estiramientos: 12 });
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

  it('borra un solo entrenamiento del historial', () => {
    const kv = memory();
    const store = new Store(kv);
    const e = (d: string) => ({ date: d, durationSec: 60, exercisesDone: 1, exercisesPlanned: 1, sections: [], completed: true });
    store.addHistory(e('2026-11-01T10:00:00Z'));
    store.addHistory(e('2026-11-02T10:00:00Z'));
    store.addHistory(e('2026-11-03T10:00:00Z'));
    store.deleteHistoryAt(1);
    expect(new Store(kv).history.map((x) => x.date)).toEqual(['2026-11-03T10:00:00Z', '2026-11-01T10:00:00Z']);
    store.deleteHistoryAt(9);
    expect(store.history).toHaveLength(2);
  });

  it('elimina un ejercicio de la lista y de todas las tablas, para siempre', () => {
    const kv = memory();
    const store = new Store(kv);
    const r = emptyRoutine();
    r.pesas = [{ exerciseId: 'x', seconds: 30 }, { exerciseId: 'y', seconds: 30 }];
    store.saveRoutine(r);
    const other = store.createRoutine('Otra');
    store.saveRoutine({ ...emptyRoutine(), pesas: [{ exerciseId: 'x', seconds: 40 }] });
    store.hideExercise('x');
    const again = new Store(kv);
    expect(again.hidden.has('x')).toBe(true);
    expect(again.routines.flatMap((t) => t.routine.pesas.map((i) => i.exerciseId))).toEqual(['y']);
    expect(other.name).toBe('Otra');
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

describe('Cambios de apartado', () => {
  it('mueve a su apartado correcto un ejercicio que estaba en otro', () => {
    const kv = memory();
    const store = new Store(kv);
    store.saveRoutine({ ...emptyRoutine(), abdominales: [{ exerciseId: 'giro', seconds: 45 }, { exerciseId: 'crunch', seconds: 30 }] });
    const moved = store.fixSections((id) => (id === 'giro' ? 'estiramientos' : 'abdominales'));
    expect(moved).toBe(1);
    const again = new Store(kv);
    expect(again.routine.abdominales.map((i) => i.exerciseId)).toEqual(['crunch']);
    expect(again.routine.estiramientos).toEqual([{ exerciseId: 'giro', seconds: 45 }]);
  });
});

describe('Orden de ejercicios', () => {
  it('guarda y restablece el orden personalizado de un apartado', () => {
    const kv = memory();
    const store = new Store(kv);
    store.setOrder('estiramientos', ['b', 'a']);
    expect(new Store(kv).customOrder('estiramientos')).toEqual(['b', 'a']);
    store.resetOrder('estiramientos');
    expect(new Store(kv).customOrder('estiramientos')).toBeUndefined();
  });

  it('aplica el orden y deja al final los ejercicios nuevos', () => {
    const ex = (id: string) => ({ id, name: id, section: 'pesas' as const, zone: '', motion: {} });
    const list = [ex('a'), ex('b'), ex('c'), ex('d')];
    expect(applyOrder(list, ['c', 'x', 'a']).map((e) => e.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(applyOrder(list, undefined).map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('mueve los ejercicios elegidos de una tabla', () => {
    const ed = new RoutineEditor(emptyRoutine());
    for (const id of ['x', 'y', 'z']) ed.toggle('pesas', id, 30);
    ed.move('pesas', 2, 0);
    expect(ed.value.pesas.map((i) => i.exerciseId)).toEqual(['z', 'x', 'y']);
    expect(ed.position('pesas', 'x')).toBe(2);
  });
});

describe('Copia de seguridad', () => {
  it('exporta y restaura todos los datos', () => {
    const a = new Store(memory());
    a.createRoutine('Brazos');
    a.saveRoutine({ ...emptyRoutine(), pesas: [{ exerciseId: 'curl', seconds: 40 }] });
    a.addHistory({ date: '2026-11-03T10:00:00Z', durationSec: 600, exercisesDone: 3, exercisesPlanned: 3, sections: ['pesas'], completed: true });
    a.hideExercise('pullover');
    const text = a.exportBackup(new Date('2026-11-04T09:00:00Z'));
    expect(a.lastBackup).toBeUndefined();
    a.markBackedUp(new Date('2026-11-04T09:00:00Z'));
    expect(a.lastBackup).toBe('2026-11-04T09:00:00.000Z');
    expect(Store.inspectBackup(text)).toEqual({ routines: 2, history: 1, exportedAt: '2026-11-04T09:00:00.000Z' });

    const kv = memory();
    const b = new Store(kv);
    b.importBackup(text);
    const c = new Store(kv);
    expect(c.routines.map((r) => r.name)).toEqual(['Mi rutina', 'Brazos']);
    expect(c.routine.pesas).toEqual([{ exerciseId: 'curl', seconds: 40 }]);
    expect(c.history).toHaveLength(1);
    expect(c.hidden.has('pullover')).toBe(true);
  });

  it('rechaza archivos que no son una copia', () => {
    const s = new Store(memory());
    expect(() => s.importBackup('hola')).toThrow();
    expect(() => s.importBackup('{"x":1}')).toThrow();
  });
});

describe('Peso, favoritos y aviso de copia', () => {
  it('guarda el peso por mancuerna al elegir un ejercicio y se puede cambiar', () => {
    const ed = new RoutineEditor(emptyRoutine());
    ed.toggle('pesas', 'curl', 30, 8.3);
    expect(ed.weight('pesas', 'curl')).toBe(8.5);
    ed.setWeight('pesas', 'curl', 10);
    expect(ed.value.pesas[0]).toEqual({ exerciseId: 'curl', seconds: 30, weight: 10 });
    ed.setWeight('pesas', 'curl', undefined);
    expect(ed.value.pesas[0]).toEqual({ exerciseId: 'curl', seconds: 30 });
  });

  it('recuerda el último peso usado', () => {
    const s = new Store(memory());
    s.saveRoutine({ ...emptyRoutine(), pesas: [{ exerciseId: 'curl', seconds: 30, weight: 6 }] });
    expect(s.lastWeight('curl')).toBe(6);
    s.addHistory({ date: '2026-11-03T10:00:00Z', durationSec: 60, exercisesDone: 1, exercisesPlanned: 1, sections: ['pesas'], completed: true,
      items: [{ exerciseId: 'curl', section: 'pesas', planned: 30, seconds: 30, completed: true, weight: 9 }] });
    expect(s.lastWeight('curl')).toBe(9);
    expect(s.lastWeight('otro')).toBeUndefined();
  });

  it('marca favoritos y cuenta los días desde la última copia', () => {
    const kv = memory();
    const s = new Store(kv);
    expect(s.toggleFavorite('a')).toBe(true);
    expect(new Store(kv).favorites.has('a')).toBe(true);
    expect(s.toggleFavorite('a')).toBe(false);
    expect(s.daysSinceBackup()).toBe(Infinity);
    s.markBackedUp(new Date('2026-11-01T10:00:00Z'));
    expect(s.daysSinceBackup(new Date('2026-11-08T11:00:00Z'))).toBe(7);
  });
});
