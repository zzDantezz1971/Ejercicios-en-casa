"""Convierte el modelo base de MakeHuman (CC0) en datos compactos para el maniquí con piel.

Salida: JSON con huesos de reposo (15 huesos propios), ojos y binario en base64:
posiciones (float32), índices (uint16), skinIndex/skinWeight (uint8 x4) y región (uint8).
Coordenadas de salida: x = lateral (lado R anatómico en -x), y = arriba, z = adelante; unidades del motor.
"""
import base64, json, sys
import numpy as np

W_MUSCLE = float(sys.argv[1]) if len(sys.argv) > 1 else 0.6
SCALE = 8.4

V = []
faces = []
cur = None
for line in open('base.obj'):
    if line.startswith('v '):
        V.append([float(x) for x in line.split()[1:4]])
    elif line.startswith('g '):
        cur = line.split()[1]
    elif line.startswith('f ') and cur == 'body':
        faces.append([int(t.split('/')[0]) - 1 for t in line.split()[1:]])
V = np.array(V)

# forma: hombre joven musculado
def apply(fname, w):
    for line in open(fname):
        if line.startswith('#') or not line.strip():
            continue
        i, dx, dy, dz = line.split()
        V[int(i)] += w * np.array([float(dx), float(dy), float(dz)])
apply('caucasian-male-young.target', 1.0)
apply('universal-male-young-maxmuscle-averageweight.target', W_MUSCLE * 0.5)
apply('universal-male-young-maxmuscle-minweight.target', W_MUSCLE * 0.5)

skel = json.load(open('default.mhskel'))
J = skel['joints']
def jp(name):
    return V[J[name]].mean(axis=0)

# Huesos propios: segmentos (a, b) en reposo
pel = jp('spine05____head')
neck = jp('neck01____head')
mid = (pel + neck) / 2
headC = (jp('head____head') + jp('head____tail')) / 2
segs = {'hips': (pel, mid), 'chest': (mid, neck), 'head': (neck, headC)}
for s in 'LR':
    segs['ua' + s] = (jp(f'upperarm01.{s}____head'), jp(f'lowerarm01.{s}____head'))
    segs['fa' + s] = (jp(f'lowerarm01.{s}____head'), jp(f'wrist.{s}____head'))
    segs['hand' + s] = (jp(f'wrist.{s}____head'), jp(f'finger3-1.{s}____head'))
    segs['th' + s] = (jp(f'upperleg01.{s}____head'), jp(f'lowerleg01.{s}____head'))
    segs['sh' + s] = (jp(f'lowerleg01.{s}____head'), jp(f'foot.{s}____head'))
    segs['foot' + s] = (jp(f'foot.{s}____head'), jp(f'toe3-1.{s}____head'))
BONES = list(segs)

def mybone(mh):
    side = mh[-1] if mh.endswith(('.L', '.R')) else ''
    base = mh[:-2] if side else mh
    if base in ('root', 'spine05', 'spine04', 'spine03', 'pelvis'):
        return 'hips'
    if base in ('spine02', 'spine01', 'clavicle', 'breast'):
        return 'chest'
    if base in ('shoulder01', 'upperarm01', 'upperarm02'):
        return 'ua' + side
    if base in ('lowerarm01', 'lowerarm02'):
        return 'fa' + side
    if base == 'wrist' or base.startswith(('metacarpal', 'finger')):
        return 'hand' + side
    if base in ('upperleg01', 'upperleg02'):
        return 'th' + side
    if base in ('lowerleg01', 'lowerleg02'):
        return 'sh' + side
    if base == 'foot' or base.startswith('toe'):
        return 'foot' + side
    return 'head'

wfile = json.load(open('w.mhw'))['weights']
nV = len(V)
Wm = np.zeros((nV, len(BONES)))
for mh, lst in wfile.items():
    b = BONES.index(mybone(mh))
    for vi, w in lst:
        Wm[vi, b] += w

# solo vértices usados por el cuerpo
used = sorted({i for f in faces for i in f})
remap = {o: n for n, o in enumerate(used)}
P = V[used]
Wu = Wm[used]
tris = []
for f in faces:
    g = [remap[i] for i in f]
    tris.append([g[0], g[1], g[2]])
    if len(g) == 4:
        tris.append([g[0], g[2], g[3]])

# 4 huesos con más peso por vértice
order = np.argsort(-Wu, axis=1)[:, :4]
wts = np.take_along_axis(Wu, order, axis=1)
wts[wts.sum(axis=1) == 0, 0] = 1
wts = wts / wts.sum(axis=1, keepdims=True)
wq = np.round(wts * 255).astype(int)
wq[:, 0] += 255 - wq.sum(axis=1)

# Regiones: 0 piel, 1 camiseta, 2 pantalón, 3 zapatilla, 4 calcetín, 5 labios, 6 franja
def tparam(p, seg):
    a, b = seg
    d = b - a
    return float(np.dot(p - a, d) / np.dot(d, d))
region = np.zeros(len(P), dtype=np.uint8)
dom = np.argmax(Wu, axis=1)
lipsBones = {'oris01', 'oris02', 'oris03', 'oris04', 'oris05', 'oris06', 'oris07'}
lipW = np.zeros(nV)
for mh, lst in wfile.items():
    base = mh[:-2] if mh.endswith(('.L', '.R')) else mh
    if base in lipsBones:
        for vi, w in lst:
            lipW[vi] += w
lipW = lipW[used]
for i, p in enumerate(P):
    b = BONES[dom[i]]
    if b == 'chest':
        region[i] = 1
    elif b == 'hips':
        # cintura: por encima de la cadera camiseta, por debajo pantalón
        region[i] = 1 if p[1] > pel[1] + 0.35 else 2
    elif b.startswith('ua'):
        t = tparam(p, segs[b])
        region[i] = 1 if t < 0.42 else (6 if t < 0.47 else 0)
    elif b.startswith('th'):
        t = tparam(p, segs[b])
        region[i] = 2 if t < 0.5 else (6 if t < 0.54 else 0)
    elif b.startswith('sh'):
        t = tparam(p, segs[b])
        region[i] = 4 if t > 0.86 else 0
    elif b.startswith('foot'):
        region[i] = 4  # calcetín: la zapatilla va encima
    elif b == 'head' and lipW[i] > 0.6:
        region[i] = 5

from smooth_regions import smooth_regions
region = smooth_regions(region, np.array(tris), 3)

# coordenadas de salida: escala y suelo
def out(p):
    return (np.asarray(p) - [0, 0, 0]) * SCALE
P2 = out(P)
eyes = {s: out(jp(f'eye.{s}____head')).tolist() for s in 'LR'}
rest = {k: [out(a).tolist(), out(b).tolist()] for k, (a, b) in segs.items()}

data = {
    'license': 'CC0 — MakeHuman (base mesh, skeleton and weights), Data Collection AB, J. Palmius, J. Hauquier',
    'bones': BONES,
    'rest': rest,
    'eyes': eyes,
    'eyeRadius': 0.13 * SCALE,
    'shoes': True,
    'count': len(P2),
    'pos': base64.b64encode(P2.astype('<f4').tobytes()).decode(),
    'idx': base64.b64encode(np.array(tris, dtype='<u2').tobytes()).decode(),
    'si': base64.b64encode(order.astype(np.uint8).tobytes()).decode(),
    'sw': base64.b64encode(wq.astype(np.uint8).tobytes()).decode(),
    'reg': base64.b64encode(region.tobytes()).decode(),
}
json.dump(data, open('skin_b.json', 'w'))
print('verts', len(P2), 'tris', len(tris), 'kb', round(len(json.dumps(data)) / 1024), 'height', P2[:, 1].min(), P2[:, 1].max())
print({k: round(float(np.linalg.norm(np.array(b) - np.array(a))), 1) for k, (a, b) in rest.items()})
print('regions', np.bincount(region, minlength=7))
