import { LOCALE } from '../../i18n';
import { remindersOf, type ReminderKind, type ReminderSettings } from '../../domain/reminders';
import { askNotificationPermission, REMINDERS_AVAILABLE } from '../../services/Reminders';
import { HAS_BACKUP } from '../../services/Backup';
import type { App, Screen } from '../App';
import { clear, confirmDialog, h, keepScroll } from '../dom';
import { icon, type IconName } from '../icons';
import { planTitle, planSummary } from './PlanScreens';

/** Días de la semana empezando por el lunes (0 = domingo). */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
/** Nombre corto del día en el idioma de la app («dl.», «lun», «Mon»…). */
export const dayName = (d: number) => new Date(2024, 0, d === 0 ? 7 : d).toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '');

/** Cada cuántas semanas (peso y copia de seguridad). */
export const EVERY: Array<[number, string]> = [[1, 'Cada semana'], [2, 'Cada 2 semanas'], [3, 'Cada 3 semanas'], [4, 'Cada 4 semanas']];

const OPTIONS: Array<{ kind: ReminderKind; icon: IconName; title: string; help: string; premium?: boolean }> = [
  { kind: 'train', icon: 'bolt', title: 'Entrenamiento', help: 'Para tus tablas. Si ese día ya has entrenado, no te avisa.' },
  { kind: 'weigh', icon: 'scale', title: 'Peso', help: 'Para anotar tu peso. Si ese día ya te has pesado, no te avisa.' },
  { kind: 'backup', icon: 'copy', title: 'Copia de seguridad', help: 'Para guardar tus tablas e historial. Si ese día ya la has hecho, no te avisa.', premium: true },
];

/** Recordatorios: elige qué te avisa (entrenamiento, peso, copia) y, para cada uno, los días y la hora. */
export class RemindersScreen implements Screen {
  readonly el = h('main', { class: 'screen reminders-screen' });
  private body = h('div', { class: 'settings-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('h1', { class: 'bar-title' }, 'Recordatorios')),
      this.body);
  }

  enter(): void {
    this.render();
  }

  private get value(): ReminderSettings {
    return remindersOf(this.app.store.settings.reminders);
  }

  private save(next: ReminderSettings): void {
    this.app.store.saveSettings({ ...this.app.store.settings, reminders: next });
    this.app.haptics.tap();
    this.render();
  }

  /** Activar o desactivar uno; al activarlo se pide permiso para las notificaciones. */
  private async turn(kind: ReminderKind, on: boolean): Promise<void> {
    const r = this.value;
    // en la web se puede configurar para verlo, pero los avisos solo llegan en la app de Android
    if (on && REMINDERS_AVAILABLE && !(await askNotificationPermission())) {
      await confirmDialog('Para recibir recordatorios, permite las notificaciones de Kasa Fit en los ajustes del móvil.', 'Vale', '');
      this.render();
      return;
    }
    this.save({ ...r, [kind]: { ...r[kind], on, since: new Date().toISOString() } });
  }

  /** Vuelve a pintar sin mover la pantalla (si no, al vaciarla por un momento salta arriba). */
  private render(): void {
    keepScroll(this.body, () => this.paint());
  }

  /** Entrada «Plan de la semana»: qué planes tienen el aviso activado; abre la lista. */
  private planCard(): HTMLElement {
    const { app } = this;
    const locked = !app.access.premium;
    const plans = locked ? [] : app.store.plans;
    const on = plans.filter((p) => p.remind?.on);
    const sub = locked ? 'Cada plan de la semana con su aviso, sus días y su hora.'
      : !plans.length ? 'Cuando crees un plan de la semana, aquí podrás activar su aviso.'
      : on.length ? on.map((p) => planTitle(p)).join(', ') : 'Ningún aviso activado.';
    return h('section', { class: 'card rem-card rem-plans' + (on.length ? ' on' : '') },
      h('button', { class: 'switch-row rem-plans-open', onclick: () => (locked ? app.showPremium() : app.push(new PlanRemindersScreen(app))) },
        h('span', { class: 'set-icon' }, icon('calendar')),
        h('span', { class: 'set-text' }, h('strong', {}, 'Plan de la semana', locked ? icon('lock', 'ico rem-lock') : null), h('span', { class: 'muted block small', 'data-no-tr': on.length ? '' : null }, sub)),
        icon('chevron', 'ico chev')));
  }

  private paint(): void {
    clear(this.body);
    const r = this.value;
    const premium = this.app.access.premium;
    this.body.append(h('p', { class: 'muted small rem-intro' }, REMINDERS_AVAILABLE
      ? 'Elige qué quieres que te recuerde y, para cada uno, los días y la hora. Llegan como notificación aunque la app esté cerrada.'
      : 'Los recordatorios llegan como notificación en la app de Android, aunque esté cerrada. Aquí puedes ver cómo se configuran.'));
    // la copia de seguridad solo existe en la web
    for (const o of OPTIONS.filter((x) => x.kind !== 'backup' || HAS_BACKUP)) {
      const locked = !!o.premium && !premium;
      const rule = r[o.kind];
      const on = rule.on && !locked;
      const id = `rem-${o.kind}`;
      const card = h('section', { class: 'card rem-card' + (on ? ' on' : '') },
        h('label', { class: 'switch-row', for: id },
          h('span', { class: 'set-icon' }, icon(o.icon)),
          h('span', { class: 'set-text' }, h('strong', {}, o.title, locked ? icon('lock', 'ico rem-lock') : null), h('span', { class: 'muted block small' }, o.help)),
          h('input', { type: 'checkbox', id, class: 'switch', checked: on, onchange: (e: Event) => {
            const el = e.target as HTMLInputElement;
            if (locked) { el.checked = false; this.app.showPremium(); return; }
            void this.turn(o.kind, el.checked);
          } })));
      if (on) {
        card.append(h('div', { class: 'rem-opts' },
          h('span', { class: 'muted small' }, 'Días'),
          h('div', { class: 'rem-days', 'data-no-tr': '' }, ...WEEK.map((d) => {
            const sel = rule.days.includes(d);
            return h('button', { class: 'rem-day' + (sel ? ' on' : ''), 'aria-pressed': String(sel), onclick: () =>
              this.save({ ...r, [o.kind]: { ...rule, days: sel ? rule.days.filter((x) => x !== d) : [...rule.days, d] } }) }, dayName(d));
          })),
          !rule.days.length ? h('span', { class: 'rem-warn small' }, icon('info'), 'Marca al menos un día.') : null,
          // peso y copia: cada cuántas semanas
          o.kind !== 'train' ? h('label', { class: 'rem-hour' }, h('span', { class: 'muted small' }, 'Frecuencia'),
            h('select', { class: 'rem-time rem-every', onchange: (e: Event) =>
              this.save({ ...r, [o.kind]: { ...rule, every: Number((e.target as HTMLSelectElement).value), since: new Date().toISOString() } }) },
              ...EVERY.map(([n, label]) => h('option', { value: String(n), selected: (rule.every ?? 1) === n }, label)))) : null,
          h('label', { class: 'rem-hour' }, h('span', { class: 'muted small' }, 'Hora'),
            h('input', { type: 'time', class: 'rem-time', value: rule.time, onchange: (e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (v) this.save({ ...r, [o.kind]: { ...rule, time: v } });
            } }))));
      }
      this.body.append(card);
      // después del de entrenar: los avisos de los planes de la semana (cada plan, el suyo)
      if (o.kind === 'train') this.body.append(this.planCard());
    }
    this.body.append(h('div', { class: 'look-save' },
      h('button', { class: 'btn primary block big', onclick: () => { this.app.haptics.tap(); this.app.back(); } }, icon('check'), 'Guardar')));
  }
}

/** Avisos de los planes de la semana: cada plan con su nombre, sus días (los del plan) y la hora. */
export class PlanRemindersScreen implements Screen {
  readonly el = h('main', { class: 'screen reminders-screen' });
  private body = h('div', { class: 'settings-body' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('div', { class: 'titles' }, h('span', { class: 'subtitle' }, 'Recordatorios'), h('h1', { class: 'bar-title' }, 'Plan de la semana'))),
      this.body);
  }

  enter(): void {
    this.render();
  }

  private render(): void {
    keepScroll(this.body, () => this.paint());
  }

  private async turn(id: string, on: boolean): Promise<void> {
    const p = this.app.store.planById(id);
    if (!p) return;
    if (on && REMINDERS_AVAILABLE && !(await askNotificationPermission())) {
      await confirmDialog('Para recibir recordatorios, permite las notificaciones de Kasa Fit en los ajustes del móvil.', 'Vale', '');
      this.render();
      return;
    }
    this.app.store.setPlan({ ...p, remind: { on, time: p.remind?.time ?? remindersOf(this.app.store.settings.reminders).train.time } });
    this.app.haptics.tap();
    this.render();
  }

  private paint(): void {
    clear(this.body);
    const { app } = this;
    const plans = app.store.plans;
    this.body.append(h('p', { class: 'muted small rem-intro' }, 'Cada plan te avisa sus días de entrenamiento, a la hora que elijas. Si ese día ya has entrenado, no te avisa. Al borrar un plan, se borra también su aviso.'));
    if (!plans.length) {
      this.body.append(h('section', { class: 'card rem-card rem-empty' }, h('p', { class: 'muted' }, 'Aún no tienes ningún plan de la semana.')));
      return;
    }
    for (const p of plans) {
      const on = !!p.remind?.on;
      const id = `rem-plan-${p.id}`;
      const days = WEEK.filter((d) => p.days.some((x) => x.day === d));
      const card = h('section', { class: 'card rem-card' + (on ? ' on' : '') },
        h('label', { class: 'switch-row', for: id },
          h('span', { class: 'set-icon' }, icon('calendar')),
          h('span', { class: 'set-text' }, h('strong', { 'data-no-tr': p.name ? '' : null }, planTitle(p)), h('span', { class: 'muted block small' }, p.name ? planSummary(p) : planSummary(p).split(' · ').slice(1).join(' · '))),
          h('input', { type: 'checkbox', id, class: 'switch', checked: on, onchange: (e: Event) => void this.turn(p.id, (e.target as HTMLInputElement).checked) })));
      if (on) {
        card.append(h('div', { class: 'rem-opts' },
          h('span', { class: 'muted small' }, 'Días'),
          h('div', { class: 'rem-days', 'data-no-tr': '' }, ...WEEK.map((d) => h('span', { class: 'rem-day fixed' + (days.includes(d) ? ' on' : '') }, dayName(d)))),
          h('span', { class: 'muted small rem-fixed' }, 'Son los días del plan.'),
          h('label', { class: 'rem-hour' }, h('span', { class: 'muted small' }, 'Hora'),
            h('input', { type: 'time', class: 'rem-time', value: p.remind!.time, onchange: (e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (v) { app.store.setPlan({ ...p, remind: { on: true, time: v } }); app.haptics.tap(); }
            } }))));
      }
      this.body.append(card);
    }
  }
}
