import { describe, expect, it } from 'vitest';
import { EXTRAS, extraId } from '../src/data/extra';
import { EXTRA_MOTIONS } from '../src/data/extra/motions';
import { CATALOG } from '../src/data/catalog';
import { Motion } from '../src/figure/poses';

describe('Animaciones de los ejercicios nuevos', () => {
  it('cada animación corresponde a un ejercicio nuevo y deja de estar "en preparación"', () => {
    const ids = new Set(EXTRAS.map((e) => extraId(e.n)));
    for (const id of Object.keys(EXTRA_MOTIONS)) {
      expect(ids.has(id), id).toBe(true);
      expect(CATALOG.get(id)?.pending, id).toBe(false);
    }
  });
  it('todas dan posturas válidas (sin NaN) a lo largo del movimiento', () => {
    for (const [id, spec] of Object.entries(EXTRA_MOTIONS)) {
      const m = new Motion(spec);
      for (let k = 0; k < 8; k++) {
        const { J } = m.jointsAt((m.total * k) / 8);
        for (const p of Object.values(J)) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), id).toBe(true);
      }
    }
  });
});
