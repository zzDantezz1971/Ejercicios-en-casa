import { LocalNotifications } from '@capacitor/local-notifications';
import { tr } from '../i18n';
import { IS_NATIVE } from '../platform/native';
import { planReminders, remindersOf, type ReminderKind } from '../domain/reminders';
import { GOAL_INFO } from '../domain/generator';
import { kindLabel } from '../domain/weekPlan';
import { HAS_BACKUP } from './Backup';
import type { Store } from '../domain/Store';

/** Recordatorios: solo en la app Android (en la web no se pueden programar con la app cerrada). */
export const REMINDERS_AVAILABLE = IS_NATIVE;

const TEXT: Record<ReminderKind, [string, string]> = {
  train: ['Hora de entrenar', 'Tu tabla te espera. ¡Vamos!'],
  weigh: ['Toca pesarse', 'Anota tu peso en Mis datos para ver cómo avanzas.'],
  backup: ['Haz una copia de seguridad', 'Hace días que no guardas una copia de tus tablas y tu historial.'],
};

/** Pide permiso para mostrar notificaciones (Android 13 o más). Devuelve si se puede. */
export async function askNotificationPermission(): Promise<boolean> {
  if (!IS_NATIVE) return false;
  try {
    let st = await LocalNotifications.checkPermissions();
    if (st.display !== 'granted') st = await LocalNotifications.requestPermissions();
    return st.display === 'granted';
  } catch {
    return false;
  }
}

/** ¿Android deja programar avisos a la hora exacta? (Android 12 o más: ajuste «Alarmas y recordatorios».) */
export async function exactAllowed(): Promise<boolean> {
  if (!IS_NATIVE) return true;
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return true;
  }
}

/** Abre el ajuste del móvil para permitir los avisos a la hora exacta. */
export async function allowExact(): Promise<void> {
  if (!IS_NATIVE) return;
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch {
    /* sin ese ajuste (Android antiguo): ya se puede */
  }
}

/** Una llamada al sistema que no contesta no puede dejar los avisos parados para siempre. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((r) => window.setTimeout(() => r(undefined), ms))]);
}

let timer = 0;
let busy: Promise<void> = Promise.resolve();

/** Vuelve a programar todos los avisos según los ajustes y lo que ya has hecho (con un pequeño retraso). */
export function rescheduleReminders(store: Store, premium: () => boolean): void {
  if (!IS_NATIVE) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    busy = busy.then(() => withTimeout(reschedule(store, premium()), 15000)).then(() => undefined, () => undefined);
  }, 800);
}

async function reschedule(store: Store, premium: boolean): Promise<void> {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  const settings = remindersOf(store.settings.reminders);
  // en la app de Android no hay copia a mano: tampoco su recordatorio
  if (!HAS_BACKUP) settings.backup.on = false;
  // el de entrenar puede seguir el plan de la semana en uso (prémium): sus días, y el aviso dice qué toca
  const week = premium && settings.train.followPlan ? store.plan : undefined;
  if (week) settings.train = { ...settings.train, days: week.days.map((d) => d.day) };
  const plan = planReminders(new Date(), settings, {
    trainings: store.history.map((e) => e.date),
    weighings: store.weights.map((w) => w.date),
    lastBackup: store.lastBackup,
    premium,
  });
  if (!plan.length) return;
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
  // a la hora exacta solo si Android lo permite: si no, el complemento abriría el ajuste del sistema cada vez
  // (y, con la app en segundo plano, se quedaba esperando y ya no programaba nada); así llegan, aunque con algún
  // minuto de retraso, hasta que se permita en Recordatorios
  const exact = await exactAllowed();
  const look = { smallIcon: 'ic_stat_kasa', iconColor: '#3D6BFF', isExactNotification: exact };
  await LocalNotifications.schedule({
    notifications: [
      ...plan.map((p) => {
        const d = p.kind === 'train' && week ? week.days.find((y) => y.day === p.at.getDay()) : undefined;
        const text = d && week
          ? { title: `${tr('Plan de la semana')}: ${week.name ?? tr(GOAL_INFO[week.goal].name)}`, body: `${tr('Hoy toca')}: ${tr(kindLabel(week, d.kind))}` }
          : { title: tr(TEXT[p.kind][0]), body: tr(TEXT[p.kind][1]) };
        return { id: p.id, ...text, schedule: { at: p.at, allowWhileIdle: true }, ...look };
      }),
    ],
  });
}
