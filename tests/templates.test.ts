import { describe, expect, it } from 'vitest';
import { CATALOG, SECTIONS } from '../src/data/catalog';
import { TEMPLATES } from '../src/data/templates';
import { WorkoutPlan } from '../src/domain/WorkoutPlan';
import { DEFAULT_SETTINGS, emptyRoutine, SECTION_IDS } from '../src/domain/types';

describe('Taules fetes', () => {
  const visible = new Set(SECTIONS.flatMap((s) => s.exercises.map((e) => e.id)));
  it('todos los ejercicios existen, están en su apartado y no están retirados', () => {
    for (const t of TEMPLATES) for (const sec of SECTION_IDS) for (const [id] of t.routine[sec] ?? []) {
      expect(visible.has(id), `${t.id}: ${id}`).toBe(true);
      expect(CATALOG.get(id)!.section, `${t.id}: ${id}`).toBe(sec);
    }
  });
  it('sin ejercicios repetidos en una misma tabla y con identificador único', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      const ids = SECTION_IDS.flatMap((s) => (t.routine[s] ?? []).map(([id]) => id));
      expect(new Set(ids).size, t.id).toBe(ids.length);
    }
  });
  it('duran entre 5 y 40 minutos', () => {
    for (const t of TEMPLATES) {
      const r = emptyRoutine();
      for (const s of SECTION_IDS) r[s] = (t.routine[s] ?? []).map(([exerciseId, seconds]) => ({ exerciseId, seconds }));
      const min = WorkoutPlan.build(r, CATALOG, DEFAULT_SETTINGS, t.rounds).estimatedSeconds / 60;
      expect(min, t.id).toBeGreaterThan(5);
      expect(min, t.id).toBeLessThan(40);
    }
  });
});
