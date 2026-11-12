"""Comprobación: colorea un mapa con los datos empaquetados (misma cuenta que src/ui/components/bodyMaps.ts)."""
import sys, numpy as np
from PIL import Image

def lin2srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)

def compose(png, box, weights, W=440, H=660):
    P = np.array(Image.open(png).convert('RGB')).astype(np.float64)
    h = P.shape[0] // 5
    A, B, C, D, E = P[:h], P[h:2*h], P[2*h:3*h], P[3*h:4*h], P[4*h:]
    w = np.array(list(weights) + [0] * 240)
    i1, m1, i2 = A[..., 0].astype(int), A[..., 1] / 255, A[..., 2].astype(int)
    m2, lines, flag = B[..., 0] / 255, B[..., 1] / 255, B[..., 2]
    w1, w2 = w[np.minimum(i1, 255)], w[np.minimum(i2, 255)]
    amt = lambda m, w: m * np.where(w >= 0.65, 1.0, np.where(w > 0.001, 0.45, 0.0))
    hot = np.array([0.85, 0.12, 0.15])
    shorts = (flag > 191)[..., None]
    base = np.where(shorts, np.array([0.12, 0.15, 0.2]), np.array([0.6, 0.64, 0.7]))
    m3, w3 = D[..., 2] / 255, w[E[..., 0].astype(int)]
    k2 = np.clip(np.maximum(np.maximum(amt(m1, w1), amt(m2, w2)), amt(m3, w3))[..., None] * np.where(shorts, 0.5, 1.0), 0, 1)
    alb = (base * (1 - k2) + hot * k2) * (1 - 0.2 * lines[..., None] * k2)
    L = (D[..., 1] / 255 * 2)[..., None]
    col = lin2srgb(alb * L + hot * k2 * 0.3) * 255
    body = (flag > 63)[..., None]
    rgb = np.where(body, col, C)
    out = np.zeros((H, W, 4))
    x0, y0, bw, bh = box
    out[y0:y0+bh, x0:x0+bw, :3] = rgb
    out[y0:y0+bh, x0:x0+bw, 3] = D[..., 0]
    return Image.fromarray(out.astype(np.uint8), 'RGBA')

if __name__ == '__main__':
    pass
