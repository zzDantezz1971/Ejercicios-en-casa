import type { Badge } from '../../domain/types';
import { h } from '../dom';

const LABELS: Record<Badge, [string, string]> = {
  lumbar: ['good', 'Bueno para la lumbar'],
  caution: ['warn', 'Ojo con la lumbar'],
  gentle: ['warn', 'Hazlo suave'],
};

export function badgeList(badges?: Badge[]): HTMLElement | null {
  if (!badges?.length) return null;
  return h('span', { class: 'badges' }, ...badges.map((b) => h('span', { class: `badge ${LABELS[b][0]}` }, LABELS[b][1])));
}
