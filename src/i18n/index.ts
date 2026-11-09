/* Idiomas de la app: catalán (por defecto), castellano e inglés.
   La app está escrita en castellano; aquí se traduce al idioma elegido. */
import { EX1, type ExT } from './ex1';
import { EX2 } from './ex2';
import { EX3 } from './ex3';
import { EX4, GROUPS } from './ex4';
import { UI_CA, UI_EN } from './ui';
import { EXTRA_GROUPS, EXTRA_T } from '../data/extra';

export type Lang = 'ca' | 'es' | 'en';

export const LANGS: Array<{ id: Lang; name: string }> = [
  { id: 'ca', name: 'Català' },
  { id: 'es', name: 'Castellano' },
  { id: 'en', name: 'English' },
];

function readLang(): Lang {
  if (typeof window === 'undefined') return 'es'; // pruebas
  try {
    const l = JSON.parse(localStorage.getItem('ejercicios-en-casa') ?? '{}')?.settings?.lang;
    if (l === 'ca' || l === 'es' || l === 'en') return l;
  } catch {
    /* sin datos: idioma por defecto */
  }
  return 'ca';
}

/** Idioma en uso (se fija al abrir la app; al cambiarlo, la app se recarga). */
export const LANG: Lang = readLang();
/** Formato de fechas y números del idioma. */
export const LOCALE = ({ ca: 'ca-ES', es: 'es-ES', en: 'en-GB' } as const)[LANG];
/** Separador decimal (7,5 kg / 7.5 kg). */
export const DEC = LANG === 'en' ? '.' : ',';
/** Código de idioma para la voz. */
export const VOICE_LANG = LOCALE;

const EX: Record<string, { ca: ExT; en: ExT }> = { ...EX1, ...EX2, ...EX3, ...EX4, ...EXTRA_T };

/** Textos de un ejercicio en el idioma en uso (o undefined en castellano). */
export function exerciseText(id: string): ExT | undefined {
  if (LANG === 'es') return undefined;
  return EX[id]?.[LANG];
}

export function hasExerciseText(id: string, lang: 'ca' | 'en'): boolean {
  return !!EX[id]?.[lang];
}

/* ── Diccionario de la interfaz: texto en castellano → traducción ── */

type Dict = Record<string, string>;
const exact: Dict = {};
const patterns: Array<{ re: RegExp; keys: string[]; out: string }> = [];

function load(lang: Lang): void {
  if (lang === 'es') return;
  const ui = lang === 'ca' ? UI_CA : UI_EN;
  for (const [es, tr] of Object.entries({ ...GROUPS, ...EXTRA_GROUPS })) exact[es] = tr[lang];
  for (const [es, t] of Object.entries(ui)) {
    if (/\{\w+\}/.test(es)) {
      const keys: string[] = [];
      const src = es
        .split(/(\{\w+\})/)
        .map((part) => {
          const m = part.match(/^\{(\w+)\}$/);
          if (m) {
            keys.push(m[1]);
            return '(.+?)';
          }
          return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('');
      patterns.push({ re: new RegExp(`^${src}$`), keys, out: t });
    } else exact[es] = t;
  }
  // los patrones más largos (más específicos) primero
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
}
load(LANG);

const missing = new Set<string>();
/** Textos que ya están en el idioma de destino (no cuentan como pendientes). */
const known = new Set<string>();
if (LANG !== 'es') {
  Object.values(exact).forEach((v) => known.add(v));
  Object.values(EX).forEach((e) => e[LANG].forEach((t) => t && known.add(t)));
}

/** Traduce un texto en castellano al idioma en uso. Si no se conoce, se deja como está. */
export function tr(text: string): string {
  if (LANG === 'es' || !text) return text;
  const lead = text.match(/^\s*/)![0], trail = text.match(/\s*$/)![0];
  const core = text.trim();
  if (!core) return text;
  const hit = exact[core];
  if (hit !== undefined) return lead + hit + trail;
  for (const p of patterns) {
    const m = core.match(p.re);
    if (!m) continue;
    let out = p.out;
    p.keys.forEach((k, i) => (out = out.split(`{${k}}`).join(tr(m[i + 1]))));
    // en catalán, "de octubre" → "d’octubre", "de Escalfament" → "d’Escalfament"
    if (LANG === 'ca') out = out.replace(/\b([Dd])e (?=[aeiouàèéíïòóúüAEIOUÀÈÉÍÒÓÚ]|h[aeiouàèéíòóú])/g, '$1’');
    return lead + out + trail;
  }
  if (!known.has(core) && /[a-záéíóúñ]{3,}/i.test(core) && !/^[\d\s.,:;%+−-]+$/.test(core)) missing.add(core);
  return text;
}

/** Textos sin traducir vistos en pantalla (para revisar). */
export function missingTranslations(): string[] {
  return [...missing];
}

/* ── Traducción automática de lo que aparece en pantalla ── */

const ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
const done = new WeakMap<Node, string>();

function translateText(n: Text): void {
  const v = n.data;
  if (done.get(n) === v) return;
  const t = tr(v);
  done.set(n, t);
  if (t !== v) n.data = t;
}

function translateEl(el: Element): void {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const t = tr(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) return translateText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return translateEl(el);
  if ((el as HTMLElement).dataset?.noTr !== undefined) return;
  translateEl(el);
  for (const c of Array.from(el.childNodes)) walk(c);
}

/** Traduce todo lo que se pinte en la página a partir de ahora. */
export function startTranslating(): void {
  document.documentElement.lang = LANG;
  // la app ya está traducida: que el navegador no la traduzca otra vez por su cuenta
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');
  if (LANG === 'es') return;
  walk(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') translateText(r.target as Text);
      else if (r.type === 'attributes') translateEl(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  (window as unknown as { __missingTr: () => string[] }).__missingTr = missingTranslations;
}
