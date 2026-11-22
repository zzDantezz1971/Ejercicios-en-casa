import type { SectionId } from '../domain/types';

/*
 * «Taules fetes»: tablas ya preparadas para usar con un toque (se copian a las tablas del usuario y se pueden cambiar).
 * Nombre y descripción en castellano; se traducen con i18n/ui.ts. La duración se calcula al mostrarlas, con las pausas
 * de cada usuario. [id del ejercicio, segundos].
 */
export interface TableTemplate {
  id: string;
  name: string;
  desc: string;
  icon: string;
  routine: Partial<Record<SectionId, Array<[string, number]>>>;
  rounds?: Partial<Record<SectionId, number>>;
}

export const TEMPLATES: readonly TableTemplate[] = [
  {
    id: 'manana-expres', name: 'Mañana exprés', icon: 'sun',
    desc: 'Un poco de todo para despertar el cuerpo, sin material.',
    routine: {
      calentamiento: [['marcha-en-el-sitio', 30], ['circulos-de-brazos', 30], ['circulos-de-cadera', 30], ['saltos-de-tijera-jumping-jacks', 30]],
      pesas: [['flexiones-con-rodillas-apoyadas', 40], ['zancada-atras', 40], ['sentadilla-sumo-sin-peso', 40]],
      abdominales: [['plancha-frontal', 40], ['crunch-abdominal', 40], ['bicicleta', 40]],
      estiramientos: [['perro-boca-abajo', 30], ['cobra', 30], ['postura-del-nino', 30]],
    },
  },
  {
    id: 'espalda-sana', name: 'Espalda sana', icon: 'heart',
    desc: 'Suave: movilidad, core y estiramientos para cuidar la espalda.',
    routine: {
      calentamiento: [['circulos-de-cadera', 30], ['giros-de-tronco', 30], ['inclinaciones-laterales-de-tronco', 30], ['circulos-de-brazos', 30]],
      abdominales: [['dead-bug-bicho-muerto', 40], ['plancha-frontal', 30], ['plancha-lateral', 30]],
      estiramientos: [['gato-camello', 40], ['bird-dog-perro-de-caza', 40], ['puente-de-gluteos', 40], ['nadador-suave-superman-alterno', 40],
        ['postura-del-nino', 40], ['rodillas-al-pecho-tumbado', 40], ['torsion-lumbar-tumbado', 40], ['esfinge', 30]],
    },
  },
  {
    id: 'piernas-gluteos', name: 'Piernas y glúteos', icon: 'target',
    desc: 'Sentadillas, zancadas y glúteos, sin material.',
    routine: {
      calentamiento: [['marcha-en-el-sitio', 30], ['circulos-de-rodillas', 30], ['circulos-de-cadera', 30], ['sentadillas-sin-peso', 30], ['zancadas-alternas', 30]],
      pesas: [['sentadilla-sumo-sin-peso', 40], ['zancada-atras', 40], ['sentadilla-bulgara-con-silla', 40], ['patada-de-gluteo-en-cuadrupedia', 40],
        ['abduccion-de-cadera-tumbado-de-lado', 40], ['sentadilla-isometrica-en-la-pared', 40], ['peso-muerto-a-una-pierna-sin-peso', 40], ['elevacion-de-talones-de-pie', 40]],
      estiramientos: [['cuadriceps-de-pie', 30], ['isquiotibiales-tumbado', 30], ['postura-de-la-paloma', 30], ['mariposa-aductores', 30], ['flexores-de-cadera-rodilla-en-el-suelo', 30]],
    },
  },
  {
    id: 'abdominales', name: 'Abdominales', icon: 'secAbs',
    desc: 'Abdomen, oblicuos y core completo.',
    routine: {
      calentamiento: [['giros-de-tronco', 30], ['inclinaciones-laterales-de-tronco', 30], ['codo-a-la-rodilla-contraria', 30]],
      abdominales: [['crunch-abdominal', 40], ['bicicleta', 40], ['crunch-inverso', 40], ['plancha-frontal', 40], ['plancha-lateral', 40],
        ['toques-de-talon', 40], ['dead-bug-bicho-muerto', 40], ['escaladores', 40], ['barquita-hollow-hold', 30]],
      estiramientos: [['cobra', 30], ['rodillas-al-pecho-tumbado', 30], ['torsion-lumbar-tumbado', 30]],
    },
  },
  {
    id: 'cardio-casa', name: 'Cardio en casa', icon: 'flame',
    desc: 'Para sudar: saltos y circuito de cuerpo entero, sin material.',
    routine: {
      calentamiento: [['marcha-en-el-sitio', 30], ['circulos-de-brazos', 30], ['saltos-de-tijera-jumping-jacks', 30], ['skipping-rodillas-arriba', 30],
        ['talones-al-gluteo', 30], ['punetazos-al-aire', 30], ['patinador', 30], ['saltos-de-esquiador', 30]],
      pesas: [['sentadilla-con-salto', 30], ['burpees', 30], ['flexiones-con-rodillas-apoyadas', 30], ['zancada-atras', 30]],
      abdominales: [['escaladores', 30], ['plancha-con-rodilla-al-codo', 30]],
      estiramientos: [['perro-boca-abajo', 30], ['cuadriceps-de-pie', 30], ['postura-del-nino', 30]],
    },
    rounds: { pesas: 2, abdominales: 2 },
  },
  {
    id: 'estiramientos-completos', name: 'Estiramientos completos', icon: 'stretch',
    desc: 'De la cabeza a los pies, para el día de descanso o después de entrenar.',
    routine: {
      calentamiento: [['circulos-de-brazos', 30], ['circulos-de-cadera', 30]],
      estiramientos: [['inclinacion-lateral-de-cuello', 30], ['hombro-cruzado', 30], ['triceps-detras-de-la-cabeza', 30], ['apertura-de-pecho-con-manos-atras', 30],
        ['gato-camello', 30], ['perro-boca-abajo', 30], ['postura-del-nino', 30], ['cobra', 30], ['torsion-lumbar-tumbado', 30], ['postura-de-la-paloma', 40],
        ['isquiotibiales-tumbado', 30], ['mariposa-aductores', 30], ['cuadriceps-de-pie', 30], ['flexores-de-cadera-rodilla-en-el-suelo', 30]],
    },
  },
  {
    id: 'fuerza-mancuernas', name: 'Fuerza con mancuernas', icon: 'dumbbell',
    desc: 'Cuerpo entero con mancuernas, dos vueltas.',
    routine: {
      calentamiento: [['circulos-de-brazos', 30], ['abrir-y-cerrar-brazos-abrazos', 30], ['sentadillas-sin-peso', 30], ['zancadas-alternas', 30], ['marcha-en-el-sitio', 30]],
      pesas: [['sentadilla-con-mancuernas-a-los-hombros', 45], ['press-de-suelo-con-mancuernas', 45], ['remo-inclinado-con-mancuernas', 45], ['zancadas-hacia-delante-con-mancuernas', 45],
        ['press-de-hombros-sentado', 45], ['curl-de-biceps', 45], ['extension-de-triceps-por-encima-de-la-cabeza', 45], ['peso-muerto-con-mancuernas', 45]],
      abdominales: [['giro-ruso-con-mancuerna', 40], ['plancha-frontal', 40]],
      estiramientos: [['hombro-cruzado', 30], ['pecho-en-el-marco-de-la-puerta', 30], ['isquiotibiales-tumbado', 30], ['cuadriceps-de-pie', 30]],
    },
    rounds: { pesas: 2 },
  },
  {
    id: 'despues-de-correr', name: 'Después de correr', icon: 'clock',
    desc: 'Estiramientos de piernas y cadera para después de correr o caminar.',
    routine: {
      estiramientos: [['cuadriceps-de-pie', 40], ['isquiotibiales-tumbado', 40], ['perro-boca-abajo', 40], ['flexores-de-cadera-rodilla-en-el-suelo', 40],
        ['postura-de-la-paloma', 40], ['mariposa-aductores', 30], ['torsion-lumbar-tumbado', 30], ['postura-del-nino', 30]],
    },
  },
  {
    id: 'pilates-empezar', name: 'Pilates para empezar', icon: 'stretch',
    desc: 'Pilates suave en la esterilla: respiración, core y espalda.',
    routine: {
      calentamiento: [['circulos-de-cadera', 30], ['giros-de-tronco', 30], ['circulos-de-brazos', 30]],
      abdominales: [['estiramiento-de-una-pierna', 40], ['dead-bug-bicho-muerto', 40], ['circulos-de-pierna-tumbado', 40], ['barquita-hollow-hold', 30], ['plancha-frontal', 30]],
      estiramientos: [['puente-de-gluteos', 40], ['nadador-suave-superman-alterno', 40], ['gato-camello', 40], ['estiramiento-de-columna-sentado', 40], ['postura-del-nino', 40]],
    },
  },
  {
    id: 'pilates-core', name: 'Pilates core', icon: 'bolt',
    desc: 'Los clásicos de pilates para el abdomen: el cien, roll up, tijeras…',
    routine: {
      calentamiento: [['marcha-en-el-sitio', 30], ['circulos-de-cadera', 30], ['giros-de-tronco', 30]],
      abdominales: [['el-cien', 45], ['enrollarse-roll-up', 40], ['estiramiento-de-una-pierna', 40], ['estiramiento-de-dos-piernas', 40], ['tijeras', 40],
        ['circulos-de-pierna-tumbado', 40], ['rodar-como-una-pelota', 30], ['abdominal-en-v', 30], ['plancha-lateral', 30], ['bicicleta', 40]],
      estiramientos: [['estiramiento-de-columna-sentado', 40], ['cobra', 30], ['postura-del-nino', 40]],
    },
  },
  {
    id: 'pilates-espalda-gluteos', name: 'Pilates de espalda y glúteos', icon: 'heart',
    desc: 'Puentes, patadas y extensiones para una espalda fuerte y unos glúteos activos.',
    routine: {
      calentamiento: [['circulos-de-cadera', 30], ['inclinaciones-laterales-de-tronco', 30], ['circulos-de-brazos', 30]],
      pesas: [['abduccion-de-cadera-tumbado-de-lado', 40]],
      abdominales: [['plancha-frontal', 40], ['dead-bug-bicho-muerto', 40]],
      estiramientos: [['puente-de-hombros-con-patada', 40], ['puente-a-una-pierna', 40], ['patada-de-una-pierna-boca-abajo', 40], ['bird-dog-perro-de-caza', 40],
        ['nadador-suave-superman-alterno', 40], ['cobra', 30], ['gato-camello', 40], ['postura-del-nino', 40]],
    },
  },
];
