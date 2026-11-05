import { exerciseWeights, weightSuggestion } from '../src/domain/weights';
import { MUSCLES } from '../src/figure/anatomy';
import { muscleLoad, loadWeights } from '../src/domain/muscleLoad';
import { describe, expect, it } from 'vitest';
import { bestStreak, routineNames, secondsBySection, topExercises } from '../src/domain/stats';
import { summarizeHeart, type HistoryEntry } from '../src/domain/types';

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

describe('Pulsaciones', () => {
  it('calcula media, máxima y mínima descartando lecturas imposibles', () => {
    expect(summarizeHeart([90, 110, 0, 130, 250])).toEqual({ avg: 110, max: 130, min: 90, samples: [90, 110, 130] });
    expect(summarizeHeart([])).toBeNull();
  });
});

describe('Músculos trabajados', () => {
  it('suma el tiempo de cada músculo (secundarios a la mitad) y separa los estiramientos', () => {
    const e = (items: HistoryEntry['items']): HistoryEntry => ({ date: '2026-11-05T10:00:00Z', durationSec: 100, exercisesDone: 1, exercisesPlanned: 1, sections: [], completed: true, items });
    const map: Record<string, string> = { curl: '+biceps ~antebrazo', cuad: '-cuadriceps@R' };
    const load = muscleLoad([
      e([{ exerciseId: 'curl', section: 'pesas', planned: 40, seconds: 40, completed: true }, { exerciseId: 'cuad', section: 'estiramientos', planned: 30, seconds: 30, completed: true }]),
      { ...e(undefined) },
    ], (id) => map[id]);
    expect(load.work.biceps).toBe(40);
    expect(load.work.antebrazo).toBe(20);
    expect(load.stretch.cuadriceps).toBe(30);
    expect(load.missing).toBe(1);
    const w = loadWeights(load);
    expect(w[MUSCLES.indexOf('biceps')]).toBe(1);
    expect(w[MUSCLES.indexOf('cuadriceps')]).toBeLessThan(0);
    expect(w[MUSCLES.indexOf('pecho')]).toBe(0);
  });
});

describe('Evolución de pesos', () => {
  const e = (d: string, kg: number, completed = true): HistoryEntry => ({ date: d, durationSec: 60, exercisesDone: 1, exercisesPlanned: 1, sections: ['pesas'], completed,
    items: [{ exerciseId: 'curl', section: 'pesas', planned: 30, seconds: 30, completed, weight: kg }] });
  it('ordena los kilos por fecha y propone subir tras 4 sesiones completas con el mismo peso', () => {
    const h = [e('2026-11-06', 8), e('2026-11-04', 8), e('2026-11-02', 8), e('2026-10-30', 7), e('2026-11-01', 8)];
    expect(exerciseWeights(h, 'curl').map((w) => w.kg)).toEqual([7, 8, 8, 8, 8]);
    expect(weightSuggestion(h, 'curl')).toEqual({ kg: 8, next: 9, sessions: 4 });
    expect(weightSuggestion(h.slice(1), 'curl')).toBeNull();
    expect(weightSuggestion([e('2026-11-07', 8, false), ...h], 'curl')).toBeNull();
  });
});
