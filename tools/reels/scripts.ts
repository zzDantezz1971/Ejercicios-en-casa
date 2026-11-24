/** Guiones de los reels: cada clip, un ejercicio del muñeco con su texto. ms = duración del clip. */
/** name: el nombre que se enseña del ejercicio (si no, el del catálogo en catalán). */
export interface Clip { ex: string; name?: string; ms: number; l1: string; l2?: string; start?: number; span?: number; az?: number }
/** poster: la frase motivadora del cuadro de la habitación (líneas separadas por «|»; la última, en azul). */
export interface Reel { clips: Clip[]; endMs: number; poster?: string }

export const REELS: Record<string, Reel> = {
  // Reel 1 · Presentació
  presentacio: {
    poster: 'Cada dia,|una mica|més',
    clips: [
      { ex: 'saltos-de-tijera-jumping-jacks', ms: 3200, l1: 'Entrena a casa', l2: 'en català' },
      { ex: 'sentadillas-sin-peso', ms: 3200, l1: '+200 exercicis', l2: 'explicats pas a pas' },
      { ex: 'curl-de-biceps', ms: 3200, l1: 'Amb o sense material', l2: 'manuelles, banda, fitball…' },
      { ex: 'gato-camello', ms: 3200, l1: 'Avisos per veu', l2: 'i sense anuncis' },
    ],
    endMs: 2600,
  },
};
