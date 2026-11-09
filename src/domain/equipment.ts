/* Material para entrenar. Los ejercicios sin material los ve todo el mundo; los que necesitan algo,
   solo quien lo tiene. Silla, pared y suelo se dan por hechos (no se preguntan). */

export const EQUIPMENT = ['mancuernas', 'kettlebell', 'barra', 'banco', 'bandas', 'step', 'fitball', 'dominadas', 'comba', 'rueda'] as const;
export type Equip = (typeof EQUIPMENT)[number];

/** Nombre (en castellano; se traduce en pantalla) e icono de cada material. */
export const EQUIP_INFO: Record<Equip, { name: string; icon: string }> = {
  mancuernas: { name: 'Mancuernas', icon: 'dumbbell' },
  kettlebell: { name: 'Pesa rusa', icon: 'kettlebell' },
  barra: { name: 'Barra con discos', icon: 'barbell' },
  banco: { name: 'Banco', icon: 'bench' },
  bandas: { name: 'Bandas elásticas', icon: 'band' },
  step: { name: 'Step', icon: 'step' },
  fitball: { name: 'Fitball', icon: 'ball' },
  dominadas: { name: 'Barra de dominadas', icon: 'pullup' },
  comba: { name: 'Comba', icon: 'rope' },
  rueda: { name: 'Rueda abdominal', icon: 'wheel' },
};

/**
 * Lo que necesita un ejercicio: lista de requisitos que hay que cumplir todos; cada requisito
 * puede tener alternativas. Se escribe como "mancuernas+banco" o "banco|step".
 */
export type EquipNeed = Equip[][];

export function parseNeed(spec: string | undefined): EquipNeed {
  if (!spec) return [];
  return spec.split('+').map((alt) => alt.split('|').map((x) => x.trim()).filter((x): x is Equip => (EQUIPMENT as readonly string[]).includes(x)));
}

/** ¿Se puede hacer con este material? */
export function canDo(need: EquipNeed | undefined, owned: ReadonlySet<string>): boolean {
  return !need?.length || need.every((alts) => alts.some((e) => owned.has(e)));
}

/** Material de cada requisito, para mostrarlo ("Mancuernas", "Banco o Step"). */
export function needList(need: EquipNeed | undefined): Equip[][] {
  return need ?? [];
}
