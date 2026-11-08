import { KeepAwake } from '@capacitor-community/keep-awake';
import { IS_NATIVE } from '../platform/native';

/** Mantiene la pantalla encendida durante el entrenamiento (Screen Wake Lock API). */
export class ScreenAwake {
  private lock: WakeLockSentinel | null = null;
  private wanted = false;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (this.wanted && document.visibilityState === 'visible') void this.acquire();
    });
  }

  async enable(): Promise<void> {
    this.wanted = true;
    if (IS_NATIVE) return void (await KeepAwake.keepAwake().catch(() => undefined));
    await this.acquire();
  }

  async disable(): Promise<void> {
    this.wanted = false;
    if (IS_NATIVE) return void (await KeepAwake.allowSleep().catch(() => undefined));
    try {
      await this.lock?.release();
    } catch {
      /* ya liberado */
    }
    this.lock = null;
  }

  private async acquire(): Promise<void> {
    if (IS_NATIVE || !('wakeLock' in navigator) || this.lock) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => (this.lock = null));
    } catch {
      /* el sistema lo ha denegado (batería baja, etc.) */
    }
  }
}
