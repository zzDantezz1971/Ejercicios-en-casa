import type { SkinData } from './SkinnedFigure';

/* Cuerpo del maniquí (malla con piel). Se descarga una vez y la app lo guarda para usarlo sin conexión.
   Si no se puede cargar, las figuras usan el maniquí de piezas como reserva. */
let skin: SkinData | undefined;
let enabled = true;
let anatomy = false;

/** Maniquí anatomía: el realista en gris con los músculos marcados. */
export function useAnatomy(on: boolean): void {
  anatomy = on;
}

export function anatomyOn(): boolean {
  return anatomy;
}

/** Elegir entre el maniquí realista (true) y el de piezas (false). */
export function useSkin(on: boolean): void {
  enabled = on;
}

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
  return enabled ? skin : undefined;
}

/** El cuerpo realista aunque esté elegido el maniquí de piezas (para vistas previas). */
export function getLoadedSkin(): SkinData | undefined {
  return skin;
}
