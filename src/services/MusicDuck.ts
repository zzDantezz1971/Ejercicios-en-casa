import { IS_NATIVE } from '../platform/native';
import { KasaNative } from '../platform/kasaNative';
import type { MusicMode } from '../domain/types';

/*
 * Pausar o bajar la música de otras apps (Spotify, YouTube Music, la radio...) mientras la app habla o pita, y volver a
 * subirla al acabar. Solo en la app Android. Se pide el foco una vez y se mantiene mientras sigan llegando avisos
 * seguidos (p. ej., la cuenta atrás), para que la música no suba y baje a cada pitido.
 */
let mode: MusicMode = 'pause';
let enabled = true;
let held = false;
/** Con qué foco se tiene ahora: para la voz con «pausa», la música se para; para los pitidos, solo baja. */
let heldPause = false;
let speaking = 0;
let until = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Tiempo que la música sigue baja después del último aviso. */
const TAIL = 700;

const active = () => IS_NATIVE && enabled;

function grab(pause: boolean): void {
  if (held && (heldPause || !pause)) return;
  held = true;
  heldPause = pause;
  void KasaNative.duck({ pause }).catch(() => undefined);
}

function releaseNow(): void {
  clearTimeout(timer);
  if (!held) return;
  held = false;
  heldPause = false;
  void KasaNative.release().catch(() => undefined);
}

function schedule(): void {
  clearTimeout(timer);
  if (speaking > 0) return;
  const wait = until - Date.now();
  if (wait <= 0) releaseNow();
  else timer = setTimeout(schedule, wait);
}

/** Ajuste de Configuración: la música se pausa (de serie), se baja o no cambia. Al apagarlo, vuelve enseguida. */
export function setMusicMode(m: MusicMode): void {
  mode = m;
  enabled = m !== 'off';
  if (!enabled) {
    speaking = 0;
    releaseNow();
  }
}

/** La música baja durante un sonido que dura `ms` milisegundos. */
export function duckFor(ms: number): void {
  if (!active()) return;
  grab(false);
  until = Math.max(until, Date.now() + ms + TAIL);
  schedule();
}

/** ¿La voz va amplificada? (con «se baja»: la música sigue sonando de fondo y la voz tiene que destacar) */
export function loudVoice(): boolean {
  return active() && mode === 'duck';
}

/** La música se pausa o baja mientras dura una frase (la promesa se cumple cuando acaba de hablar). */
export function duckWhile<T>(p: Promise<T>): Promise<T> {
  if (!active()) return p;
  grab(mode === 'pause');
  speaking++;
  clearTimeout(timer);
  // una sola vez por frase; y si el motor de voz no avisa de que ha acabado, la música vuelve igualmente a los 15 s
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    clearTimeout(guard);
    speaking = Math.max(0, speaking - 1);
    until = Math.max(until, Date.now() + TAIL);
    schedule();
  };
  const guard = setTimeout(done, 15000);
  return p.then((v) => (done(), v), (e) => { done(); throw e; });
}

/** Se ha cortado la voz (p. ej., al salir del entrenamiento): la música vuelve enseguida. */
export function stopSpeechDuck(): void {
  speaking = 0;
  until = Math.min(until, Date.now() + TAIL);
  schedule();
}
