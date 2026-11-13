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
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  kettlebell: 'M9.5 9.5V7.5a2.5 2.5 0 0 1 5 0v2M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
  barbell: 'M2.5 12h19M5.5 8.5v7M8.5 6.5v11M15.5 6.5v11M18.5 8.5v7',
  bench: 'M3 10.5h18M6 10.5V18M18 10.5V18M4 18h4M16 18h4',
  band: 'M4 12c0-2.8 3.6-5 8-5s8 2.2 8 5-3.6 5-8 5-8-2.2-8-5zM8 12c0-1.2 1.8-2 4-2s4 .8 4 2-1.8 2-4 2-4-.8-4-2z',
  step: 'M2.5 18h19M5 18l2.5-6h9l2.5 6M7.5 12V10h9v2',
  ball: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM4.3 10.5c5 2 10.4 2 15.4 0M5.5 16.5c4-2 9-2 13 0',
  pullup: 'M3 5.5h18M5.5 5.5V20M18.5 5.5V20M9 5.5v3M15 5.5v3',
  rope: 'M5 4v5M19 4v5M5 9c0 10 14 10 14 0',
  wheel: 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM2.5 12h3.5M18 12h3.5',
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
  user: 'M12 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4.5 20.5c.8-3.9 3.8-6 7.5-6s6.7 2.1 7.5 6',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9M12 3c-2.5 2.6-3.7 5.6-3.7 9s1.2 6.4 3.7 9',
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

/** Iconos ilustrados de los apartados: capas rellenas con distinta opacidad del color del apartado. */
const ILLUSTRATED: Record<string, Array<[string, number]>> = {
  secWarm: [
    ['M12 2.5c1.2 3.6 6 5.6 6 11a6 6 0 0 1-12 0c0-2.9 1.4-4.8 3-6.1.1 2.3 1.2 3.7 2.9 4C11 8.8 10.9 5.6 12 2.5z', 0.95],
    ['M12 11.5c.6 1.7 3 2.7 3 5.2a3 3 0 0 1-6 0c0-1.4.7-2.3 1.5-3 .1 1 .6 1.7 1.4 1.9-.4-1.3-.4-2.8.1-4.1z', 0.45],
  ],
  secWeights: [
    ['M2.5 9.2a1 1 0 0 1 1-1h1.4v7.6H3.5a1 1 0 0 1-1-1z M19.1 8.2h1.4a1 1 0 0 1 1 1v5.6a1 1 0 0 1-1 1h-1.4z', 0.55],
    ['M5.6 5.5h2.2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5.6a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z M16.2 5.5h2.2a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-2.2a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z', 0.95],
    ['M8.8 11h6.4v2H8.8z', 0.8],
  ],
  secAbs: [
    ['M7 4.5c2.8-1.3 7.2-1.3 10 0l.8 9.5c-.3 3.4-2.4 5.9-5.8 6.6-3.4-.7-5.5-3.2-5.8-6.6z', 0.35],
    ['M9.2 6.6h2.3v2.6H9.2zM12.5 6.6h2.3v2.6h-2.3zM9.2 10.2h2.3v2.6H9.2zM12.5 10.2h2.3v2.6h-2.3zM9.6 13.8h1.9v2.8c-.8-.4-1.5-1.3-1.9-2.8zM12.5 13.8h1.9c-.4 1.5-1.1 2.4-1.9 2.8z', 0.95],
  ],
  secStretch: [
    ['M12 2.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4z', 0.95],
    ['M3.6 8.6c.2-.7.9-1 1.6-.8l6.8 1.7 6.8-1.7c.7-.2 1.4.1 1.6.8.2.7-.2 1.4-.9 1.6l-5.3 1.6v3.4l3.4 5.4c.4.6.2 1.4-.4 1.8-.6.4-1.4.2-1.8-.4L12 16.9l-3.4 5.1c-.4.6-1.2.8-1.8.4-.6-.4-.8-1.2-.4-1.8l3.4-5.4v-3.4L4.5 10.2c-.7-.2-1.1-.9-.9-1.6z', 0.9],
  ],
};

export type IconName = keyof typeof STROKE | keyof typeof FILL | keyof typeof ILLUSTRATED;

export function icon(name: IconName, cls = 'ico'): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', cls);
  if (name in ILLUSTRATED) {
    for (const [d, op] of ILLUSTRATED[name]) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'currentColor');
      p.setAttribute('fill-opacity', String(op));
      svg.append(p);
    }
    return svg;
  }
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
  calentamiento: { color: 'var(--sec-warm)', icon: 'secWarm' },
  pesas: { color: 'var(--sec-weights)', icon: 'secWeights' },
  abdominales: { color: 'var(--sec-abs)', icon: 'secAbs' },
  estiramientos: { color: 'var(--sec-stretch)', icon: 'secStretch' },
};

/* Silueta del cuerpo con la zona trabajada resaltada (títulos de zona en las listas). */
type Zone = 'superior' | 'inferior' | 'cuello' | 'hombros' | 'pecho' | 'espalda' | 'brazos' | 'abdomen' | 'lumbar' | 'cadera' | 'piernas' | 'todo';

export function zoneOf(title: string): Zone {
  const t = title.toLowerCase();
  if (t === 'tren superior') return 'superior';
  if (t === 'tren inferior') return 'inferior';
  if (t === 'core') return 'abdomen';
  if (/cuello|trapecio/.test(t)) return 'cuello';
  if (/hombro/.test(t)) return 'hombros';
  if (/pecho/.test(t)) return 'pecho';
  if (/lumbar/.test(t)) return 'lumbar';
  if (/espalda|costado/.test(t)) return 'espalda';
  if (/brazo/.test(t)) return 'brazos';
  if (/abdomen|oblicuo|core/.test(t)) return 'abdomen';
  if (/cadera|glúte|aductor|ingle/.test(t)) return 'cadera';
  if (/pierna/.test(t)) return 'piernas';
  return 'todo';
}

const BODY = {
  head: 'M12 1.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z',
  neck: 'M11 5.6h2v1.4h-2z',
  shoulders: 'M7.4 7.3c1.3-.5 2.8-.7 4.6-.7s3.3.2 4.6.7l.4 1.8H7z',
  chest: 'M7.2 8.9h9.6l-.3 3.3H7.5z',
  abdomen: 'M7.6 12.1h8.8l-.3 3.4H7.9z',
  hips: 'M7.8 15.4h8.4l.4 2.4H7.4z',
  armL: 'M6.2 7.6l1.4.4-1 6.2-1 2.9-1.3-.4.8-2.8z',
  armR: 'M17.8 7.6l-1.4.4 1 6.2 1 2.9 1.3-.4-.8-2.8z',
  legL: 'M7.5 17.7h4l-.5 6.1H8.4z',
  legR: 'M12.5 17.7h4l-.9 6.1h-2.6z',
};

export function zoneIcon(title: string): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const zone = zoneOf(title);
  const hot: Record<Zone, string[]> = {
    cuello: ['neck'], hombros: ['shoulders'], pecho: ['chest'], espalda: ['shoulders', 'chest'], brazos: ['armL', 'armR'],
    abdomen: ['abdomen'], lumbar: ['abdomen'], cadera: ['hips'], piernas: ['legL', 'legR'], todo: [],
    superior: ['neck', 'shoulders', 'chest', 'armL', 'armR'], inferior: ['hips', 'legL', 'legR'],
  };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 25');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'zone-ico');
  for (const [k, d] of Object.entries(BODY)) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', hot[zone].includes(k) ? 'zone-hot' : 'zone-body');
    svg.append(p);
  }
  return svg;
}

/** Trazo de un icono de línea (para dibujarlo dentro de otra imagen). */
export function strokePath(name: string): string | undefined {
  return STROKE[name];
}
