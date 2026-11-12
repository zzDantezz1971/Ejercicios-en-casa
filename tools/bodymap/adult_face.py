"""Cara de hombre adulto para el cuerpo de los mapas de músculos: mandíbula más ancha, barbilla más larga y cuadrada,
pómulos y ceja más marcados, ojos algo más pequeños y la cabeza algo más grande (se veía pequeña para el cuerpo).
Uso: python3 tools/bodymap/adult_face.py tools/skin_new.json tools/skin_map.json [fuerza=1] [escala_cabeza=1.12]"""
import base64, json, sys
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
K = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
HS = float(sys.argv[4]) if len(sys.argv) > 4 else 1.12
d = json.load(open(src))
P = np.frombuffer(base64.b64decode(d['pos']), '<f4').reshape(-1, 3).astype(np.float64).copy()
x, y, z = P[:, 0].copy(), P[:, 1].copy(), P[:, 2].copy()
ax = np.abs(x); sx = np.sign(x)
g = lambda v, c, s: np.exp(-((v - c) / s) ** 2)          # campana
up = lambda v, a, b: np.clip((v - a) / (b - a), 0, 1)     # rampa 0→1
head = up(y, 57.0, 58.5)                                  # solo la cabeza (no el cuello de abajo)
front = up(z, 4.0, 9.0)                                   # mitad delantera de la cara

part = np.frombuffer(base64.b64decode(d['part']), 'u1')
nolips = (part != 7).astype(float)
# 1) mandíbula: ángulo más marcado (atrás y abajo de la cara), sin hinchar las mejillas
jaw = head * g(y, 60.8, 1.5) * up(ax, 1.5, 4.5) * g(z, 5.5, 2.6) * nolips
x += sx * jaw * 0.8 * K
# 2) barbilla: por debajo de la boca, más larga (baja), algo adelantada y más cuadrada
chin = head * g(y, 58.9, 1.0) * up(z, 10.0, 12.5) * g(x, 0, 3.0) * nolips
y -= chin * 0.7 * K
z += chin * 0.35 * K
x += sx * chin * up(ax, 0.3, 2.0) * 0.4 * K
# 3) pómulos: un poco hacia fuera y hacia delante
cheek = g(y, 65.6, 0.9) * g(ax, 5.0, 1.0) * up(z, 7.0, 10.0)
x += sx * cheek * 0.3 * K
z += cheek * 0.25 * K
# 4) ceja: arco superciliar adelantado (los ojos quedan más hundidos)
brow = g(y, 69.3, 0.8) * g(ax, 2.6, 2.4) * up(z, 10.5, 12.5)
z += brow * 0.55 * K

# 5) cabeza más grande: escala desde la base del cuello, pasando poco a poco por el cuello
PIV = np.array([0.0, 58.0, 3.5])
def grow(p, w):
    return PIV + (p - PIV) * (1 + (HS - 1) * w)
hw = up(y, 56.5, 60.5)[:, None]
Q = grow(np.stack([x, y, z], 1), hw)
x, y, z = Q[:, 0], Q[:, 1], Q[:, 2]

P2 = np.stack([x, y, z], 1).astype('<f4')
d['pos'] = base64.b64encode(P2.tobytes()).decode()
# ojos algo más pequeños y un poco más metidos
d['eyeRadius'] = d['eyeRadius'] * (1 - 0.12 * K) * HS
for s in ('L', 'R'):
    e = np.array(d['eyes'][s], float); e[2] -= 0.15 * K
    d['eyes'][s] = grow(e, 1.0).tolist()
d['adultFace'] = [K, HS]
json.dump(d, open(dst, 'w'))
print('ok', dst)
