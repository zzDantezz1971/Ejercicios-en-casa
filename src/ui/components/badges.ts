import type { Badge } from '../../domain/types';
import { h } from '../dom';
import { icon, type IconName } from '../icons';
import { EQUIP_INFO, type Equip } from '../../domain/equipment';

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

/** Material que necesita un ejercicio, en pastillas pequeñas ("Mancuernas", "Banco o Step").
    Las que el usuario no tiene salen marcadas. */
export function equipChips(need: Equip[][] | undefined, owned?: ReadonlySet<string>): HTMLElement | null {
  if (!need?.length) return null;
  return h('span', { class: 'equip-chips' }, ...need.map((alts) => {
    const ok = !owned || alts.some((e) => owned.has(e));
    return h('span', { class: 'equip-chip' + (ok ? '' : ' missing') }, icon(EQUIP_INFO[alts[0]].icon as IconName),
      ...alts.flatMap((e, i) => (i ? [h('span', { class: 'or' }, 'o'), h('span', {}, EQUIP_INFO[e].name)] : [h('span', {}, EQUIP_INFO[e].name)])));
  }));
}

/** Material sobre el maniquí (arriba a la izquierda): solo el icono de cada aparato necesario
    (el nombre queda para lectores de pantalla); si vale uno u otro, van en la misma pastilla
    separados por «/». En naranja, lo que el usuario no tiene. */
export function equipMarks(need: Equip[][] | undefined, owned?: ReadonlySet<string>): HTMLElement | null {
  if (!need?.length) return null;
  return h('span', { class: 'equip-marks' }, ...need.map((alts) => {
    const ok = !owned || alts.some((e) => owned.has(e));
    const label = alts.map((e) => EQUIP_INFO[e].name).join(' / ');
    return h('span', { class: 'equip-mark' + (ok ? '' : ' missing'), title: label, 'aria-label': label },
      ...alts.flatMap((e, i) => (i ? [h('span', { class: 'or', 'aria-hidden': 'true' }, '/'), icon(EQUIP_INFO[e].icon as IconName)] : [icon(EQUIP_INFO[e].icon as IconName)])));
  }));
}
