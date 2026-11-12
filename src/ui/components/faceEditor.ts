import { h } from '../dom';
import { icon } from '../icons';

/* Cara del usuario para el muñeco: se elige una foto, se encuadra la cara en el óvalo (arrastrando y con el zoom)
   y se pasa a dibujo (colores planos y contorno marcado). Todo se hace en el móvil: la foto no sale de él. */

const OUT = 256; // tamaño de la imagen final (px)

export interface FaceResult { url: string; skin: string }

/** Pide una foto y abre el editor. Devuelve la cara lista para el muñeco, o null si se cancela. */
export function pickFace(): Promise<FaceResult | null> {
  return new Promise((done) => {
    const input = h('input', { type: 'file', accept: 'image/*', style: 'display:none' }) as HTMLInputElement;
    document.body.append(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return done(null);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); void editFace(img).then(done); };
      img.onerror = () => { URL.revokeObjectURL(url); done(null); };
      img.src = url;
    });
    // si se cierra el selector sin elegir nada no siempre llega «change»: se limpia al volver a la app
    window.addEventListener('focus', () => setTimeout(() => { if (input.isConnected && !input.files?.length) { input.remove(); done(null); } }, 800), { once: true });
    input.click();
  });
}

/** Editor: la foto se mueve y se amplía dentro de un recuadro con el óvalo de la cara marcado. */
function editFace(img: HTMLImageElement): Promise<FaceResult | null> {
  return new Promise((done) => {
    const S = 280; // tamaño del recuadro en pantalla (px CSS)
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const view = h('canvas', { class: 'fe-view', width: S * dpr, height: S * dpr }) as HTMLCanvasElement;
    const prev = h('canvas', { class: 'fe-prev', width: OUT, height: OUT }) as HTMLCanvasElement;
    const zoom = h('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', class: 'fe-zoom', 'aria-label': 'Zoom' }) as HTMLInputElement;
    // escala base: la foto cubre el recuadro; luego el zoom y el desplazamiento (en px del recuadro)
    const base = Math.max(S / img.naturalWidth, S / img.naturalHeight);
    let z = 1, ox = 0, oy = 0;
    const clamp = () => {
      const w = img.naturalWidth * base * z, hh = img.naturalHeight * base * z;
      ox = Math.min((w - S) / 2, Math.max(-(w - S) / 2, ox));
      oy = Math.min((hh - S) / 2, Math.max(-(hh - S) / 2, oy));
    };
    // dibuja la foto con el encuadre actual en un lienzo de lado `size`
    const drawTo = (ctx: CanvasRenderingContext2D, size: number) => {
      const k = size / S, w = img.naturalWidth * base * z * k, hh = img.naturalHeight * base * z * k;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, (size - w) / 2 + ox * k, (size - hh) / 2 + oy * k, w, hh);
    };
    const vctx = view.getContext('2d')!;
    let previewTimer = 0;
    const paint = () => {
      drawTo(vctx, S * dpr);
      // óvalo de la cara: fuera, oscurecido
      const W = S * dpr;
      vctx.save();
      vctx.fillStyle = 'rgba(0,0,0,.55)';
      vctx.beginPath();
      vctx.rect(0, 0, W, W);
      vctx.ellipse(W * OVAL.cx, W * OVAL.cy, W * OVAL.rx, W * OVAL.ry, 0, 0, Math.PI * 2, true);
      vctx.fill('evenodd');
      vctx.strokeStyle = 'rgba(255,255,255,.85)';
      vctx.lineWidth = 2 * dpr;
      vctx.beginPath();
      vctx.ellipse(W * OVAL.cx, W * OVAL.cy, W * OVAL.rx, W * OVAL.ry, 0, 0, Math.PI * 2);
      vctx.stroke();
      vctx.restore();
      clearTimeout(previewTimer);
      previewTimer = window.setTimeout(() => {
        const c = document.createElement('canvas');
        c.width = c.height = OUT;
        drawTo(c.getContext('2d')!, OUT);
        cartoon(c);
        prev.getContext('2d')!.clearRect(0, 0, OUT, OUT);
        prev.getContext('2d')!.drawImage(c, 0, 0);
      }, 120);
    };

    // arrastrar con un dedo, ampliar con dos (o con la barra)
    const pts = new Map<number, { x: number; y: number }>();
    let pinch0 = 0, z0 = 1;
    view.addEventListener('pointerdown', (e) => {
      view.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y); z0 = z;
      }
    });
    view.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        ox += e.clientX - p.x; oy += e.clientY - p.y;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch0 > 0) {
        const [a, b] = [...pts.values()];
        z = Math.min(4, Math.max(1, z0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0));
        zoom.value = String(z);
      }
      clamp();
      paint();
    });
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
    view.addEventListener('pointerup', up);
    view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', (e) => {
      e.preventDefault();
      z = Math.min(4, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      zoom.value = String(z);
      clamp();
      paint();
    }, { passive: false });
    zoom.addEventListener('input', () => { z = Number(zoom.value); clamp(); paint(); });

    const close = (r: FaceResult | null) => { wrap.remove(); done(r); };
    const save = () => {
      const c = document.createElement('canvas');
      c.width = c.height = OUT;
      drawTo(c.getContext('2d')!, OUT);
      const skin = cartoon(c);
      close({ url: c.toDataURL('image/png'), skin });
    };
    const wrap = h('div', { class: 'dialog-wrap face-editor', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'dialog' },
        h('h3', {}, 'Tu cara en el muñeco'),
        h('p', { class: 'muted small' }, 'Mueve y amplía la foto para que tu cara quede dentro del óvalo.'),
        h('div', { class: 'fe-stage' }, view),
        h('div', { class: 'fe-zoom-row' }, icon('search'), zoom),
        h('div', { class: 'fe-result' }, prev, h('span', { class: 'muted small' }, 'Así se verá en el muñeco')),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost', onclick: () => close(null) }, 'Cancelar'),
          h('button', { class: 'btn primary', onclick: save }, 'Guardar'))));
    document.body.append(wrap);
    clamp();
    paint();
  });
}

/** Óvalo de la cara dentro del recuadro (fracciones del lado). */
const OVAL = { cx: 0.5, cy: 0.47, rx: 0.36, ry: 0.45 };

/**
 * Pasa la imagen del lienzo a dibujo, en su sitio: suaviza sin perder los bordes (Kuwahara), reduce los tonos,
 * marca el contorno y deja transparente lo de fuera del óvalo. Devuelve el color medio de la piel (mejillas).
 */
export function cartoon(c: HTMLCanvasElement): string {
  const N = c.width, ctx = c.getContext('2d', { willReadFrequently: true })!;
  const im = ctx.getImageData(0, 0, N, N), d = im.data;
  const n = N * N;
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), L = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    R[i] = d[i * 4] / 255; G[i] = d[i * 4 + 1] / 255; B[i] = d[i * 4 + 2] / 255;
    L[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
  }
  // tablas de sumas (para las medias de cada cuadrante en tiempo constante)
  const W1 = N + 1;
  const sat = (src: Float32Array, sq = false) => {
    const t = new Float64Array(W1 * W1);
    for (let y = 0; y < N; y++) {
      let row = 0;
      for (let x = 0; x < N; x++) {
        const v = src[y * N + x];
        row += sq ? v * v : v;
        t[(y + 1) * W1 + x + 1] = t[y * W1 + x + 1] + row;
      }
    }
    return t;
  };
  const sR = sat(R), sG = sat(G), sB = sat(B), sL = sat(L), sL2 = sat(L, true);
  const box = (t: Float64Array, x0: number, y0: number, x1: number, y1: number) =>
    t[(y1 + 1) * W1 + x1 + 1] - t[y0 * W1 + x1 + 1] - t[(y1 + 1) * W1 + x0] + t[y0 * W1 + x0];
  const r = 4;
  const oR = new Float32Array(n), oG = new Float32Array(n), oB = new Float32Array(n);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let best = Infinity, br = 0, bg = 0, bb = 0;
      for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x0 = Math.max(0, Math.min(x, x + qx * r)), x1 = Math.min(N - 1, Math.max(x, x + qx * r));
        const y0 = Math.max(0, Math.min(y, y + qy * r)), y1 = Math.min(N - 1, Math.max(y, y + qy * r));
        const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
        const m = box(sL, x0, y0, x1, y1) / cnt, v = box(sL2, x0, y0, x1, y1) / cnt - m * m;
        if (v < best) { best = v; br = box(sR, x0, y0, x1, y1) / cnt; bg = box(sG, x0, y0, x1, y1) / cnt; bb = box(sB, x0, y0, x1, y1) / cnt; }
      }
      const i = y * N + x;
      oR[i] = br; oG[i] = bg; oB[i] = bb;
    }
  }
  // contorno: gradiente (Sobel) de la luminosidad suavizada
  const lum = (i: number) => 0.299 * oR[i] + 0.587 * oG[i] + 0.114 * oB[i];
  const edge = new Float32Array(n);
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const gx = lum(i - N + 1) + 2 * lum(i + 1) + lum(i + N + 1) - lum(i - N - 1) - 2 * lum(i - 1) - lum(i + N - 1);
      const gy = lum(i + N - 1) + 2 * lum(i + N) + lum(i + N + 1) - lum(i - N - 1) - 2 * lum(i - N) - lum(i - N + 1);
      edge[i] = Math.hypot(gx, gy);
    }
  }
  let sr = 0, sg = 0, sb = 0, sc = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      // pocos tonos (manteniendo el color) y algo más de saturación
      const l = Math.max(1e-3, lum(i));
      const lq = Math.min(1, (Math.round(l * 6 - 0.5) + 0.5) / 6);
      let rr = oR[i] * lq / l, gg = oG[i] * lq / l, bb = oB[i] * lq / l;
      const m = (rr + gg + bb) / 3;
      rr = m + (rr - m) * 1.18; gg = m + (gg - m) * 1.18; bb = m + (bb - m) * 1.18;
      const e = Math.min(1, Math.max(0, (edge[i] - 0.18) / 0.22));
      const k = 1 - 0.78 * e;
      // óvalo con el borde suave
      const ex = (x / N - OVAL.cx) / OVAL.rx, ey = (y / N - OVAL.cy) / OVAL.ry;
      // algo más estrecho que la guía, con el borde difuminado: así no se cuela el fondo de la foto
      const rad = Math.hypot(ex / 0.9, ey / 0.94);
      const a = Math.min(1, Math.max(0, (1 - rad) / 0.12));
      d[i * 4] = Math.min(255, Math.max(0, rr * k * 255));
      d[i * 4 + 1] = Math.min(255, Math.max(0, gg * k * 255));
      d[i * 4 + 2] = Math.min(255, Math.max(0, bb * k * 255));
      d[i * 4 + 3] = a * 255;
      // piel: las mejillas (a los lados de la nariz, a media altura)
      if (Math.abs(Math.abs(ex) - 0.5) < 0.15 && Math.abs(ey - 0.12) < 0.12) { sr += oR[i]; sg += oG[i]; sb += oB[i]; sc++; }
    }
  }
  ctx.putImageData(im, 0, 0);
  const hex = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return sc ? `#${hex(sr / sc)}${hex(sg / sc)}${hex(sb / sc)}` : '#E2A983';
}
