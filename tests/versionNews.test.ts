import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/Updates', () => ({ APP_BUILD: '', applyUpdate: vi.fn(), BUILD_TIME: '', PREV_BUILD: '', previousBuild: null }));
vi.mock('../src/platform/native', () => ({ IS_NATIVE: false }));

const { versionEntries } = await import('../src/ui/components/updateDialog');

const e = (fecha: string) => ({ fecha, es: [fecha], ca: [fecha], en: [fecha] });
// novedades.json: la más nueva primero
const ALL = [e('2026-11-18T10:00:00Z'), e('2026-11-17T23:00:00Z'), e('2026-11-17T20:00:00Z'), e('2026-11-17T12:00:00Z')];

describe('Novedades de una versión', () => {
  it('app Android: solo lo que entró después de la compilación anterior y hasta esta', () => {
    const r = versionEntries(ALL, '2026-11-17T23:30:00Z', '2026-11-17T19:00:00Z');
    expect(r.map((x) => x.fecha)).toEqual(['2026-11-17T23:00:00Z', '2026-11-17T20:00:00Z']);
  });
  it('sin compilación anterior (web): las últimas hasta esta versión', () => {
    const r = versionEntries(ALL, '2026-11-17T23:30:00Z', '');
    expect(r[0].fecha).toBe('2026-11-17T23:00:00Z');
    expect(r.length).toBe(3);
  });
});
