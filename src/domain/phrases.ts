/* Frases motivadoras. {n} se sustituye por el nombre (o desaparece si no hay). */
import { LANG } from '../i18n';

const PHRASES_ES: string[] = [
  'Hoy es un buen día para moverse{, n}.',
  'Cada repetición cuenta{, n}.',
  'Tu espalda te dará las gracias.',
  'Poco a poco se llega lejos.',
  'No hace falta ser el mejor: hace falta ser constante.',
  'El mejor entrenamiento es el que se hace.',
  'Diez minutos también suman.',
  'Tu cuerpo es tu casa: cuídalo{, n}.',
  'La disciplina gana a la motivación.',
  'Hoy, un poco mejor que ayer.',
  'Respira, empieza y lo demás viene solo.',
  'Fuerte por dentro y por fuera{, n}.',
  'Moverte es la mejor medicina.',
  'La constancia es tu superpoder{, n}.',
  'No cuentes los días: haz que los días cuenten.',
  'Cada gota de sudor es un paso adelante.',
  'Estira, respira y sigue.',
  'Hoy entrenas por el tú de mañana.',
  'Lo difícil es empezar. ¡Vamos{, n}!',
  'Sin prisa, pero sin pausa.',
  'Tu mejor rival eres tú mismo.',
  'Una buena técnica vale más que un kilo más.',
  'Cuida la zona lumbar y ella te cuidará a ti.',
  'Un día sin moverte es un día perdido{, n}.',
  'Ya has hecho lo más difícil: pensar en entrenar.',
  'Los resultados llegan a quien no se rinde.',
  'Pequeños pasos, grandes cambios.',
  'Hoy toca ser constante{, n}.',
  'Tu salud es tu mejor inversión.',
  'Suda hoy, sonríe mañana.',
];
const PHRASES_CA: string[] = [
  'Avui és un bon dia per moure’s{, n}.',
  'Cada repetició compta{, n}.',
  'La teva esquena t’ho agrairà.',
  'A poc a poc s’arriba lluny.',
  'No cal ser el millor: cal ser constant.',
  'El millor entrenament és el que es fa.',
  'Deu minuts també sumen.',
  'El teu cos és casa teva: cuida’l{, n}.',
  'La disciplina guanya la motivació.',
  'Avui, una mica millor que ahir.',
  'Respira, comença i la resta ve sola.',
  'Fort per dins i per fora{, n}.',
  'Moure’t és la millor medicina.',
  'La constància és el teu superpoder{, n}.',
  'No comptis els dies: fes que els dies comptin.',
  'Cada gota de suor és un pas endavant.',
  'Estira, respira i continua.',
  'Avui entrenes pel teu jo de demà.',
  'El més difícil és començar. Som-hi{, n}!',
  'Sense presses, però sense pauses.',
  'El teu millor rival ets tu mateix.',
  'Una bona tècnica val més que un quilo de més.',
  'Cuida la zona lumbar i ella et cuidarà a tu.',
  'Un dia sense moure’t és un dia perdut{, n}.',
  'Ja has fet el més difícil: pensar a entrenar.',
  'Els resultats arriben a qui no es rendeix.',
  'Petits passos, grans canvis.',
  'Avui toca ser constant{, n}.',
  'La teva salut és la teva millor inversió.',
  'Sua avui, somriu demà.',
];

const PHRASES_EN: string[] = [
  'Today is a good day to move{, n}.',
  'Every rep counts{, n}.',
  'Your back will thank you.',
  'Slowly but surely you get far.',
  'You don’t need to be the best: you need to be consistent.',
  'The best workout is the one you do.',
  'Ten minutes add up too.',
  'Your body is your home: look after it{, n}.',
  'Discipline beats motivation.',
  'Today, a little better than yesterday.',
  'Breathe, start, and the rest will follow.',
  'Strong inside and out{, n}.',
  'Moving is the best medicine.',
  'Consistency is your superpower{, n}.',
  'Don’t count the days: make the days count.',
  'Every drop of sweat is a step forward.',
  'Stretch, breathe and keep going.',
  'Today you train for the you of tomorrow.',
  'The hardest part is starting. Let’s go{, n}!',
  'No rush, but no pause.',
  'Your best rival is yourself.',
  'Good technique is worth more than an extra kilo.',
  'Look after your lower back and it will look after you.',
  'A day without moving is a day lost{, n}.',
  'You’ve already done the hardest part: deciding to train.',
  'Results come to those who don’t give up.',
  'Small steps, big changes.',
  'Today is a day to be consistent{, n}.',
  'Your health is your best investment.',
  'Sweat today, smile tomorrow.',
];

/** Frases de la app en el idioma en uso. */
export const PHRASES: string[] = LANG === 'ca' ? PHRASES_CA : LANG === 'en' ? PHRASES_EN : PHRASES_ES;


/** Sustituye {n} / {, n} por el nombre. */
export function personalize(phrase: string, name?: string): string {
  return phrase
    .replace(/\{,\s*n\}/g, name ? `, ${name}` : '')
    .replace(/\{n\}/g, name ?? '')
    .replace(/\s+([.!?,])/g, '$1')
    .trim();
}

/** Frase del día: la misma durante todo el día, distinta al día siguiente. */
export function phraseOfDay(date: Date, name?: string): string {
  const pool = PHRASES;
  const day = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 864e5);
  const idx = ((day * 7919) % pool.length + pool.length) % pool.length;
  return personalize(pool[idx], name);
}
