import { remindersOf, type ReminderKind, type ReminderSettings } from '../../domain/reminders';
import { allowExact, askNotificationPermission, exactAllowed, REMINDERS_AVAILABLE } from '../../services/Reminders';
import { HAS_BACKUP } from '../../services/Backup';
import type { App, Screen } from '../App';
import { clear, confirmDialog, h, keepScroll } from '../dom';
import { icon, type IconName } from '../icons';
import { planTitle } from './PlanScreens';
import { dateText } from '../../i18n/fmtDate';

/** Días de la semana empezando por el lunes (0 = domingo). */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
/** Nombre corto del día en el idioma de la app («dl.», «lun», «Mon»…). */
export const dayName = (d: number) => dateText(new Date(2024, 0, d === 0 ? 7 : d), { weekday: 'short' }).replace('.', '');

/** Cada cuántas semanas (peso y copia de seguridad). */
export const EVERY: Array<[number, string]> = [[1, 'Cada semana'], [2, 'Cada 2 semanas'], [3, 'Cada 3 semanas'], [4, 'Cada 4 semanas']];

const OPTIONS: Array<{ kind: ReminderKind; icon: IconName; title: string; help: string; premium?: boolean }> = [
  { kind: 'train', icon: 'bolt', title: 'Entrenamiento', help: 'Para tus tablas. Si ese día ya has entrenado, no te avisa.' },
  { kind: 'weigh', icon: 'scale', title: 'Peso', help: 'Para anotar tu peso. Si ese día ya te has pesado, no te avisa.' },
  { kind: 'backup', icon: 'copy', title: 'Copia de seguridad', help: 'Para guardar tus tablas e historial. Si ese día ya la has hecho, no te avisa.', premium: true },
];

/** Recordatorios: elige qué te avisa (entrenamiento, peso, copia) y, para cada uno, los días y la hora. */
/**
 * Aviso si Android no deja programar a la hora exacta (Android 12 o más, ajuste «Alarmas y recordatorios»): sin él,
 * los recordatorios pueden llegar bastante más tarde. Se rellena al saber la respuesta (vacío si ya está permitido).
 */
function exactCard(): HTMLElement {
  const box = h('div', { class: 'rem-exact-box' });
  if (!REMINDERS_AVAILABLE) return box;
  void exactAllowed().then((ok) => {
    if (ok) return;
    box.append(h('section', { class: 'card rem-card rem-exact' },
      h('div', { class: 'switch-row' },
        h('span', { class: 'set-icon' }, icon('info')),
        h('span', { class: 'set-text' }, h('strong', {}, 'Avisos a la hora exacta'),
          h('span', { class: 'muted block small' }, 'Android no deja que los avisos lleguen a la hora justa y pueden llegar tarde. Permite «Alarmas y recordatorios» para Kasa Fit.'))),
      h('button', { class: 'btn primary block', onclick: async () => {
        await allowExact();
        if (await exactAllowed()) box.replaceChildren();
      } }, 'Permitir')));
  });
  return box;
}

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

  private paint(): void {
    clear(this.body);
    const r = this.value;
    const premium = this.app.access.premium;
    this.body.append(h('p', { class: 'muted small rem-intro' }, REMINDERS_AVAILABLE
      ? 'Elige qué quieres que te recuerde y, para cada uno, los días y la hora. Llegan como notificación aunque la app esté cerrada.'
      : 'Los recordatorios llegan como notificación en la app de Android, aunque esté cerrada. Aquí puedes ver cómo se configuran.'),
      exactCard());
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
        // entrenar: con un plan de la semana en uso (prémium), puede seguir sus días; el aviso dice qué toca
        const week = o.kind === 'train' && premium ? this.app.store.plan : undefined;
        const follow = !!week && !!rule.followPlan;
        const planDays = week ? week.days.map((x) => x.day) : [];
        card.append(h('div', { class: 'rem-opts' },
          week ? h('label', { class: 'switch-row rem-follow', for: 'rem-follow' },
            h('span', { class: 'set-text' }, h('strong', {}, 'Seguir el plan de la semana'),
              h('span', { class: 'muted block small' }, h('span', { 'data-no-tr': '' }, `«${planTitle(week)}». `), 'Te avisa sus días y te dice qué toca.')),
            h('input', { type: 'checkbox', id: 'rem-follow', class: 'switch', checked: follow, onchange: (e: Event) =>
              this.save({ ...r, train: { ...rule, followPlan: (e.target as HTMLInputElement).checked } }) })) : null,
          h('span', { class: 'muted small' }, 'Días'),
          follow
            ? h('div', { class: 'rem-days', 'data-no-tr': '' }, ...WEEK.map((d) => h('span', { class: 'rem-day fixed' + (planDays.includes(d) ? ' on' : '') }, dayName(d))))
            : h('div', { class: 'rem-days', 'data-no-tr': '' }, ...WEEK.map((d) => {
              const sel = rule.days.includes(d);
              return h('button', { class: 'rem-day' + (sel ? ' on' : ''), 'aria-pressed': String(sel), onclick: () =>
                this.save({ ...r, [o.kind]: { ...rule, days: sel ? rule.days.filter((x) => x !== d) : [...rule.days, d] } }) }, dayName(d));
            })),
          follow ? h('span', { class: 'muted small rem-fixed' }, 'Son los días del plan.') : null,
          !follow && !rule.days.length ? h('span', { class: 'rem-warn small' }, icon('info'), 'Marca al menos un día.') : null,
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
    }
    this.body.append(h('div', { class: 'look-save' },
      h('button', { class: 'btn primary block big', onclick: () => { this.app.haptics.tap(); this.app.back(); } }, icon('check'), 'Guardar')));
  }
}
