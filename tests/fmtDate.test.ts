import { describe, expect, it } from 'vitest';
import { dateText, timeText } from '../src/i18n/fmtDate';

const d = new Date(2026, 10, 23, 16, 5); // lunes 23 de noviembre de 2026

describe('fechas en gallego y euskera (sin depender del navegador)', () => {
  it('gallego', () => {
    expect(dateText(d, { weekday: 'long', day: 'numeric', month: 'long' }, 'gl')).toBe('luns, 23 de novembro');
    expect(dateText(d, { day: 'numeric', month: 'long', year: 'numeric' }, 'gl')).toBe('23 de novembro de 2026');
    expect(dateText(d, { day: 'numeric', month: 'short' }, 'gl')).toBe('23 nov.');
    expect(dateText(d, { month: 'long', year: 'numeric' }, 'gl')).toBe('novembro de 2026');
    expect(dateText(d, { weekday: 'short' }, 'gl')).toBe('luns');
    expect(dateText(d, {}, 'gl')).toBe('23/11/2026');
    expect(timeText(d, undefined, 'gl')).toBe('16:05');
  });
  it('euskera', () => {
    expect(dateText(d, { weekday: 'long', day: 'numeric', month: 'long' }, 'eu')).toBe('astelehena, azaroak 23');
    expect(dateText(d, { day: 'numeric', month: 'long', year: 'numeric' }, 'eu')).toBe('2026ko azaroaren 23a');
    expect(dateText(d, { day: 'numeric', month: 'short' }, 'eu')).toBe('aza. 23');
    expect(dateText(d, { month: 'long', year: 'numeric' }, 'eu')).toBe('2026ko azaroa');
    expect(dateText(d, { month: 'long' }, 'eu')).toBe('azaroa');
    expect(dateText(d, {}, 'eu')).toBe('2026/11/23');
  });
});
