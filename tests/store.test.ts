import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, Store, type KeyValue } from '../src/domain/Store';
import { RoutineEditor } from '../src/domain/RoutineEditor';
import { DEFAULT_SETTINGS, emptyRoutine } from '../src/domain/types';

function memory(initial?: string): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial) data.set(STORAGE_KEY, initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('Store', () => {
  it('empieza con valores por defecto y guarda los cambios', () => {
    const kv = memory();
    const store = new Store(kv);
    expect(store.settings).toEqual(DEFAULT_SETTINGS);
    store.saveSettings({ ...DEFAULT_SETTINGS, restSeconds: 8 });
    expect(new Store(kv).settings.restSeconds).toBe(8);
  });

  it('rellena ajustes nuevos y descarta datos rotos', () => {
    const kv = memory(JSON.stringify({ version: 1, settings: { restSeconds: 12 }, routine: { pesas: [{ exerciseId: 'x', seconds: 30 }, { bad: 1 }] } }));
    const store = new Store(kv);
    expect(store.settings.restSeconds).toBe(12);
    expect(store.settings.sectionCountdown).toBe(DEFAULT_SETTINGS.sectionCountdown);
    expect(store.routine.pesas).toEqual([{ exerciseId: 'x', seconds: 30 }]);
    expect(new Store(memory('{no es json')).routine).toEqual(emptyRoutine());
  });

  it('funciona sin almacenamiento', () => {
    const store = new Store(null);
    store.saveRoutine(emptyRoutine());
    expect(store.history).toEqual([]);
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
