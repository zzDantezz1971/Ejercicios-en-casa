import { describe, expect, it } from 'vitest';
import { CATALOG, SECTIONS } from '../src/data/catalog';
import { generate, swapExercise, tableSeconds, GOALS, ZONES, LEVELS, MINUTES, type GenContext } from '../src/domain/generator';
import { canDo } from '../src/domain/equipment';
import { DEFAULT_SETTINGS, SECTION_IDS } from '../src/domain/types';

// generador de números «aleatorios» repetible
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}
const ctx = (owned: string[], seed = 1): GenContext => ({ sections: SECTIONS, catalog: CATALOG, owned: new Set(owned), settings: DEFAULT_SETTINGS, rng: seeded(seed) });

describe('Asistente «Crea-la per mi»', () => {
  it('cuadra el tiempo, no repite ejercicios y respeta el material en todas las combinaciones', () => {
    const worst: string[] = [];
    for (const owned of [[], ['mancuernas', 'banco', 'bandas', 'kettlebell', 'step', 'fitball', 'comba', 'barra', 'dominadas', 'rueda']])
      for (const goal of GOALS) for (const zone of ZONES) for (const level of LEVELS) for (const minutes of MINUTES) {
        const c = ctx(owned, minutes * 7 + level.length);
        const r = generate({ goal, zone, level, minutes }, c);
        const ids = SECTION_IDS.flatMap((s) => r.routine[s].map((i) => i.exerciseId));
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) {
          const ex = CATALOG.get(id)!;
          expect(canDo(ex.equip, c.owned)).toBe(true);
          if (level === 'suave' || goal === 'espalda') expect(ex.badges?.includes('caution')).not.toBe(true);
        }
        const t = tableSeconds(r, c), target = minutes * 60;
        if (Math.abs(t - target) > target * 0.2) worst.push(`${goal}/${zone}/${level}/${minutes}: ${Math.round(t / 60)} min`);
      }
    expect(worst).toEqual([]);
  });

  it('en la zona elegida, la fuerza trabaja esos músculos', () => {
    const r = generate({ goal: 'forma', zone: 'inferior', level: 'normal', minutes: 20 }, ctx([]));
    const legs = ['cuadriceps', 'gluteos', 'isquios', 'gemelos', 'aductores'];
    for (const i of r.routine.pesas) expect(legs.some((m) => (CATALOG.get(i.exerciseId)!.muscles ?? '').includes(m))).toBe(true);
    expect(r.routine.estiramientos.length).toBeGreaterThan(0);
  });

  it('flexibilidad: solo calentamiento y estiramientos', () => {
    const r = generate({ goal: 'flexibilidad', zone: 'entero', level: 'normal', minutes: 15 }, ctx([]));
    expect(r.routine.pesas).toEqual([]);
    expect(r.routine.abdominales).toEqual([]);
    expect(r.routine.estiramientos.length).toBeGreaterThan(3);
  });

  it('cambiar un ejercicio pone otro del mismo apartado que no estaba', () => {
    const c = ctx([]);
    const o = { goal: 'forma', zone: 'entero', level: 'normal', minutes: 20 } as const;
    const r = generate(o, c);
    const before = r.routine.pesas[0].exerciseId;
    const s = swapExercise(r, 'pesas', 0, o, c);
    const after = s.routine.pesas[0].exerciseId;
    expect(after).not.toBe(before);
    expect(CATALOG.get(after)!.section).toBe('pesas');
    expect(r.routine.pesas.map((i) => i.exerciseId)).not.toContain(after);
  });
});
