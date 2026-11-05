import type { SectionId } from '../domain/types';

/* Iconos propios (24×24). Los de trazo usan currentColor; los marcados como "fill" van rellenos. */
const STROKE: Record<string, string> = {
  star: 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z',
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  tables: 'M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  flame: 'M12 3c.8 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.2 1-3.6 2.2-4.6.1 1.8 1 2.9 2.3 3.1-.6-2.7-.8-5.2 0-8z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3.5 2',
  dumbbell: 'M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
  stretch: 'M12 3.5a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM4 9.5l8 1.5 8-1.5M12 11v4.5L8.5 21M12 15.5l3.5 5.5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 7.8h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  trash: 'M4 7h16M9.5 7V4h5v3M6 7l1 13h10l1-13',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6z',
  volume: 'M4 9.5h3.5L13 5v14l-5.5-4.5H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11',
  voice: 'M4 5h16v11H9.5L4 20z',
  trophy: 'M8 4h8v5.5a4 4 0 0 1-8 0zM8 6H4.5a3.5 3.5 0 0 0 3.8 4M16 6h3.5a3.5 3.5 0 0 1-3.8 4M12 13.5V17M8.5 21h7M10 17h4v4h-4z',
  hourglass: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  rest: 'M7 4v16M17 4v16',
  sides: 'M7 7h10l-3-3M17 17H7l3 3',
  swap: 'M7 7h11l-3-3M17 17H6l3 3',
};

const FILL: Record<string, string> = {
  play: 'M7 4.5v15l12.5-7.5z',
  heart: 'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z',
  starFill: 'M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z',
  pause: 'M6.5 5h4v14h-4zm7 0h4v14h-4z',
  prev: 'M6 5h2.5v14H6zM20 5v14L9.5 12z',
  next: 'M15.5 5H18v14h-2.5zM4 5l10.5 7L4 19z',
};

export type IconName = keyof typeof STROKE | keyof typeof FILL;

export function icon(name: IconName, cls = 'ico'): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', cls);
  const path = document.createElementNS(NS, 'path');
  if (name in FILL) {
    path.setAttribute('d', FILL[name]);
    path.setAttribute('fill', 'currentColor');
  } else {
    path.setAttribute('d', STROKE[name]);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', name === 'more' ? '3.2' : '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
  }
  svg.append(path);
  return svg;
}

/** Color e icono de cada apartado. */
export const SECTION_STYLE: Record<SectionId, { color: string; icon: IconName }> = {
  calentamiento: { color: 'var(--sec-warm)', icon: 'flame' },
  pesas: { color: 'var(--sec-weights)', icon: 'dumbbell' },
  abdominales: { color: 'var(--sec-abs)', icon: 'target' },
  estiramientos: { color: 'var(--sec-stretch)', icon: 'stretch' },
};
