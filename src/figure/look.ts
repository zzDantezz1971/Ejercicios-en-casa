/* Aspecto del muñeco elegido en Configuración: colores de piel y ropa (gratis); gafas y barba (prémium). */

export type Glasses = 'none' | 'normal' | 'sun';
export type Beard = 'none' | 'stubble' | 'full';

export interface Look {
  skin: string;
  shirt: string;
  shorts: string;
  shoe: string;
  glasses: Glasses;
  beard: Beard;
}

export const DEFAULT_LOOK: Look = { skin: '#E2A983', shirt: '#2F5BEA', shorts: '#1E2633', shoe: '#F2A516', glasses: 'none', beard: 'none' };

/** Colores que se pueden elegir. */
export const SKIN_TONES = ['#F6D3BC', '#EBBE9B', '#E2A983', '#C68B62', '#9C6644', '#6B4430', '#47291C'];
export const SHIRT_COLORS = ['#2F5BEA', '#E5484D', '#22A06B', '#F2A516', '#8B5CF6', '#EC4899', '#14B8A6', '#F3F5F8', '#1E2633'];
export const SHORTS_COLORS = ['#1E2633', '#3A4555', '#2F5BEA', '#7A1F2B', '#2E5E3A', '#6B5B45', '#F3F5F8'];
export const SHOE_COLORS = ['#F2A516', '#F3F5F8', '#1E2633', '#E5484D', '#2F5BEA', '#22A06B', '#EC4899'];

let look: Look = { ...DEFAULT_LOOK };
let premium: () => boolean = () => false;
let version = 0;

/** Aspecto que se ve (las opciones prémium solo con prémium). */
export function getLook(): Look {
  return premium() ? look : { ...look, glasses: 'none', beard: 'none' };
}

export function setLook(l: Partial<Look> | undefined, isPremium: () => boolean): void {
  const next = { ...DEFAULT_LOOK, ...(l ?? {}) };
  premium = isPremium;
  if (JSON.stringify(next) !== JSON.stringify(look)) version++;
  look = next;
}

/** Cambia cada vez que cambia el aspecto (para no reutilizar miniaturas dibujadas con el anterior). */
export function lookKey(): string {
  const l = getLook();
  return `${version}${l.glasses[0]}${l.beard[0]}`;
}

/** Color de las cejas y la barba a juego con la piel. */
export function hairColor(skin: string): string {
  const n = parseInt(skin.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#6B4A3A' : lum > 0.35 ? '#3B2A20' : '#1E1612';
}
