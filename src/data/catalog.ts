import type { Catalog } from '../domain/WorkoutPlan';
import type { ExerciseDef, SectionId } from '../domain/types';
import { DESCRIPTIONS } from './descriptions';
import { RAW_SECTIONS } from './rawExercises';
import { MUSCLES_BY_EXERCISE } from './muscles';
import { exerciseText, LANG } from '../i18n';
import { parseNeed } from '../domain/equipment';
import { EXTRAS, extraId, NEW_GROUP } from './extra';
import { EXTRA_MOTIONS, MOTION_OVERRIDES } from './extra/motions';
import { DEFAULT_ANGLES } from './defaultAngles';

/** Material de los ejercicios de antes (los que usan mancuernas lo sacan del movimiento). */
const NEEDS_BENCH = new Set([
  'pajaros-elevaciones-posteriores',
  'press-de-banca-con-mancuernas',
  'press-inclinado-con-mancuernas',
  'aperturas-con-mancuernas',
  'pullover-con-mancuerna',
  'remo-a-una-mano-apoyado-en-banco',
  'remo-con-pecho-apoyado-en-banco-inclinado',
  'patada-de-triceps-apoyado-en-banco',
  'press-frances-tumbado',
]);

/** Movimiento provisional de los ejercicios nuevos (de pie, quieto); no se ve: sale "Animación en preparación". */
const STILL = { f: [[{}, 0, 1000]] } as ExerciseDef['motion'];
/** Ángulo de cámara de siempre según la vista (el mismo que usa el maniquí si el movimiento no trae «az»). */
const BASE_AZ = { side: 32, front: 18, top: 12 } as const;
/** El movimiento con el ángulo predeterminado elegido para ese ejercicio (DEFAULT_ANGLES), si lo tiene. */
function withAngle(id: string, m: ExerciseDef['motion']): ExerciseDef['motion'] {
  const d = DEFAULT_ANGLES[id];
  if (!d) return m;
  return { ...m, az: (m.az ?? BASE_AZ[(m.v ?? 'side') as keyof typeof BASE_AZ]) + d };
}

/** Ejercicios que se hacen primero con un lado y luego con el otro. */
const ONE_SIDED = new Set([
  'balanceo-de-pierna-adelante-y-atras',
  'remo-a-una-mano-apoyado-en-banco',
  'curl-concentrado-sentado',
  'patada-de-triceps-apoyado-en-banco',
  'plancha-lateral',
  'plancha-lateral-con-elevacion-de-cadera',
  'inclinaciones-laterales-con-mancuerna',
  'hombro-cruzado',
  'triceps-detras-de-la-cabeza',
  'estiramiento-de-antebrazos',
  'torsion-lumbar-tumbado',
  'torsion-de-columna-con-piernas-cruzadas',
  'hilo-en-la-aguja',
  'figura-4-gluteo-y-piriforme',
  'isquiotibiales-tumbado',
  'cuadriceps-de-pie',
  'gemelos-contra-la-pared',
  'flexores-de-cadera-rodilla-en-el-suelo',
  'puente-a-una-pierna',
]);

/**
 * Nombres sin la parte en inglés entre paréntesis (la voz en castellano o catalán la pronunciaba mal).
 * El identificador sigue saliendo del nombre original, así las tablas y el historial guardados no cambian.
 */
const PLAIN_NAMES: Record<string, { es: string; ca: string; en?: string }> = {
  'saltos-de-tijera-jumping-jacks': { es: 'Saltos de tijera', ca: 'Salts de tisora' },
  'dead-bug-bicho-muerto': { es: 'Bicho muerto', ca: 'Insecte mort' },
  'bird-dog-perro-de-caza': { es: 'Perro de caza', ca: 'Gos de caça' },
  'skipping-rodillas-arriba': { es: 'Rodillas arriba', ca: 'Genolls amunt' },
  'gusano-inchworm': { es: 'Gusano', ca: 'Cuc' },
  'barquita-hollow-hold': { es: 'Barquita', ca: 'Barqueta' },
  'mariposa-aductores': { es: 'Mariposa', ca: 'Papallona' },
  // antes «Flexores de cadera (rodilla en el suelo)»: ahora es la postura de la lagartija (mismo identificador)
  'flexores-de-cadera-rodilla-en-el-suelo': { es: 'Postura de la lagartija', ca: 'Postura del llangardaix' },
  // sin paréntesis en el nombre
  'abrir-y-cerrar-brazos-abrazos': { es: 'Abrir y cerrar brazos', ca: 'Obrir i tancar braços', en: 'Arm swings' },
  'pajaros-elevaciones-posteriores': { es: 'Pájaros', ca: 'Ocells' },
  'press-frances-tumbado': { es: 'Press francés tumbado', ca: 'Press francès estirat', en: 'Lying tricep extension' },
  'plancha-a-flexion-arriba-y-abajo': { es: 'Plancha a flexión', ca: 'Planxa a flexió' },
  'figura-4-gluteo-y-piriforme': { es: 'Estiramiento en figura 4', ca: 'Estirament en figura 4', en: 'Figure-4 stretch' },
  'pinza-sentado-piernas-estiradas': { es: 'Pinza sentado', ca: 'Pinça assegut' },
  'nadador-suave-superman-alterno': { es: 'Nadador suave', ca: 'Nedador suau', en: 'Gentle swimmers' },
};
function plainName(id: string, name: string): string {
  return PLAIN_NAMES[id]?.[LANG] ?? name;
}

export function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface SectionInfo {
  id: SectionId;
  title: string;
  exercises: ExerciseDef[];
}

/** Grupos grandes de Fuerza y Estiramientos (el detalle está en el orden por músculo). */
const BROAD_GROUP: Record<string, string> = {
  'Cuello y trapecio': 'Tren superior', 'Hombros': 'Tren superior', 'Espalda': 'Tren superior', 'Brazos': 'Tren superior', 'Pecho': 'Tren superior',
  'Core y zona lumbar': 'Core', 'Piernas y glúteos': 'Tren inferior',
  'Cuello': 'Tren superior', 'Hombros y brazos': 'Tren superior',
  'Espalda alta y costados': 'Espalda', 'Zona lumbar': 'Espalda',
  'Cadera y glúteos': 'Tren inferior', 'Aductores (ingles)': 'Tren inferior', 'Piernas': 'Tren inferior',
  'Fortalecer zona lumbar (espalda sana)': 'Fortalecer zona lumbar',
};

function buildSections(): SectionInfo[] {
  return RAW_SECTIONS.map((sec) => {
    let group: string | undefined;
    const exercises: ExerciseDef[] = [];
    for (const raw of sec.items) {
      if (raw.g) {
        group = raw.g;
        continue;
      }
      const { n, z, g: _g, b, top: _top, ...rawMotion } = raw;
      const id = slug(n!);
      const motion = withAngle(id, MOTION_OVERRIDES[id] ?? rawMotion);
      // textos en el idioma elegido (el identificador sigue saliendo del nombre en castellano)
      const t = exerciseText(id);
      const desc = DESCRIPTIONS[id];
      exercises.push({
        id,
        name: plainName(id, t?.[0] ?? n!),
        section: sec.id,
        zone: t?.[1] ?? z ?? '',
        group,
        oneSided: ONE_SIDED.has(id),
        badges: b,
        description: t && desc ? { start: t[2], move: t[3], tip: t[4], mistakes: t[5] || undefined, easier: t[6] || undefined } : desc,
        muscles: MUSCLES_BY_EXERCISE[id],
        motion,
        viewLabel: raw.top ?? (motion.v === 'front' ? 'De frente' : undefined),
        equip: [...(motion.db ? [['mancuernas' as const]] : []), ...(NEEDS_BENCH.has(id) ? [['banco' as const]] : [])],
      } as ExerciseDef);
    }
    // ejercicios nuevos: detrás del último de su mismo subgrupo (o al final, si el subgrupo es nuevo)
    for (const x of EXTRAS.filter((e) => e.s === sec.id)) {
      const id = extraId(x.n);
      const t = exerciseText(id);
      const ex: ExerciseDef = {
        id,
        name: plainName(id, t?.[0] ?? x.n),
        section: sec.id,
        zone: t?.[1] ?? x.z,
        group: x.g,
        oneSided: !!x.one,
        badges: x.b,
        description: t ? { start: t[2], move: t[3], tip: t[4], mistakes: t[5] || undefined, easier: t[6] || undefined }
          : { start: x.es[0], move: x.es[1], tip: x.es[2], mistakes: x.es[3] || undefined, easier: x.es[4] || undefined },
        muscles: x.m,
        motion: withAngle(id, EXTRA_MOTIONS[id] ?? STILL),
        viewLabel: EXTRA_MOTIONS[id]?.v === 'front' ? 'De frente' : undefined,
        equip: parseNeed(x.eq),
        pending: !EXTRA_MOTIONS[id],
      };
      let at = -1;
      // los recién añadidos van al principio del apartado, juntos, para revisarlos
      if (x.g === NEW_GROUP) at = exercises.filter((e) => e.group === NEW_GROUP).length - 1;
      else if (x.g) for (let i = exercises.length - 1; i >= 0; i--) if (exercises[i].group === x.g) { at = i; break; }
      if (at >= 0 || x.g === NEW_GROUP) exercises.splice(at + 1, 0, ex);
      else exercises.push(ex);
    }
    // los subgrupos finos solo sirven para ordenar; en la lista se agrupan en pocos títulos
    for (const e of exercises) if (e.group && BROAD_GROUP[e.group]) e.group = BROAD_GROUP[e.group];
    return { id: sec.id, title: sec.title, exercises };
  });
}

/**
 * Ejercicios retirados por ser casi iguales a otro. No salen en las listas para elegir,
 * pero siguen en el catálogo para las tablas y el historial que ya los tengan.
 */
// retirados de las listas (siguen existiendo para el historial y las tablas que ya los tengan)
const RETIRED = new Set(['peso-muerto-rumano-con-mancuernas', 'curl-alterno-de-biceps', 'dominadas-supinas', 'elevacion-de-brazos-en-y-boca-abajo',
  // muy parecidos a otros con el mismo material
  'zancada-atras-con-mancuernas', 'press-de-hombros-de-pie', 'aperturas-inclinadas-con-mancuernas', 'press-inclinado-con-mancuernas', 'swing-a-una-mano-con-pesa-rusa',
  'subida-al-step-con-rodilla-arriba', 'dominadas-negativas', 'caminata-lateral-con-banda',
  // eliminados de la lista desde la app (copia de seguridad del 13-11-2026)
  'figura-4-gluteo-y-piriforme', 'gemelos-contra-la-pared', 'giros-rusos', 'estiramiento-de-antebrazos', 'toques-de-puntera-alternos',
  'boxeo-con-desplazamiento', 'comba-con-saltos-laterales', 'encogimientos-de-hombros', 'flexiones-en-pica', 'hip-thrust-con-mancuerna',
  'oso-caminando', 'hip-thrust-con-barra', 'plancha-lateral-con-rotacion',
  'rotaciones-de-hombros', 'flexiones-con-manos-en-el-step', 'angeles-boca-abajo', 'y-t-w-boca-abajo', 'retraccion-escapular-colgado',
  'sentadilla-goblet-con-mancuerna',
  // Fuerza: casi iguales a otro con el mismo material
  'press-arnold', 'curl-concentrado-sentado', 'remo-con-pecho-apoyado-en-banco-inclinado', 'press-de-banca-a-una-mano',
  'elevacion-en-y-inclinado', 'buenos-dias-con-barra', 'sentadilla-sumo-con-pesa-rusa', 'cargada-con-pesa-rusa',
  'separacion-de-banda', 'puente-con-pies-en-fitball',
  // eliminados desde la app (copia del 13-11-2026, noche)
  'halo-con-pesa-rusa', 'press-de-pecho-con-banda', 'plancha-con-toques-de-hombro',
  // eliminados desde la app (copia del 13-11-2026, 22:46)
  'torsion-de-columna-con-piernas-cruzadas', 'retroversion-pelvica']);
const ALL_SECTIONS: SectionInfo[] = buildSections();
export const SECTIONS: SectionInfo[] = ALL_SECTIONS.map((s) => ({ ...s, exercises: s.exercises.filter((e) => !RETIRED.has(e.id)) }));
export const CATALOG: Catalog = new Map(ALL_SECTIONS.flatMap((s) => s.exercises).map((e) => [e.id, e]));
