import { IS_NATIVE } from '../platform/native';
import { KasaNative } from '../platform/kasaNative';

/*
 * Bajar la música de otras apps (Spotify, YouTube Music, la radio...) mientras la app habla o pita, y volver a
 * subirla al acabar. Solo en la app Android. Se pide el foco una vez y se mantiene mientras sigan llegando avisos
 * seguidos (p. ej., la cuenta atrás), para que la música no suba y baje a cada pitido.
 */
let enabled = true;
let held = false;
let speaking = 0;
let until = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Tiempo que la música sigue baja después del último aviso. */
const TAIL = 700;

const active = () => IS_NATIVE && enabled;

function grab(): void {
  if (held) return;
  held = true;
  void KasaNative.duck().catch(() => undefined);
}

function releaseNow(): void {
  clearTimeout(timer);
  if (!held) return;
  held = false;
  void KasaNative.release().catch(() => undefined);
}

function schedule(): void {
  clearTimeout(timer);
  if (speaking > 0) return;
  const wait = until - Date.now();
  if (wait <= 0) releaseNow();
  else timer = setTimeout(schedule, wait);
}

/** Interruptor de Configuración (activado de serie). Al apagarlo, la música vuelve enseguida. */
export function setMusicDuck(on: boolean): void {
  enabled = on;
  if (!on) {
    speaking = 0;
    releaseNow();
  }
}

/** La música baja durante un sonido que dura `ms` milisegundos. */
export function duckFor(ms: number): void {
  if (!active()) return;
  grab();
  until = Math.max(until, Date.now() + ms + TAIL);
  schedule();
}

/** La música baja mientras dura una frase (la promesa se cumple cuando acaba de hablar). */
export function duckWhile<T>(p: Promise<T>): Promise<T> {
  if (!active()) return p;
  grab();
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
