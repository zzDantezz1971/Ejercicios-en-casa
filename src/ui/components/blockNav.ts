import { SECTION_TITLES, type SectionId } from '../../domain/types';
import { h } from '../dom';
import { icon, SECTION_STYLE } from '../icons';

/** Al final de un bloque: botones con el bloque anterior y el siguiente (cada uno con su icono y su color). */
export function blockNav(blocks: readonly SectionId[], cur: SectionId, go: (s: SectionId, dir: -1 | 1) => void): HTMLElement | null {
  const i = blocks.indexOf(cur);
  const prev = i > 0 ? blocks[i - 1] : undefined;
  const next = i >= 0 && i < blocks.length - 1 ? blocks[i + 1] : undefined;
  if (!prev && !next) return null;
  const btn = (s: SectionId, dir: -1 | 1) => {
    const b = h('button', { class: 'block-nav-btn ' + (dir < 0 ? 'prev' : 'next'), onclick: () => go(s, dir) },
      dir < 0 ? icon('back', 'ico arrow') : null,
      h('span', { class: 'bn-icon' }, icon(SECTION_STYLE[s].icon)),
      h('span', { class: 'bn-text' }, h('span', { class: 'muted small' }, dir < 0 ? 'Bloque anterior' : 'Bloque siguiente'), h('strong', {}, SECTION_TITLES[s])),
      dir > 0 ? icon('chevron', 'ico arrow') : null);
    b.style.setProperty('--sec', SECTION_STYLE[s].color);
    return b;
  };
  return h('nav', { class: 'block-nav', 'aria-label': 'Otros bloques' }, prev ? btn(prev, -1) : h('span'), next ? btn(next, 1) : h('span'));
}
