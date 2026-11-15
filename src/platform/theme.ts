import { IS_NATIVE } from './native';
import { KasaNative } from './kasaNative';

/* Tema de la interfaz: modo oscuro (por defecto), claro o automático (el del sistema), y color (tema). */
export type ThemePref = 'dark' | 'light' | 'auto';

/** Temas de color: «blau» es el de siempre. Los colores están en app.css (:root[data-color="…"]). */
export const COLOR_THEMES = ['blau', 'verd', 'taronja', 'or', 'lila', 'rosa', 'grafit'] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];
/** Nombre (en castellano; se traduce en pantalla) y color de muestra de cada tema. */
export const COLOR_INFO: Record<ColorTheme, { name: string; swatch: [string, string] }> = {
  blau: { name: 'Azul', swatch: ['#3658C2', '#15206E'] },
  verd: { name: 'Verde salvia', swatch: ['#4F9A78', '#23503D'] },
  taronja: { name: 'Terracota', swatch: ['#9A714F', '#502D23'] },
  or: { name: 'Oro', swatch: ['#A88838', '#45360F'] },
  lila: { name: 'Lila noche', swatch: ['#6541B2', '#2E1B62'] },
  rosa: { name: 'Rosa', swatch: ['#C2367B', '#6E1546'] },
  grafit: { name: 'Grafito', swatch: ['#555E6E', '#212730'] },
};

/** Temas gratis; los demás, con Prémium (sin él se ve el azul). */
export const FREE_COLORS: ReadonlySet<ColorTheme> = new Set<ColorTheme>(['blau', 'verd']);

let pref: ThemePref = 'dark';
let color: ColorTheme = 'blau';
/** ¿Tiene Prémium? (lo conecta la app; al arrancar, antes de saberlo, se deja ver el tema guardado). */
let premium: () => boolean = () => true;

/** Conecta la comprobación de Prémium para los temas de pago. */
export function setColorGate(isPremium: () => boolean): void {
  premium = isPremium;
}
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null;

function paint(): void {
  const light = pref === 'light' || (pref === 'auto' && !!mq?.matches);
  const root = document.documentElement;
  root.dataset.theme = light ? 'light' : 'dark';
  const shown = FREE_COLORS.has(color) || premium() ? color : 'blau';
  if (shown === 'blau') delete root.dataset.color;
  else root.dataset.color = shown;
  // el fondo del tema (con su tinte) para la barra del navegador y las barras de Android
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || (light ? '#F3F5F9' : '#0A0D12');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  // app Android: barras del sistema del color del fondo, con iconos oscuros en el modo claro
  if (IS_NATIVE) void KasaNative.setBars({ light, color: bg }).catch(() => undefined);
}

/** Aplica el modo elegido (y sigue los cambios del sistema en automático). */
export function applyTheme(p: ThemePref): void {
  pref = p;
  paint();
}

/** Aplica el tema de color. */
export function applyColor(c: string | undefined): void {
  color = (COLOR_THEMES as readonly string[]).includes(c ?? '') ? (c as ColorTheme) : 'blau';
  paint();
}
mq?.addEventListener?.('change', () => pref === 'auto' && paint());

/** Al arrancar, antes de pintar nada: el modo y el tema guardados (para que no parpadee). */
export function applySavedTheme(): void {
  try {
    const s = JSON.parse(localStorage.getItem('ejercicios-en-casa') ?? '{}')?.settings;
    const t = s?.theme;
    pref = t === 'light' || t === 'auto' ? t : 'dark';
    applyColor(s?.colorTheme);
  } catch {
    pref = 'dark';
    applyColor('blau');
  }
}
