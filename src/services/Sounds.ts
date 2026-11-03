/** Pitidos generados con Web Audio (no hacen falta archivos de sonido). */
export class Sounds {
  private ctx: AudioContext | null = null;
  enabled = true;

  /** Debe llamarse desde un toque del usuario para que el navegador permita el sonido. */
  unlock(): void {
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  count(): void {
    this.tone(880, 0.12);
  }
  start(): void {
    this.tone(1320, 0.35);
  }
  end(): void {
    this.tone(1046, 0.15);
    this.tone(1568, 0.3, 0.17);
  }
  switchSide(): void {
    [0, 0.16, 0.32].forEach((d) => this.tone(1175, 0.11, d));
  }
  finish(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, i * 0.18));
  }

  private tone(freq: number, dur: number, delay = 0): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}
