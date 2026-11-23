import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { LANG, type Lang } from '../i18n';
import { IS_NATIVE } from '../platform/native';
import { KasaNative, type EngineStatus } from '../platform/kasaNative';
import { duckWhile, loudVoice, stopSpeechDuck } from './MusicDuck';

const CODE: Record<Lang, string> = { ca: 'ca', es: 'es', en: 'en', gl: 'gl', eu: 'eu' };
/** Código de cada idioma para el motor de voz. */
export const VOICE_CODE: Record<Lang, string> = { ca: 'ca-ES', es: 'es-ES', en: 'en-GB', gl: 'gl-ES', eu: 'eu-ES' };

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

/**
 * Voces del motor de Android para el idioma. Ojo: el complemento pone en «name» solo el idioma («español España»,
 * igual en todas las voces); el nombre de verdad (es-es-x-eea-local…) viene en voiceURI, y con él se distinguen.
 */
export function nativeVoiceList(voices: ReadonlyArray<{ voiceURI?: string; name: string; lang: string }>, l: Lang): Array<{ id: string; name: string }> {
  return pickFew(voices.filter((v) => forLang(v.lang, l)).map((v) => ({ id: v.voiceURI || v.name, name: v.voiceURI || v.name, lang: v.lang })));
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
  /** App Android: nombre de esa voz (para la voz amplificada, que la busca por nombre). */
  private nativeName: string | undefined;
  /**
   * App Android: otro motor de voz para el idioma de la app, cuando el del móvil no lo tiene (p. ej., gallego o
   * euskera, que Google no tiene). Se usa solo para los avisos de Kasa Fit; el motor del móvil no se cambia.
   */
  engine: { id: string; label: string; voices: Array<{ name: string; lang: string }> } | null = null;
  /** Web: todas las voces del navegador para el idioma. */
  private webVoices: SpeechSynthesisVoice[] = [];
  /**
   * Web: se cumple cuando el navegador ya ha dado su lista de voces (o a los 3 s). En Chrome para Android la lista
   * llega tarde (y más después de cambiar el motor de voz del móvil): si se pide antes, sale vacía.
   */
  private webLoaded: Promise<void> = Promise.resolve();

  constructor() {
    if (IS_NATIVE) {
      void this.pickNative();
      // al volver de instalar una voz en los ajustes del móvil, se vuelve a mirar si ya está
      document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible') void this.pickNative(); });
      return;
    }
    if (!this.synth) return;
    let loaded = () => {};
    this.webLoaded = new Promise<void>((res) => { loaded = res; setTimeout(res, 3000); });
    const pick = () => {
      const voices = this.synth!.getVoices();
      if (voices.length) loaded();
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

  /** Web: todas las voces que da el navegador (para la línea de detalles de Ajustes). */
  webAll(): Array<{ name: string; lang: string; local: boolean }> {
    return this.synth ? this.synth.getVoices().map((v) => ({ name: v.name, lang: v.lang, local: v.localService })) : [];
  }

  /** Lo que ha contestado cada motor de voz del móvil (para la línea de detalles de Ajustes). */
  report: EngineStatus[] = [];

  /**
   * App Android: ¿quién dice los avisos? El motor del móvil si tiene una voz de verdad para el idioma; si no, otro
   * motor instalado que la tenga (p. ej., AhoTTS para gallego o euskera); si ninguno, en castellano.
   * Ojo: Google contesta que «tiene» idiomas que solo puede descargar o usar por internet (y luego lee con su voz
   * castellana), así que no basta con su lista de idiomas: hace falta una voz instalada.
   */
  private async pickNative(): Promise<void> {
    const want = VOICE_CODE[LANG];
    const st = await KasaNative.voiceStatus({ lang: want }).catch(() => null);
    if (st && st.engines.length) {
      this.report = st.engines;
      const def = st.engines.find((e) => e.isDefault) ?? st.engines.find((e) => e.engine === st.default);
      const pick = chooseEngine(st.engines, def?.engine);
      if (pick === 'default') {
        this.engine = null;
        this.nativeLang = want;
        this.lang = LANG;
      } else if (pick) {
        this.engine = { id: pick.engine, label: pick.label, voices: (pick.voices ?? []).filter((v) => v.installed) };
        this.nativeLang = pick.locale || want;
        this.lang = LANG;
      } else {
        this.engine = null;
        this.nativeLang = 'es-ES';
        this.lang = 'es';
      }
      if (this.chosenId) void this.useVoice(this.chosenId);
      return;
    }
    // sin la función nueva (o sin respuesta): como antes, con la lista de idiomas del motor del móvil
    try {
      const { languages } = await TextToSpeech.getSupportedLanguages();
      const has = (code: string) => languages.some((l) => l.replace('_', '-').toLowerCase() === code.toLowerCase() || l.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
      this.engine = null;
      this.nativeLang = !languages.length || has(want) ? want : 'es-ES';
      this.lang = this.nativeLang === want ? LANG : 'es';
    } catch {
      this.nativeLang = want;
    }
  }

  /** Voces del móvil (o del navegador) para el idioma en que habla la app: identificador y nombre. */
  async voices(): Promise<Array<{ id: string; name: string }>> {
    if (IS_NATIVE) {
      if (this.engine) return pickFew(this.engine.voices.map((v) => ({ id: v.name, name: v.name, lang: v.lang })));
      try {
        const { voices } = await TextToSpeech.getSupportedVoices();
        return nativeVoiceList(voices, this.lang);
      } catch {
        return [];
      }
    }
    await this.webLoaded;
    return pickFew(this.webVoices.map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang })));
  }

  /** Usa esta voz para los avisos (vacío = la de siempre del sistema). */
  async useVoice(id: string | undefined): Promise<void> {
    this.chosenId = id ?? '';
    if (IS_NATIVE) {
      this.nativeIndex = undefined;
      this.nativeName = undefined;
      if (!this.chosenId) return;
      if (this.engine) {
        this.nativeName = this.engine.voices.some((v) => v.name === this.chosenId) ? this.chosenId : undefined;
        return;
      }
      try {
        const { voices } = await TextToSpeech.getSupportedVoices();
        const i = voices.findIndex((v) => (v.voiceURI || v.name) === this.chosenId);
        // una voz elegida en otro idioma (p. ej., la catalana al pasar la app a castellano) no se usa:
        // si no, leería el texto en castellano con acento catalán
        this.nativeIndex = i >= 0 && forLang(voices[i].lang, this.lang) ? i : undefined;
        this.nativeName = this.nativeIndex !== undefined ? this.chosenId : undefined;
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

  /** ¿Falta la voz del idioma de la app (y por eso los avisos se dicen en castellano)? */
  get missingOwn(): boolean {
    return this.lang !== LANG;
  }

  get available(): boolean {
    return IS_NATIVE || !!this.synth;
  }

  /** Dice el texto; corta lo que estuviera diciendo antes (o lo pone a la cola con queue). */
  say(text: string, queue = false): void {
    if (!this.enabled) return;
    text = speakable(text);
    if (IS_NATIVE) {
      // la música de otras apps se pausa o baja mientras habla (la promesa se cumple al acabar la frase)
      const lang = this.nativeLang || 'es-ES';
      const rate = queue ? 1.15 : 1.02;
      if (this.engine) {
        // otro motor de voz: siempre por el camino propio (el del complemento usa el motor del móvil)
        const speech = KasaNative.speakLoud({ text, lang, rate, queue, engine: this.engine.id, loud: loudVoice(), ...(this.nativeName ? { voice: this.nativeName } : {}) });
        void duckWhile(speech).catch(() => undefined);
        return;
      }
      const plain = () => TextToSpeech.speak({ text, lang, rate, queueStrategy: queue ? 1 : 0, ...(this.nativeIndex !== undefined ? { voice: this.nativeIndex } : {}) });
      // con la música bajada (no pausada), la voz va amplificada; si eso falla, la normal
      const speech = loudVoice()
        ? KasaNative.speakLoud({ text, lang, rate, queue, ...(this.nativeName ? { voice: this.nativeName } : {}) }).catch(plain)
        : plain();
      void duckWhile(speech).catch(() => undefined);
      return;
    }
    if (!this.synth) return;
    if (!queue) this.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.voice?.lang ?? VOICE_CODE[this.lang];
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
      void KasaNative.stopLoud().catch(() => undefined);
      stopSpeechDuck();
      return;
    }
    this.synth?.cancel();
  }
}

/** ¿El motor tiene de verdad el idioma? Lo dice que sí y, si da la lista de voces, alguna está instalada en el móvil. */
export function engineHas(e: EngineStatus): boolean {
  if (e.avail < 0) return false;
  const v = e.voices ?? [];
  return v.length === 0 || v.some((x) => x.installed);
}

/** 'default' = el motor del móvil; un motor = ese otro; null = ninguno tiene el idioma (se habla en castellano). */
export function chooseEngine(engines: EngineStatus[], defEngine: string | undefined): EngineStatus | 'default' | null {
  const def = engines.find((e) => e.engine === defEngine);
  if (def && engineHas(def)) return 'default';
  return engines.find((e) => e.engine !== defEngine && engineHas(e)) ?? (def ? null : 'default');
}

/**
 * El texto tal como se manda al motor de voz. Los dos puntos van como una coma: algunos motores (AhoTTS) dejan de
 * leer al llegar a «:» («Seguinte: curl de bíceps» se quedaba en «Seguinte»); con la coma la pausa suena igual.
 */
export function speakable(text: string): string {
  return text.replace(/\s*:(?=\s|$)/g, ',');
}
