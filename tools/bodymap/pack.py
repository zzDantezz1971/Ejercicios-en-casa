"""Empaqueta las capturas de tools/bodymap.html en public/mapa-musculos-{delante,detras}.png.
Cada PNG tiene 5 paneles (uno debajo de otro, mismo recorte):
  A = (músculo 1, cobertura 1, músculo 2)   B = (cobertura 2, líneas, 0 fuera / 128 piel / 255 pantalón)
  C = color con luces (sin músculos)          D = (transparencia, luz, cobertura 3)
  E = (músculo 3, 0, 0)
Uso: python3 tools/bodymap/pack.py carpeta-capturas public  (imprime el recorte, que va en src/ui/components/bodyMaps.ts)"""
import sys, numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
def srgb2lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

boxes = {}
for view in ('delante', 'detras'):
    lit = np.array(Image.open(f'{src}/{view}_0.png').convert('RGBA')).astype(np.float64)
    A = np.array(Image.open(f'{src}/{view}_2.png').convert('RGBA'))
    B = np.array(Image.open(f'{src}/{view}_3.png').convert('RGBA'))
    M = np.array(Image.open(f'{src}/{view}_4.png').convert('RGBA'))
    T3 = np.array(Image.open(f'{src}/{view}_5.png').convert('RGBA'))
    body = (M[..., 3] > 0) & (M[..., 0] == 255) & (M[..., 1] == 0) & (M[..., 2] == 255)
    shorts = body & (B[..., 2] > 127)
    alpha = lit[..., 3]
    vis = (alpha > 0) | body
    ys, xs = np.where(vis)
    y0, y1, x0, x1 = max(0, ys.min() - 2), ys.max() + 3, max(0, xs.min() - 2), xs.max() + 3
    alb = np.where(shorts, 0.15, 0.64)
    light = np.clip(srgb2lin(lit[..., 1]) / alb / 2.0, 0, 1)  # luz / 2 (hasta 2)
    pA = np.zeros(A.shape[:2] + (3,), np.uint8); pA[..., 0] = np.where(body, A[..., 0], 255); pA[..., 1] = np.where(body, A[..., 1], 0); pA[..., 2] = np.where(body, A[..., 2], 255)
    pB = np.zeros_like(pA); pB[..., 0] = np.where(body, B[..., 0], 0); pB[..., 1] = np.where(body, B[..., 1], 0); pB[..., 2] = np.where(shorts, 255, np.where(body, 128, 0))
    pC = lit[..., :3].astype(np.uint8)
    pD = np.zeros_like(pA); pD[..., 0] = alpha.astype(np.uint8); pD[..., 1] = np.round(light * 255).astype(np.uint8)
    pD[..., 2] = np.where(body, T3[..., 1], 0)   # cobertura del tercer músculo
    pE = np.zeros_like(pA); pE[..., 0] = np.where(body, T3[..., 0], 255)  # tercer músculo
    crop = lambda p: p[y0:y1, x0:x1]
    out = np.concatenate([crop(pA), crop(pB), crop(pC), crop(pD), crop(pE)], axis=0)
    Image.fromarray(out, 'RGB').save(f'{dst}/mapa-musculos-{view}.png', optimize=True)
    boxes[view] = (int(x0), int(y0), int(x1 - x0), int(y1 - y0))
print(boxes)
