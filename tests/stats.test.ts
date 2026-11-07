import { Store } from '../src/domain/Store';
import { personalize, phraseOfDay } from '../src/domain/phrases';
import { addMonths, monthKey, monthStats, weekKey, weekStart, weekStats } from '../src/domain/monthSummary';
import { goalProgress } from '../src/domain/goal';
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

describe('Resumen del mes', () => {
  it('cuenta días, tiempo, peso y récords del mes', () => {
    const it = (kg: number) => [{ exerciseId: 'curl', section: 'pesas' as const, planned: 30, seconds: 30, completed: true, weight: kg }];
    const e = (d: string, kg: number, name = 'Brazos'): HistoryEntry => ({ date: d, durationSec: 600, exercisesDone: 1, exercisesPlanned: 1, sections: ['pesas'], completed: true, routineName: name, items: it(kg) });
    const h = [e('2026-10-28T10:00:00', 7), e('2026-11-02T10:00:00', 8), e('2026-11-03T10:00:00', 8), e('2026-11-03T18:00:00', 8, 'Otra'), e('2026-11-10T10:00:00', 9)];
    const w = [{ date: '2026-10-20T08:00:00', kg: 82 }, { date: '2026-11-15T08:00:00', kg: 80.5 }];
    const m = monthStats(h, w, new Date(2026, 10, 1), () => 100);
    expect([m.days, m.sessions, m.seconds, m.kcal, m.bestStreak]).toEqual([3, 4, 2400, 400, 2]);
    expect(m.topTable).toEqual({ name: 'Brazos', times: 3 });
    expect(m.weight).toEqual({ from: 82, to: 80.5 });
    expect(m.records).toEqual([{ exerciseId: 'curl', from: 7, to: 9 }]);
    expect(monthKey(addMonths(new Date(2026, 11, 5), 1))).toBe('2027-01');
  });
  it('objetivo de peso: lo que falta y el progreso', () => {
    expect(goalProgress(82, 80, 75)).toMatchObject({ left: 5, reached: false, losing: true });
    expect(goalProgress(82, 80, 75).done).toBeCloseTo(2 / 7);
    expect(goalProgress(82, 74.8, 75)).toMatchObject({ left: 0, reached: true, done: 1 });
    expect(goalProgress(70, 72, 75)).toMatchObject({ left: 3, losing: false });
  });
});

describe('Resumen de la semana', () => {
  it('semana natural de lunes a domingo', () => {
    expect(weekKey(new Date(2026, 10, 8))).toBe('2026-11-02'); // domingo 8 -> lunes 2
    expect(weekKey(new Date(2026, 10, 9))).toBe('2026-11-09');
    const e = (d: string): HistoryEntry => ({ date: d, durationSec: 600, exercisesDone: 1, exercisesPlanned: 1, sections: [], completed: true });
    const w = weekStats([e('2026-11-01T20:00:00'), e('2026-11-02T08:00:00'), e('2026-11-08T22:00:00'), e('2026-11-09T07:00:00')], [], weekStart(new Date(2026, 10, 4)), () => null);
    expect([w.sessions, w.days]).toEqual([2, 2]);
  });
});

describe('Frases motivadoras', () => {
  it('pone el nombre o lo quita, y cambia cada día', () => {
    expect(personalize('Cada repetición cuenta{, n}.', 'David')).toBe('Cada repetición cuenta, David.');
    expect(personalize('Cada repetición cuenta{, n}.')).toBe('Cada repetición cuenta.');
    const a = phraseOfDay(new Date(2026, 10, 6, 8)), b = phraseOfDay(new Date(2026, 10, 6, 22));
    expect(a).toBe(b);
    expect(phraseOfDay(new Date(2026, 10, 7))).not.toBe(a);
  });
});

describe('Medallas', () => {
  it('se consiguen con los datos y la primera vez no se celebran', () => {
    const data = new Map<string, string>();
    const kv = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    const s = new Store(kv);
    const e = (d: string): HistoryEntry => ({ date: d, durationSec: 1200, exercisesDone: 4, exercisesPlanned: 4, sections: ['calentamiento', 'pesas', 'abdominales', 'estiramientos'], completed: true });
    s.addHistory(e('2026-11-02T07:30:00'));
    expect(s.checkMedals()).toEqual([]); // primera vez: se apuntan sin celebrar
    expect(Object.keys(s.medals)).toEqual(expect.arrayContaining(['entrenos-1', 'completo', 'madrugador']));
    s.addHistory(e('2026-11-03T10:00:00'));
    s.addHistory(e('2026-11-04T10:00:00'));
    expect(s.checkMedals()).toEqual(expect.arrayContaining(['racha-3', 'semana-3']));
    expect(s.checkMedals()).toEqual([]);
  });
});
