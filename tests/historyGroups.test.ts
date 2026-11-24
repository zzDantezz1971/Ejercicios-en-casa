import { describe, expect, it } from 'vitest';
import { groupHistory } from '../src/domain/historyGroups';

const ids = (s: string) => s.split('');

describe('Historial: repeticiones agrupadas', () => {
  it('sin repeticiones, una fila por ejercicio', () => {
    const g = groupHistory(ids('ABC'));
    expect(g.rounds).toBe(1);
    expect(g.groups.map((x) => x.times)).toEqual([1, 1, 1]);
  });
  it('una serie x3 en medio', () => {
    const g = groupHistory(ids('ABCBCBCD'));
    expect(g.rounds).toBe(1);
    expect(g.groups.map((x) => `${x.times}:${x.rows.length}`)).toEqual(['1:1', '3:2', '1:1']);
    expect(g.groups[1].rows[0]).toEqual([1, 3, 5]);
  });
  it('el bloque entero x2 con una serie x3 dentro', () => {
    const one = 'ABCBCBCD';
    const g = groupHistory(ids(one + one));
    expect(g.rounds).toBe(2);
    expect(g.groups.map((x) => `${x.times}:${x.rows.length}`)).toEqual(['1:1', '3:2', '1:1']);
    // la fila de A, con las dos vueltas
    expect(g.groups[0].rows[0]).toEqual([0, 8]);
    expect(g.groups[1].rows[0]).toEqual([1, 3, 5, 9, 11, 13]);
  });
});
