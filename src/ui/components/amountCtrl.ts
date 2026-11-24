import { MAX_SECONDS, MIN_SECONDS, STEP_SECONDS } from '../../domain/RoutineEditor';
import { allowsReps, DEFAULT_REPS, MAX_REPS, MIN_REPS, type ExerciseDef } from '../../domain/types';
import { h } from '../dom';

/** Lo que dura un ejercicio de una tabla: segundos o, por repeticiones, cuántas (conservando los segundos). */
export interface Amount { seconds: number; reps?: number; repsSaved?: number }

/** «40 s», «12 reps» o «10 por lado» (para las listas que solo se miran). */
export function amountText(ex: Pick<ExerciseDef, 'id' | 'section' | 'oneSided'> | undefined, a: Amount): string {
  if (a.reps && ex && allowsReps(ex)) return ex.oneSided ? `${a.reps} por lado` : `${a.reps} reps`;
  return `${a.seconds} s`;
}

/**
 * Cuánto dura un ejercicio al editar una tabla: si se puede hacer por repeticiones, el selector «Tiempo | Reps»;
 * y el contador (− 40 s + o − 12 reps +). Los que se aguantan quietos y los estiramientos, solo por tiempo.
 */
export function amountCtrl(ex: ExerciseDef, a: Amount, change: (next: Amount) => void): HTMLElement {
  const canReps = allowsReps(ex);
  const reps = canReps && !!a.reps;
  // solo los tres campos de la cantidad (sin reps = por tiempo; repsSaved = las que tenía, para recuperarlas)
  const set = (next: Amount) => change({ seconds: next.seconds, ...(next.reps ? { reps: next.reps } : {}), ...(next.repsSaved ? { repsSaved: next.repsSaved } : {}) });
  const stepper = reps
    ? h('div', { class: 'stepper inline maker-time' },
      h('button', { 'aria-label': 'Menos repeticiones', disabled: a.reps! <= MIN_REPS, onclick: () => set({ ...a, reps: Math.max(MIN_REPS, a.reps! - 1) }) }, '−'),
      // en los por lados, «por lados» ya se ve debajo del nombre: aquí solo el número (que es por lado)
      h('span', { class: 'secs' }, `${a.reps} reps`),
      h('button', { 'aria-label': 'Más repeticiones', disabled: a.reps! >= MAX_REPS, onclick: () => set({ ...a, reps: Math.min(MAX_REPS, a.reps! + 1) }) }, '+'))
    : h('div', { class: 'stepper inline maker-time' },
      h('button', { 'aria-label': 'Menos tiempo', disabled: a.seconds <= MIN_SECONDS, onclick: () => set({ ...a, seconds: Math.max(MIN_SECONDS, a.seconds - STEP_SECONDS) }) }, '−'),
      h('span', { class: 'secs' }, `${a.seconds} s`),
      h('button', { 'aria-label': 'Más tiempo', disabled: a.seconds >= MAX_SECONDS, onclick: () => set({ ...a, seconds: Math.min(MAX_SECONDS, a.seconds + STEP_SECONDS) }) }, '+'));
  // solo por tiempo (estiramientos y los que se aguantan quietos): «Tiempo» igualmente, sin poder cambiarlo
  if (!canReps) return h('div', { class: 'amount-ctrl' },
    h('div', { class: 'segmented small amount-mode only', role: 'group', 'aria-label': 'Solo por tiempo' }, h('span', { class: 'seg on' }, 'Tiempo')), stepper);
  const mode = h('div', { class: 'segmented small amount-mode', role: 'group', 'aria-label': 'Por tiempo o por repeticiones' },
    // al cambiar, se guarda lo del otro modo: los segundos siempre; las repeticiones, en repsSaved
    h('button', { class: 'seg' + (reps ? '' : ' on'), 'aria-pressed': String(!reps), onclick: () => reps && set({ seconds: a.seconds, repsSaved: a.reps }) }, 'Tiempo'),
    h('button', { class: 'seg' + (reps ? ' on' : ''), 'aria-pressed': String(reps), onclick: () => !reps && set({ seconds: a.seconds, reps: a.repsSaved ?? DEFAULT_REPS }) }, 'Reps'));
  return h('div', { class: 'amount-ctrl' }, mode, stepper);
}
