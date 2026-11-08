/* Datos de ejemplo para las capturas de Google Play (no se usan en la app).
   Uso: npx vite-node tools/play/demo-data.ts <ca|es|en>  → escribe el JSON del almacenamiento por la salida estándar. */
import { SECTIONS } from '../../src/data/catalog';
import { Store, STORAGE_KEY } from '../../src/domain/Store';
import { addWeeks, weekKey, weekStart } from '../../src/domain/monthSummary';
import { SECTION_IDS, emptyRoutine, summarizeHeart, usesWeight, type HistoryEntry, type SectionId } from '../../src/domain/types';

const lang = (process.argv[2] ?? 'ca') as 'ca' | 'es' | 'en';
const mem = new Map<string, string>();
const store = new Store({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });

const NOW = new Date('2026-11-08T18:30:00');
const day = (d: number, h = 18, m = 30) => { const x = new Date(NOW); x.setDate(x.getDate() - d); x.setHours(h, m, 0, 0); return x; };

// tabla
const pick: Record<SectionId, number[]> = { calentamiento: [0, 1, 2, 9], pesas: [0, 2, 6, 10], abdominales: [0, 3, 6], estiramientos: [0, 5, 9] };
const routine = emptyRoutine();
const weights: Record<string, number> = {};
for (const s of SECTION_IDS) {
  const exs = SECTIONS.find((x) => x.id === s)!.exercises;
  routine[s] = pick[s].map((i) => exs[i % exs.length]).map((e, n) => {
    const item = { exerciseId: e.id, seconds: s === 'estiramientos' ? 30 : s === 'calentamiento' ? 40 : 45 } as { exerciseId: string; seconds: number; weight?: number };
    if (usesWeight(e)) item.weight = [6, 8, 5, 10][n % 4];
    return item;
  });
}
store.renameRoutine(store.active.id, { ca: 'Rutina completa', es: 'Rutina completa', en: 'Full routine' }[lang]);
store.saveRoutine(routine);

// ajustes y perfil
const s = store.settings;
store.saveSettings({ ...s, lang, askWatch: false, profile: { ...s.profile, name: 'Alex', age: 45, height: 176, sex: 'h', goalKg: 78 } });

// peso: de 84,6 a 80,4 kg en 10 semanas
for (let w = 10; w >= 0; w--) store.addWeight(Math.round((80.4 + w * 0.42 + (w % 3 === 0 ? 0.2 : 0)) * 10) / 10, day(w * 7 + 1, 8, 0));

// historial: 3-4 entrenamientos por semana durante 10 semanas
const pattern = [0, 2, 4, 6]; // días hacia atrás dentro de cada semana
let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
for (let w = 9; w >= 0; w--) {
  for (const p of pattern) {
    const d = w * 7 + p;
    if (rnd() < 0.18 && d > 0) continue;
    const when = day(d, 18 + Math.floor(rnd() * 3), Math.floor(rnd() * 60));
    const items = SECTION_IDS.flatMap((sec) => routine[sec].map((it) => ({ exerciseId: it.exerciseId, section: sec, planned: it.seconds, seconds: it.seconds, completed: true, weight: it.weight })));
    const dur = items.reduce((a, b) => a + b.seconds, 0) + items.length * 15 + Math.floor(rnd() * 120);
    const samples = Array.from({ length: Math.floor(dur / 5) }, (_, i) => Math.round(95 + 35 * Math.sin(i / 9) ** 2 + rnd() * 8));
    const e: HistoryEntry = {
      date: when.toISOString(), durationSec: dur, exercisesDone: items.length, exercisesPlanned: items.length,
      sections: [...SECTION_IDS], completed: true, routineName: store.active.name, routineId: store.active.id, items,
      heart: rnd() < 0.7 ? summarizeHeart(samples) ?? undefined : undefined,
    };
    const c = store.caloriesFor(e);
    if (c) { e.kcal = c.kcal; e.kcalMethod = c.method as 'pulso' | 'estimado'; }
    store.addHistory(e);
  }
}
store.markUsed(store.active.id, day(0));
store.checkMedals(NOW);
store.markBackedUp(day(1));
store.markSummarySeen('2026-10');
store.markWeekSeen(weekKey(addWeeks(weekStart(NOW), -1)));
process.stdout.write(mem.get(STORAGE_KEY)!);
