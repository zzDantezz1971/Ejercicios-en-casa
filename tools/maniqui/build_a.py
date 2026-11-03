"""Opción A: cuerpo propio de una sola pieza.
Se modela con formas suaves (función de distancia con uniones suaves), se convierte en malla con
"surface nets", se suaviza y se le asignan pesos de piel por distancia a los huesos.
Mismo formato de salida que build_mh.py. Coordenadas: x lateral (lado R en -x), y arriba, z adelante.
"""
import base64, json
import numpy as np

RES = 0.85

# ── Esqueleto de reposo (mismas longitudes que el motor de posturas) ──
def v(*a):
    return np.array(a, dtype=float)
pel, mid, neck = v(0, 71, 0), v(0, 95, 0), v(0, 119, 0)
headC = v(0, 133, 0)
J = {'pel': pel, 'mid': mid, 'neck': neck, 'head': headC}
A = np.radians(24)
for s, sx in (('L', 1), ('R', -1)):
    sho = v(13 * sx, 116, 0)
    el = sho + 26 * v(np.sin(A) * sx, -np.cos(A), 0)
    ha = el + 24 * v(np.sin(A) * sx, -np.cos(A), 0)
    hip = v(8.5 * sx, 71, 0)
    kn = v(8.5 * sx, 37, 0.6)
    an = v(8.5 * sx, 4.5, 0)
    ti = an + v(0, -2, 9)
    J.update({'sho' + s: sho, 'el' + s: el, 'ha' + s: ha, 'hip' + s: hip, 'kn' + s: kn, 'an' + s: an, 'ti' + s: ti})
def unit(x):
    return x / np.linalg.norm(x)
segs = {'hips': (pel, mid), 'chest': (mid, neck), 'head': (neck, headC)}
for s in 'LR':
    u = unit(J['ha' + s] - J['el' + s])
    segs['ua' + s] = (J['sho' + s], J['el' + s])
    segs['fa' + s] = (J['el' + s], J['ha' + s])
    segs['hand' + s] = (J['ha' + s], J['ha' + s] + 9 * u)
    segs['th' + s] = (J['hip' + s], J['kn' + s])
    segs['sh' + s] = (J['kn' + s], J['an' + s])
    segs['foot' + s] = (J['an' + s], J['ti' + s])
BONES = list(segs)

# ── Rejilla ──
xs = np.arange(-50, 50 + RES, RES)
ys = np.arange(-1, 150 + RES, RES)
zs = np.arange(-18, 20 + RES, RES)
X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
Pg = np.stack([X, Y, Z], axis=-1)

def d_cone(a, b, ra, rb):
    """Cono redondeado aproximado (cápsula con radio variable)."""
    ba = b - a
    pa = Pg - a
    h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    r = ra + (rb - ra) * h
    return np.linalg.norm(pa - h[..., None] * ba, axis=-1) - r

def d_ell(c, r, axes=None):
    """Elipsoide (aproximación de distancia de Inigo Quilez). axes: matriz 3x3 con los ejes locales en filas."""
    p = Pg - c
    if axes is not None:
        p = p @ np.asarray(axes).T
    r = np.asarray(r, dtype=float)
    k0 = np.linalg.norm(p / r, axis=-1)
    k1 = np.linalg.norm(p / (r * r), axis=-1)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-6)

def frame(a, b, fwd=v(0, 0, 1)):
    """Ejes locales (x lateral, y a lo largo del hueso, z adelante) para elipsoides de músculos."""
    y = unit(b - a)
    z = unit(fwd - y * (fwd @ y))
    x = np.cross(y, z)
    return np.array([x, y, z])

prims = []  # (sdf, region, k)
def add(d, region=0, k=2.4):
    prims.append((d, region, k))

LIPS = 5
# tronco
add(d_ell(v(0, 74, 0.3), (12.2, 9.5, 8.2)), 2)
add(d_ell(v(0, 87, 0.6), (11.2, 12.5, 7.4)))
add(d_ell(v(0, 103.5, 0.2), (14.8, 12.5, 8.6)))
for sx in (1, -1):
    add(d_ell(v(5.4 * sx, 106.5, 5.3), (6.2, 4.4, 3.0)))          # pectorales
    add(d_ell(v(10.5 * sx, 101, -2.5), (5.5, 10, 4.5)))            # dorsales
    add(d_cone(v(3.5 * sx, 118.5, -1.2), v(12 * sx, 115.5, -1), 4.2, 4.6))  # trapecio
    add(d_ell(v(14.6 * sx, 113.6, 0), (6.3, 6.8, 6.2)))            # deltoides
    add(d_ell(v(5 * sx, 70.5, -4.6), (6.6, 7.2, 5.6)), 2)          # glúteos
add(d_ell(v(0, 92, 5.6), (6.5, 9, 2.4)))                            # abdominales
add(d_cone(v(0, 113, 0), v(0, 126, 0.6), 5.4, 4.6))                 # cuello
# cabeza
add(d_ell(v(0, 135.2, 0), (8.7, 10.2, 9.7)))
add(d_ell(v(0, 128.6, 2.6), (6.7, 5.6, 6.8)))
add(d_ell(v(0, 125.6, 6.0), (3.4, 2.7, 3.0)))
add(d_cone(v(0, 134.2, 8.9), v(0, 130.6, 11.0), 0.9, 1.7), 0, 1.2)  # nariz
add(d_ell(v(0, 137.6, 7.6), (6.4, 1.5, 2.1)), 0, 1.5)               # arco de las cejas
for sx in (1, -1):
    add(d_ell(v(8.7 * sx, 133.6, -0.5), (1.5, 3.1, 2.3)), 0, 1.0)   # orejas
    add(d_ell(v(4.6 * sx, 130.8, 6.8), (2.6, 2.2, 2.2)), 0, 1.6)    # mejillas
add(d_ell(v(0, 128.9, 8.6), (2.7, 0.75, 1.0)), LIPS, 0.4)           # labios
# brazos y piernas
for s, sx in (('L', 1), ('R', -1)):
    sho, el, ha = J['sho' + s], J['el' + s], J['ha' + s]
    add(d_cone(sho, el, 4.6, 3.6))
    F = frame(sho, el)
    add(d_ell(sho + 0.56 * (el - sho) + 1.8 * F[2], (3.4, 6.8, 3.3), F))   # bíceps
    add(d_ell(sho + 0.45 * (el - sho) - 1.7 * F[2], (3.3, 7.4, 3.2), F))   # tríceps
    add(d_cone(el, ha, 3.5, 2.4))
    F2 = frame(el, ha)
    add(d_ell(el + 0.28 * (ha - el) + 0.6 * F2[2], (3.6, 6.4, 3.4), F2))  # antebrazo
    # mano: palma, dedos y pulgar (palma hacia el muslo)
    u = unit(ha - el)
    ac = v(0, 0, 1)
    lat = np.cross(u, ac) * (-sx)
    add(d_ell(ha + 3.4 * u, (1.7, 3.6, 3.3), np.array([unit(lat), u, ac])), 0, 1.0)
    for f in range(4):
        off = (f - 1.5) * 1.45
        b0 = ha + 6.4 * u + off * ac
        L = 3.6 if f in (0, 3) else 4.3
        add(d_cone(b0, b0 + L * u - 0.5 * lat * sx, 0.82, 0.68), 0, 0.5)
    add(d_cone(ha + 2.2 * u + 2.6 * ac, ha + 5.6 * u + 4.3 * ac, 1.15, 0.85), 0, 0.8)
    hip, kn, an, ti = J['hip' + s], J['kn' + s], J['an' + s], J['ti' + s]
    add(d_cone(hip, kn, 7.2, 4.8))
    Ft = frame(hip, kn)
    add(d_ell(hip + 0.56 * (kn - hip) + 2.2 * Ft[2], (5.0, 11.5, 4.4), Ft))   # cuádriceps
    add(d_ell(hip + 0.5 * (kn - hip) - 2.2 * Ft[2], (4.6, 11, 4.2), Ft))       # isquios
    add(d_ell(kn + v(0, 0, 0.8), (4.4, 4.6, 4.4)))
    add(d_cone(kn, an, 4.3, 2.9))
    Fs = frame(kn, an)
    add(d_ell(kn + 0.3 * (an - kn) - 2.3 * Fs[2], (3.9, 7.4, 3.9), Fs))       # gemelo
    # zapatilla
    add(d_ell(an + v(0, -1.0, 4.4), (3.9, 3.5, 7.9)), 3)
    add(d_ell(v(an[0], 1.3, an[2] + 4.4), (4.2, 1.3, 8.3)), 6, 1.0)

print('primitivas', len(prims))
# unión suave en orden
sdf = None
reg_id = None
prim_id = None
for i, (d, r, k) in enumerate(prims):
    if sdf is None:
        sdf, reg_id, prim_id = d, np.full(d.shape, r, np.uint8), np.zeros(d.shape, np.int16)
        continue
    closer = d < sdf
    reg_id = np.where(closer, r, reg_id)
    prim_id = np.where(closer, i, prim_id)
    h = np.clip(0.5 + 0.5 * (d - sdf) / k, 0, 1)
    sdf = d * (1 - h) + sdf * h - k * h * (1 - h)

# ── Surface nets ──
inside = sdf < 0
nx, ny, nz = sdf.shape
cell_in = [inside[i:nx - 1 + i, j:ny - 1 + j, k:nz - 1 + k] for i in (0, 1) for j in (0, 1) for k in (0, 1)]
cnt = sum(c.astype(np.int8) for c in cell_in)
active = (cnt > 0) & (cnt < 8)
cidx = -np.ones(active.shape, np.int64)
act = np.argwhere(active)
cidx[active] = np.arange(len(act))
# vértice = media de los cruces de las 12 aristas de la celda
corners = [(i, j, k) for i in (0, 1) for j in (0, 1) for k in (0, 1)]
edges = [(a, b) for a in range(8) for b in range(a + 1, 8) if sum(abs(np.subtract(corners[a], corners[b]))) == 1]
acc = np.zeros((len(act), 3))
num = np.zeros(len(act))
ai, aj, ak = act[:, 0], act[:, 1], act[:, 2]
for a, b in edges:
    ca, cb = corners[a], corners[b]
    da = sdf[ai + ca[0], aj + ca[1], ak + ca[2]]
    db = sdf[ai + cb[0], aj + cb[1], ak + cb[2]]
    m = (da < 0) != (db < 0)
    t = np.where(m, da / np.where(m, da - db, 1), 0)
    pa = np.stack([xs[ai + ca[0]], ys[aj + ca[1]], zs[ak + ca[2]]], -1)
    pb = np.stack([xs[ai + cb[0]], ys[aj + cb[1]], zs[ak + cb[2]]], -1)
    acc += m[:, None] * (pa + t[:, None] * (pb - pa))
    num += m
verts = acc / np.maximum(num, 1)[:, None]
# caras: una por cada arista de la rejilla con cambio de signo
quads = []
for axis in range(3):
    sl = [slice(1, -1)] * 3
    sl[axis] = slice(0, -1)
    a = inside[tuple(sl)]
    sl2 = list(sl)
    sl2[axis] = slice(1, None)
    b = inside[tuple(sl2)]
    flip = a & ~b
    cross = a != b
    idx = np.argwhere(cross)
    off = [1 if ax != axis else 0 for ax in range(3)]
    idx = idx + np.array(off)  # volver a índices de la rejilla completa
    o1, o2 = [ax for ax in range(3) if ax != axis]
    def cell(dd1, dd2):
        c = idx.copy()
        c[:, o1] -= dd1
        c[:, o2] -= dd2
        return cidx[c[:, 0], c[:, 1], c[:, 2]]
    c00, c10, c11, c01 = cell(1, 1), cell(0, 1), cell(0, 0), cell(1, 0)
    fl = flip[tuple(np.argwhere(cross).T)]
    q = np.stack([c00, c10, c11, c01], -1)
    if axis == 1:
        fl = ~fl
    q[fl] = q[fl][:, ::-1]
    quads.append(q)
quads = np.concatenate(quads)
quads = quads[(quads >= 0).all(axis=1)]
tris = np.concatenate([quads[:, [0, 1, 2]], quads[:, [0, 2, 3]]])

# suavizado (Laplaciano) para quitar escalones
nv = len(verts)
nbr_i = np.concatenate([tris[:, 0], tris[:, 1], tris[:, 2], tris[:, 1], tris[:, 2], tris[:, 0]])
nbr_j = np.concatenate([tris[:, 1], tris[:, 2], tris[:, 0], tris[:, 0], tris[:, 1], tris[:, 2]])
for _ in range(3):
    s_ = np.zeros_like(verts)
    c_ = np.zeros(nv)
    np.add.at(s_, nbr_i, verts[nbr_j])
    np.add.at(c_, nbr_i, 1)
    verts = 0.5 * verts + 0.5 * s_ / np.maximum(c_, 1)[:, None]

# región y primitiva más cercana en cada vértice (celda de la rejilla)
gi = np.clip(np.round((verts[:, 0] - xs[0]) / RES).astype(int), 0, nx - 1)
gj = np.clip(np.round((verts[:, 1] - ys[0]) / RES).astype(int), 0, ny - 1)
gk = np.clip(np.round((verts[:, 2] - zs[0]) / RES).astype(int), 0, nz - 1)
vreg = reg_id[gi, gj, gk]

# pesos por distancia a cada hueso
D = np.zeros((nv, len(BONES)))
for b, name in enumerate(BONES):
    a, c = segs[name]
    ba = c - a
    h = np.clip(((verts - a) @ ba) / (ba @ ba), 0, 1)
    D[:, b] = np.linalg.norm(verts - a - h[:, None] * ba, axis=1)
# no mezclar mano con muslo, ni brazo con tronco bajo
dmin = D.min(axis=1, keepdims=True)
# solo se mezcla con los huesos vecinos del más cercano (evita tirones entre partes alejadas)
ADJ = {'hips': {'chest', 'thL', 'thR'}, 'chest': {'hips', 'head', 'uaL', 'uaR'}, 'head': {'chest'}}
for s in 'LR':
    ADJ['ua' + s] = {'chest', 'fa' + s}; ADJ['fa' + s] = {'ua' + s, 'hand' + s}; ADJ['hand' + s] = {'fa' + s}
    ADJ['th' + s] = {'hips', 'sh' + s}; ADJ['sh' + s] = {'th' + s, 'foot' + s}; ADJ['foot' + s] = {'sh' + s}
near = np.argmin(D, axis=1)
allowed = np.zeros_like(D, dtype=bool)
for b, name in enumerate(BONES):
    ok = [BONES.index(n) for n in ADJ[name] | {name}]
    allowed[np.ix_(near == b, ok)] = True
SIG = np.array([3.4 if n in ('chest', 'hips') or n.startswith(('ua', 'th')) else 2.4 for n in BONES])
Wt = np.where(allowed, np.exp(-(D - dmin) / SIG[None, :]), 0)
order = np.argsort(-Wt, axis=1)[:, :4]
wts = np.take_along_axis(Wt, order, axis=1)
wts[:, 3] *= 0  # 3 huesos bastan
wts = wts / wts.sum(axis=1, keepdims=True)
wq = np.round(wts * 255).astype(int)
wq[:, 0] += 255 - wq.sum(axis=1)

# regiones finales (igual que en B)
def tpar(p, name):
    a, c = segs[name]
    d = c - a
    return ((p - a) @ d) / (d @ d)
dom = np.array(BONES)[order[:, 0]]
region = np.zeros(nv, np.uint8)
for i, p in enumerate(verts):
    b = dom[i]
    r = vreg[i]
    if r in (3, 6, LIPS):
        region[i] = r
    elif b == 'chest':
        region[i] = 1
    elif b == 'hips':
        region[i] = 1 if p[1] > 77 else 2
    elif b.startswith('ua'):
        t = tpar(p, b)
        region[i] = 1 if t < 0.42 else (6 if t < 0.47 else 0)
    elif b.startswith('th'):
        t = tpar(p, b)
        region[i] = 2 if t < 0.5 else (6 if t < 0.54 else 0)
    elif b.startswith('sh'):
        t = tpar(p, b)
        region[i] = 4 if t > 0.82 else 0
    elif b.startswith('foot'):
        region[i] = 3
    elif r == 2:
        region[i] = 2

PART = {'hips': 0, 'chest': 0, 'head': 0, 'uaL': 1, 'faL': 1, 'uaR': 2, 'faR': 2, 'thL': 3, 'shL': 3, 'thR': 4, 'shR': 4,
        'footL': 5, 'footR': 5, 'handL': 6, 'handR': 6}
part = np.array([PART[b] for b in dom], dtype=np.uint8)
part[vreg == 3] = 5
from smooth_regions import smooth_regions
region = smooth_regions(region, tris, 3, keep=(3,))
eyes = {s: [2.9 * (1 if s == 'L' else -1), 135.3, 7.0] for s in 'LR'}
data = {
    'license': 'Modelo propio de Ejercicios en casa',
    'bones': BONES,
    'rest': {k: [a.tolist(), b.tolist()] for k, (a, b) in segs.items()},
    'eyes': eyes,
    'eyeRadius': 1.0,
    'count': nv,
    'pos': base64.b64encode(verts.astype('<f4').tobytes()).decode(),
    'idx': base64.b64encode(tris.astype('<u2' if nv < 65536 else '<u4').tobytes()).decode(),
    'idx32': nv >= 65536,
    'si': base64.b64encode(order.astype(np.uint8).tobytes()).decode(),
    'sw': base64.b64encode(wq.astype(np.uint8).tobytes()).decode(),
    'reg': base64.b64encode(region.tobytes()).decode(),
    'part': base64.b64encode(part.tobytes()).decode(),
    'clothes': {'collarY': 115.6, 'waistY': 77.5, 'sleeve': 0.42, 'shorts': 0.24, 'sock': 0.86, 'shoeTop': 6.4, 'sleeveStripe': 0},
}
json.dump(data, open('skin_a.json', 'w'))
print('verts', nv, 'tris', len(tris), 'kb', round(len(json.dumps(data)) / 1024), 'regions', np.bincount(region, minlength=7))
