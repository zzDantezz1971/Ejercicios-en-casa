import { describe, expect, it } from 'vitest';
import { canDo, parseNeed, EQUIPMENT } from '../src/domain/equipment';
import { CATALOG, SECTIONS } from '../src/data/catalog';
import { EXTRAS, EXTRA_GROUPS, extraId } from '../src/data/extra';
import { GROUPS } from '../src/i18n/ex4';
import { MUSCLES } from '../src/figure/anatomy';
import { Store } from '../src/domain/Store';

describe('material', () => {
  it('requisitos: todos a la vez, con alternativas', () => {
    const need = parseNeed('mancuernas+banco|step');
    expect(canDo(need, new Set(['mancuernas', 'banco']))).toBe(true);
    expect(canDo(need, new Set(['mancuernas', 'step']))).toBe(true);
    expect(canDo(need, new Set(['mancuernas']))).toBe(false);
    expect(canDo(parseNeed(''), new Set())).toBe(true);
  });
  it('ejercicios de antes: mancuernas y banco donde toca', () => {
    expect(CATALOG.get('curl-de-biceps')!.equip).toEqual([['mancuernas']]);
    expect(CATALOG.get('press-de-banca-con-mancuernas')!.equip).toEqual([['mancuernas'], ['banco']]);
    expect(CATALOG.get('fondos-de-triceps-en-banco')!.equip).toEqual([]);
    expect(CATALOG.get('sentadillas-sin-peso')!.equip).toEqual([]);
  });
  it('quien ya usaba la app tiene mancuernas y banco; quien empieza, nada', () => {
    const mem = (raw?: string) => { const m = new Map<string, string>(); if (raw) m.set('ejercicios-en-casa', raw); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
    expect(new Store(mem(JSON.stringify({ version: 2, history: [] }))).settings.equipment).toEqual(['mancuernas', 'banco']);
    expect(new Store(mem()).settings.equipment).toEqual([]);
  });
});

describe('ejercicios nuevos', () => {
  const ids = EXTRAS.map((e) => extraId(e.n));
  it('sin nombres repetidos', () => {
    expect(new Set(ids).size).toBe(ids.length);
    const total = SECTIONS.reduce((a, s) => a + s.exercises.length, 0);
    expect(CATALOG.size).toBe(total + 4); // + los retirados de las listas
  });
  for (const x of EXTRAS) {
    it(x.n, () => {
      expect(x.es.length).toBe(5);
      expect(x.ca.length).toBe(7);
      expect(x.en.length).toBe(7);
      for (const t of [...x.es.slice(0, 3), ...x.ca.slice(0, 5), ...x.en.slice(0, 5)]) expect(t.trim().length).toBeGreaterThan(1);
      for (const tok of x.m.trim().split(/\s+/)) {
        expect(['+', '~', '-']).toContain(tok[0]);
        expect(MUSCLES as readonly string[]).toContain(tok.slice(1).split('@')[0]);
      }
      for (const alts of (x.eq ?? '').split('+').filter(Boolean)) for (const e of alts.split('|')) expect(EQUIPMENT as readonly string[]).toContain(e);
      if (x.g) expect({ ...GROUPS, ...EXTRA_GROUPS }[x.g], `grupo sin traducir: ${x.g}`).toBeTruthy();
    });
  }
});
