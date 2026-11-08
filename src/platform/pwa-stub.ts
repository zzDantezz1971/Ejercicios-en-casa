/** App Android: sin service worker (sustituye a virtual:pwa-register). */
export function registerSW(_opts?: unknown): (reload?: boolean) => Promise<void> {
  return async () => location.reload();
}
