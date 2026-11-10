"""Pasa una animación de Mixamo (posiciones sacadas con tools/mocap.html) a posturas del motor (ángulos de vista lateral).
Uso: python3 fbx2pose.py situps.json abdominal-completo  → imprime la entrada para src/data/extra/mocap.ts.
Ejes de Mixamo: Y arriba, Z adelante (hacia donde mira la figura), X a su izquierda.
Ángulos del motor: 0 = adelante, 90 = abajo (y hacia abajo positivo)."""
import json, sys
import numpy as np

src, exid = sys.argv[1], sys.argv[2]
step = int(sys.argv[3]) if len(sys.argv) > 3 else 2  # 30 fps / 2 = 15 posturas por segundo
d = json.load(open(src)); N = d['names']; F = np.array(d['frames'], dtype=float)
P = {n: F[:, i] for i, n in enumerate(N)}
def ang(a, b):
    v = P[b] - P[a]
    return np.degrees(np.arctan2(-v[:, 1], v[:, 2]))
def ratio(a, b):
    v = P[b] - P[a]
    return np.hypot(v[:, 1], v[:, 2]) / np.linalg.norm(v, axis=1)
keys = {
    'tl': ang('Hips', 'Spine2'), 'tu': ang('Spine2', 'Neck'), 'hd': ang('Neck', 'HeadTop_End'),
}
for s, m in (('L', 'Left'), ('R', 'Right')):
    keys['ua' + s] = ang(m + 'Arm', m + 'ForeArm')
    keys['fa' + s] = ang(m + 'ForeArm', m + 'Hand')
    keys['sa' + s] = np.clip(ratio(m + 'Arm', m + 'Hand'), 0.05, 1)
    keys['th' + s] = ang(m + 'UpLeg', m + 'Leg')
    keys['sn' + s] = ang(m + 'Leg', m + 'Foot')
    keys['ft' + s] = ang(m + 'Foot', m + 'ToeBase')
names = list(keys)
rows = []
for k in names:
    v = keys[k]
    if not k.startswith('sa'):
        v = np.degrees(np.unwrap(np.radians(v)))
        # que el primer valor quede cerca de lo habitual (tumbado boca arriba ≈ 180)
    rows.append(v)
M = np.array(rows).T[::step]
out = {'per': round(d['duration'] * 1000), 'keys': names, 'frames': [[round(float(x), 1 if abs(x) > 2 else 3) for x in r] for r in M]}
print(json.dumps({exid: out}, separators=(',', ':')))
