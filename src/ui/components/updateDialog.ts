import { LANG } from '../../i18n';
import { applyUpdate, BUILD_TIME, previousBuild } from '../../services/Updates';
import { IS_NATIVE } from '../../platform/native';
import { h } from '../dom';

interface Entry { fecha: string; es: string[]; ca: string[]; en: string[] }

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
