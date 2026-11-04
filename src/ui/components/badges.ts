import type { Badge } from '../../domain/types';
import { h } from '../dom';
import { icon } from '../icons';

const LABELS: Record<Badge, [string, string]> = {
  lumbar: ['good', 'Bueno para la lumbar'],
  caution: ['warn', 'Ojo con la lumbar'],
  gentle: ['warn', 'Hazlo suave'],
};

export function badgeList(badges?: Badge[]): HTMLElement | null {
  if (!badges?.length) return null;
  return h('span', { class: 'badges' }, ...badges.map((b) => h('span', { class: `badge ${LABELS[b][0]}` }, LABELS[b][1])));
}

/** Marca sobre el maniquí: el ejercicio se hace en dos partes (un lado y luego el otro). */
export function sidesMark(small = false): HTMLElement {
  return h('span', { class: 'sides-mark' + (small ? ' small' : ''), title: 'Se hace por lados', 'aria-label': 'Se hace por lados' }, icon('sides'));
}
