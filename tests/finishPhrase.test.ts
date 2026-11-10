import { describe, expect, it } from 'vitest';
import { finishPhrase } from '../src/services/Coach';

describe('Frase final de la voz', () => {
  it('dice el nombre, los minutos y las calorías en cada idioma', () => {
    expect(finishPhrase('es', { name: 'David', completed: true, seconds: 1440, kcal: 69 })).toBe('¡Buen trabajo, David! Entrenamiento terminado. 24 minutos y 69 calorías quemadas.');
    expect(finishPhrase('ca', { completed: true, seconds: 60, kcal: null })).toBe('Bona feina! Entrenament acabat. un minut.');
    expect(finishPhrase('en', { name: 'David', completed: false, seconds: 600, kcal: 40 })).toBe('Well done, David! Workout complete. 10 minutes and 40 calories burned.');
  });
});
