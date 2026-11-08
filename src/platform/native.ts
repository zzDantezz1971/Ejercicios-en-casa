import { Capacitor } from '@capacitor/core';

/** true dentro de la app Android (Capacitor); false en el navegador. */
export const IS_NATIVE: boolean = Capacitor.isNativePlatform();
