import type { WorkoutSession } from '../domain/WorkoutSession';
import { SECTION_TITLES } from '../domain/types';
import { tr } from '../i18n';
import type { Haptics } from './Haptics';
import type { Sounds } from './Sounds';
import type { Voice } from './Voice';

type VoiceLang = 'es' | 'ca' | 'en';

/** Frases que dice la voz, en cada idioma. */
const VT: Record<VoiceLang, {
  prepare: string; round: string; half: string; rest: string; secDone: string; sw: string; done: string; doneEarly: string; min: string; min1: string; kcal: string; count: string[];
}> = {
  es: { prepare: '{s}. Prepárate. Primer ejercicio: {x}', round: 'Vuelta {a} de {b}. ', half: '. A mitad, cambio de lado', rest: 'Descanso. Siguiente: {x}',
    secDone: '{a} terminado. Toca la pantalla para seguir con {b}', sw: 'Cambio de lado', done: '¡Buen trabajo{n}! Entrenamiento terminado.', doneEarly: '¡Bien hecho{n}! Entrenamiento terminado.', min: '{m} minutos', min1: 'un minuto', kcal: ' y {k} calorías quemadas',  count: ['', 'uno', 'dos', 'tres'] },
  ca: { prepare: '{s}. Prepara’t. Primer exercici: {x}', round: 'Volta {a} de {b}. ', half: '. A la meitat, canvi de costat', rest: 'Descans. Següent: {x}',
    secDone: '{a}: fet. Toca la pantalla per continuar amb {b}', sw: 'Canvi de costat', done: 'Bona feina{n}! Entrenament acabat.', doneEarly: 'Ben fet{n}! Entrenament acabat.', min: '{m} minuts', min1: 'un minut', kcal: ' i {k} calories cremades',  count: ['', 'un', 'dos', 'tres'] },
  en: { prepare: '{s}. Get ready. First exercise: {x}', round: 'Round {a} of {b}. ', half: '. Switch sides halfway', rest: 'Rest. Next up: {x}',
    secDone: '{a} done. Tap the screen to continue with {b}', sw: 'Switch sides', done: 'Great job{n}! Workout complete.', doneEarly: 'Well done{n}! Workout complete.', min: '{m} minutes', min1: 'one minute', kcal: ' and {k} calories burned',  count: ['', 'one', 'two', 'three'] },
};

function fill(t: string, v: Record<string, string | number>): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
}

/** Frase final: «¡Buen trabajo, David! Entrenamiento terminado. 24 minutos y 69 calorías quemadas.» */
export function finishPhrase(lang: VoiceLang, o: { name?: string; completed: boolean; seconds: number; kcal?: number | null }): string {
  const t = VT[lang];
  const m = Math.max(1, Math.round(o.seconds / 60));
  const mins = m === 1 ? t.min1 : fill(t.min, { m });
  const kcal = o.kcal ? fill(t.kcal, { k: o.kcal }) : '';
  return `${fill(o.completed ? t.done : t.doneEarly, { n: o.name ? `, ${o.name}` : '' })} ${mins}${kcal}.`;
}

/** Une la sesión con los pitidos y la voz: decide qué se dice y cuándo suena cada aviso. */
export class Coach {
  private off: Array<() => void> = [];

  constructor(session: WorkoutSession, sounds: Sounds, voice: Voice, haptics?: Haptics, opts: { countdown?: boolean; name?: string } = {}) {
    const L = (): VoiceLang => voice.lang;
    const T = () => VT[L()];
    // en la voz, los nombres de los apartados van en su idioma (si la voz cae al castellano, en castellano)
    const sec = (s: keyof typeof SECTION_TITLES) => (L() === 'es' ? SECTION_TITLES[s] : tr(SECTION_TITLES[s]));
    this.off.push(
      session.on('cue', (cue) => {
        switch (cue.type) {
          case 'count':
            sounds.count();
            if (opts.countdown && cue.n >= 1 && cue.n <= 3) voice.say(T().count[cue.n], true);
            break;
          case 'go':
            sounds.start();
            haptics?.start();
            break;
          case 'start':
            sounds.start();
            haptics?.start();
            break;
          case 'end':
            sounds.end();
            haptics?.end();
            break;
          case 'switch':
            sounds.switchSide();
            haptics?.switchSide();
            voice.say(T().sw);
            break;
        }
      }),
      session.on('step', ({ step }) => {
        switch (step.kind) {
          case 'countdown':
            voice.say(fill(T().prepare, { s: sec(step.section), x: step.next.name }));
            break;
          case 'exercise':
            voice.say(`${step.rounds > 1 && step.position === 1 ? fill(T().round, { a: step.round, b: step.rounds }) : ''}${step.exercise.name}${step.weight ? `, ${speakKg(step.weight, L())}` : ''}. ${speakSeconds(step.seconds, L())}${step.switchAt !== undefined ? T().half : ''}`);
            break;
          case 'rest':
            voice.say(fill(T().rest, { x: step.next.name }));
            break;
          case 'sectionBreak':
            voice.say(fill(T().secDone, { a: sec(step.finished), b: sec(step.next) }));
            break;
        }
      }),
      session.on('finished', (s) => {
        // la frase final (con minutos y calorías) la dice la pantalla de resumen: ver finishPhrase
        if (s.completed) {
          sounds.finish();
          haptics?.finish();
        }
      }),
    );
  }

  dispose(): void {
    this.off.forEach((f) => f());
    this.off = [];
  }
}

/** 8 -> "8 kilos"; 7.5 -> "7 kilos y medio" (en el idioma de la voz). */
export function speakKg(w: number, lang: VoiceLang = 'es'): string {
  const whole = Math.floor(w);
  const half = w - whole >= 0.5;
  const W = {
    es: { half0: 'medio kilo', one: 'un kilo', many: (n: number) => `${n} kilos`, andHalf: (b: string) => `${b} y medio` },
    ca: { half0: 'mig quilo', one: 'un quilo', many: (n: number) => `${n} quilos`, andHalf: (b: string) => `${b} i mig` },
    en: { half0: 'half a kilo', one: 'one kilo', many: (n: number) => `${n} kilos`, andHalf: (_b: string) => `${whole} and a half kilos` },
  }[lang];
  if (whole === 0) return W.half0;
  const base = whole === 1 ? W.one : W.many(whole);
  return half ? W.andHalf(base) : base;
}

function speakSeconds(s: number, lang: VoiceLang = 'es'): string {
  const W = {
    es: { sec: 'segundos', min1: 'un minuto', mins: 'minutos', and: 'y' },
    ca: { sec: 'segons', min1: 'un minut', mins: 'minuts', and: 'i' },
    en: { sec: 'seconds', min1: 'one minute', mins: 'minutes', and: 'and' },
  }[lang];
  if (s < 60) return `${s} ${W.sec}`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const min = m === 1 ? W.min1 : `${m} ${W.mins}`;
  return r ? `${min} ${W.and} ${r} ${W.sec}` : min;
}
