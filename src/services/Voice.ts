/** Avisos por voz en castellano con la síntesis de voz del móvil. */
export class Voice {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  private readonly synth: SpeechSynthesis | null = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  constructor() {
    if (!this.synth) return;
    const pick = () => {
      const voices = this.synth!.getVoices();
      this.voice = voices.find((v) => v.lang === 'es-ES') ?? voices.find((v) => v.lang.startsWith('es')) ?? null;
    };
    pick();
    this.synth.addEventListener?.('voiceschanged', pick);
  }

  get available(): boolean {
    return !!this.synth;
  }

  /** Dice el texto; corta lo que estuviera diciendo antes (o lo pone a la cola con queue). */
  say(text: string, queue = false): void {
    if (!this.enabled || !this.synth) return;
    if (!queue) this.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    if (this.voice) u.voice = this.voice;
    u.rate = queue ? 1.15 : 1.02;
    this.synth.speak(u);
  }

  /** Algunos navegadores solo hablan si la primera frase sale de un toque del usuario. */
  unlock(): void {
    if (!this.synth) return;
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    this.synth.speak(u);
  }

  stop(): void {
    this.synth?.cancel();
  }
}
