import { describe, expect, it } from 'vitest';
import { chooseEngine, nativeVoiceList, pickFew, speakable } from '../src/services/Voice';

describe('pickFew (voces para elegir)', () => {
  it('una de cada voz (la local), como mucho 3', () => {
    const v = ['eea', 'eeb', 'eec', 'eed', 'eef'].flatMap((x) => [
      { id: `es-es-x-${x}-network`, name: `es-es-x-${x}-network`, lang: 'es-ES' },
      { id: `es-es-x-${x}-local`, name: `es-es-x-${x}-local`, lang: 'es-ES' },
    ]);
    const r = pickFew(v);
    expect(r.length).toBe(3);
    expect(r.every((x) => x.name.endsWith('-local'))).toBe(true);
    expect(new Set(r.map((x) => x.name)).size).toBe(3);
  });
  it('en inglés, las británicas si las hay', () => {
    const r = pickFew([
      { id: 'a', name: 'en-us-x-iob-local', lang: 'en-US' },
      { id: 'b', name: 'en-gb-x-gba-local', lang: 'en-GB' },
      { id: 'c', name: 'en-au-x-aua-local', lang: 'en-AU' },
    ]);
    expect(r.map((x) => x.id)).toEqual(['b']);
  });
  it('Android: todas las voces se llaman «español España»; se distinguen por voiceURI', () => {
    const v = ['eea', 'eec', 'eed', 'eef'].flatMap((x) => [
      { voiceURI: `es-es-x-${x}-local`, name: 'español España', lang: 'es-ES' },
      { voiceURI: `es-es-x-${x}-network`, name: 'español España', lang: 'es-ES' },
    ]).concat([{ voiceURI: 'es-us-x-esc-local', name: 'español Estados Unidos', lang: 'es-US' }]);
    const r = nativeVoiceList(v, 'es');
    expect(r.length).toBe(3);
    expect(r.every((x) => x.id.startsWith('es-es-') && x.id.endsWith('-local'))).toBe(true);
  });
});

describe('qué motor de voz dice los avisos', () => {
  const google = (avail: number, installed: boolean[]) => ({ engine: 'com.google.android.tts', label: 'Google', isDefault: true, avail, voices: installed.map((i, n) => ({ name: `gl-${n}`, lang: 'gl-ES', installed: i, network: false })) });
  const aho = { engine: 'org.aholab.tts', label: 'AhoTTS', isDefault: false, avail: 1, locale: 'gl-ES', voices: [] };
  it('Google dice que tiene gallego pero sin ninguna voz instalada: el otro motor', () => {
    expect(chooseEngine([google(1, [false, false]), aho], 'com.google.android.tts')).toBe(aho);
  });
  it('Google no lo tiene: el otro motor', () => {
    expect(chooseEngine([google(-2, []), aho], 'com.google.android.tts')).toBe(aho);
  });
  it('Google con la voz instalada: Google', () => {
    expect(chooseEngine([google(1, [true]), aho], 'com.google.android.tts')).toBe('default');
  });
  it('ninguno: en castellano', () => {
    expect(chooseEngine([google(-1, [])], 'com.google.android.tts')).toBeNull();
  });
});

describe('texto para el motor de voz', () => {
  it('los dos puntos van como coma (AhoTTS deja de leer en «:»)', () => {
    expect(speakable('Así soarán os avisos. Seguinte: curl de bíceps.')).toBe('Así soarán os avisos. Seguinte, curl de bíceps.');
    expect(speakable('Abdominalak: eginda. Ukitu pantaila')).toBe('Abdominalak, eginda. Ukitu pantaila');
    expect(speakable('Son las 16:05')).toBe('Son las 16:05');
  });
});
