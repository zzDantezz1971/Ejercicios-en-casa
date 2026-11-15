import { describe, expect, it } from 'vitest';
import { planDayReminders, planReminders, reminderDue, remindersOf } from '../src/domain/reminders';

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

describe('reminderDue (aviso dentro de la app)', () => {
  // jueves 12-11-2026 a las 08:30; hoy domingo 15-11-2026
  const rule = { on: true, days: [4], time: '08:30', every: 1 };
  const sun = new Date(2026, 10, 15, 10, 0);
  it('toca si desde la última vez ha pasado un jueves a la hora', () => {
    expect(reminderDue(sun, rule, [new Date(2026, 10, 10, 9).toISOString()])).toBe(true);
  });
  it('no toca si te pesaste después del último jueves, aunque hagan más de 7 días después', () => {
    expect(reminderDue(sun, rule, [new Date(2026, 10, 12, 20).toISOString()])).toBe(false);
    expect(reminderDue(new Date(2026, 10, 19, 8, 0), rule, [new Date(2026, 10, 12, 20).toISOString()])).toBe(false);
    expect(reminderDue(new Date(2026, 10, 19, 9, 0), rule, [new Date(2026, 10, 12, 20).toISOString()])).toBe(true);
  });
  it('apagado o desde que se activó', () => {
    expect(reminderDue(sun, { ...rule, on: false }, [])).toBe(false);
    expect(reminderDue(sun, { ...rule, since: new Date(2026, 10, 13).toISOString() }, [])).toBe(false);
    expect(reminderDue(sun, { ...rule, since: new Date(2026, 10, 1).toISOString() }, [])).toBe(true);
  });
  it('cada 2 semanas: solo la semana que toca', () => {
    const r2 = { ...rule, every: 2 };
    const last = [new Date(2026, 10, 5, 9).toISOString()]; // jueves 5
    expect(reminderDue(new Date(2026, 10, 15, 10), r2, last)).toBe(false); // el 12 no toca
    expect(reminderDue(new Date(2026, 10, 19, 10), r2, last)).toBe(true);
  });
});

describe('planDayReminders (avisos de los planes)', () => {
  const now = new Date(2026, 10, 15, 10, 0); // domingo
  it('cada plan, sus días a su hora; ids distintos por plan', () => {
    const r = planDayReminders(now, [{ days: [1, 3], time: '19:00' }, { days: [2], time: '08:00' }], []);
    expect(r.filter((x) => x.plan === 0).every((x) => [1, 3].includes(x.at.getDay()) && x.at.getHours() === 19)).toBe(true);
    expect(r.filter((x) => x.plan === 1).every((x) => x.at.getDay() === 2 && x.at.getHours() === 8)).toBe(true);
    expect(new Set(r.map((x) => x.id)).size).toBe(r.length);
  });
  it('hoy no avisa si ya has entrenado', () => {
    const r = planDayReminders(now, [{ days: [0], time: '19:00' }], [new Date(2026, 10, 15, 9).toISOString()]);
    expect(r.some((x) => x.at.getDate() === 15)).toBe(false);
  });
});
