import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../src/domain/Store';

describe('app Android', () => {
  it('la copia duradera usa la misma clave que el Store', () => {
    const src = readFileSync('src/platform/durable.ts', 'utf8');
    expect(src).toContain(`const KEYS = ['${STORAGE_KEY}']`);
  });
});
