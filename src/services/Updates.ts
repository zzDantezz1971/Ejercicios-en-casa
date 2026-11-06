import { registerSW } from 'virtual:pwa-register';

/* Actualizaciones de la app: busca versiones nuevas al abrirla, al volver a ella y cada 30 min,
   y avisa para aplicarlas con un toque. */
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
let registration: ServiceWorkerRegistration | undefined;
let ready = false;
const listeners = new Set<() => void>();

export const BUILD_TIME: string = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

export function initUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
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
