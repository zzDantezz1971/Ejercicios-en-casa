import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { LANG, type Lang } from '../i18n';
import { IS_NATIVE } from '../platform/native';
import { duckWhile, stopSpeechDuck } from './MusicDuck';

const CODE: Record<Lang, string> = { ca: 'ca', es: 'es', en: 'en' };

/** Como mucho, tantas voces por idioma en la lista para elegir. */
const MAX_VOICES = 3;

/**
 * Pocas voces y distintas: Android repite cada voz «-local» (sin conexión) y «-network» (por internet), y en inglés
 * hay decenas de países. Se queda con una de cada (la «-local», que funciona sin conexión), en inglés las británicas
 * si las hay, y como mucho MAX_VOICES.
 */
export function pickFew(voices: Array<{ id: string; name: string; lang: string }>): Array<{ id: string; name: string }> {
  const gb = voices.filter((v) => /^en[-_]gb$/i.test(v.lang));
  const pool = gb.length ? gb : voices;
  const base = (n: string) => n.toLowerCase().replace(/[-_](local|network)$/, '');
  const seen = new Map<string, { id: string; name: string }>();
  for (const v of pool) {
    const k = base(v.name);
    if (!seen.has(k) || /local$/i.test(v.name)) seen.set(k, { id: v.id, name: v.name });
  }
  return [...seen.values()].slice(0, MAX_VOICES);
}

/** ¿Esta voz sirve para el idioma? En castellano, solo la de España (no las de Latinoamérica). */
function forLang(voiceLang: string, l: Lang): boolean {
  const v = voiceLang.replace('_', '-').toLowerCase();
  if (l === 'es') return v === 'es-es' || v === 'es';
  return v === CODE[l] || v.startsWith(CODE[l] + '-');
}

/** Avisos por voz con la síntesis de voz del móvil, en el idioma de la app si el móvil tiene esa voz (si no, en castellano). */
export class Voice {
  enabled = true;
  private voice: SpeechSynthesisVoice | null = null;
  /** Idioma en que habla de verdad (el de la app o, si no hay voz para él, castellano). */
  lang: Lang = LANG;
  private readonly synth: SpeechSynthesis | null = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

  /** Idioma de la voz del motor de Android (app nativa). */
  private nativeLang = '';
  /** Voz elegida en Ajustes (identificador); vacía = la de siempre del sistema. */
  private chosenId = '';
  /** App Android: posición de la voz elegida en la lista del motor de voz. */
  private nativeIndex: number | undefined;
  /** Web: todas las voces del navegador para el idioma. */
  private webVoices: SpeechSynthesisVoice[] = [];

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
      this.lang = own || !voices.length ? LANG : 'es';
      this.webVoices = voices.filter((v) => forLang(v.lang, this.lang));
      this.voice = this.webVoices.find((v) => v.voiceURI === this.chosenId) ?? own ?? es ?? null;
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

  /** Voces del móvil (o del navegador) para el idioma en que habla la app: identificador y nombre. */
  async voices(): Promise<Array<{ id: string; name: string }>> {
    if (IS_NATIVE) {
      try {
        const { voices } = await TextToSpeech.getSupportedVoices();
        return pickFew(voices.filter((v) => forLang(v.lang, this.lang)).map((v) => ({ id: v.voiceURI || v.name, name: v.name, lang: v.lang })));
      } catch {
        return [];
      }
    }
    return pickFew(this.webVoices.map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang })));
  }

  /** Usa esta voz para los avisos (vacío = la de siempre del sistema). */
  async useVoice(id: string | undefined): Promise<void> {
    this.chosenId = id ?? '';
    if (IS_NATIVE) {
      this.nativeIndex = undefined;
      if (!this.chosenId) return;
      try {
        const { voices } = await TextToSpeech.getSupportedVoices();
        const i = voices.findIndex((v) => (v.voiceURI || v.name) === this.chosenId);
        this.nativeIndex = i >= 0 ? i : undefined;
      } catch { /* sin lista de voces: la de siempre */ }
      return;
    }
    this.voice = this.webVoices.find((v) => v.voiceURI === this.chosenId) ?? this.webVoices[0] ?? this.voice;
  }

  /** Dice una frase de prueba con una voz concreta (sin cambiar la elegida). */
  async preview(id: string | undefined, text: string): Promise<void> {
    const keep = this.chosenId;
    await this.useVoice(id);
    const was = this.enabled;
    this.enabled = true;
    this.say(text);
    this.enabled = was;
    await this.useVoice(keep || undefined);
  }

  get available(): boolean {
    return IS_NATIVE || !!this.synth;
  }

  /** Dice el texto; corta lo que estuviera diciendo antes (o lo pone a la cola con queue). */
  say(text: string, queue = false): void {
    if (!this.enabled) return;
    if (IS_NATIVE) {
      // la música de otras apps baja mientras habla (la promesa se cumple al acabar la frase)
      void duckWhile(TextToSpeech.speak({ text, lang: this.nativeLang || 'es-ES', rate: queue ? 1.15 : 1.02, queueStrategy: queue ? 1 : 0, ...(this.nativeIndex !== undefined ? { voice: this.nativeIndex } : {}) })).catch(() => undefined);
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
      stopSpeechDuck();
      return;
    }
    this.synth?.cancel();
  }
}
