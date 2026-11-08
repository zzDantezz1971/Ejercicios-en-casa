import { Preferences } from '@capacitor/preferences';
import { IS_NATIVE } from './native';

/* En la app Android los datos se guardan también en el almacenamiento propio de la app
   (Preferences = SharedPreferences de Android). Así no dependen de Chrome ni del WebView,
   y entran en la copia automática de Android (se restauran al reinstalar o cambiar de móvil).
   La app sigue leyendo de localStorage (rápido y síncrono); aquí se mantiene la copia duradera. */

// Misma clave que STORAGE_KEY del Store (no se importa: este módulo se carga antes que el idioma).
const KEYS = ['ejercicios-en-casa'];

/** Al arrancar: lo guardado en la app manda; se copia a localStorage antes de cargar nada. */
export async function restoreDurable(): Promise<void> {
  if (!IS_NATIVE) return;
  for (const key of KEYS) {
    try {
      const { value } = await Preferences.get({ key });
      if (value != null) localStorage.setItem(key, value);
      else {
        const local = localStorage.getItem(key);
        if (local != null) await Preferences.set({ key, value: local });
      }
    } catch {
      /* sin almacenamiento nativo: se sigue con localStorage */
    }
  }
}

let pending: Promise<unknown> = Promise.resolve();

/** Espera a que la copia duradera esté escrita (antes de recargar la app). */
export async function flushDurable(): Promise<void> {
  await pending.catch(() => undefined);
}

/** Almacenamiento para el Store: localStorage y, en la app, también la copia duradera. */
export function durableStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void } | null {
  let ls: Storage | null = null;
  try {
    ls = window.localStorage;
  } catch {
    ls = null;
  }
  if (!IS_NATIVE) return ls;
  return {
    getItem: (k) => ls?.getItem(k) ?? null,
    setItem: (k, v) => {
      try {
        ls?.setItem(k, v);
      } catch {
        /* lleno o bloqueado: queda la copia duradera */
      }
      pending = Preferences.set({ key: k, value: v });
    },
  };
}
