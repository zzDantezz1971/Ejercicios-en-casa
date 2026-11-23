import { registerPlugin } from '@capacitor/core';

/** Funciones propias de la app Android (android/.../KasaNativePlugin.java). En la web no existen. */
export interface KasaNative {
  /** Pide a Android el foco de audio transitorio: con pause, la música de otras apps se para un momento;
   *  si no, solo baja. */
  duck(o?: { pause?: boolean }): Promise<void>;
  /** Dice la frase con el motor de voz del móvil, pero más fuerte (amplificada). Se cumple al acabar de hablar. */
  speakLoud(o: { text: string; lang: string; rate: number; voice?: string; queue?: boolean; engine?: string; loud?: boolean }): Promise<void>;
  /** Busca un motor de voz instalado que tenga el idioma (sin cambiar el del móvil); vacío si no hay ninguno. */
  findEngine(o: { lang: string }): Promise<{ engine?: string; label?: string; voices?: Array<{ name: string; lang: string }> }>;
  /** Corta la voz amplificada (y lo que tuviera en cola). */
  stopLoud(): Promise<void>;
  /** Devuelve el foco: la música vuelve a su volumen. */
  release(): Promise<void>;
  /** Color de fondo de las barras del sistema y si sus iconos van oscuros (tema claro). */
  setBars(o: { light: boolean; color: string }): Promise<void>;
  /** ¿Está Spotify instalado? */
  musicApp(): Promise<{ spotify: boolean }>;
  /** Cierra la app de verdad: la quita también de las apps recientes. */
  closeApp(): Promise<void>;
  /** Abre Spotify o, si no está, la app de música del móvil. */
  openMusic(): Promise<{ opened: boolean }>;
  /** Abre la pantalla del móvil para instalar voces (o los ajustes de texto a voz). */
  openVoiceInstall(o?: { store?: string }): Promise<{ opened: boolean }>;
}

export const KasaNative = registerPlugin<KasaNative>('KasaNative');
