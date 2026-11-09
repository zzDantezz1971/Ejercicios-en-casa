import { describe, expect, it } from 'vitest';
import { findFit, markZones } from '../src/figure/thumbFit';

const W = 132, H = 88;
/** Máscara con un rectángulo de figura (coordenadas en fracciones). */
function rect(x0: number, y0: number, x1: number, y1: number): Uint8Array {
  const m = new Uint8Array(W * H);
  for (let y = Math.floor(y0 * H); y < y1 * H; y++) for (let x = Math.floor(x0 * W); x < x1 * W; x++) m[y * W + x] = 1;
  return m;
}

describe('encaje de miniaturas', () => {
  it('no cambia nada si la figura no toca los iconos', () => {
    expect(findFit(rect(0.4, 0.15, 0.6, 1), W, H, markZones(2))).toBeNull();
  });

  it('aparta una figura que queda debajo del icono de la derecha', () => {
    const fit = findFit(rect(0.45, 0.05, 0.92, 1), W, H, markZones(0));
    expect(fit).not.toBeNull();
    expect(fit!.dx < 0 || fit!.s < 1).toBe(true);
  });

  it('las zonas de la izquierda crecen con cada aparato', () => {
    expect(markZones(0)).toHaveLength(1);
    expect(markZones(2)[1][3]).toBeGreaterThan(markZones(1)[1][3]);
  });
});
