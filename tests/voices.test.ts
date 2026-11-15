import { describe, expect, it } from 'vitest';
import { pickFew } from '../src/services/Voice';

describe('pickFew (voces para elegir)', () => {
  it('una de cada voz (la local), como mucho 3', () => {
    const v = ['eea', 'eeb', 'eec', 'eed', 'eef'].flatMap((x) => [
      { id: `es-es-x-${x}-network`, name: `es-es-x-${x}-network`, lang: 'es-ES' },
      { id: `es-es-x-${x}-local`, name: `es-es-x-${x}-local`, lang: 'es-ES' },
    ]);
    const r = pickFew(v);
    expect(r.length).toBe(3);
    expect(r.every((x) => x.name.endsWith('-local'))).toBe(true);
    expect(new Set(r.map((x) => x.name)).size).toBe(3);
  });
  it('en inglés, las británicas si las hay', () => {
    const r = pickFew([
      { id: 'a', name: 'en-us-x-iob-local', lang: 'en-US' },
      { id: 'b', name: 'en-gb-x-gba-local', lang: 'en-GB' },
      { id: 'c', name: 'en-au-x-aua-local', lang: 'en-AU' },
    ]);
    expect(r.map((x) => x.id)).toEqual(['b']);
  });
});
