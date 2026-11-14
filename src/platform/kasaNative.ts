import { registerPlugin } from '@capacitor/core';

/** Funciones propias de la app Android (android/.../KasaNativePlugin.java). En la web no existen. */
export interface KasaNative {
  /** Pide a Android que baje la música de otras apps (foco de audio transitorio). */
  duck(): Promise<void>;
  /** Devuelve el foco: la música vuelve a su volumen. */
  release(): Promise<void>;
  /** Color de fondo de las barras del sistema y si sus iconos van oscuros (tema claro). */
  setBars(o: { light: boolean; color: string }): Promise<void>;
  /** ¿Está Spotify instalado? */
  musicApp(): Promise<{ spotify: boolean }>;
  /** Abre Spotify o, si no está, la app de música del móvil. */
  openMusic(): Promise<{ opened: boolean }>;
}

export const KasaNative = registerPlugin<KasaNative>('KasaNative');
