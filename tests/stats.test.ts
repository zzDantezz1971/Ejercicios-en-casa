import { describe, expect, it } from 'vitest';
import { bestStreak, routineNames, secondsBySection, topExercises } from '../src/domain/stats';
import type { HistoryEntry } from '../src/domain/types';

const entry = (date: string, extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  date, durationSec: 600, exercisesDone: 1, exercisesPlanned: 1, sections: ['pesas'], completed: true, ...extra,
});

describe('Estadísticas del historial', () => {
  it('calcula la mejor racha de días seguidos (varios entrenamientos el mismo día cuentan una vez)', () => {
    const h = ['2026-10-01T10:00', '2026-10-02T10:00', '2026-10-02T19:00', '2026-10-03T10:00', '2026-10-10T10:00', '2026-10-11T10:00'].map((d) => entry(d));
    expect(bestStreak(h)).toBe(3);
    expect(bestStreak([])).toBe(0);
  });

  it('suma el tiempo por apartado (real con detalle, repartido sin él)', () => {
    const h = [
      entry('2026-10-01T10:00', { items: [
        { exerciseId: 'a', section: 'calentamiento', planned: 30, seconds: 30, completed: true },
        { exerciseId: 'b', section: 'pesas', planned: 60, seconds: 45, completed: false },
      ] }),
      entry('2026-10-02T10:00', { durationSec: 600, sections: ['abdominales', 'estiramientos'] }),
    ];
    const r = secondsBySection(h);
    expect(r.bySection).toEqual({ calentamiento: 30, pesas: 45, abdominales: 300, estiramientos: 300 });
    expect(r.approximate).toBe(true);
  });

  it('ordena los ejercicios más hechos y los nombres de tabla', () => {
    const it2 = (id: string, done = true) => ({ exerciseId: id, section: 'pesas' as const, planned: 30, seconds: 30, completed: done });
    const h = [
      entry('2026-10-01T10:00', { routineName: 'Brazos', items: [it2('curl'), it2('press')] }),
      entry('2026-10-02T10:00', { routineName: 'Brazos', items: [it2('curl'), it2('press', false)] }),
      entry('2026-10-03T10:00', { routineName: 'Espalda', items: [it2('remo')] }),
    ];
    expect(topExercises(h).map((x) => [x.exerciseId, x.times])).toEqual([['curl', 2], ['press', 1], ['remo', 1]]);
    expect(routineNames(h)).toEqual(['Brazos', 'Espalda']);
  });
});
