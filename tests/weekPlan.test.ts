import { describe, expect, it } from 'vitest';
import { CATALOG, SECTIONS } from '../src/data/catalog';
import { generate, GOALS, tableSeconds } from '../src/domain/generator';
import { earnedMedals } from '../src/domain/medals';
import { Store, type KeyValue } from '../src/domain/Store';
import { DEFAULT_SETTINGS, emptyRoutine } from '../src/domain/types';
import { dateInWeek, dayOptions, fullPlanWeek, mondayOf, nextPlanDay, sanitizePlan, sortDays, splitFor, type WeekPlan } from '../src/domain/weekPlan';

function memory(): KeyValue {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe('Plan de la semana', () => {
  it('ordena los días de lunes a domingo', () => {
    expect(sortDays([0, 5, 1, 3, 3])).toEqual([1, 3, 5, 0]);
  });

  it('reparte las zonas para que no se repitan seguidas', () => {
    expect(splitFor('forma', [1, 3, 5]).map((d) => d.kind)).toEqual(['superior', 'inferior', 'entero']);
    expect(splitFor('fuerza', [1, 2, 3, 4, 5, 6]).map((d) => d.kind)).toEqual(['superior', 'inferior', 'abdomen', 'superior', 'inferior', 'entero']);
    expect(splitFor('perder', [2, 4]).map((d) => d.kind)).toEqual(['cardio', 'cardio']);
    expect(splitFor('forma', [1, 2, 3, 4, 5]).map((d) => d.kind)).toContain('movilidad');
  });

  it('crea una tabla de cada día que cuadra con el tiempo', () => {
    const ctx = { sections: SECTIONS, catalog: CATALOG, owned: new Set<string>(), settings: DEFAULT_SETTINGS };
    for (const goal of GOALS) for (const n of [2, 3, 4, 5, 6]) {
      const days = [1, 2, 3, 4, 5, 6].slice(0, n);
      for (const { kind } of splitFor(goal, days)) {
        const r = generate(dayOptions({ goal, minutes: 30, level: 'normal' }, kind), ctx);
        const t = tableSeconds(r, ctx);
        expect(Math.abs(t - 1800), `${goal}/${kind}`).toBeLessThan(1800 * 0.25);
      }
    }
  });

  it('con «Espalda sana» y «Flexibilidad», todos los días con ese objetivo', () => {
    for (const k of ['superior', 'inferior', 'entero'] as const) {
      expect(dayOptions({ goal: 'espalda', minutes: 20, level: 'suave' }, k).goal).toBe('espalda');
      expect(dayOptions({ goal: 'flexibilidad', minutes: 20, level: 'suave' }, k).goal).toBe('flexibilidad');
    }
  });

  it('calcula el lunes y el próximo día de entrenamiento', () => {
    expect(mondayOf(new Date(2026, 10, 14))).toBe('2026-11-09'); // sábado
    expect(mondayOf(new Date(2026, 10, 15))).toBe('2026-11-09'); // domingo
    expect(mondayOf(new Date(2026, 10, 9))).toBe('2026-11-09');
    expect(dateInWeek('2026-11-09', 0).getDate()).toBe(15);
    const plan = { days: [{ day: 1, kind: 'superior', routineId: 'a' }, { day: 4, kind: 'inferior', routineId: 'b' }] } as WeekPlan;
    expect(nextPlanDay(plan, new Date(2026, 10, 10))).toMatchObject({ inDays: 2, day: { day: 4 } }); // martes → jueves
    expect(nextPlanDay(plan, new Date(2026, 10, 13))).toMatchObject({ inDays: 3, day: { day: 1 } }); // viernes → lunes
  });

  it('medalla «Plan cumplido»: todos los días del plan en una misma semana', () => {
    const at = (d: number) => ({ date: new Date(2026, 10, d, 19).toISOString() });
    expect(fullPlanWeek([at(9), at(11)], [1, 3, 5])).toBe(false);
    expect(fullPlanWeek([at(9), at(11), at(13)], [1, 3, 5])).toBe(true);
    // repartido en dos semanas no vale
    expect(fullPlanWeek([at(11), at(13), at(16)], [1, 3, 5])).toBe(false);
    const base = { weights: [], kcal: 0 };
    const hist = [at(9), at(11), at(13)].map((x) => ({ ...x, routineId: 'r', routineName: 'r', durationSec: 600, exercisesDone: 5, exercisesPlanned: 5, sections: ['pesas'], completed: true })) as never;
    expect(earnedMedals({ ...base, history: hist })).not.toContain('plan-cumplido');
    expect(earnedMedals({ ...base, history: hist, planDays: [1, 3, 5] })).toContain('plan-cumplido');
  });

  it('se guarda, se recupera y se borra con sus tablas', () => {
    const kv = memory();
    const s = new Store(kv);
    const activeId = s.active.id;
    const a = s.addRoutine('Plan · Lunes', emptyRoutine());
    expect(s.active.id).toBe(activeId); // no cambia la tabla en uso
    s.setPlan({ id: 'p1', goal: 'fuerza', minutes: 30, level: 'normal', days: [{ day: 1, kind: 'superior', routineId: a.id }], renew: true, week: '2026-11-09', createdAt: '2026-11-14T00:00:00Z' });
    const again = new Store(kv);
    expect(again.plan?.days[0].routineId).toBe(a.id);
    expect(again.isPlanRoutine(a.id)).toBe(true);
    again.deletePlan('p1', true);
    expect(again.plan).toBeUndefined();
    expect(again.routineById(a.id)).toBeUndefined();
  });

  it('varios planes: el nuevo queda en uso y, al borrar el que está en uso, pasa otro', () => {
    const s = new Store(memory());
    const base = { goal: 'forma' as const, minutes: 20, level: 'normal' as const, renew: true, week: '2026-11-09', createdAt: '2026-11-14T00:00:00Z' };
    s.setPlan({ ...base, id: 'a', days: [{ day: 1, kind: 'superior', routineId: 'x' }] });
    s.setPlan({ ...base, id: 'b', days: [{ day: 2, kind: 'inferior', routineId: 'y' }] });
    expect(s.plans.map((p) => p.id)).toEqual(['a', 'b']);
    expect(s.plan?.id).toBe('b');
    s.setActivePlan('a');
    expect(s.plan?.id).toBe('a');
    s.renamePlan('a', 'Verano');
    expect(s.planById('a')?.name).toBe('Verano');
    s.deletePlan('a', false);
    expect(s.plan?.id).toBe('b');
  });

  it('los datos con un solo plan (versión anterior) pasan a la lista de planes', () => {
    const old = { plan: { goal: 'forma', level: 'normal', minutes: 20, days: [{ day: 1, kind: 'superior', routineId: 'x' }, { day: 3, kind: 'inferior', routineId: 'y' }], createdAt: '2026-11-14T10:00:00Z' } };
    const d = Store.migrate(old);
    expect(d.plans?.length).toBe(1);
    expect(d.activePlanId).toBe(d.plans![0].id);
  });

  it('descarta un plan roto', () => {
    expect(sanitizePlan({ goal: 'nada' })).toBeUndefined();
    expect(sanitizePlan({ goal: 'forma', level: 'normal', minutes: 20, days: [{ day: 9, kind: 'superior', routineId: 'x' }] })).toBeUndefined();
    const ok = sanitizePlan({ goal: 'forma', level: 'normal', minutes: 20, days: [{ day: 0, kind: 'entero', routineId: 'x' }, { day: 2, kind: 'superior', routineId: 'y' }] });
    expect(ok?.days.map((d) => d.day)).toEqual([2, 0]);
    expect(ok?.renew).toBe(true);
  });
});
