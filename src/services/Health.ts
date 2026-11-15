import { registerPlugin } from '@capacitor/core';
import { healthWorkout, type HealthWorkout } from '../domain/healthExport';
import type { HistoryEntry } from '../domain/types';
import { IS_NATIVE } from '../platform/native';

/*
 * Health Connect (solo en la app de Android): guardar los entrenamientos y el peso para que salgan en
 * Samsung Health, Google Fit, Fitbit... La parte nativa está en android/.../KasaHealthPlugin.kt.
 */

export type HealthStatus = 'available' | 'install' | 'unsupported';

interface KasaHealth {
  status(): Promise<{ status: HealthStatus; granted: boolean }>;
  request(): Promise<{ status: HealthStatus; granted: boolean }>;
  install(): Promise<void>;
  writeWorkout(w: HealthWorkout): Promise<{ written: number }>;
  writeWeight(o: { kg: number; date: string }): Promise<{ written: number }>;
}

const native = IS_NATIVE ? registerPlugin<KasaHealth>('KasaHealth') : null;

/** Solo para ver la tarjeta en la web mientras se desarrolla (localStorage «vista-previa-health» = available | install). */
function preview(): HealthStatus | null {
  if (IS_NATIVE) return null;
  try {
    const v = localStorage.getItem('vista-previa-health');
    return v === 'available' || v === 'install' ? v : null;
  } catch {
    return null;
  }
}
let previewGranted = false;

/** ¿Lo tiene el móvil, hay que instalarlo o no se puede? Y si Kasa Fit tiene permiso. */
export async function healthStatus(): Promise<{ status: HealthStatus; granted: boolean }> {
  const pv = preview();
  if (pv) return { status: pv, granted: pv === 'available' && previewGranted };
  if (!native) return { status: 'unsupported', granted: false };
  try {
    return await native.status();
  } catch {
    return { status: 'unsupported', granted: false };
  }
}

/** Pantalla del sistema para dar permiso. */
export async function requestHealth(): Promise<{ status: HealthStatus; granted: boolean }> {
  if (preview()) { previewGranted = true; return healthStatus(); }
  if (!native) return { status: 'unsupported', granted: false };
  try {
    return await native.request();
  } catch {
    return healthStatus();
  }
}

/** Abre Health Connect en Play Store. */
export function installHealth(): void {
  void native?.install().catch(() => {});
}

/** Guarda un entrenamiento (sin avisar si falla: no debe molestar al acabar de entrenar). */
export function exportWorkout(e: HistoryEntry): void {
  const w = native && healthWorkout(e);
  if (w) void native!.writeWorkout(w).catch(() => {});
}

export function exportWeight(kg: number, date: string): void {
  if (native && kg > 0) void native.writeWeight({ kg, date }).catch(() => {});
}
