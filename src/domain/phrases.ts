/* Frases motivadoras. {n} se sustituye por el nombre (o desaparece si no hay). */
export const PHRASES: string[] = [
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

/** Sustituye {n} / {, n} por el nombre. */
export function personalize(phrase: string, name?: string): string {
  return phrase
    .replace(/\{,\s*n\}/g, name ? `, ${name}` : '')
    .replace(/\{n\}/g, name ?? '')
    .replace(/\s+([.!?,])/g, '$1')
    .trim();
}

/** Frase del día: la misma durante todo el día, distinta al día siguiente. */
export function phraseOfDay(date: Date, mine: readonly string[], onlyMine: boolean, name?: string): string {
  const pool = onlyMine && mine.length ? [...mine] : [...PHRASES, ...mine];
  const day = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 864e5);
  const idx = ((day * 7919) % pool.length + pool.length) % pool.length;
  return personalize(pool[idx], name);
}
