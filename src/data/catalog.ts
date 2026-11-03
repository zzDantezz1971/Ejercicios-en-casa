import type { Catalog } from '../domain/WorkoutPlan';
import type { ExerciseDef, SectionId } from '../domain/types';
import { DESCRIPTIONS } from './descriptions';
import { RAW_SECTIONS } from './rawExercises';

/** Ejercicios que se hacen primero con un lado y luego con el otro. */
const ONE_SIDED = new Set([
  'balanceo-de-pierna-adelante-y-atras',
  'remo-a-una-mano-apoyado-en-banco',
  'curl-concentrado-sentado',
  'patada-de-triceps-apoyado-en-banco',
  'plancha-lateral',
  'plancha-lateral-con-elevacion-de-cadera',
  'inclinaciones-laterales-con-mancuerna',
  'inclinacion-lateral-de-cuello',
  'hombro-cruzado',
  'triceps-detras-de-la-cabeza',
  'estiramiento-de-antebrazos',
  'torsion-lumbar-tumbado',
  'hilo-en-la-aguja',
  'inclinacion-lateral-de-pie',
  'figura-4-gluteo-y-piriforme',
  'isquiotibiales-tumbado',
  'cuadriceps-de-pie',
  'gemelos-contra-la-pared',
  'flexores-de-cadera-rodilla-en-el-suelo',
  'puente-a-una-pierna',
  'zancada-lateral',
]);

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

function buildSections(): SectionInfo[] {
  return RAW_SECTIONS.map((sec) => {
    let group: string | undefined;
    const exercises: ExerciseDef[] = [];
    for (const raw of sec.items) {
      if (raw.g) {
        group = raw.g;
        continue;
      }
      const { n, z, g: _g, b, top: _top, ...motion } = raw;
      const id = slug(n!);
      exercises.push({
        id,
        name: n!,
        section: sec.id,
        zone: z ?? '',
        group,
        oneSided: ONE_SIDED.has(id),
        badges: b,
        description: DESCRIPTIONS[id],
        motion,
        viewLabel: raw.top ?? (motion.v === 'front' ? 'De frente' : undefined),
      } as ExerciseDef);
    }
    return { id: sec.id, title: sec.title, exercises };
  });
}

export const SECTIONS: SectionInfo[] = buildSections();
export const CATALOG: Catalog = new Map(SECTIONS.flatMap((s) => s.exercises).map((e) => [e.id, e]));
