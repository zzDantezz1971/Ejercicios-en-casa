import { duckFor } from './MusicDuck';

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
  /** Fanfarria final: arpegio que sube, un pequeño redoble y un acorde mayor que se mantiene y se apaga. */
  finish(): void {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.16, i * 0.13, 'triangle', 0.4));
    [1046, 1046].forEach((f, i) => this.tone(f, 0.1, 0.42 + i * 0.1, 'triangle', 0.35));
    // acorde final (do mayor con la octava), con un brillo suave por encima
    [523, 659, 784, 1046].forEach((f) => this.tone(f, 1.5, 0.66, 'triangle', 0.22));
    this.tone(1568, 1.2, 0.7, 'sine', 0.1);
    this.tone(2093, 0.9, 0.74, 'sine', 0.06);
  }

  private tone(freq: number, dur: number, delay = 0, type: OscillatorType = 'sine', peak = 0.5): void {
    if (!this.enabled || !this.ctx) return;
    // la música de otras apps baja mientras suena el pitido
    duckFor((delay + dur) * 1000);
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}
