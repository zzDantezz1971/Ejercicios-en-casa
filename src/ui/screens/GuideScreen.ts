import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon, type IconName } from '../icons';

/** Qué puede hacer la app, por apartados (los textos se traducen con i18n/ui.ts). */
const GUIDE: Array<{ icon: IconName; title: string; sub: string; points: string[] }> = [
  { icon: 'play', title: 'Primeros pasos', sub: 'Empieza a entrenar en tres pasos.', points: [
      'En Mis datos, marca el material que tienes en casa: verás los ejercicios que puedes hacer.',
      'En Tablas, crea una tabla y elige los ejercicios de cada apartado.',
      'En Inicio, pulsa Empezar y sigue al muñeco.'] },
  { icon: 'home', title: 'Inicio', sub: 'Tu tabla y tu semana de un vistazo.', points: [
      'La tabla que vas a hacer, con su contenido y el botón para empezar. Puedes cambiar de tabla desde aquí.',
      'Tu semana: minutos y calorías, con unas metas que puedes cambiar.',
      'Una frase motivadora distinta cada día (se puede quitar en Ajustes).',
      'Avisos cuando toca anotar el peso o hacer una copia de seguridad.'] },
  { icon: 'tables', title: 'Tablas y ejercicios', sub: 'Más de 200 ejercicios para armar tus tablas.', points: [
      'Crea tantas tablas como quieras, cámbiales el nombre, duplícalas o bórralas.',
      'Cuatro apartados: Calentamiento, Fuerza, Abdominales y Estiramientos.',
      'Toca un ejercicio para ver al muñeco haciéndolo, cómo se hace paso a paso y los músculos que trabaja. Desliza para pasar al siguiente.',
      'Busca por nombre o zona, marca favoritos con la estrella y ordena la lista por zona, músculo, material o nombre, o a tu manera con «Ordenar lista».',
      'En los ejercicios elegidos puedes cambiar los segundos, el orden y, si usan pesas, anotar el peso.',
      'Vueltas: repite todos los ejercicios de un apartado 2, 3 o más veces seguidas.'] },
  { icon: 'bolt', title: 'Entrenar', sub: 'El muñeco te guía ejercicio a ejercicio.', points: [
      'Cada ejercicio con el muñeco animado y una cuenta atrás.',
      'Pitidos, vibración y voz te avisan del siguiente ejercicio, del cambio de lado y de los últimos segundos.',
      'Puedes pausar, saltar un ejercicio, volver al anterior o terminar antes: lo que hayas hecho se guarda en el historial.',
      'La pausa entre ejercicios y la cuenta atrás de cada apartado se cambian en Ajustes.'] },
  { icon: 'heart', title: 'Pulsaciones del reloj', sub: 'Ve tu pulso mientras entrenas.', points: [
      'Conecta un reloj o una pulsera que difunda la frecuencia cardíaca por Bluetooth: verás tus pulsaciones durante el entrenamiento y las calorías se calcularán con tu pulso.',
      'En Ajustes › Reloj tienes los pasos para conectarlo.'] },
  { icon: 'calendar', title: 'Historial y resúmenes', sub: 'Todo lo que has entrenado, día a día.', points: [
      'Calendario con los días entrenados; toca uno para ver el detalle de ese entrenamiento.',
      'Resumen semanal y mensual: tiempo, calorías, pulsaciones medias, tiempo por apartado, récords y el mapa de los músculos trabajados.',
      'Puedes repetir un entrenamiento, copiarlo a otro día o borrarlo.'] },
  { icon: 'user', title: 'Mis datos y peso', sub: 'Para calcular calorías e IMC y seguir tu peso.', points: [
      'Nombre, edad, altura y sexo: se usan para calcular las calorías y el IMC.',
      'Anota tu peso cuando quieras y mira su evolución en el gráfico, con tu objetivo de peso.',
      'Mi material: marca lo que tienes; los ejercicios sin material se ven siempre.'] },
  { icon: 'trophy', title: 'Medallas', sub: 'Premios por tu constancia.', points: [
      'Gana medallas por entrenamientos, constancia, tiempo entrenado, calorías, peso, fuerza y apartados, y alguna especial.'] },
  { icon: 'settings', title: 'Ajustes', sub: 'Deja la app a tu gusto.', points: [
      'Idioma (català, castellano o English) y modo oscuro, claro o el del móvil.',
      'Personaliza el muñeco: color de piel, pelo y ropa; con prémium, también peinado, ropa, gafas, barba y cuerpo de mujer.',
      'Tiempos, pitidos, voz y frases motivadoras.'] },
  { icon: 'bell', title: 'Recordatorios', sub: 'Avisos en el móvil a la hora que elijas.', points: [
      'Para entrenar, pesarte y hacer la copia de seguridad, los días y a la hora que elijas. Llegan como notificación en la app de Android, aunque esté cerrada.'] },
  { icon: 'copy', title: 'Copia de seguridad', sub: 'No pierdas tus datos.', points: [
      'Guarda tus tablas, historial y ajustes en un archivo (por ejemplo, en Drive) y restáuralo si cambias de móvil.'] },
  { icon: 'star', title: 'Gratis y prémium', sub: 'Qué incluye cada versión.', points: [
      'Gratis: un ejercicio de cada apartado y todas las funciones de la app.',
      'Prémium: todos los ejercicios, la personalización completa del muñeco y el recordatorio de copia de seguridad. Se paga y se cancela en Google Play.'] },
];

/** Guía de la app: todo lo que se puede hacer, organizado en apartados que se abren y cierran. */
export class GuideScreen implements Screen {
  readonly el = h('main', { class: 'screen guide-screen' });

  constructor(private readonly app: App) {
    this.el.append(
      h('header', { class: 'bar sticky' },
        h('button', { class: 'icon-btn', 'aria-label': 'Volver', onclick: () => app.back() }, icon('back')),
        h('h1', { class: 'bar-title' }, 'Guía de la app')),
      h('div', { class: 'settings-body' },
        h('p', { class: 'muted small guide-intro' }, 'Todo lo que puedes hacer con Kasa Fit. Toca un apartado para verlo.'),
        ...GUIDE.map((g, i) =>
          h('details', { class: 'card guide-item', open: i === 0 },
            h('summary', {},
              h('span', { class: 'set-icon' }, icon(g.icon)),
              h('span', { class: 'set-text' }, h('strong', {}, g.title), h('span', { class: 'muted block small' }, g.sub)),
              icon('chevron', 'ico guide-chev')),
            h('ul', { class: 'guide-points' }, ...g.points.map((p) => h('li', {}, p))))),
        h('div', { class: 'look-save' },
          h('button', { class: 'btn primary block big', onclick: () => this.app.back() }, icon('check'), 'Entendido'))));
  }
}
