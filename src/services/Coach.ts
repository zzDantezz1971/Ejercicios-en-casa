import type { WorkoutSession } from '../domain/WorkoutSession';
import { SECTION_TITLES } from '../domain/types';
import type { Haptics } from './Haptics';
import type { Sounds } from './Sounds';
import type { Voice } from './Voice';

/** Une la sesión con los pitidos y la voz: decide qué se dice y cuándo suena cada aviso. */
export class Coach {
  private off: Array<() => void> = [];

  constructor(session: WorkoutSession, sounds: Sounds, voice: Voice, haptics?: Haptics, opts: { countdown?: boolean; name?: string } = {}) {
    this.off.push(
      session.on('cue', (cue) => {
        switch (cue.type) {
          case 'count':
            sounds.count();
            if (opts.countdown && cue.n >= 1 && cue.n <= 3) voice.say(['', 'uno', 'dos', 'tres'][cue.n], true);
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
            voice.say('Cambia de lado');
            break;
        }
      }),
      session.on('step', ({ step }) => {
        switch (step.kind) {
          case 'countdown':
            voice.say(`${SECTION_TITLES[step.section]}. Prepárate. Primer ejercicio: ${step.next.name}`);
            break;
          case 'exercise':
            voice.say(`${step.rounds > 1 && step.position === 1 ? `Vuelta ${step.round} de ${step.rounds}. ` : ''}${step.exercise.name}${step.weight ? `, ${speakKg(step.weight)}` : ''}. ${speakSeconds(step.seconds)}${step.switchAt !== undefined ? '. A mitad, cambio de lado' : ''}`);
            break;
          case 'rest':
            voice.say(`Descanso. Siguiente: ${step.next.name}`);
            break;
          case 'sectionBreak':
            voice.say(`${SECTION_TITLES[step.finished]} terminado. Toca la pantalla para seguir con ${SECTION_TITLES[step.next]}`);
            break;
        }
      }),
      session.on('finished', (s) => {
        if (s.completed) {
          sounds.finish();
          haptics?.finish();
          voice.say(`¡Buen trabajo${opts.name ? `, ${opts.name}` : ''}! Entrenamiento finalizado.`);
        } else if (s.exercisesDone > 0) {
          voice.say(`¡Bien hecho${opts.name ? `, ${opts.name}` : ''}! Entrenamiento finalizado.`);
        }
      }),
    );
  }

  dispose(): void {
    this.off.forEach((f) => f());
    this.off = [];
  }
}

/** 8 -> "8 kilos"; 7.5 -> "7 kilos y medio". */
export function speakKg(w: number): string {
  const whole = Math.floor(w);
  const half = w - whole >= 0.5;
  if (whole === 0) return 'medio kilo';
  const base = whole === 1 ? 'un kilo' : `${whole} kilos`;
  return half ? `${base} y medio` : base;
}

function speakSeconds(s: number): string {
  if (s < 60) return `${s} segundos`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const min = m === 1 ? 'un minuto' : `${m} minutos`;
  return r ? `${min} y ${r} segundos` : min;
}
