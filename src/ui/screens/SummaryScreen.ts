import type { SessionSummary } from '../../domain/WorkoutSession';
import { SECTION_TITLES, type HeartSummary } from '../../domain/types';
import { caloriesOf } from '../../domain/calories';
import { askWeight, fmtKg } from '../components/weightCard';
import { weightSuggestion } from '../../domain/weights';
import type { App, Screen } from '../App';
import { h, humanDuration, kg } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { backupCard, backupDue } from '../components/backupPrompt';

/** Resumen al terminar, con una pequeña celebración si se completó. */
export class SummaryScreen implements Screen {
  readonly el = h('main', { class: 'screen summary' });

  constructor(private readonly app: App, s: SessionSummary, tableName: string, heart?: HeartSummary | null) {
    const win = s.completed;
    const confetti = win ? h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...Array.from({ length: 36 }, (_, i) => {
      const p = h('i', {});
      p.style.setProperty('--x', `${Math.round(Math.random() * 100)}%`);
      p.style.setProperty('--d', `${(Math.random() * 0.8).toFixed(2)}s`);
      p.style.setProperty('--r', `${Math.round(Math.random() * 360)}deg`);
      p.style.setProperty('--c', ['var(--accent)', 'var(--sec-warm)', 'var(--sec-abs)', 'var(--sec-stretch)', '#FFFFFF'][i % 5]);
      return p;
    })) : null;

    this.el.append(
      ...(confetti ? [confetti] : []),
      h('div', { class: 'summary-card' },
        h('div', { class: 'trophy' + (win ? ' win' : '') }, icon(win ? 'trophy' : 'check')),
        h('h1', {}, win ? '¡Buen trabajo!' : s.exercisesDone ? '¡Bien hecho!' : 'Sin ejercicios completados'),
        h('p', { class: 'eyebrow' }, win ? 'Entrenamiento finalizado' : s.exercisesDone ? 'Entrenamiento finalizado antes de tiempo' : 'Entrenamiento terminado'),
        h('p', { class: 'muted' }, tableName),
        h('div', { class: 'stats' },
          stat('clock', humanDuration(s.durationSec), 'Tiempo'),
          stat('bolt', `${s.exercisesDone}/${s.exercisesPlanned}`, 'Ejercicios'),
          stat('target', String(s.sections.length), s.sections.length === 1 ? 'Apartado' : 'Apartados')),
        s.sections.length
          ? h('div', { class: 'summary-secs' }, ...s.sections.map((x) => {
              const c = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[x].icon), SECTION_TITLES[x]);
              c.style.setProperty('--sec', SECTION_STYLE[x].color);
              return c;
            }))
          : null,
        heart ? h('p', { class: 'hr-summary' }, icon('heart'), `Pulso medio ${heart.avg} · máximo ${heart.max} ppm`) : null,
        this.kcal(s, heart),
        this.weightTips(s),
        s.exercisesDone ? h('p', { class: 'muted small' }, 'Guardado en el historial.') : null,
        s.exercisesDone && app.store.daysSinceWeight() >= 7 ? this.weightPrompt() : null,
        s.exercisesDone && backupDue(app) ? backupCard(app, { question: true }) : null,
        h('button', { class: 'btn primary block big', onclick: () => this.app.openTab('inicio') }, 'Volver al inicio')),
    );
  }

  /** Calorías aproximadas, o cómo verlas si faltan los datos. */
  private kcal(s: SessionSummary, heart?: HeartSummary | null): HTMLElement | null {
    if (!s.exercisesDone) return null;
    const c = caloriesOf({ date: s.startedAt.toISOString(), durationSec: s.durationSec, exercisesDone: s.exercisesDone, exercisesPlanned: s.exercisesPlanned,
      sections: s.sections, completed: s.completed, items: s.items, ...(heart ? { heart } : {}) }, { ...this.app.store.settings.profile, weight: this.app.store.currentWeight });
    if (!c) return null;
    return h('p', { class: 'kcal-summary' }, icon('flame'), `Unas ${c.kcal} kcal`, h('span', { class: 'muted small' }, c.method === 'pulso' ? ' · con tu pulso' : ' · estimadas'));
  }

  /** Ejercicios en los que ya toca subir de peso. */
  private weightTips(s: SessionSummary): HTMLElement | null {
    if (!s.exercisesDone) return null;
    const ids = [...new Set(s.items.filter((i) => i.weight && i.completed).map((i) => i.exerciseId))];
    const tips = ids.map((id) => ({ id, sug: weightSuggestion(this.app.store.history, id) })).filter((t) => t.sug).slice(0, 3);
    if (!tips.length) return null;
    return h('div', { class: 'note tip weight-tips' }, icon('bolt'),
      h('div', {}, ...tips.map(({ id, sug }) =>
        h('p', {}, h('strong', {}, this.app.catalog.get(id)?.name ?? ''), `: ${sug!.sessions} sesiones completas con ${kg(sug!.kg)}. Prueba con ${kg(sug!.next)} la próxima vez.`))));
  }

  /** Recordatorio semanal para anotar el peso. */
  private weightPrompt(): HTMLElement {
    const st = this.app.store;
    const d = st.daysSinceWeight();
    const card: HTMLElement = h('section', { class: 'card backup-prompt weight-prompt' },
      h('div', { class: 'bp-head' },
        h('span', { class: 'bp-icon' }, icon('trophy')),
        h('div', {},
          h('strong', {}, '¿Anotas tu peso de hoy?'),
          h('p', { class: 'muted small' }, d === Infinity ? 'Así verás tu evolución en el Historial y se calcularán las calorías.' : `La última vez fue hace ${d} días (${fmtKg(st.currentWeight!)}).`))),
      h('div', { class: 'bp-actions' },
        h('button', { class: 'btn ghost small', onclick: () => card.remove() }, 'Ahora no'),
        h('button', {
          class: 'btn primary small',
          onclick: async () => {
            if (await askWeight(this.app)) card.replaceChildren(h('p', { class: 'bp-done' }, icon('check'), `Peso anotado: ${fmtKg(st.currentWeight!)}`));
          },
        }, icon('plus'), 'Anotar peso')));
    return card;
  }

  onBack(): boolean {
    this.app.openTab('inicio');
    return true;
  }
}

function stat(ic: 'clock' | 'bolt' | 'target', value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label));
}
