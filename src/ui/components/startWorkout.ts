import type { WorkoutPlan } from '../../domain/WorkoutPlan';
import type { SavedRoutine } from '../../domain/types';
import type { App } from '../App';
import { h } from '../dom';
import { icon } from '../icons';
import { WorkoutScreen } from '../screens/WorkoutScreen';

/**
 * Empieza un entrenamiento. Si se usa el reloj y no está conectado, antes muestra la pantalla
 * para activar las pulsaciones; con "Cancelar" empieza sin ellas.
 */
export async function startWorkout(app: App, plan: WorkoutPlan, table: SavedRoutine): Promise<void> {
  // El sonido y la voz solo se activan desde un toque del usuario.
  app.sounds.unlock();
  app.voice.unlock();
  app.haptics.tap();
  if (app.heart.available && app.store.settings.askWatch && !app.heart.connected) {
    await watchDialog(app);
  }
  app.push(new WorkoutScreen(app, plan, table));
}

/** Pantalla de espera del reloj. Se resuelve al recibir el pulso o al cancelar. */
function watchDialog(app: App): Promise<void> {
  return new Promise((resolve) => {
    const hr = app.heart;
    let done = false;
    const status = h('p', { class: 'wd-status', 'aria-live': 'polite' });
    const connectBtn = h('button', { class: 'btn primary' }, icon('heart'), 'Conectar reloj');
    const cancelBtn = h('button', { class: 'btn ghost' }, 'Empezar sin pulsaciones');
    const never = h('input', { type: 'checkbox', id: 'watch-never' });

    const finish = () => {
      if (done) return;
      done = true;
      off();
      if (never.checked) app.store.saveSettings({ ...app.store.settings, askWatch: false });
      wrap.remove();
      resolve();
    };
    const paint = () => {
      const bpm = hr.current;
      status.className = 'wd-status ' + hr.status;
      if (hr.status === 'on' && bpm) {
        status.replaceChildren(icon('heart'), `¡Conectado! ${bpm} ppm`);
        connectBtn.disabled = true;
        // deja ver el pulso un momento y empieza
        setTimeout(finish, 1200);
      } else if (hr.status === 'on') {
        status.replaceChildren(icon('heart'), 'Conectado, esperando el pulso…');
      } else if (hr.status === 'connecting' || hr.status === 'lost') {
        status.replaceChildren(icon('heart'), 'Conectando…');
      }
    };
    const off = hr.onChange(paint);

    connectBtn.addEventListener('click', async () => {
      status.className = 'wd-status';
      status.replaceChildren('Elige tu reloj en la lista…');
      try {
        await hr.connect();
      } catch (e) {
        const name = (e as DOMException)?.name;
        status.className = 'wd-status warn';
        status.replaceChildren(name === 'NotFoundError' || name === 'AbortError'
          ? 'No se ha elegido ningún reloj. Si no aparecía en la lista, comprueba que la opción está activada en el reloj y vuelve a pulsar "Conectar reloj".'
          : `No se pudo conectar (${(e as Error).message}). Vuelve a intentarlo.`);
      }
    });
    cancelBtn.addEventListener('click', () => {
      if (hr.status !== 'on') hr.disconnect();
      finish();
    });

    const wrap = h('div', { class: 'dialog-wrap' },
      h('div', { class: 'dialog watch-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'watch-title' },
        h('div', { class: 'wd-head' },
          h('span', { class: 'wd-heart' }, icon('heart')),
          h('h2', { id: 'watch-title' }, 'Pulsaciones del reloj')),
        h('ol', { class: 'wd-steps' },
          h('li', {}, 'En el reloj, activa ', h('strong', {}, 'Difundir frecuencia cardíaca'), ' (suele estar en Ajustes › Ajustes de entrenamiento).'),
          h('li', {}, 'Pulsa ', h('strong', {}, 'Conectar reloj'), ' y elígelo en la lista.'),
          h('li', {}, 'Cuando llegue tu pulso, el entrenamiento empezará solo.')),
        h('p', { class: 'muted small' }, 'Si el reloj no aparece en la lista, inicia un entrenamiento en el reloj y vuelve a intentarlo.'),
        status,
        h('div', { class: 'wd-actions' }, connectBtn, cancelBtn),
        h('label', { class: 'wd-never', for: 'watch-never' }, never, 'No volver a preguntar (se puede cambiar en Ajustes)')));
    document.body.append(wrap);
    connectBtn.focus();
  });
}
