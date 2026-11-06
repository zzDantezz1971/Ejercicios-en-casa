import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { hasExerciseText } from '../src/i18n';
import { GROUPS } from '../src/i18n/ex4';
import { UI_ROWS } from '../src/i18n/ui';
import { RAW_SECTIONS } from '../src/data/rawExercises';

const keys = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe('traducciones', () => {
  it('todos los ejercicios tienen texto en catalán e inglés', () => {
    const missing = [...CATALOG.keys()].filter((id) => !hasExerciseText(id, 'ca') || !hasExerciseText(id, 'en'));
    expect(missing).toEqual([]);
  });

  it('todos los títulos de grupo están traducidos', () => {
    const groups = RAW_SECTIONS.flatMap((s) => s.items.filter((i) => i.g).map((i) => i.g!));
    expect(groups.filter((g) => !GROUPS[g])).toEqual([]);
  });

  it('cada texto de la interfaz aparece una sola vez y conserva sus huecos', () => {
    const seen = new Set<string>();
    for (const [es, ca, en] of UI_ROWS) {
      expect(seen.has(es), es).toBe(false);
      seen.add(es);
      expect(ca && en, es).toBeTruthy();
      expect(keys(ca), es).toBe(keys(es));
      expect(keys(en), es).toBe(keys(es));
    }
  });
});
