import { describe, expect, it } from 'vitest';
import { CATALOG, SECTIONS } from '../src/data/catalog';
import { DESCRIPTIONS } from '../src/data/descriptions';
import { Motion } from '../src/figure/poses';

const all = SECTIONS.flatMap((s) => s.exercises);

describe('Catálogo de ejercicios', () => {
  it('no repite identificadores', () => {
    expect(CATALOG.size).toBe(all.length);
  });

  it('todos los ejercicios tienen descripción completa', () => {
    const missing = all.filter((e) => !e.description?.start || !e.description.move || !e.description.tip).map((e) => e.id);
    expect(missing).toEqual([]);
  });

  it('no hay descripciones de ejercicios que no existen', () => {
    expect(Object.keys(DESCRIPTIONS).filter((id) => !CATALOG.has(id))).toEqual([]);
  });

  it('los ejercicios con los dos lados en sus fotogramas tienen un número par de fotogramas', () => {
    for (const e of all.filter((x) => x.motion.split)) expect((e.motion.f?.length ?? 0) % 2, e.id).toBe(0);
  });

  it('cada movimiento (y cada lado) se puede calcular sin valores inválidos', () => {
    for (const e of all) {
      for (const side of [undefined, 1, 2] as const) {
        const m = new Motion(e.motion, side);
        for (let i = 0; i <= 8; i++) {
          const { J } = m.jointsAt((m.total * i) / 8);
          for (const p of Object.values(J)) expect(Number.isFinite(p[0]) && Number.isFinite(p[1]), e.id).toBe(true);
        }
        m.props();
      }
    }
  });
});
