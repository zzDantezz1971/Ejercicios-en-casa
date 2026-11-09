import { describe, expect, it } from 'vitest';
import news from '../public/novedades.json';

describe('novedades.json', () => {
  it('ordenadas de la más nueva a la más antigua, con los tres idiomas', () => {
    const f = news.map((e) => e.fecha);
    expect(f).toEqual([...f].sort().reverse());
    for (const e of news) for (const l of ['es', 'ca', 'en'] as const) expect(e[l].length).toBeGreaterThan(0);
  });

  it('ninguna fecha en el futuro (si no, se enseñarían en cada actualización)', () => {
    const limit = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    for (const e of news) expect(e.fecha <= limit, e.fecha).toBe(true);
  });
});
