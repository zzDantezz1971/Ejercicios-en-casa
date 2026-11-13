import { describe, expect, it } from 'vitest';
import { planReminders, remindersOf } from '../src/domain/reminders';

// miércoles 11-11-2026 a las 10:00
const NOW = new Date(2026, 10, 11, 10, 0);
const base = { trainings: [], weighings: [], premium: true };

describe('Recordatorios', () => {
  it('entrenar: solo los días elegidos, a la hora elegida y siempre en el futuro', () => {
    const r = remindersOf({ train: { on: true, days: [1, 3], time: '19:30' } });
    const p = planReminders(NOW, r, base);
    expect(p.length).toBeGreaterThan(4);
    for (const x of p) {
      expect([1, 3]).toContain(x.at.getDay());
      expect(x.at.getHours()).toBe(19);
      expect(x.at.getMinutes()).toBe(30);
      expect(x.at.getTime()).toBeGreaterThan(NOW.getTime());
    }
  });

  it('entrenar: si hoy ya has entrenado, hoy no avisa', () => {
    const today = NOW.getDay();
    const r = remindersOf({ train: { on: true, days: [today], time: '19:00' } });
    expect(planReminders(NOW, r, base)[0].at.getDate()).toBe(NOW.getDate());
    const p = planReminders(NOW, r, { ...base, trainings: [new Date(2026, 10, 11, 8).toISOString()] });
    expect(p[0].at.getDate()).not.toBe(NOW.getDate());
  });

  it('pesarse: cada semana, y no si ya te has pesado esa semana', () => {
    const r = remindersOf({ weigh: { on: true, every: 'week', day: NOW.getDay(), time: '20:00' } });
    expect(planReminders(NOW, r, base)[0].at.getDate()).toBe(NOW.getDate());
    const p = planReminders(NOW, r, { ...base, weighings: [new Date(2026, 10, 10).toISOString()] });
    expect(p[0].at.getDate()).toBe(NOW.getDate() + 7);
  });

  it('copia de seguridad: solo con prémium, a la semana de la última', () => {
    const r = remindersOf({ backup: { on: true, time: '20:00' } });
    const last = new Date(2026, 10, 10, 12).toISOString();
    expect(planReminders(NOW, r, { ...base, premium: false, lastBackup: last })).toEqual([]);
    const p = planReminders(NOW, r, { ...base, lastBackup: last });
    expect(p[0].at).toEqual(new Date(2026, 10, 17, 20, 0));
  });

  it('desactivados: no hay ningún aviso', () => {
    expect(planReminders(NOW, remindersOf(undefined), base)).toEqual([]);
  });
});
