import { describe, expect, it } from 'vitest';
import { WorkoutPlan, type Catalog } from '../src/domain/WorkoutPlan';
import { WorkoutSession, type Cue, type SessionSummary } from '../src/domain/WorkoutSession';
import { DEFAULT_SETTINGS, emptyRoutine, type ExerciseDef, type Settings } from '../src/domain/types';

const ex = (id: string, section: ExerciseDef['section'], oneSided = false): ExerciseDef => ({
  id, name: id, section, zone: '', oneSided, motion: {},
});
const catalog: Catalog = new Map(
  [ex('a', 'calentamiento'), ex('b', 'calentamiento'), ex('c', 'pesas', true), ex('d', 'estiramientos')].map((e) => [e.id, e]),
);

function routine() {
  const r = emptyRoutine();
  r.calentamiento = [{ exerciseId: 'a', seconds: 20 }, { exerciseId: 'b', seconds: 10 }];
  r.pesas = [{ exerciseId: 'c', seconds: 40 }];
  r.estiramientos = [{ exerciseId: 'd', seconds: 30 }];
  return r;
}

/** Reloj falso controlable. */
function clock() {
  let t = 0;
  return { now: () => t, advance: (s: number) => (t += s * 1000) };
}

function run(session: WorkoutSession, c: ReturnType<typeof clock>, seconds: number) {
  for (let i = 0; i < seconds * 10; i++) {
    c.advance(0.1);
    session.tick();
  }
}

describe('WorkoutPlan', () => {
  it('ordena apartados, añade cuenta atrás, pausas y esperas entre apartados', () => {
    const plan = WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS);
    expect(plan.steps.map((s) => s.kind)).toEqual([
      'countdown', 'exercise', 'rest', 'exercise',
      'sectionBreak', 'countdown', 'exercise',
      'sectionBreak', 'countdown', 'exercise',
    ]);
    expect(plan.exerciseCount).toBe(4);
    expect(plan.estimatedSeconds).toBe(10 * 3 + 20 + 5 + 10 + 40 + 3 + 30); // 3 s del cambio de lado
  });

  it('pone el cambio de lado a mitad del tiempo solo en ejercicios de un lado', () => {
    const plan = WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS);
    const exs = plan.steps.filter((s) => s.kind === 'exercise');
    expect(exs.map((s) => (s.kind === 'exercise' ? s.switchAt : null))).toEqual([undefined, undefined, 20, undefined]);
  });

  it('sin pausa ni cuenta atrás si se ponen a 0', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, rest: { calentamiento: 0, pesas: 0, abdominales: 0, estiramientos: 0 }, sectionCountdown: 0 };
    const plan = WorkoutPlan.build(routine(), catalog, settings);
    expect(plan.steps.map((s) => s.kind)).toEqual(['exercise', 'exercise', 'sectionBreak', 'exercise', 'sectionBreak', 'exercise']);
  });

  it('usa la pausa de cada apartado y pasa el peso al ejercicio', () => {
    const r = routine();
    r.pesas = [{ exerciseId: 'c', seconds: 40, weight: 8 }, { exerciseId: 'c2', seconds: 20 }];
    const cat: Catalog = new Map([...catalog, ['c2', ex('c2', 'pesas')]]);
    const plan = WorkoutPlan.build(r, cat, { ...DEFAULT_SETTINGS, rest: { ...DEFAULT_SETTINGS.rest, calentamiento: 3, pesas: 30 } });
    const rests = plan.steps.filter((s) => s.kind === 'rest').map((s) => [s.section, 'seconds' in s ? s.seconds : 0]);
    expect(rests).toEqual([['calentamiento', 3], ['pesas', 30]]);
    const first = plan.steps.find((s) => s.kind === 'exercise' && s.exercise.id === 'c');
    expect(first && first.kind === 'exercise' && first.weight).toBe(8);
  });

  it('ignora ejercicios que ya no existen', () => {
    const r = emptyRoutine();
    r.pesas = [{ exerciseId: 'no-existe', seconds: 30 }];
    expect(WorkoutPlan.build(r, catalog, DEFAULT_SETTINGS).isEmpty).toBe(true);
  });
});

describe('WorkoutSession', () => {
  it('recorre todo, espera el toque entre apartados y registra el resumen', () => {
    const c = clock();
    const s = new WorkoutSession(WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS), c.now);
    const cues: Cue[] = [];
    let summary: unknown = null;
    s.on('cue', (q) => cues.push(q));
    s.on('finished', (r) => (summary = r));

    s.start();
    expect(s.current?.kind).toBe('countdown');
    run(s, c, 10 + 20 + 5 + 10 + 1);
    expect(s.status).toBe('waiting');
    run(s, c, 30); // esperando: no avanza solo
    expect(s.current?.kind).toBe('sectionBreak');
    s.continue();
    expect(s.current?.kind).toBe('countdown');
    run(s, c, 10 + 40 + 3 + 1);
    expect(cues.filter((q) => q.type === 'switch')).toHaveLength(1);
    expect(cues.filter((q) => q.type === 'go')).toHaveLength(1);
    s.continue();
    run(s, c, 10 + 30 + 1);
    expect(s.status).toBe('finished');
    expect(summary).toMatchObject({ exercisesDone: 4, exercisesPlanned: 4, completed: true });
    expect(cues.filter((q) => q.type === 'start')).toHaveLength(4);
    expect(cues.filter((q) => q.type === 'count' && q.n === 3).length).toBeGreaterThanOrEqual(4);
  });

  it('la pausa congela el tiempo', () => {
    const c = clock();
    const s = new WorkoutSession(WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS), c.now);
    let remaining = 0;
    s.on('tick', (t) => (remaining = t.remaining));
    s.start();
    run(s, c, 4);
    s.pause();
    c.advance(60);
    s.tick();
    s.resume();
    run(s, c, 1);
    expect(remaining).toBeCloseTo(5, 0);
    expect(s.current?.kind).toBe('countdown');
  });

  it('saltar va al siguiente ejercicio sin pasar por la pausa; anterior vuelve al ejercicio previo', () => {
    const c = clock();
    const s = new WorkoutSession(WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS), c.now);
    s.start();
    s.next(); // cuenta atrás -> ejercicio a
    expect(s.current).toMatchObject({ kind: 'exercise', exercise: { id: 'a' } });
    s.next(); // a -> b (salta la pausa)
    expect(s.current).toMatchObject({ kind: 'exercise', exercise: { id: 'b' } });
    s.previous();
    expect(s.current).toMatchObject({ kind: 'exercise', exercise: { id: 'a' } });
    s.previous(); // no hay anterior: reinicia a
    expect(s.current).toMatchObject({ kind: 'exercise', exercise: { id: 'a' } });
    run(s, c, 21); // termina a -> pausa
    expect(s.current?.kind).toBe('rest');
    s.previous(); // desde la pausa vuelve a a
    expect(s.current).toMatchObject({ kind: 'exercise', exercise: { id: 'a' } });
  });

  it('anota el tiempo hecho de cada ejercicio, completados y saltados', () => {
    const c = clock();
    const s = new WorkoutSession(WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS), c.now);
    let sum: SessionSummary | null = null;
    s.on('finished', (r) => (sum = r));
    s.start();
    run(s, c, 10 + 20 + 5 + 4); // cuenta atrás, 'a' completo, pausa y 4 s de 'b'
    s.next(); // salta el resto de 'b'
    s.stop();
    const items = (sum as unknown as SessionSummary).items;
    expect(items.map((i) => i.exerciseId)).toEqual(['a', 'b', 'c', 'd']);
    expect(items[0]).toMatchObject({ seconds: 20, completed: true, planned: 20 });
    expect(items[1].completed).toBe(false);
    expect(items[1].seconds).toBeGreaterThanOrEqual(3);
    expect(items[1].seconds).toBeLessThanOrEqual(5);
    expect(items[3]).toMatchObject({ seconds: 0, completed: false });
  });

  it('terminar antes guarda como no completado', () => {
    const c = clock();
    const s = new WorkoutSession(WorkoutPlan.build(routine(), catalog, DEFAULT_SETTINGS), c.now);
    let done: { completed: boolean; exercisesDone: number } | null = null;
    s.on('finished', (r) => (done = r));
    s.start();
    run(s, c, 31);
    s.stop();
    expect(done).toMatchObject({ completed: false, exercisesDone: 1 });
  });
});

describe('Vueltas', () => {
  it('repite los ejercicios del apartado con pausa entre vueltas', () => {
    const r = emptyRoutine();
    r.calentamiento = [{ exerciseId: 'a', seconds: 20 }, { exerciseId: 'b', seconds: 10 }];
    const plan = WorkoutPlan.build(r, catalog, DEFAULT_SETTINGS, { calentamiento: 3 });
    const exs = plan.steps.filter((s) => s.kind === 'exercise');
    expect(exs.map((s) => (s.kind === 'exercise' ? `${s.exercise.id}${s.round}/${s.rounds}` : ''))).toEqual(['a1/3', 'b1/3', 'a2/3', 'b2/3', 'a3/3', 'b3/3']);
    expect(plan.steps.filter((s) => s.kind === 'rest')).toHaveLength(5);
    expect(plan.estimatedSeconds).toBe(10 + 3 * 30 + 5 * 5);
  });
});

describe('Cambio de lado', () => {
  it('a mitad de tiempo para el reloj 3 s con cuenta atrás y luego sigue la otra mitad', () => {
    const r = emptyRoutine();
    r.pesas = [{ exerciseId: 'c', seconds: 40 }];
    const c = clock();
    const s = new WorkoutSession(WorkoutPlan.build(r, catalog, DEFAULT_SETTINGS), c.now);
    const cues: Cue[] = [];
    let last: { remaining: number; switching?: number } = { remaining: 0 };
    s.on('cue', (q) => cues.push(q));
    s.on('tick', (t) => (last = t));
    s.start();
    run(s, c, 10); // cuenta atrás inicial
    expect(s.current?.kind).toBe('exercise');
    run(s, c, 21); // pasa la mitad (20 s)
    expect(cues.filter((q) => q.type === 'switch')).toHaveLength(1);
    expect(last.switching).toBeGreaterThan(0);
    expect(last.remaining).toBe(20); // el tiempo está parado
    expect(cues.filter((q) => q.type === 'count' && q.side).map((q) => (q as { n: number }).n)).toEqual([3, 2]);
    run(s, c, 2.5);
    expect(cues.some((q) => q.type === 'go')).toBe(true);
    expect(last.switching).toBeUndefined();
    expect(last.remaining).toBeGreaterThan(19);
    expect(last.remaining).toBeLessThan(20);
    run(s, c, 20);
    expect(s.status).toBe('finished');
  });

  it('la duración estimada cuenta los 3 s del cambio de lado', () => {
    const r = emptyRoutine();
    r.pesas = [{ exerciseId: 'c', seconds: 40 }];
    const plan = WorkoutPlan.build(r, catalog, DEFAULT_SETTINGS);
    const first = plan.steps[0];
    const countdown = first.kind === 'countdown' ? first.seconds : 0;
    expect(plan.estimatedSeconds).toBe(countdown + 40 + 3);
  });
});
