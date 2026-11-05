import type { SkinData } from './SkinnedFigure';

/* Cuerpo del maniquí anatomía (malla con piel). Se descarga una vez y la app lo guarda para usarlo sin conexión.
   Si no se puede cargar, las figuras usan el maniquí de piezas como reserva. */
let skin: SkinData | undefined;

export async function loadSkin(timeoutMs = 6000): Promise<void> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${import.meta.env.BASE_URL}maniqui.json`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) skin = (await res.json()) as SkinData;
  } catch {
    skin = undefined;
  }
}

export function getSkin(): SkinData | undefined {
  return skin;
}
