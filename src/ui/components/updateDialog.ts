import { LANG } from '../../i18n';
import { APP_BUILD, applyUpdate, BUILD_TIME, PREV_BUILD, previousBuild } from '../../services/Updates';
import { IS_NATIVE } from '../../platform/native';
import { h } from '../dom';
import { LOCALE } from '../../i18n';

export interface Entry { fecha: string; es: string[]; ca: string[]; en: string[]; gl?: string[]; eu?: string[] }

/** Lee las novedades de la versión nueva (siempre del servidor, nunca de la copia guardada). */
async function loadNews(): Promise<string[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}novedades.json?t=${Date.now()}`, { cache: 'no-store' });
    const all = (await res.json()) as Entry[];
    // web: lo que trae la versión nueva; app Android: lo que ha llegado desde la versión anterior
    const fresh = IS_NATIVE ? all.filter((e) => !!previousBuild && e.fecha > previousBuild && e.fecha <= BUILD_TIME) : all.filter((e) => e.fecha > BUILD_TIME);
    return (fresh.length ? fresh : all.slice(0, 1)).flatMap((e) => e[LANG] ?? e.es);
  } catch {
    return [];
  }
}

/** Antes de actualizar: qué ha cambiado, y botones para actualizar ahora o más tarde. */
export async function showUpdateDialog(): Promise<void> {
  const news = await loadNews();
  const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && wrap.remove() },
    h('div', { class: 'dialog update-dialog', role: 'dialog', 'aria-modal': 'true' },
      h('h3', {}, 'Novedades'),
      news.length ? h('ul', { class: 'news-list' }, ...news.map((t) => h('li', {}, t))) : h('p', { class: 'muted' }, 'Mejoras y arreglos.'),
      IS_NATIVE
        ? h('div', { class: 'dialog-actions' }, h('button', { class: 'btn primary', onclick: () => wrap.remove() }, 'Cerrar'))
        : h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn ghost', onclick: () => wrap.remove() }, 'Más tarde'),
          h('button', { class: 'btn primary', onclick: () => void applyUpdate() }, 'Actualizar ahora'))));
  // las novedades vienen ya en el idioma elegido
  wrap.querySelector('.news-list')?.setAttribute('data-no-tr', '');
  document.body.append(wrap);
}

/**
 * Novedades de las entradas elegidas (fecha y lista). App Android: lo que entró desde la compilación anterior hasta
 * esta; web (o sin fecha anterior): las últimas entradas hasta esta versión.
 */
export function versionEntries(all: readonly Entry[], built = BUILD_TIME, prev = PREV_BUILD): Entry[] {
  const upTo = all.filter((e) => e.fecha <= built);
  const mine = prev ? upTo.filter((e) => e.fecha > prev) : [];
  return mine.length ? mine : upTo.slice(0, 5);
}

/** Configuración › Versión de la app: qué hay en esta versión. */
export async function showVersionNews(): Promise<void> {
  let entries: Entry[] = [];
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}novedades.json?t=${Date.now()}`, { cache: 'no-store' });
    entries = versionEntries((await res.json()) as Entry[]);
  } catch {
    /* sin novedades */
  }
  const day = (iso: string) => new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
  const days = [...new Set(entries.map((e) => day(e.fecha)))];
  const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && wrap.remove() },
    h('div', { class: 'dialog update-dialog', role: 'dialog', 'aria-modal': 'true' },
      APP_BUILD ? h('h3', {}, `Novedades de la versión ${APP_BUILD}`) : h('h3', {}, 'Últimas novedades'),
      entries.length
        ? h('div', { class: 'news-days', 'data-no-tr': '' }, ...days.map((d) => h('div', { class: 'news-day' },
          h('p', { class: 'muted small news-date' }, d),
          h('ul', { class: 'news-list' }, ...entries.filter((e) => day(e.fecha) === d).flatMap((e) => e[LANG] ?? e.es).map((t) => h('li', {}, t))))))
        : h('p', { class: 'muted' }, 'Mejoras y arreglos.'),
      h('div', { class: 'dialog-actions' }, h('button', { class: 'btn primary', onclick: () => wrap.remove() }, 'Cerrar'))));
  document.body.append(wrap);
}
