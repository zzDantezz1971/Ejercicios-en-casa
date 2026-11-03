import numpy as np
def smooth_regions(region, tris, iters=3, keep=()):
    """Cada vértice toma la región más frecuente entre él y sus vecinos (quita manchas sueltas)."""
    n = len(region)
    i = np.concatenate([tris[:, 0], tris[:, 1], tris[:, 2], tris[:, 1], tris[:, 2], tris[:, 0]])
    j = np.concatenate([tris[:, 1], tris[:, 2], tris[:, 0], tris[:, 0], tris[:, 1], tris[:, 2]])
    r = region.copy()
    for _ in range(iters):
        cnt = np.zeros((n, 8))
        np.add.at(cnt, (i, r[j]), 1)
        cnt[np.arange(n), r] += 1.5
        new = np.argmax(cnt, axis=1).astype(np.uint8)
        for k in keep:
            new[r == k] = k
        r = new
    return r
