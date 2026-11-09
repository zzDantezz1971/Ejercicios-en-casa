/* Tema de la interfaz: oscuro (por defecto), claro o automático (el del sistema). */
export type ThemePref = 'dark' | 'light' | 'auto';

let pref: ThemePref = 'dark';
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null;

function paint(): void {
  const light = pref === 'light' || (pref === 'auto' && !!mq?.matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#F3F5F9' : '#0A0D12');
}

/** Aplica el tema elegido (y sigue los cambios del sistema en automático). */
export function applyTheme(p: ThemePref): void {
  pref = p;
  paint();
}
mq?.addEventListener?.('change', () => pref === 'auto' && paint());

/** Al arrancar, antes de pintar nada: el tema guardado (para que no parpadee). */
export function applySavedTheme(): void {
  try {
    const t = JSON.parse(localStorage.getItem('ejercicios-en-casa') ?? '{}')?.settings?.theme;
    applyTheme(t === 'light' || t === 'auto' ? t : 'dark');
  } catch {
    applyTheme('dark');
  }
}
