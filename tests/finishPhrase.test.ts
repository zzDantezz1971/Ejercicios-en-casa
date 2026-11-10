import { describe, expect, it } from 'vitest';
import { finishPhrase } from '../src/services/Coach';

describe('Frase final de la voz', () => {
  it('dice el nombre, el tiempo exacto y las calorías en cada idioma', () => {
    expect(finishPhrase('es', { name: 'David', completed: true, seconds: 1452, kcal: 69 }))
      .toBe('¡Buen trabajo, David! Entrenamiento terminado. Tiempo de ejercicio: 24 minutos 12 segundos. Se han quemado 69 calorías aproximadamente.');
    expect(finishPhrase('es', { completed: true, seconds: 3661, kcal: null })).toBe('¡Buen trabajo! Entrenamiento terminado. Tiempo de ejercicio: una hora un minuto un segundo.');
    expect(finishPhrase('ca', { completed: true, seconds: 600, kcal: 40 })).toBe('Bona feina! Entrenament acabat. Temps d’exercici: 10 minuts. S’han cremat aproximadament 40 calories.');
    expect(finishPhrase('en', { name: 'David', completed: false, seconds: 61, kcal: 5 })).toBe('Well done, David! Workout complete. Exercise time: one minute one second. About 5 calories burned.');
  });
});
