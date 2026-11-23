import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { WorkoutPlan } from '../src/domain/WorkoutPlan';
import { Store, sanitizeFree } from '../src/domain/Store';
import { DEFAULT_SETTINGS, freeToRoutine, routineToFree, type FreeNode } from '../src/domain/types';

const S = { ...DEFAULT_SETTINGS, sectionCountdown: 0 };
const ex = (exerciseId: string, seconds = 30) => ({ kind: 'ex' as const, exerciseId, seconds });

describe('Tabla libre', () => {
  it('sigue el orden de la lista, con pausas cortas entre ejercicios y los descansos donde se ponen', () => {
    const free: FreeNode[] = [ex('plancha-frontal'), ex('flexiones'), { kind: 'rest', seconds: 60 }, ex('cobra')];
    const steps = WorkoutPlan.buildFree(free, CATALOG, S).steps;
    expect(steps.map((s) => (s.kind === 'exercise' ? s.exercise.id : `${s.kind}:${'seconds' in s ? s.seconds : ''}`))).toEqual([
      'plancha-frontal', 'rest:5', 'flexiones', 'rest:60', 'cobra']);
    // cada ejercicio, con el tipo al que pertenece (para el color)
    expect(steps.filter((s) => s.kind === 'exercise').map((s) => s.section)).toEqual(['abdominales', 'pesas', 'estiramientos']);
  });
  it('una serie repite sus ejercicios las vueltas pedidas; lo de fuera, una vez', () => {
    const free: FreeNode[] = [ex('marcha-en-el-sitio'), { kind: 'group', rounds: 3, items: [ex('flexiones'), { kind: 'rest', seconds: 20 }, ex('sentadillas-sin-peso')] }, ex('cobra')];
    const exs = WorkoutPlan.buildFree(free, CATALOG, S).steps.filter((s) => s.kind === 'exercise');
    expect(exs.map((s) => s.kind === 'exercise' && `${s.exercise.id}:${s.round}/${s.rounds}`)).toEqual([
      'marcha-en-el-sitio:1/1', 'flexiones:1/3', 'sentadillas-sin-peso:1/3', 'flexiones:2/3', 'sentadillas-sin-peso:2/3',
      'flexiones:3/3', 'sentadillas-sin-peso:3/3', 'cobra:1/1']);
  });
  it('un descanso al final no se hace y la lista vacía no tiene pasos', () => {
    expect(WorkoutPlan.buildFree([ex('cobra'), { kind: 'rest', seconds: 30 }], CATALOG, S).steps.length).toBe(1);
    expect(WorkoutPlan.buildFree([{ kind: 'rest', seconds: 30 }], CATALOG, S).isEmpty).toBe(true);
  });
  it('pasar una tabla por bloques a libre conserva el orden y las vueltas (como series)', () => {
    const routine = { calentamiento: [{ exerciseId: 'marcha-en-el-sitio', seconds: 30 }], pesas: [{ exerciseId: 'flexiones', seconds: 40 }], abdominales: [], estiramientos: [{ exerciseId: 'cobra', seconds: 30 }] };
    const free = routineToFree(routine, { pesas: 2 }, ['pesas', 'calentamiento', 'abdominales', 'estiramientos']);
    expect(free).toEqual([{ kind: 'group', rounds: 2, items: [{ kind: 'ex', exerciseId: 'flexiones', seconds: 40 }] }, ex('marcha-en-el-sitio'), ex('cobra')]);
    expect(freeToRoutine(free, (id) => CATALOG.get(id)?.section).pesas).toEqual([{ exerciseId: 'flexiones', seconds: 40 }]);
  });
  it('se guarda, se carga y se duplica', () => {
    const data = new Map<string, string>();
    const st = new Store({ getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
    const t = st.createFreeRoutine('Lliure');
    const free: FreeNode[] = [ex('cobra'), { kind: 'group', rounds: 2, items: [ex('flexiones')] }];
    st.setFreeContent(t.id, free, freeToRoutine(free, (id) => CATALOG.get(id)?.section));
    const copy = st.duplicateRoutine(t.id)!;
    expect(copy.free).toEqual(free);
    // al volver a cargar, sigue igual
    const again = new Store({ getItem: (k: string) => data.get(k) ?? null, setItem: () => {} });
    expect(again.routineById(t.id)?.free).toEqual(free);
    expect(sanitizeFree([{ kind: 'rest', seconds: 2000 }, { kind: 'group', rounds: 50, items: [{ kind: 'ex', exerciseId: 'cobra', seconds: 30 }] }, { kind: 'x' }]))
      .toEqual([{ kind: 'rest', seconds: 900 }, { kind: 'group', rounds: 10, items: [ex('cobra')] }]);
  });
});
