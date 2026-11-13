import { describe, expect, it } from 'vitest';
import { Store } from '../src/domain/Store';
import { CATALOG } from '../src/data/catalog';
import { DEFAULT_ANGLES, DEFAULT_ANGLES_VER } from '../src/data/defaultAngles';

describe('Ángulos predeterminados', () => {
  it('el catálogo usa el ángulo elegido como el de siempre', () => {
    // giros de tronco: de frente (18°) y con su giro predeterminado
    expect(CATALOG.get('giros-de-tronco')!.motion.az).toBe(18 + DEFAULT_ANGLES['giros-de-tronco']);
    // los que no tienen ángulo elegido siguen igual
    const libre = [...CATALOG.values()].find((e) => !(e.id in DEFAULT_ANGLES) && e.motion.az == null);
    expect(libre).toBeTruthy();
  });

  it('los ángulos guardados antes se recalculan una sola vez respecto a los nuevos', () => {
    const base = DEFAULT_ANGLES['giros-de-tronco'];
    const d = Store.migrate({ settings: { angles: { 'giros-de-tronco': base, 'circulos-de-rodillas': DEFAULT_ANGLES['circulos-de-rodillas'] + 20, otro: 30 } } });
    expect(d.settings.angles).toEqual({ 'circulos-de-rodillas': 20, otro: 30 });
    expect(d.settings.anglesVer).toBe(DEFAULT_ANGLES_VER);
    // una vez recalculados, ya no se tocan
    expect(Store.migrate({ settings: d.settings }).settings.angles).toEqual({ 'circulos-de-rodillas': 20, otro: 30 });
  });
});
