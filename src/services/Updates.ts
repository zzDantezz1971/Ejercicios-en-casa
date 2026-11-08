import { registerSW } from 'virtual:pwa-register';
import { IS_NATIVE } from '../platform/native';

/* Actualizaciones de la app: busca versiones nuevas al abrirla, al volver a ella y cada 30 min,
   y avisa para aplicarlas con un toque. */
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;
let ready = false;
const listeners = new Set<() => void>();

export const BUILD_TIME: string = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

export function initUpdates(): void {
  // en la app Android las versiones nuevas llegan por Google Play
  if (IS_NATIVE || !('serviceWorker' in navigator)) return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true;
      listeners.forEach((f) => f());
    },
    onRegisteredSW(_url, reg) {
      registration = reg;
      setInterval(() => void reg?.update(), 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg?.update();
      });
    },
  });
}

/** Hay una versión nueva descargada y lista para usar. */
export function updateReady(): boolean {
  return ready;
}

export function onUpdateReady(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Aplica la versión nueva (la app se recarga). */
export async function applyUpdate(): Promise<void> {
  if (updateSW) await updateSW(true);
  else location.reload();
}

/** Busca una versión nueva ahora. Devuelve true si la hay. */
export async function checkForUpdate(): Promise<boolean> {
  if (ready) return true;
  try {
    await registration?.update();
  } catch {
    return false;
  }
  // la descarga tarda unos segundos: se espera un poco a que avise
  for (let i = 0; i < 16 && !ready; i++) await new Promise((r) => setTimeout(r, 500));
  return ready;
}

/** App Android: la última versión de la que ya se enseñaron las novedades. */
const SEEN_KEY = 'ejercicios-en-casa-version-vista';

/** App Android: true la primera vez que se abre una versión nueva instalada desde Google Play (no en la primera instalación). */
export function firstRunOfNewVersion(): boolean {
  if (!IS_NATIVE) return false;
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    localStorage.setItem(SEEN_KEY, BUILD_TIME);
    previousBuild = seen;
    return !!seen && seen !== BUILD_TIME;
  } catch {
    return false;
  }
}

/** Fecha de la versión anterior (para enseñar solo las novedades posteriores). */
export let previousBuild: string | null = null;
