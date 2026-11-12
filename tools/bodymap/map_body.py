"""Cuerpo de los mapas de músculos (a partir del maniquí realista, solo para generar las imágenes de los resúmenes):
- la postura del mapa se aplica sobre la malla original (pesos de los huesos exactos) y después se subdivide (Loop),
  así el relieve sale suave y sin pliegues;
- cuerpo más atlético esculpido en la malla (pectorales, abdominales, muslos, hombros y brazos), sin pintar contornos;
- cara de hombre adulto (mandíbula, barbilla, pómulos, ceja; ojos algo más pequeños) y cabeza algo más grande.
Necesita tools/bodymap/huesos.json (node tools/bodymap/export_bones.cjs con npm run dev en marcha).
Uso: python3 tools/bodymap/map_body.py tools/skin_new.json tools/skin_map.json [cara=1] [cabeza=1.12] [músculo=1] [subdivisiones=2]"""
import base64, json, os, sys
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
K = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0      # fuerza de los rasgos de la cara
HS = float(sys.argv[4]) if len(sys.argv) > 4 else 1.12    # escala de la cabeza
MU = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0     # fuerza del relieve de los músculos
SUB = int(sys.argv[6]) if len(sys.argv) > 6 else 2        # veces que se subdivide la malla

d = json.load(open(src))
dec = lambda k, t: np.frombuffer(base64.b64decode(d[k]), t)
P = dec('pos', '<f4').reshape(-1, 3).astype(np.float64)
T = dec('idx', '<u4' if d.get('idx32') else '<u2').reshape(-1, 3).astype(np.int64)
SI = dec('si', 'u1').reshape(-1, 4).astype(np.int64)
SW = dec('sw', 'u1').reshape(-1, 4).astype(np.float64)
REG = dec('reg', 'u1').copy()
PART = dec('part', 'u1').copy()
NB = len(d['bones'])

# ── postura del mapa (skinning como el de la app) ──
H = json.load(open(os.path.join(os.path.dirname(__file__), 'huesos.json')))
assert H['names'] == d['bones']
M4 = lambda a: np.array(a, float).reshape(4, 4).T          # three.js guarda las matrices por columnas
BIND, BINV = M4(H['bind']), M4(H['bindInv'])
BM = np.stack([BINV @ M4(H['mats'][16 * k:16 * k + 16]) @ BIND for k in range(NB)])
def skin_mats(SI, SW):
    w = SW / 255.0
    return np.einsum('vk,vkij->vij', w, BM[SI])
def pose(Pr, SI, SW):
    A = skin_mats(SI, SW)
    return np.einsum('vij,vj->vi', A[:, :3, :3], Pr) + A[:, :3, 3]

def mixw(SI, SW, a, b):
    W = np.zeros((len(a), NB))
    for k in range(4):
        np.add.at(W, (np.arange(len(a)), SI[a, k]), SW[a, k] * 0.5)
        np.add.at(W, (np.arange(len(a)), SI[b, k]), SW[b, k] * 0.5)
    top = np.argsort(-W, axis=1)[:, :4]
    tw = np.take_along_axis(W, top, 1)
    tw = tw / np.maximum(tw.sum(1, keepdims=True), 1e-9) * 255
    twi = np.floor(tw); twi[:, 0] += 255 - twi.sum(1)
    return top, twi

def weld_mesh(P, T, *attrs):
    _, first, inv = np.unique(np.round(P * 1000).astype(np.int64), axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    T = inv[T]
    T = T[(T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 2] != T[:, 0])]
    return (P[first], T) + tuple(x[first] for x in attrs)

def loop(Xs, T, SI, SW, REG, PART):
    """Subdivisión de Loop de varias posiciones a la vez (misma malla): reposo y colocada."""
    n0 = len(Xs[0])
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    opp = np.concatenate([T[:, 2], T[:, 0], T[:, 1]])
    uniq, inv, cnt = np.unique(np.sort(e, axis=1), axis=0, return_inverse=True, return_counts=True)
    inv = inv.reshape(-1)
    a, b = uniq[:, 0], uniq[:, 1]
    interior = cnt == 2
    deg = np.zeros(n0); np.add.at(deg, a, 1); np.add.at(deg, b, 1)
    onb = np.zeros(n0); np.add.at(onb, a, ~interior); np.add.at(onb, b, ~interior)
    beta = np.where(deg > 3, 3 / (8 * np.maximum(deg, 1)), 3 / 16)
    out = []
    for X in Xs:
        osum = np.zeros((len(uniq), 3)); np.add.at(osum, inv, X[opp])
        Ep = np.where(interior[:, None], 3 / 8 * (X[a] + X[b]) + 1 / 8 * osum, (X[a] + X[b]) / 2)
        nb = np.zeros((n0, 3)); np.add.at(nb, a, X[b]); np.add.at(nb, b, X[a])
        Xv = np.where((onb > 0)[:, None], X, (1 - deg * beta)[:, None] * X + beta[:, None] * nb)
        out.append(np.concatenate([Xv, Ep]))
    si, sw = mixw(SI, SW, a, b)
    m = inv.reshape(3, -1).T + n0
    t0, t1, t2 = T[:, 0], T[:, 1], T[:, 2]
    m01, m12, m20 = m[:, 0], m[:, 1], m[:, 2]
    T2 = np.concatenate([np.stack([t0, m01, m20], 1), np.stack([m01, t1, m12], 1), np.stack([m20, m12, t2], 1), np.stack([m01, m12, m20], 1)])
    return (out, T2, np.concatenate([SI, si]), np.concatenate([SW, sw]),
            np.concatenate([REG, np.minimum(REG[a], REG[b])]), np.concatenate([PART, np.where(PART[a] == PART[b], PART[a], np.minimum(PART[a], PART[b]))]))

P, T, SI, SW, REG, PART = weld_mesh(P, T, SI, SW, REG, PART)
PP = pose(P, SI, SW)                       # colocada, con los pesos exactos de la malla original
Xs = [P, PP]
for _ in range(SUB):
    Xs, T, SI, SW, REG, PART = loop(Xs, T, SI, SW, REG, PART)
P, PP = Xs
P0 = P.copy()
n = len(P)

import scipy.sparse as sp
E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
A = sp.coo_matrix((np.ones(len(E) * 2), (np.concatenate([E[:, 0], E[:, 1]]), np.concatenate([E[:, 1], E[:, 0]]))), shape=(n, n)).tocsr()
A.data[:] = 1
deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
def Lap(F):
    return (A @ F) / (deg[:, None] if F.ndim == 2 else deg) - F
g = lambda v, c, s: np.exp(-((v - c) / s) ** 2)          # campana
up = lambda v, a, b: np.clip((v - a) / (b - a), 0, 1)     # rampa 0→1
sm = lambda v: v * v * (3 - 2 * v)                        # suavizado
def normals(P):
    Nf = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, T[:, k], Nf)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
body = (np.isin(PART, [0, 1, 2, 3, 4]) & (P[:, 1] < 56.0)).astype(float)[:, None]
# pezones más disimulados: se alisa un poco esa zona (en reposo; la diferencia pasa a la malla colocada)
nip = (g(np.abs(P[:, 0]), 6.3, 1.6) * g(P[:, 1], 43.0, 1.6) * up(P[:, 2], 6.0, 9.0) * (PART == 0))[:, None]
for _ in range(12):
    P = P + 0.5 * nip * Lap(P)
N = normals(P)
x, y, z = P[:, 0], P[:, 1], P[:, 2]
ax = np.abs(x); sx = np.sign(x)
trunk = (PART == 0).astype(float) * (y < 56.0)

D = np.zeros(n)
# pectorales: abombados, con el borde de abajo bien marcado (la sombra la hace la luz, no un trazo)
for side in (1, -1):
    dx, dy = (x - 7.0 * side) / 7.4, (y - 44.6) / 5.4
    r2 = dx * dx + np.where(dy < 0, (dy * 2.2) ** 2, dy * dy)   # por abajo cae rápido: borde inferior marcado
    D += np.clip(1 - r2, 0, 1) ** 0.75 * 2.0 * up(z, 3.0, 8.0) * trunk
# abdominales: tableta de tres filas (relieve suave) y surco central poco profundo
front = up(z, 5.0, 9.0) * trunk * up(y, 15.0, 18.0) * (1 - up(y, 38.5, 40.5))
packs = np.zeros(n)
for cy, ry in ((35.0, 2.7), (29.9, 2.6), (24.8, 2.7)):
    for cx in (2.9, -2.9):
        e = ((x - cx) / 3.0) ** 2 + ((y - cy) / ry) ** 2
        packs = np.maximum(packs, sm(np.clip(1 - e, 0, 1)) ** 0.7)
lower = sm(np.clip(1 - ((ax / 5.5) ** 2 + ((y - 19.5) / 4.0) ** 2), 0, 1)) * 0.7
D += front * (np.maximum(packs, lower) * 0.5 - g(x, 0, 0.7) * 0.12)
# dorsales: espalda en V (más ancha arriba por los lados y detrás)
D += trunk * g(y, 41.0, 5.0) * up(ax, 8.5, 12.5) * 0.7
D += trunk * g(y, 40.0, 6.0) * up(-z, 0.0, 4.0) * up(ax, 3.0, 8.0) * 0.5
# hombros (deltoides) y brazos (bíceps y tríceps)
for k, s in (('uaL', 1), ('uaR', -1)):
    a = np.array(d['rest'][k][0]); b = np.array(d['rest'][k][1])
    v = P - a; L = np.linalg.norm(b - a); u = (b - a) / L
    t = (v @ u) / L
    radial = v - np.outer(v @ u, u)
    rn = radial / np.maximum(np.linalg.norm(radial, axis=1, keepdims=True), 1e-6)
    sidew = (np.sign(x) == s) & (y < 56.0)
    arm = np.isin(PART, [1, 2]) & sidew
    D += g(t, 0.06, 0.16) * sidew * (np.isin(PART, [1, 2]) | (np.linalg.norm(v, axis=1) < 7)) * 0.7
    D += g(t, 0.5, 0.2) * np.clip(rn[:, 2], 0, 1) * arm * 0.5
    D += g(t, 0.45, 0.22) * np.clip(-rn[:, 2], 0, 1) * arm * 0.4
# muslos: cuádriceps (delante y por fuera), la «lágrima» por dentro encima de la rodilla, isquios detrás
for k, part, s in (('thL', 3, 1), ('thR', 4, -1)):
    a = np.array(d['rest'][k][0]); b = np.array(d['rest'][k][1])
    v = P - a; L = np.linalg.norm(b - a); u = (b - a) / L
    t = (v @ u) / L
    radial = v - np.outer(v @ u, u)
    rn = radial / np.maximum(np.linalg.norm(radial, axis=1, keepdims=True), 1e-6)
    leg = (PART == part).astype(float)
    fr, outer, inner = np.clip(rn[:, 2], 0, 1), np.clip(rn[:, 0] * s, 0, 1), np.clip(-rn[:, 0] * s, 0, 1)
    D += leg * g(t, 0.5, 0.26) * np.clip(fr * 0.8 + outer * 0.5, 0, 1) * 0.75
    D += leg * g(t, 0.8, 0.09) * np.clip(fr * 0.5 + inner, 0, 1) * 0.45
    D += leg * g(t, 0.5, 0.26) * np.clip(-rn[:, 2], 0, 1) * 0.35
# el relieve se difumina un poco para que las formas se fundan entre sí
for _ in range(8):
    D = D + 0.5 * Lap(D) * body[:, 0]
P = P + N * (D * MU)[:, None]


x, y, z = P[:, 0].copy(), P[:, 1].copy(), P[:, 2].copy()
ax = np.abs(x); sx = np.sign(x)

# ── cara de hombre adulto ──
head = up(y, 57.0, 58.5)
nolips = 1.0  # los labios se mueven con lo de alrededor (si no, quedaba una costura)
# mandíbula: ángulo más marcado (atrás y abajo de la cara), sin hinchar las mejillas
jaw = head * g(y, 60.8, 1.5) * up(ax, 1.5, 4.5) * g(z, 5.5, 2.6) * nolips
x += sx * jaw * 0.8 * K
# barbilla: por debajo de la boca, más larga (baja), algo adelantada y más cuadrada
chin = head * g(y, 58.9, 1.0) * up(z, 10.0, 12.5) * g(x, 0, 3.0) * nolips
y -= chin * 0.7 * K
z += chin * 0.35 * K
x += sx * chin * up(ax, 0.3, 2.0) * 0.4 * K
# pómulos: un poco hacia fuera y hacia delante
cheek = g(y, 65.6, 0.9) * g(ax, 5.0, 1.0) * up(z, 7.0, 10.0)
x += sx * cheek * 0.3 * K
z += cheek * 0.25 * K
# ceja: arco superciliar adelantado (los ojos quedan más hundidos)
brow = g(y, 69.3, 0.8) * g(ax, 2.6, 2.4) * up(z, 10.5, 12.5)
z += brow * 0.55 * K
# cabeza más grande: escala desde la base del cuello, pasando poco a poco por el cuello
PIV = np.array([0.0, 58.0, 3.5])
def grow(p, w):
    return PIV + (p - PIV) * (1 + (HS - 1) * w)
Q = grow(np.stack([x, y, z], 1), up(y, 56.5, 60.5)[:, None])

# lo esculpido (en reposo) se pasa a la malla colocada con el giro de sus huesos
delta = Q - P0
Al = skin_mats(SI, SW)[:, :3, :3]
QP = PP + np.einsum('vij,vj->vi', Al, delta)

d['count'] = int(n)
d['pos'] = base64.b64encode(Q.astype('<f4').tobytes()).decode()
d['posed'] = base64.b64encode(QP.astype('<f4').tobytes()).decode()
d['idx32'] = n > 65535
d['idx'] = base64.b64encode(T.astype('<u4' if n > 65535 else '<u2').tobytes()).decode()
d['si'] = base64.b64encode(SI.astype('u1').tobytes()).decode()
d['sw'] = base64.b64encode(SW.astype('u1').tobytes()).decode()
d['reg'] = base64.b64encode(REG.astype('u1').tobytes()).decode()
d['part'] = base64.b64encode(PART.astype('u1').tobytes()).decode()
d.pop('fist', None)  # el mapa no cierra las manos
# ojos algo más pequeños y un poco más metidos
d['eyeRadius'] = d['eyeRadius'] * (1 - 0.12 * K) * HS
for s in ('L', 'R'):
    e = np.array(d['eyes'][s], float); e[2] -= 0.15 * K
    d['eyes'][s] = grow(e, 1.0).tolist()
d['mapBody'] = {'cara': K, 'cabeza': HS, 'musculo': MU, 'subdivisiones': SUB}
json.dump(d, open(dst, 'w'))
print('ok', dst, 'vértices', n)
