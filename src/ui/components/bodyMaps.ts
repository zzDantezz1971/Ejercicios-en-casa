import { Thumbnails } from '../../figure/FigureView';

let maps: Thumbnails | null = null;
/** Dibujante propio (vertical) para los mapas de músculos. */
export function bodyMaps(): Thumbnails {
  return (maps ??= new Thumbnails(undefined, 220, 330));
}
