"""Maniquí desde un GLB exportado de Blender con MPFB (MakeHuman), con su esqueleto y sus pesos.
Uso: python3 build_glb.py Humanoide.glb  -> skin_glb.json (mismo formato que build_mh.py).
Coordenadas de salida: x = lateral (lado L en +x), y = arriba, z = adelante; altura y suelo como el maniquí anterior."""
import base64, json, os, struct, sys
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else 'Humanoide.glb'
HEIGHT, FLOOR = 146.8, -68.72  # unidades del motor
SHOES = os.environ.get('SHOES', '0') == '1'  # por defecto descalzo (como lo quiere el usuario)

b = open(SRC, 'rb').read()
L = struct.unpack('<I', b[12:16])[0]
g = json.loads(b[20:20 + L]); BIN = b[20 + L + 8:]
def acc(i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]
    dt = {5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    stride = bv.get('byteStride')
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    item = np.dtype(dt).itemsize * n
    if stride and stride != item:
        raw = np.frombuffer(BIN, dtype='u1', count=stride * a['count'], offset=off).reshape(a['count'], stride)[:, :item]
        arr = np.frombuffer(raw.tobytes(), dtype=dt).reshape(a['count'], n)
    else:
        arr = np.frombuffer(BIN, dtype=dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
    if a.get('normalized') and dt != '<f4':
        arr = arr / (255.0 if dt == 'u1' else 65535.0)
    return arr.astype(np.float64)

prim = g['meshes'][0]['primitives'][0]
V = acc(prim['attributes']['POSITION'])
tris = acc(prim['indices']).astype(np.int64).reshape(-1, 3)
JI = acc(prim['attributes']['JOINTS_0']).astype(int)
JW = acc(prim['attributes']['WEIGHTS_0'])
skin = g['skins'][0]
names = [g['nodes'][j]['name'] for j in skin['joints']]
IBM = acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
HEADS = {n: np.linalg.inv(IBM[i])[:3, 3] for i, n in enumerate(names)}
def jp(n): return HEADS[n]

# escala y posición: misma altura y suelo que el maniquí anterior, centrado en x
cx = jp('root')[0]
S = HEIGHT / (V[:, 1].max() - V[:, 1].min())
y0 = V[:, 1].min()
def out(p): return (np.asarray(p, dtype=np.float64) - [cx, y0, 0]) * S + [0, FLOOR, 0]

# pesos por hueso original
nV = len(V)
Wn = {}
for k in range(4):
    for vi in np.nonzero(JW[:, k] > 0)[0]:
        n = names[JI[vi, k]]
        Wn.setdefault(n, np.zeros(nV))[vi] += JW[vi, k]

# ── mano en puño suave ──
def _rot(axis, ang):
    axis = axis / np.linalg.norm(axis)
    K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    return np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K
V_OPEN = V.copy()
for side in 'LR':
    across = jp(f'finger5-1.{side}') - jp(f'finger2-1.{side}')
    for f, angs in ((2, (80, 95, 60)), (3, (82, 95, 60)), (4, (84, 95, 60)), (5, (86, 95, 60)), (1, (25, 45, 35))):
        for k in (1, 2, 3):
            w = np.zeros(nV)
            for kk in range(k, 4):
                w += Wn.get(f'finger{f}-{kk}.{side}', 0)
            idx = np.nonzero(w > 0)[0]
            if not len(idx): continue
            head = jp(f'finger{f}-{k}.{side}')
            axis = across * (1 if side == 'L' else -1) * float(os.environ.get('CURLSIGN', '-1'))
            for vi in idx:
                R = _rot(axis, np.radians(angs[k - 1]) * min(1.0, w[vi]))
                V[vi] = head + R @ (V[vi] - head)
V_FIST = V.copy(); V[:] = V_OPEN

# huesos propios
pel = jp('spine05'); neck = jp('neck01'); mid = (pel + neck) / 2
top = np.array([jp('head')[0], V[:, 1].max(), jp('head')[2]])
headC = (jp('head') + top) / 2
segs = {'hips': (pel, mid), 'chest': (mid, neck), 'head': (neck, headC)}
for s in 'LR':
    segs['ua' + s] = (jp(f'upperarm01.{s}'), jp(f'lowerarm01.{s}'))
    segs['fa' + s] = (jp(f'lowerarm01.{s}'), jp(f'wrist.{s}'))
    segs['hand' + s] = (jp(f'wrist.{s}'), jp(f'finger3-1.{s}'))
    segs['th' + s] = (jp(f'upperleg01.{s}'), jp(f'lowerleg01.{s}'))
    segs['sh' + s] = (jp(f'lowerleg01.{s}'), jp(f'foot.{s}'))
    segs['foot' + s] = (jp(f'foot.{s}'), jp(f'toe1-1.{s}'))
BONES = list(segs)

def mybone(mh):
    side = mh[-1] if mh.endswith(('.L', '.R')) else ''
    base = mh[:-2] if side else mh
    if base in ('root', 'spine05', 'spine04', 'spine03', 'pelvis'): return 'hips'
    if base in ('spine02', 'spine01', 'clavicle', 'breast'): return 'chest'
    if base in ('shoulder01', 'upperarm01', 'upperarm02'): return 'ua' + side
    if base in ('lowerarm01', 'lowerarm02'): return 'fa' + side
    if base == 'wrist' or base.startswith(('metacarpal', 'finger')): return 'hand' + side
    if base in ('upperleg01', 'upperleg02'): return 'th' + side
    if base in ('lowerleg01', 'lowerleg02'): return 'sh' + side
    if base == 'foot' or base.startswith('toe'): return 'foot' + side
    if base.endswith(('_ik', '_grip')): raise ValueError('hueso de control con peso: ' + mh)
    return 'head'
Wm = np.zeros((nV, len(BONES)))
for n, w in Wn.items():
    Wm[:, BONES.index(mybone(n))] += w

used = np.unique(tris); remap = -np.ones(nV, int); remap[used] = np.arange(len(used))
P = V[used]; Wu = Wm[used]; T = remap[tris]
order = np.argsort(-Wu, axis=1)[:, :4]
wts = np.take_along_axis(Wu, order, axis=1)
wts[wts.sum(axis=1) == 0, 0] = 1
wts = wts / wts.sum(axis=1, keepdims=True)
wq = np.round(wts * 255).astype(int); wq[:, 0] += 255 - wq.sum(axis=1)

def tparam(p, seg):
    a, c = seg; d = c - a
    return float(np.dot(p - a, d) / np.dot(d, d))
region = np.zeros(len(P), dtype=np.uint8)
dom = np.argmax(Wu, axis=1)
lipW = sum((w for n, w in Wn.items() if n.split('.')[0].rstrip('0123456789') == 'oris'), np.zeros(nV))[used]
U = S / 8.4  # build_mh trabajaba en decímetros con escala 8.4: pasar sus márgenes a estas unidades
for i, p in enumerate(P):
    bn = BONES[dom[i]]
    if bn == 'chest': region[i] = 1
    elif bn == 'hips': region[i] = 1 if p[1] > pel[1] + 0.35 * 8.4 / S else 2
    elif bn.startswith('ua'):
        t = tparam(p, segs[bn]); region[i] = 1 if t < 0.42 else (6 if t < 0.47 else 0)
    elif bn.startswith('th'):
        t = tparam(p, segs[bn]); region[i] = 2 if t < 0.5 else (6 if t < 0.54 else 0)
    elif bn.startswith('sh'):
        t = tparam(p, segs[bn]); region[i] = 4 if SHOES and t > 0.86 else 0
    elif bn.startswith('foot'): region[i] = 4 if SHOES else 0
    elif bn == 'head' and lipW[i] > 0.6: region[i] = 5
PART = {'hips': 0, 'chest': 0, 'head': 0, 'uaL': 1, 'faL': 1, 'uaR': 2, 'faR': 2, 'thL': 3, 'shL': 3, 'thR': 4, 'shR': 4,
        'footL': 5, 'footR': 5, 'handL': 6, 'handR': 6}
part = np.array([PART[BONES[d]] for d in dom], dtype=np.uint8); part[region == 5] = 7
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from smooth_regions import smooth_regions
region = smooth_regions(region, T, 3)

P2 = out(P)
dF = (V_FIST - V_OPEN)[used]; mF = np.abs(dF).sum(axis=1) > 1e-7
data = {
    'license': 'MakeHuman / MPFB (CC0) model made by the user in Blender',
    'bones': BONES,
    'rest': {k: [out(a).tolist(), out(c).tolist()] for k, (a, c) in segs.items()},
    'eyes': {s: out(jp(f'eye.{s}')).tolist() for s in 'LR'},
    'eyeRadius': 0.013 * S,
    'shoes': SHOES,
    'part': base64.b64encode(part.tobytes()).decode(),
    'fist': {'idx': base64.b64encode(np.nonzero(mF)[0].astype('<u2').tobytes()).decode(),
             'd': base64.b64encode((dF[mF] * S).astype('<f4').tobytes()).decode()},
    'clothes': {'collarY': float(out(neck)[1] - 0.028 * S), 'waistY': float(out(pel)[1] + 0.055 * S),
                'sleeve': 0.42, 'shorts': 0.24, 'sock': 0.9, 'shoeTop': -1e4},
    'count': len(P2),
    'pos': base64.b64encode(P2.astype('<f4').tobytes()).decode(),
    'idx': base64.b64encode(T.astype('<u2').tobytes()).decode(),
    'si': base64.b64encode(order.astype(np.uint8).tobytes()).decode(),
    'sw': base64.b64encode(wq.astype(np.uint8).tobytes()).decode(),
    'reg': base64.b64encode(region.tobytes()).decode(),
}
json.dump(data, open(os.environ.get('OUT', 'skin_glb.json'), 'w'))
print('verts', len(P2), 'tris', len(T), 'kb', round(len(json.dumps(data)) / 1024), 'y', P2[:, 1].min().round(1), P2[:, 1].max().round(1), 'x', P2[:, 0].min().round(1), P2[:, 0].max().round(1))
for k, (a, c) in data['rest'].items(): print(k, np.round(a, 1).tolist(), np.round(c, 1).tolist())
print('regions', np.bincount(region, minlength=7), 'fist', mF.sum(), 'eyes', data['eyes'])
