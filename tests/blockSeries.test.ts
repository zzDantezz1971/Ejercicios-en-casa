import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { WorkoutPlan } from '../src/domain/WorkoutPlan';
import { blockRuns, blockSeconds, DEFAULT_SETTINGS, emptyRoutine, routineToFree, type RoutineItem } from '../src/domain/types';

const S = { ...DEFAULT_SETTINGS, sectionCountdown: 0 };
const it2 = (exerciseId: string, series?: { id: string; rounds: number }, seconds = 30): RoutineItem => ({ exerciseId, seconds, ...(series ? { series } : {}) });

describe('Serie dentro de un bloque', () => {
  const A = { id: 'a', rounds: 3 };
  const pesas = [it2('marcha-en-el-sitio'), it2('flexiones', A), it2('sentadillas-sin-peso', A), it2('cobra')];
  it('tramos: sueltos y la serie junta', () => {
    expect(blockRuns(pesas)).toEqual([{ start: 0, end: 0, rounds: 1 }, { start: 1, end: 2, rounds: 3, id: 'a' }, { start: 3, end: 3, rounds: 1 }]);
    expect(blockSeconds(pesas)).toBe(30 + 60 * 3 + 30);
  });
  it('la serie se repite seguida; lo de fuera, una vez; con las vueltas del bloque, todo otra vez', () => {
    const r = { ...emptyRoutine(), pesas };
    const ids = (rounds: number) => WorkoutPlan.build(r, CATALOG, { ...S, rest: { ...S.rest, pesas: 0 } }, { pesas: rounds }).steps
      .filter((s) => s.kind === 'exercise').map((s) => s.kind === 'exercise' && `${s.exercise.id}${s.sets ? `:${s.set}/${s.sets}${s.setStart ? '*' : ''}` : ''}@${s.position}`);
    expect(ids(1)).toEqual(['marcha-en-el-sitio@1', 'flexiones:1/3*@2', 'sentadillas-sin-peso:1/3@3', 'flexiones:2/3*@2', 'sentadillas-sin-peso:2/3@3',
      'flexiones:3/3*@2', 'sentadillas-sin-peso:3/3@3', 'cobra@4']);
    expect(ids(2).length).toBe(16);
  });
  it('sin series, igual que antes', () => {
    const r = { ...emptyRoutine(), pesas: [it2('flexiones'), it2('cobra')] };
    const steps = WorkoutPlan.build(r, CATALOG, S, { pesas: 2 }).steps.filter((s) => s.kind === 'exercise');
    expect(steps.map((s) => s.kind === 'exercise' && `${s.exercise.id}:${s.round}`)).toEqual(['flexiones:1', 'cobra:1', 'flexiones:2', 'cobra:2']);
    expect(steps.every((s) => s.kind === 'exercise' && s.sets === undefined)).toBe(true);
  });
  it('al pasar a tabla libre, la serie del bloque es una serie', () => {
    const free = routineToFree({ ...emptyRoutine(), pesas }, {});
    expect(free.map((n) => (n.kind === 'group' ? `serie x${n.rounds}: ${n.items.length}` : n.kind === 'ex' ? n.exerciseId : 'rest'))).toEqual(['marcha-en-el-sitio', 'serie x3: 2', 'cobra']);
  });
});

describe('Resumen de una tabla o un bloque', () => {
  it('ejercicios distintos, los que se hacen en total y el tiempo real', () => {
    const A = { id: 'a', rounds: 3 };
    const r = { ...emptyRoutine(), pesas: [it2('flexiones'), it2('flexiones-diamante', A), it2('cobra', A)] };
    const plan = WorkoutPlan.forSection(r, 'pesas', CATALOG, S, { pesas: 2 });
    expect(plan.distinctCount).toBe(3);
    expect(plan.exerciseCount).toBe((1 + 2 * 3) * 2);
    // con los descansos entre ejercicios
    expect(plan.estimatedSeconds).toBeGreaterThan(14 * 30);
  });
});
