// Vuelca los textos de los ejercicios (id y los 7 textos en castellano) y los grupos, para traducirlos por lotes.
import { SECTIONS } from '../../src/data/catalog';
import { GROUPS } from '../../src/i18n/ex4';
import { EXTRA_GROUPS } from '../../src/data/extra';
import { RAW_SECTIONS } from '../../src/data/rawExercises';
const mode = process.argv[2];
if (mode === 'groups') {
  const all = new Set<string>([...Object.keys(GROUPS), ...Object.keys(EXTRA_GROUPS)]);
  for (const s of RAW_SECTIONS) for (const i of s.items) if (i.g) all.add(i.g);
  for (const g of all) console.log(g);
} else {
  for (const s of SECTIONS) for (const e of s.exercises) {
    const d = e.description;
    console.log([e.id, e.name, e.zone, d?.start ?? '', d?.move ?? '', d?.tip ?? '', d?.mistakes ?? '', d?.easier ?? ''].join('\t'));
  }
}
