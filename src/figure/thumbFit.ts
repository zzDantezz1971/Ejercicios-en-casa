/* Encaje de las miniaturas: en las fichas, arriba a la izquierda van los iconos del material
   (uno por línea) y arriba a la derecha el del apartado. Si el maniquí (o su banco, barra…)
   queda debajo de algún icono, se mueve un poco hacia un lado y/o se hace algo más pequeño,
   siempre con los pies en el mismo suelo. Se elige el cambio más pequeño que lo deja libre. */

/** Cambio aplicado a la imagen: escala alrededor del centro de abajo y desplazamiento horizontal (en fracción del ancho). */
export interface Fit {
  s: number;
  dx: number;
}

/** Zonas ocupadas por los iconos, en fracciones de la imagen (x0, y0, x1, y1). */
export function markZones(equipLines: number): Array<[number, number, number, number]> {
  // ficha estrecha (móvil de 360 px): imagen de unos 165×110 px; icono de 22 px a 6 px del borde, y 3 px de aire
  const W = 165, H = 110, side = (6 + 22 + 3) / W;
  const zones: Array<[number, number, number, number]> = [[1 - side, 0, 1, (6 + 22 + 3) / H]];
  if (equipLines > 0) zones.push([0, 0, side, (6 + 22 * equipLines + 4 * (equipLines - 1) + 3) / H]);
  return zones;
}

/**
 * Busca el encaje más pequeño para que la figura (máscara `mask` de w×h, 1 = figura)
 * no quede debajo de las zonas. Devuelve null si ya está libre.
 */
export function findFit(mask: Uint8Array, w: number, h: number, zones: Array<[number, number, number, number]>): Fit | null {
  // caja de la figura
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const ax = w / 2, ay = h; // ancla: centro de abajo (el suelo no se mueve)
  const hits = (s: number, dx: number): number => {
    let n = 0;
    for (const [zx0, zy0, zx1, zy1] of zones) {
      for (let y = Math.floor(zy0 * h); y < Math.ceil(zy1 * h); y++) {
        for (let x = Math.floor(zx0 * w); x < Math.ceil(zx1 * w); x++) {
          const sx = Math.round(ax + (x - dx * w - ax) / s), sy = Math.round(ay + (y - ay) / s);
          if (sx >= 0 && sx < w && sy >= 0 && sy < h && mask[sy * w + sx]) n++;
        }
      }
    }
    return n;
  };
  if (hits(1, 0) === 0) return null;
  // la figura entera debe seguir dentro de la imagen (con un pequeño margen)
  const inside = (s: number, dx: number): boolean => {
    const m = 0.01 * w;
    const l = ax + (x0 - ax) * s + dx * w, r = ax + (x1 - ax) * s + dx * w;
    return l >= m && r <= w - m;
  };
  let best: { fit: Fit; cost: number; n: number } | null = null;
  for (let s = 1; s >= 0.69; s -= 0.025) {
    for (let dx = -0.3; dx <= 0.3001; dx += 0.01) {
      if (!inside(s, dx)) continue;
      const n = hits(s, dx);
      const cost = (1 - s) * 2.5 + Math.abs(dx);
      if (!best || n < best.n || (n === best.n && cost < best.cost)) best = { fit: { s, dx }, cost, n };
    }
  }
  return best && best.n < hits(1, 0) ? best.fit : null;
}
