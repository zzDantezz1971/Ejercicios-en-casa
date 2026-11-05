import { describe, expect, it } from 'vitest';
import { caloriesOf, keytelPerMin } from '../src/domain/calories';
import { STORAGE_KEY, Store } from '../src/domain/Store';
import type { HistoryEntry, Profile } from '../src/domain/types';

const me: Profile & { weight: number } = { age: 55, weight: 80, sex: 'h' };
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
  });
});

function memory(initial?: string) {
  const data = new Map<string, string>();
  if (initial) data.set(STORAGE_KEY, initial);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('Histórico de peso', () => {
  it('anota pesos (uno por día) y sabe el peso de cada fecha', () => {
    const s = new Store(memory());
    s.addWeight(82, new Date('2026-11-01T08:00:00Z'));
    s.addWeight(81.46, new Date('2026-11-10T08:00:00Z'));
    s.addWeight(81.2, new Date('2026-11-10T20:00:00Z')); // mismo día: sustituye
    expect(s.weights.map((w) => w.kg)).toEqual([82, 81.2]);
    expect(s.currentWeight).toBe(81.2);
    expect(s.weightAt('2026-11-05T10:00:00Z')).toBe(82);
    expect(s.weightAt('2026-10-01T10:00:00Z')).toBe(82); // antes de la primera: la primera
    expect(s.weightAt('2026-11-20T10:00:00Z')).toBe(81.2);
  });

  it('las calorías guardadas no cambian al anotar otro peso; las antiguas usan el peso de su fecha', () => {
    const s = new Store(memory());
    s.saveSettings({ ...s.settings, profile: { age: 55, sex: 'h' } });
    s.addWeight(80, new Date('2026-11-01T08:00:00Z'));
    const frozen = { ...entry(), kcal: 200, kcalMethod: 'pulso' as const, weightKg: 80 };
    const old = entry();
    const before = s.caloriesFor(old)!.kcal;
    s.addWeight(70, new Date('2026-11-20T08:00:00Z'));
    expect(s.caloriesFor(frozen)).toEqual({ kcal: 200, method: 'pulso' });
    expect(s.caloriesFor(old)!.kcal).toBe(before);
  });

  it('el peso único de la versión anterior pasa a ser la primera anotación', () => {
    const s = new Store(memory(JSON.stringify({ version: 2, settings: { profile: { age: 54, weight: 79.5, sex: 'h' } } })));
    expect(s.currentWeight).toBe(79.5);
    expect(s.settings.profile).toEqual({ age: 54, sex: 'h' });
  });
});
