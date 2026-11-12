/* Mapas de músculos de los resúmenes (cuerpo de frente y de espaldas con los músculos trabajados coloreados).
   Se colorean a partir de unas imágenes de datos sacadas una vez del maniquí realista (tools/bodymap), así la app
   no tiene que descargar ese maniquí. Cada imagen lleva 4 paneles con el mismo recorte, uno debajo de otro:
   A = (músculo 1, cobertura 1, músculo 2)   B = (cobertura 2, líneas, 0 fuera / 128 piel / 255 pantalón)
   C = color con luces, sin músculos          D = (transparencia, luz / 2, 0) */

const W = 440, H = 660;
/** Recorte de cada vista dentro de la imagen final (x, y, ancho, alto); lo da tools/bodymap/pack.py. */
const BOX = { delante: [154, 121, 132, 409], detras: [153, 120, 134, 417] } as const;
type View = keyof typeof BOX;

const data = new Map<View, Promise<ImageData | null>>();
function load(view: View): Promise<ImageData | null> {
  let p = data.get(view);
  if (!p) {
    p = new Promise((done) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return done(null);
        ctx.drawImage(img, 0, 0);
        done(ctx.getImageData(0, 0, c.width, c.height));
      };
      img.onerror = () => done(null);
      img.src = `${import.meta.env.BASE_URL}mapa-musculos-${view}.png`;
    });
    data.set(view, p);
  }
  return p;
}

const toSrgb = (x: number) => {
  x = Math.min(1, Math.max(0, x));
  return 255 * (x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055);
};

/** Un solo color, rojo vivo: entero en lo más trabajado (peso 1) y suave (más transparente) en lo que se trabajó algo. */
const hot = [0.85, 0.12, 0.15];
const SOFT = 0.45;

/** Colorea el mapa de músculos. */
function paint(src: ImageData, box: readonly number[], weights: number[]): string {
  const [x0, y0, bw, bh] = box;
  const out = new ImageData(W, H);
  const s = src.data, o = out.data;
  const panel = bw * bh * 4;
  const wt = (i: number) => (i < weights.length ? weights[i] : 0);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const a = (y * bw + x) * 4, b = a + panel, c = b + panel, d = c + panel;
      const t = ((y + y0) * W + x + x0) * 4;
      o[t + 3] = s[d];
      if (!s[d]) continue;
      const flag = s[b + 2];
      if (flag < 64) { o[t] = s[c]; o[t + 1] = s[c + 1]; o[t + 2] = s[c + 2]; continue; }
      const m1 = s[a + 1] / 255, m2 = s[b] / 255, w1 = wt(s[a]), w2 = wt(s[a + 2]);
      const cov = Math.max(w1 > 0.001 ? m1 : 0, w2 > 0.001 ? m2 : 0);
      const work = Math.max(m1 * Math.max(w1, 0), m2 * Math.max(w2, 0));
      const strong = work / Math.max(cov, 0.001) >= 0.65;
      const shorts = flag > 191;
      const base = shorts ? [0.12, 0.15, 0.2] : [0.6, 0.64, 0.7];
      const k = Math.min(1, cov * (shorts ? 0.5 : 1) * (strong ? 1 : SOFT));
      const dark = 1 - 0.2 * (s[b + 1] / 255) * k;
      const L = (s[d + 1] / 255) * 2;
      for (let ch = 0; ch < 3; ch++) o[t + ch] = toSrgb((base[ch] * (1 - k) + hot[ch] * k) * dark * L + hot[ch] * k * 0.3);
    }
  }
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.getContext('2d')!.putImageData(out, 0, 0);
  return cv.toDataURL('image/png');
}

const cache = new Map<string, Promise<string>>();
/** Cuerpo de pie (de frente o de espaldas) con los músculos coloreados según `weights`. Vacío si no se pudo cargar. */
function bodyMap(weights: number[], back: boolean): Promise<string> {
  const key = `${back ? 1 : 0}:${weights.map((w) => w.toFixed(2)).join(',')}`;
  let p = cache.get(key);
  if (!p) {
    const view: View = back ? 'detras' : 'delante';
    p = load(view).then((src) => (src ? paint(src, BOX[view], weights) : ''));
    cache.set(key, p);
  }
  return p;
}

export function bodyMaps(): { bodyMap: typeof bodyMap } {
  return { bodyMap };
}
