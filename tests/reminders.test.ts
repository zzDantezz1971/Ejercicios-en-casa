import { describe, expect, it } from 'vitest';
import { planReminders, remindersOf } from '../src/domain/reminders';

// miércoles 11-11-2026 a las 10:00
const NOW = new Date(2026, 10, 11, 10, 0);
const base = { trainings: [], weighings: [], premium: true };

describe('Recordatorios', () => {
  it('solo los días elegidos, a la hora elegida y siempre en el futuro', () => {
    const r = remindersOf({ train: { on: true, days: [1, 3], time: '19:30' } });
    const p = planReminders(NOW, r, base);
    expect(p.length).toBeGreaterThan(3);
    for (const x of p) {
      expect([1, 3]).toContain(x.at.getDay());
      expect(x.at.getHours()).toBe(19);
      expect(x.at.getMinutes()).toBe(30);
      expect(x.at.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it('si hoy ya has entrenado o te has pesado, hoy no avisa', () => {
    const today = NOW.getDay();
    const r = remindersOf({ train: { on: true, days: [today], time: '19:00' }, weigh: { on: true, days: [today], time: '20:00' } });
    const first = (p: ReturnType<typeof planReminders>, k: string) => p.find((x) => x.kind === k)!.at.getDate();
    expect(first(planReminders(NOW, r, base), 'train')).toBe(NOW.getDate());
    const later = planReminders(NOW, r, { ...base, trainings: [new Date(2026, 10, 11, 8).toISOString()], weighings: [new Date(2026, 10, 11, 7).toISOString()] });
    expect(first(later, 'train')).toBe(NOW.getDate() + 7);
    expect(first(later, 'weigh')).toBe(NOW.getDate() + 7);
  });

  it('copia de seguridad: solo con prémium', () => {
    const r = remindersOf({ backup: { on: true, days: [0], time: '20:00' } });
    expect(planReminders(NOW, r, { ...base, premium: false })).toEqual([]);
    expect(planReminders(NOW, r, base)[0].at).toEqual(new Date(2026, 10, 15, 20, 0));
  });

  it('peso cada 2 semanas: desde la última vez que te pesaste', () => {
    // lunes; te pesaste el lunes pasado (9-11): toca el lunes 23-11, no el 16-11
    const r = remindersOf({ weigh: { on: true, days: [1], time: '08:30', every: 2 } });
    const p = planReminders(NOW, r, { ...base, weighings: [new Date(2026, 10, 9, 9).toISOString()] });
    expect(p.map((x) => x.at.getDate())).toEqual([23, 7]);
    // nunca te has pesado: desde la semana en que lo activaste
    const q = planReminders(NOW, remindersOf({ weigh: { on: true, days: [1], time: '08:30', every: 2, since: NOW.toISOString() } }), base);
    expect(q[0].at).toEqual(new Date(2026, 10, 23, 8, 30));
  });

  it('ajustes de una versión anterior o desactivados: sin avisos', () => {
    expect(planReminders(NOW, remindersOf(undefined), base)).toEqual([]);
    const old = remindersOf({ weigh: { on: true, every: 'week', day: 1, time: '08:30' } as never });
    expect(old.weigh.days).toEqual([1]);
  });
});
