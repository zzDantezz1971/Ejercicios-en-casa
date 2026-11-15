import { describe, expect, it } from 'vitest';
import { healthWorkout } from '../src/domain/healthExport';
import type { HistoryEntry } from '../src/domain/types';

const base: HistoryEntry = { date: '2026-11-15T18:00:00.000Z', durationSec: 1500, pausedSec: 120, exercisesDone: 10, exercisesPlanned: 10, sections: ['pesas'], completed: true, routineName: 'Pla · Dilluns · Tren superior' };

describe('Health Connect: lo que se guarda', () => {
  it('inicio y fin reales (con las pausas), nombre y calorías', () => {
    const w = healthWorkout({ ...base, kcal: 210.6 })!;
    expect(w.start).toBe('2026-11-15T18:00:00.000Z');
    expect(w.end).toBe('2026-11-15T18:27:00.000Z');
    expect(w.title).toBe('Pla · Dilluns · Tren superior');
    expect(w.kcal).toBe(211);
    expect(w.hr).toBeUndefined();
  });

  it('pulsaciones del reloj, una cada 5 s', () => {
    const w = healthWorkout({ ...base, heart: { avg: 120, max: 150, min: 90, samples: [100, 120.4, 150] } })!;
    expect(w.hr).toEqual([100, 120, 150]);
    expect(w.hrStep).toBe(5);
  });

  it('no guarda entrenamientos de menos de un minuto', () => {
    expect(healthWorkout({ ...base, durationSec: 30, pausedSec: 0 })).toBeNull();
  });
});
