import type { WorkoutSession } from '../domain/WorkoutSession';
import { SECTION_TITLES } from '../domain/types';
import type { Haptics } from './Haptics';
import type { Sounds } from './Sounds';
import type { Voice } from './Voice';

/** Une la sesión con los pitidos y la voz: decide qué se dice y cuándo suena cada aviso. */
export class Coach {
  private off: Array<() => void> = [];

  constructor(session: WorkoutSession, sounds: Sounds, voice: Voice, haptics?: Haptics) {
    this.off.push(
      session.on('cue', (cue) => {
        switch (cue.type) {
          case 'count':
            sounds.count();
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
            voice.say(`${step.exercise.name}. ${speakSeconds(step.seconds)}${step.switchAt !== undefined ? '. A mitad, cambio de lado' : ''}`);
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
          voice.say('Entrenamiento terminado. ¡Buen trabajo!');
        }
      }),
    );
  }

  dispose(): void {
    this.off.forEach((f) => f());
    this.off = [];
  }
}

function speakSeconds(s: number): string {
  if (s < 60) return `${s} segundos`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  const min = m === 1 ? 'un minuto' : `${m} minutos`;
  return r ? `${min} y ${r} segundos` : min;
}
