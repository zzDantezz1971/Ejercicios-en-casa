import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { LANG, type Lang } from '../i18n';
import { IS_NATIVE } from '../platform/native';

const CODE: Record<Lang, string> = { ca: 'ca', es: 'es', en: 'en' };

/** Avisos por voz con la síntesis de voz del móvil, en el idioma de la app si el móvil tiene esa voz (si no, en castellano). */
export class Voice {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  /** Idioma en que habla de verdad (el de la app o, si no hay voz para él, castellano). */
  lang: Lang = LANG;
  private readonly synth: SpeechSynthesis | null = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  /** Idioma de la voz del motor de Android (app nativa). */
  private nativeLang = '';

  constructor() {
    if (IS_NATIVE) {
      void this.pickNative();
      return;
    }
    if (!this.synth) return;
    const pick = () => {
      const voices = this.synth!.getVoices();
      const find = (l: Lang) => voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(CODE[l] + '-') || v.lang.toLowerCase() === CODE[l]);
      const own = find(LANG);
      const es = voices.find((v) => v.lang === 'es-ES') ?? find('es');
      this.voice = own ?? es ?? null;
      this.lang = own || !voices.length ? LANG : 'es';
    };
    pick();
    this.synth.addEventListener?.('voiceschanged', pick);
  }

  /** En la app Android se usa el motor de voz del sistema (el WebView no tiene síntesis de voz). */
  private async pickNative(): Promise<void> {
    const want = ({ ca: 'ca-ES', es: 'es-ES', en: 'en-GB' } as const)[LANG];
    try {
      const { languages } = await TextToSpeech.getSupportedLanguages();
      const has = (code: string) => languages.some((l) => l.replace('_', '-').toLowerCase() === code.toLowerCase() || l.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
      if (!languages.length || has(want)) {
        this.nativeLang = want;
        this.lang = LANG;
      } else {
        this.nativeLang = 'es-ES';
        this.lang = 'es';
      }
    } catch {
      this.nativeLang = want;
    }
  }

  get available(): boolean {
    return IS_NATIVE || !!this.synth;
  }

  /** Dice el texto; corta lo que estuviera diciendo antes (o lo pone a la cola con queue). */
  say(text: string, queue = false): void {
    if (!this.enabled) return;
    if (IS_NATIVE) {
      void TextToSpeech.speak({ text, lang: this.nativeLang || 'es-ES', rate: queue ? 1.15 : 1.02, queueStrategy: queue ? 1 : 0 }).catch(() => undefined);
      return;
    }
    if (!this.synth) return;
    if (!queue) this.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.voice?.lang ?? ({ ca: 'ca-ES', es: 'es-ES', en: 'en-GB' } as const)[this.lang];
    if (this.voice) u.voice = this.voice;
    u.rate = queue ? 1.15 : 1.02;
    this.synth.speak(u);
  }

  /** Algunos navegadores solo hablan si la primera frase sale de un toque del usuario. */
  unlock(): void {
    if (IS_NATIVE || !this.synth) return;
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    this.synth.speak(u);
  }

  stop(): void {
    if (IS_NATIVE) {
      void TextToSpeech.stop().catch(() => undefined);
      return;
    }
    this.synth?.cancel();
  }
}
