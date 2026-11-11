/* Códigos de acceso gratis (para quien el autor quiera): NOMBRE-XXXX-XXXX.
   XXXX-XXXX son los primeros 40 bits de HMAC-SHA256(clave, NOMBRE) en base 32 sin letras que se confundan.
   La clave no está en el código fuente: se pone como secreto de GitHub (ACCESS_CODE_SECRET) y entra en la app
   al compilarla para Google Play. Los códigos se generan con la misma clave (generador aparte). */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 símbolos, sin I, O, 0 ni 1

/** Nombre del código: solo letras y números, en mayúsculas y sin acentos (2 a 12). */
export function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

async function hmac(secret: string, text: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

function base32(bytes: Uint8Array, chars: number): string {
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= chars) break;
  }
  return out;
}

/** Código para un nombre (null si el nombre no vale). */
export async function codeFor(secret: string, name: string): Promise<string | null> {
  const n = normalizeName(name);
  if (n.length < 2 || !secret) return null;
  const s = base32(await hmac(secret, n), 8);
  return `${n}-${s.slice(0, 4)}-${s.slice(4)}`;
}

/** Comprueba un código escrito por el usuario. Devuelve el nombre si es válido (y no está anulado). */
export async function checkCode(secret: string, typed: string, revoked: readonly string[] = []): Promise<string | null> {
  if (!secret) return null;
  // se aceptan minúsculas, espacios y guiones de más
  const clean = typed.toUpperCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const m = clean.match(/^([A-Z0-9]{2,12})-?([A-Z0-9]{4})-?([A-Z0-9]{4})$/);
  if (!m || revoked.includes(m[1])) return null;
  const good = await codeFor(secret, m[1]);
  return good === `${m[1]}-${m[2]}-${m[3]}` ? m[1] : null;
}
