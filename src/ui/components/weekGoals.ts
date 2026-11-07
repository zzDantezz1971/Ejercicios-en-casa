import type { App } from '../App';
import { h } from '../dom';
import { icon } from '../icons';

/** Ventana de "Tu semana": qué mide cada anillo y las metas de minutos y calorías, que se pueden cambiar. */
export function weekGoalsDialog(app: App, info: { days: number; mins: number; kcal: number | null; prevKcal: number | null }, onSave: () => void): void {
  const st = app.store;
  let minutes = st.settings.weekGoals.minutes;
  let kcal = st.settings.weekGoals.kcal;
  const auto = () => Math.max(300, info.prevKcal ?? 0);

  const stepper = (get: () => number, set: (v: number) => void, step: number, min: number, max: number, unit: string, label: string) => {
    const val = h('span', { class: 'secs' });
    const paint = () => (val.textContent = `${get()} ${unit}`);
    paint();
    return h('div', { class: 'stepper' },
      h('button', { 'aria-label': `Menos ${label}`, onclick: () => { set(Math.max(min, get() - step)); paint(); } }, '−'),
      val,
      h('button', { 'aria-label': `Más ${label}`, onclick: () => { set(Math.min(max, get() + step)); paint(); } }, '+'));
  };

  const kcalBox = h('div', { class: 'wg-kcal' });
  const paintKcal = () => {
    kcalBox.replaceChildren(
      h('div', { class: 'segmented small' },
        h('button', { class: 'seg' + (kcal === null ? ' on' : ''), onclick: () => { kcal = null; paintKcal(); } }, 'Automática'),
        h('button', { class: 'seg' + (kcal !== null ? ' on' : ''), onclick: () => { kcal = kcal ?? auto(); paintKcal(); } }, 'Fija')),
      kcal === null
        ? h('p', { class: 'muted small' }, `Lo que quemaste la semana pasada (mínimo 300): ahora ${auto()} kcal.`)
        : stepper(() => kcal!, (v) => (kcal = v), 50, 100, 5000, 'kcal', 'calorías'));
  };
  paintKcal();

  const row = (color: string, ic: Parameters<typeof icon>[0], title: string, now: string, text: string, extra?: HTMLElement) => {
    const r = h('div', { class: 'wg-row' },
      h('span', { class: 'wg-ico' }, icon(ic)),
      h('div', { class: 'wg-body' },
        h('div', { class: 'wg-top' }, h('strong', {}, title), h('span', { class: 'wg-now' }, now)),
        h('p', { class: 'muted small' }, text),
        extra ?? null));
    r.style.setProperty('--c', color);
    return r;
  };

  const close = () => wrap.remove();
  const wrap = h('div', { class: 'dialog-wrap', onclick: (e: Event) => e.target === wrap && close() },
    h('div', { class: 'dialog week-goals', role: 'dialog', 'aria-modal': 'true' },
      h('h3', {}, 'Tu semana'),
      h('p', { class: 'muted small' }, 'Los anillos se llenan de lunes a domingo a medida que entrenas.'),
      row('var(--sec-warm)', 'calendar', 'Días', `${info.days} de 7`, 'Días de la semana en los que has entrenado.'),
      row('var(--accent)', 'clock', 'Minutos', `${info.mins} min`, 'Tiempo entrenado esta semana. La OMS recomienda al menos 150 minutos a la semana.',
        h('div', { class: 'wg-goal' }, h('span', { class: 'muted small' }, 'Meta'), stepper(() => minutes, (v) => (minutes = v), 10, 30, 600, 'min', 'minutos'))),
      row('var(--sec-stretch)', 'flame', 'Calorías', info.kcal != null ? `${info.kcal} kcal` : '—', 'Calorías aproximadas de tus entrenamientos de esta semana.',
        h('div', { class: 'wg-goal' }, h('span', { class: 'muted small' }, 'Meta'), kcalBox)),
      h('div', { class: 'dialog-actions' },
        h('button', { class: 'btn ghost', onclick: close }, 'Cancelar'),
        h('button', { class: 'btn primary', onclick: () => {
          st.saveSettings({ ...st.settings, weekGoals: { minutes, kcal } });
          close();
          onSave();
        } }, 'Guardar'))));
  document.body.append(wrap);
}
