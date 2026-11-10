import { MUSCLE_NAMES, MUSCLES } from '../../figure/anatomy';
import { totalLoad, type muscleLoad } from '../../domain/muscleLoad';
import { h } from '../dom';

type Load = ReturnType<typeof muscleLoad>;

/** Líneas bajo el mapa de músculos (resúmenes): más y menos trabajados (fuerza y estiramientos cuentan igual). */
export function muscleLines(load: Load): HTMLElement[] {
  const lines: HTMLElement[] = [];
  const block = (t: Record<string, number>, kind: 'work' | 'stretch', more: string, less: string) => {
    const top = MUSCLES.filter((m) => t[m] > 0).sort((a, b) => t[b] - t[a]).slice(0, 5);
    if (!top.length) return;
    const shown = new Set<string>(top);
    // los 3 trabajados con menos tiempo (los que no se han hecho nada no cuentan), sin repetir los de arriba
    const low = MUSCLES.filter((m) => !shown.has(m) && t[m] > 0).sort((a, b) => t[a] - t[b]).slice(0, 3);
    const line = (cls: string, label: string, list: readonly string[]) =>
      h('p', { class: 'mm-line' + cls }, h('span', { class: 'mu-dot ' + kind }), h('strong', {}, label), h('span', { class: 'mm-list' }, list.map((m) => MUSCLE_NAMES[m as keyof typeof MUSCLE_NAMES]).join(', ')));
    lines.push(line('', more, top));
    if (low.length) lines.push(line(' less', less, low));
  };
  block(totalLoad(load), 'work', 'Más trabajados: ', 'Menos trabajados: ');
  return lines;
}
