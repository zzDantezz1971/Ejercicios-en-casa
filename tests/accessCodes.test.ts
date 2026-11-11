import { describe, expect, it } from 'vitest';
import { checkCode, codeFor, normalizeName } from '../src/services/accessCodes';

const SECRET = 'clave-de-prueba-solo-para-los-tests';

describe('Códigos de acceso', () => {
  it('normaliza el nombre', () => {
    expect(normalizeName('  Núria m. ')).toBe('NURIAM');
    expect(normalizeName('abcdefghijklmnop')).toBe('ABCDEFGHIJKL');
  });

  it('genera códigos NOMBRE-XXXX-XXXX sin letras que se confundan', async () => {
    const c = (await codeFor(SECRET, 'Marta'))!;
    expect(c).toMatch(/^MARTA-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(await codeFor(SECRET, 'Marta')).toBe(c); // siempre el mismo
    expect(await codeFor(SECRET, 'Pere')).not.toBe(c.replace('MARTA', 'PERE'));
  });

  it('acepta el código bien escrito, en minúsculas o sin guiones', async () => {
    const c = (await codeFor(SECRET, 'Marta'))!;
    expect(await checkCode(SECRET, c)).toBe('MARTA');
    expect(await checkCode(SECRET, ` ${c.toLowerCase()} `)).toBe('MARTA');
    expect(await checkCode(SECRET, c.replace(/-/g, ''))).toBe('MARTA');
  });

  it('rechaza códigos inventados, de otra clave o anulados', async () => {
    const c = (await codeFor(SECRET, 'Marta'))!;
    expect(await checkCode(SECRET, 'MARTA-AAAA-AAAA')).toBeNull();
    expect(await checkCode('otra-clave', c)).toBeNull();
    expect(await checkCode(SECRET, c, ['MARTA'])).toBeNull();
    expect(await checkCode('', c)).toBeNull();
    expect(await checkCode(SECRET, c.replace('MARTA', 'PERE'))).toBeNull();
  });
});
