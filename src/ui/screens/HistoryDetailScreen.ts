import { WorkoutPlan } from '../../domain/WorkoutPlan';
import { SECTION_IDS, SECTION_TITLES, emptyRoutine, type HistoryEntry, type SavedRoutine } from '../../domain/types';
import type { App, Screen } from '../App';
import { confirmDialog, h, humanDuration, mmss } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { WorkoutScreen } from './WorkoutScreen';

/** Detalle de un entrenamiento del historial: qué se hizo, cuánto tiempo y repetirlo. */
export class HistoryDetailScreen implements Screen {
  readonly el = h('main', { class: 'screen history-detail' });

  constructor(private readonly app: App, private readonly entry: HistoryEntry) {
    const e = entry;
    const d = new Date(e.date);
    const end = new Date(d.getTime() + e.durationSec * 1000);
    const hm = (x: Date) => x.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const items = e.items ?? [];
    const skipped = items.filter((i) => !i.completed).length;

    const list: HTMLElement[] = [];
    for (const s of SECTION_IDS) {
      const its = items.filter((i) => i.section === s);
      if (!its.length) continue;
      const st = SECTION_STYLE[s];
      const head = h('h3', { class: 'hd-sec' }, h('span', { class: 'sec-dot' }, icon(st.icon)), SECTION_TITLES[s],
        h('span', { class: 'muted small' }, mmss(its.reduce((n, i) => n + i.seconds, 0))));
      head.style.setProperty('--sec', st.color);
      list.push(head);
      for (const it of its) {
        const ex = app.catalog.get(it.exerciseId);
        const r = h('div', { class: 'card hd-row' + (it.completed ? '' : ' skipped') },
          h('span', { class: 'hd-mark' }, icon(it.completed ? 'check' : 'next')),
          h('div', { class: 'hd-text' },
            h('strong', {}, ex?.name ?? 'Ejercicio eliminado'),
            h('span', { class: 'muted small' }, it.completed ? 'Hecho' : it.seconds > 0 ? 'Saltado a medias' : 'Saltado')),
          h('span', { class: 'hd-secs' }, `${mmss(it.seconds)}`, h('span', { class: 'muted small' }, ` / ${mmss(it.planned)}`)));
        r.style.setProperty('--sec', st.color);
        list.push(r);
      }
    }

    const canRepeat = items.some((i) => app.catalog.has(i.exerciseId) && !app.store.hidden.has(i.exerciseId));
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('span', { class: 'bar-title' }, 'Entrenamiento')),
      h('section', { class: 'detail-body hd-body' },
        e.routineName ? h('span', { class: 'h-name' }, e.routineName) : null,
        h('h2', { class: 'hd-date' }, d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
        h('p', { class: 'muted' }, `De ${hm(d)} a ${hm(end)}`),
        h('section', { class: 'stats-row' },
          stat('clock', humanDuration(e.durationSec), 'duración'),
          stat('check', `${e.exercisesDone}/${e.exercisesPlanned}`, 'hechos'),
          stat('next', String(items.length ? skipped : e.exercisesPlanned - e.exercisesDone), 'saltados')),
        !e.completed ? h('p', { class: 'note' }, icon('info'), 'Se terminó antes de acabar la tabla.') : null,
        ...(items.length
          ? list
          : [h('p', { class: 'muted' }, 'Este entrenamiento es de una versión anterior de la app y no guarda el detalle de cada ejercicio.')]),
        canRepeat
          ? h('button', { class: 'btn primary block', onclick: () => this.repeat() }, icon('play'), 'Repetir este entrenamiento')
          : null,
        h('button', { class: 'btn danger block', onclick: () => void this.remove() }, icon('trash'), 'Borrar este entrenamiento')),
    );
  }

  /** Vuelve a hacer los mismos ejercicios, en el mismo orden y con los tiempos previstos. */
  private repeat(): void {
    const { app, entry } = this;
    const routine = emptyRoutine();
    for (const it of entry.items ?? []) {
      if (app.store.hidden.has(it.exerciseId)) continue;
      const sec = app.catalog.get(it.exerciseId)?.section;
      if (sec) routine[sec].push({ exerciseId: it.exerciseId, seconds: it.planned });
    }
    const plan = WorkoutPlan.build(routine, app.catalog, app.store.settings);
    if (plan.isEmpty) return;
    const table: SavedRoutine = app.store.routines.find((r) => r.id === entry.routineId)
      ?? { id: entry.routineId ?? 'historial', name: entry.routineName ?? 'Entrenamiento repetido', routine, createdAt: entry.date };
    app.sounds.unlock();
    app.voice.unlock();
    app.haptics.tap();
    app.push(new WorkoutScreen(app, plan, { ...table, routine }));
  }

  private async remove(): Promise<void> {
    if (!(await confirmDialog('¿Borrar este entrenamiento del historial? No se puede deshacer.', 'Borrar'))) return;
    const i = this.app.store.history.indexOf(this.entry);
    if (i >= 0) this.app.store.deleteHistoryAt(i);
    this.app.back();
  }
}

function stat(ic: Parameters<typeof icon>[0], value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label));
}

