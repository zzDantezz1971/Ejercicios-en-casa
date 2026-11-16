import { describe, expect, it } from 'vitest';
import { CATALOG, SECTIONS } from '../src/data/catalog';
import { DESCRIPTIONS } from '../src/data/descriptions';
import { Motion } from '../src/figure/poses';
import { MUSCLES, muscleWeights, parseMuscles } from '../src/figure/anatomy';
import { MUSCLES_BY_EXERCISE } from '../src/data/muscles';

const all = SECTIONS.flatMap((s) => s.exercises);

describe('Catálogo de ejercicios', () => {
  it('no repite identificadores', () => {
    // el catálogo tiene también los retirados (12), que no salen en las listas
    expect(CATALOG.size).toBe(all.length + 44);
  });

  it('todos los ejercicios tienen descripción completa', () => {
    const missing = all.filter((e) => !e.description?.start || !e.description.move || !e.description.tip).map((e) => e.id);
    expect(missing).toEqual([]);
  });

  it('todos los ejercicios tienen sus músculos y son válidos', () => {
    expect(all.filter((e) => !e.muscles).map((e) => e.id)).toEqual([]);
    expect(Object.keys(MUSCLES_BY_EXERCISE).filter((id) => !CATALOG.has(id))).toEqual([]);
    for (const e of all) for (const t of parseMuscles(e.muscles)) expect(MUSCLES, `${e.id}: ${t.muscle}`).toContain(t.muscle);
  });

  it('en los ejercicios por lados, el lado 2 marca el otro lado del cuerpo', () => {
    const w1 = muscleWeights('-cuadriceps@R ~gluteos', 1), w2 = muscleWeights('-cuadriceps@R ~gluteos', 2), both = muscleWeights('-cuadriceps@R', undefined);
    const q = MUSCLES.indexOf('cuadriceps'), g = MUSCLES.indexOf('gluteos');
    expect([w1.R[q], w1.L[q], w2.R[q], w2.L[q]]).toEqual([-1, 0, 0, -1]);
    expect([w1.L[g], w1.R[g]]).toEqual([0.55, 0.55]);
    expect([both.L[q], both.R[q]]).toEqual([-1, -1]);
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
