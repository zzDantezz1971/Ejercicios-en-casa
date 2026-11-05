import { describe, expect, it } from 'vitest';
import { caloriesOf, keytelPerMin, totalCalories } from '../src/domain/calories';
import type { HistoryEntry, Profile } from '../src/domain/types';

const me: Profile = { age: 55, weight: 80, sex: 'h' };
const entry = (extra: Partial<HistoryEntry> = {}): HistoryEntry => ({
  date: '2026-11-05T10:00:00Z', durationSec: 1800, exercisesDone: 2, exercisesPlanned: 2, sections: ['pesas', 'estiramientos'], completed: true,
  items: [
    { exerciseId: 'a', section: 'pesas', planned: 900, seconds: 900, completed: true },
    { exerciseId: 'b', section: 'estiramientos', planned: 600, seconds: 600, completed: true },
  ],
  ...extra,
});

describe('Calorías', () => {
  it('sin peso no calcula', () => {
    expect(caloriesOf(entry(), { age: 55, weight: null, sex: 'h' })).toBeNull();
  });

  it('sin pulso estima por tipo de ejercicio y tiempo', () => {
    // pesas 3.5 MET × 900 s + estiramientos 2.3 × 600 + pausas 1.5 × 300, × 80 kg / 3600
    const c = caloriesOf(entry(), me)!;
    expect(c.method).toBe('estimado');
    expect(c.kcal).toBe(Math.round((3.5 * 900 + 2.3 * 600 + 1.5 * 300) * 80 / 3600));
  });

  it('con pulso usa la fórmula del pulso y da más con más pulsaciones', () => {
    const low = caloriesOf(entry({ heart: { avg: 110, max: 110, min: 110, samples: [110, 110] } }), me)!;
    const high = caloriesOf(entry({ heart: { avg: 140, max: 140, min: 140, samples: [140, 140] } }), me)!;
    expect(low.method).toBe('pulso');
    expect(low.kcal).toBe(Math.round(keytelPerMin(110, { age: 55, weight: 80, sex: 'h' }) * 30));
    expect(high.kcal).toBeGreaterThan(low.kcal);
    expect(totalCalories([entry(), entry()], me)).toBe(2 * caloriesOf(entry(), me)!.kcal);
  });
});
