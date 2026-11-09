import { EQUIPMENT, EQUIP_INFO, type Equip } from '../../domain/equipment';
import { h } from '../dom';
import { icon, type IconName } from '../icons';

/** Cuadrícula de tarjetas de material que se marcan y desmarcan tocándolas (bienvenida y Mis datos). */
export function equipGrid(selected: Set<Equip>, onChange: () => void): HTMLElement {
  return h('div', { class: 'equip-grid' },
    ...EQUIPMENT.map((e) => {
      const on = selected.has(e);
      return h('button', {
        class: 'equip-card' + (on ? ' on' : ''),
        'aria-pressed': String(on),
        onclick: () => { if (on) selected.delete(e); else selected.add(e); onChange(); },
      }, icon(EQUIP_INFO[e].icon as IconName), h('span', {}, EQUIP_INFO[e].name), on ? h('span', { class: 'check', 'aria-hidden': 'true' }, '✓') : null);
    }));
}
