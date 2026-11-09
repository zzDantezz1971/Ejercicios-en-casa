import { MUSCLE_NAMES, MUSCLES } from '../../figure/anatomy';
import type { muscleLoad } from '../../domain/muscleLoad';
import { h } from '../dom';

type Load = ReturnType<typeof muscleLoad>;

const minutes = (s: number) => (s >= 60 ? `${Math.round(s / 60)} min` : s > 0 ? `${Math.round(s)} s` : '0 min');

/** Líneas bajo el mapa de músculos (Historial y resúmenes): más y menos trabajados, más y menos estirados. */
export function muscleLines(load: Load): HTMLElement[] {
  const lines: HTMLElement[] = [];
  const block = (t: Record<string, number>, kind: 'work' | 'stretch', more: string, less: string) => {
    const top = MUSCLES.filter((m) => t[m] > 0).sort((a, b) => t[b] - t[a]).slice(0, 5);
    if (!top.length) return;
    const shown = new Set<string>(top);
    // los 3 con menos tiempo (también los que no se han hecho nada), sin repetir los de arriba
    const low = MUSCLES.filter((m) => !shown.has(m)).sort((a, b) => t[a] - t[b]).slice(0, 3);
    const line = (cls: string, label: string, list: readonly string[]) =>
      h('p', { class: 'mm-line' + cls }, h('span', { class: 'mu-dot ' + kind }), h('strong', {}, label), list.map((m) => `${MUSCLE_NAMES[m as keyof typeof MUSCLE_NAMES]} (${minutes(t[m])})`).join(', '));
    lines.push(line('', more, top));
    if (low.length) lines.push(line(' less', less, low));
  };
  block(load.work, 'work', 'Más trabajados: ', 'Menos trabajados: ');
  block(load.stretch, 'stretch', 'Más estirados: ', 'Menos estirados: ');
  return lines;
}
