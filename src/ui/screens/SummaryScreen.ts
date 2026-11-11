import type { SessionSummary } from '../../domain/WorkoutSession';
import { SECTION_TITLES, type HeartSummary } from '../../domain/types';
import { caloriesOf } from '../../domain/calories';
import { weightSuggestion } from '../../domain/weights';
import { checkAndCelebrate } from '../components/medals';
import type { App, Screen } from '../App';
import { h, humanDuration, kg } from '../dom';
import { icon, SECTION_STYLE } from '../icons';
import { remindersDue, showReminders } from '../components/weightReminder';
import { finishPhrase } from '../../services/Coach';
import { streak } from '../dates';

/** Resumen al terminar, con una pequeña celebración si se completó. */
export class SummaryScreen implements Screen {
  readonly el = h('main', { class: 'screen summary' });

  constructor(private readonly app: App, s: SessionSummary, tableName: string, heart?: HeartSummary | null) {
    const win = s.completed;
    if (s.exercisesDone) {
      const c = this.calories(s, heart);
      this.phrase = finishPhrase(app.voice.lang, { name: app.store.settings.profile.name || undefined, completed: win, seconds: s.durationSec, kcal: c?.kcal });
    }
    const name = app.store.settings.profile.name;
    const nm = name ? `, ${name}` : '';
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
        h('h1', {}, win ? `¡Buen trabajo${nm}!` : s.exercisesDone ? `¡Bien hecho${nm}!` : 'Sin ejercicios completados'),
        h('p', { class: 'eyebrow' }, win ? 'Entrenamiento finalizado' : s.exercisesDone ? 'Entrenamiento finalizado antes de tiempo' : 'Entrenamiento terminado'),
        h('p', { class: 'muted' }, tableName),
        h('div', { class: 'stats' },
          stat('clock', humanDuration(s.durationSec), 'Tiempo'),
          stat('bolt', `${s.exercisesDone}/${s.exercisesPlanned}`, 'Ejercicios'),
          stat('flame', s.exercisesDone ? String(this.calories(s, heart)?.kcal ?? '—') : '—', 'kcal')),
        s.sections.length
          ? h('div', { class: 'summary-secs' }, ...s.sections.map((x) => {
              const c = h('span', { class: 'sec-pill' }, icon(SECTION_STYLE[x].icon), SECTION_TITLES[x]);
              c.style.setProperty('--sec', SECTION_STYLE[x].color);
              return c;
            }))
          : null,
        heart ? h('p', { class: 'hr-summary' }, icon('heart'), `Pulso medio ${heart.avg} · máximo ${heart.max} ppm`) : null,
        this.streakLine(s),
        this.weightTips(s),
        s.exercisesDone ? h('p', { class: 'muted small' }, 'Guardado en el historial.') : null,
        // los recordatorios (peso, copia) salen después, en una ventana, al volver al inicio
        h('button', { class: 'btn primary block big', onclick: () => {
          this.app.voice.stop();
          this.app.openTab('inicio');
          if (s.exercisesDone && remindersDue(this.app)) showReminders(this.app);
        } }, 'Volver al inicio')),
    );
  }

  /** Frase final que dice la voz al llegar al resumen. */
  private phrase = '';

  private calories(s: SessionSummary, heart?: HeartSummary | null) {
    return caloriesOf({ date: s.startedAt.toISOString(), durationSec: s.durationSec, exercisesDone: s.exercisesDone, exercisesPlanned: s.exercisesPlanned,
      sections: s.sections, completed: s.completed, items: s.items, ...(heart ? { heart } : {}) }, { ...this.app.store.settings.profile, weight: this.app.store.currentWeight });
  }

  /** Racha de días seguidos entrenando (contando el de hoy). */
  private streakLine(s: SessionSummary): HTMLElement | null {
    if (!s.exercisesDone) return null;
    const today = { date: s.startedAt.toISOString() } as (typeof this.app.store.history)[number];
    const n = streak([...this.app.store.history, today]);
    return h('p', { class: 'kcal-summary' }, icon('calendar'), n === 1 ? 'Primer día de racha' : `Racha de ${n} días seguidos`);
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

  enter(): void {
    // medallas nuevas tras este entrenamiento
    if (!this.checked) {
      this.checked = true;
      // tras la fanfarria, la voz dice el resumen (se calla si se vuelve al inicio)
      if (this.phrase) window.setTimeout(() => { if (this.app.current === this) this.app.voice.say(this.phrase); }, 1600);
      window.setTimeout(() => checkAndCelebrate(this.app), 900);
    }
  }

  private checked = false;

  onBack(): boolean {
    this.app.voice.stop();
    this.app.openTab('inicio');
    return true;
  }
}

function stat(ic: 'clock' | 'bolt' | 'flame', value: string, label: string): HTMLElement {
  return h('div', { class: 'stat' }, icon(ic), h('span', { class: 'stat-value' }, value), h('span', { class: 'muted small' }, label));
}
