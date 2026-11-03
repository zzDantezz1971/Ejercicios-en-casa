import { h } from '../dom';
import { icon } from '../icons';

export interface SortableRow {
  /** Contenido de la fila (miniatura, nombre...). */
  content: HTMLElement;
  /** Etiqueta para los botones de accesibilidad. */
  label: string;
}

/**
 * Lista ordenable: cada fila tiene flechas ↑ ↓ y un asa ≡ para arrastrar con el dedo.
 * Al soltar (o al pulsar una flecha) avisa con `onMove(desde, hasta)`; quien la usa guarda el
 * nuevo orden y vuelve a pintar la lista.
 */
export function sortableList(rows: SortableRow[], onMove: (from: number, to: number) => void): HTMLElement {
  const list = h('ol', { class: 'sortable' });
  rows.forEach((r, i) => {
    const handle = h('span', { class: 'drag-handle', 'aria-hidden': 'true' }, icon('tables'));
    const li = h('li', { class: 'sort-row' },
      h('div', { class: 'sort-content' }, r.content),
      h('div', { class: 'sort-arrows' },
        h('button', { class: 'arrow-btn', 'aria-label': `Subir ${r.label}`, disabled: i === 0, onclick: () => onMove(i, i - 1) }, icon('back', 'ico up')),
        h('button', { class: 'arrow-btn', 'aria-label': `Bajar ${r.label}`, disabled: i === rows.length - 1, onclick: () => onMove(i, i + 1) }, icon('back', 'ico down'))),
      handle);
    li.dataset.index = String(i);
    attachDrag(list, li, handle, onMove);
    list.append(li);
  });
  return list;
}

function attachDrag(list: HTMLElement, li: HTMLElement, handle: HTMLElement, commit: (from: number, to: number) => void): void {
  let startY = 0, startTop = 0, from = 0, pointerId = -1;
  let raf = 0, lastY = 0;

  const autoscroll = () => {
    const edge = 90, vh = window.innerHeight;
    let dy = 0;
    if (lastY < edge) dy = -Math.ceil((edge - lastY) / 6);
    else if (lastY > vh - edge - 80) dy = Math.ceil((lastY - (vh - edge - 80)) / 6);
    if (dy) {
      window.scrollBy(0, dy);
      reposition(lastY);
    }
    raf = requestAnimationFrame(autoscroll);
  };

  const reposition = (clientY: number) => {
    // intercambia con la fila vecina al pasar su mitad
    let prev = li.previousElementSibling as HTMLElement | null;
    while (prev && clientY < prev.getBoundingClientRect().top + prev.offsetHeight / 2) {
      list.insertBefore(li, prev);
      prev = li.previousElementSibling as HTMLElement | null;
    }
    let next = li.nextElementSibling as HTMLElement | null;
    while (next && clientY > next.getBoundingClientRect().top + next.offsetHeight / 2) {
      list.insertBefore(next, li);
      next = li.nextElementSibling as HTMLElement | null;
    }
    const slotTop = li.getBoundingClientRect().top - parseFloat(li.style.getPropertyValue('--dy') || '0');
    li.style.setProperty('--dy', `${clientY - startY - (slotTop - startTop)}px`);
  };

  // Al mover la fila en la lista el navegador suelta la "captura" del dedo,
  // así que durante el arrastre se escucha en toda la ventana.
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    e.preventDefault();
    lastY = e.clientY;
    reposition(e.clientY);
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = -1;
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    li.classList.remove('dragging');
    list.classList.remove('is-sorting');
    li.style.removeProperty('--dy');
    const to = [...list.children].indexOf(li);
    if (to !== from) commit(from, to);
  };
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointerId = e.pointerId;
    from = [...list.children].indexOf(li);
    startY = lastY = e.clientY;
    startTop = li.getBoundingClientRect().top;
    li.style.setProperty('--dy', '0px');
    li.classList.add('dragging');
    list.classList.add('is-sorting');
    navigator.vibrate?.(10);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    raf = requestAnimationFrame(autoscroll);
  });
}
