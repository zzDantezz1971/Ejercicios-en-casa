import { describe, expect, it } from 'vitest';
import { UI_ROWS } from '../src/i18n/ui';
import { UI_GL } from '../src/i18n/gl/ui';
import { UI_EU } from '../src/i18n/eu/ui';

const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();

describe('Gallego y euskera: interfaz', () => {
  for (const [name, dict] of [['gallego', UI_GL], ['euskera', UI_EU]] as const) {
    it(`${name}: todas las frases traducidas, con los mismos huecos {x}`, () => {
      const missing = UI_ROWS.filter((r) => !dict[r[0]]?.trim()).map((r) => r[0]);
      expect(missing).toEqual([]);
      for (const r of UI_ROWS) expect(holes(dict[r[0]]), r[0]).toBe(holes(r[0]));
    });
    it(`${name}: sin frases que ya no existen`, () => {
      const known = new Set(UI_ROWS.map((r) => r[0]));
      expect(Object.keys(dict).filter((k) => !known.has(k))).toEqual([]);
    });
  }
});
