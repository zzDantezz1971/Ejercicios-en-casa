/** Vibraciones cortas del móvil para acompañar los avisos (Android las admite; si no, no hace nada). */
export class Haptics {
  enabled = true;

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* no disponible */
    }
  }

  tap(): void {
    this.vibrate(12);
  }
  start(): void {
    this.vibrate(180);
  }
  end(): void {
    this.vibrate([80, 60, 80]);
  }
  switchSide(): void {
    this.vibrate([60, 50, 60, 50, 60]);
  }
  finish(): void {
    this.vibrate([120, 80, 120, 80, 260]);
  }
}
