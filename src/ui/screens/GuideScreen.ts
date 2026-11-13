import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon, type IconName } from '../icons';

/** Qué puede hacer la app, menú a menú (los textos se traducen con i18n/ui.ts); { h } es un subtítulo dentro del menú. */
const GUIDE: Array<{ icon: IconName; title: string; sub: string; points: Array<string | { h: string }> }> = [
  { icon: 'play', title: 'Primeros pasos', sub: 'Empieza a entrenar en tres pasos.', points: [
      'En Mis datos, marca el material que tienes en casa: verás los ejercicios que puedes hacer.',
      'En Tablas, crea una tabla y elige los ejercicios de cada apartado: Calentamiento, Fuerza, Abdominales y Estiramientos.',
      'En Inicio, pulsa Empezar y sigue al muñeco.'] },
  { icon: 'home', title: 'Menú Inicio', sub: 'Tu tabla, tu semana y el entrenamiento.', points: [
      'La tabla que vas a hacer, con su contenido y el botón para empezar. Puedes cambiar de tabla desde aquí.',
      'Tu semana: minutos y calorías, con unas metas que puedes cambiar.',
      'Una frase motivadora distinta cada día (se puede quitar en Ajustes).',
      'Si los tienes activados en Recordatorios, al acabar un entrenamiento te avisa cuando toca anotar el peso o hacer la copia de seguridad.',
      { h: 'Entrenar' },
      'Cada ejercicio con el muñeco animado y una cuenta atrás.',
      'Pitidos, vibración y voz te avisan del siguiente ejercicio, del cambio de lado y de los últimos segundos.',
      'Puedes pausar, saltar un ejercicio, volver al anterior o terminar antes: lo que hayas hecho se guarda en el historial.',
      'La pausa entre ejercicios y la cuenta atrás de cada apartado se cambian en Ajustes.'] },
  { icon: 'tables', title: 'Menú Tablas', sub: 'Más de 200 ejercicios para armar tus tablas.', points: [
      'Crea tantas tablas como quieras, cámbiales el nombre, duplícalas o bórralas.',
      'Cuatro apartados: Calentamiento, Fuerza, Abdominales y Estiramientos.',
      'Toca un ejercicio para ver al muñeco haciéndolo, cómo se hace paso a paso y los músculos que trabaja. Desliza para pasar al siguiente.',
      'Busca por nombre o zona, marca favoritos con la estrella y ordena la lista por zona, músculo, material o nombre, o a tu manera con «Ordenar lista».',
      'En los ejercicios elegidos puedes cambiar los segundos, el orden y, si usan pesas, anotar el peso.',
      'Vueltas: repite todos los ejercicios de un apartado 2, 3 o más veces seguidas.'] },
  { icon: 'trophy', title: 'Menú Medallas', sub: 'Premios por tu constancia.', points: [
      'Gana medallas por entrenamientos, constancia, tiempo entrenado, calorías, peso, fuerza y apartados, y alguna especial.'] },
  { icon: 'calendar', title: 'Menú Historial', sub: 'Todo lo que has entrenado, día a día.', points: [
      'Calendario con los días entrenados; toca uno para ver el detalle de ese entrenamiento.',
      'Resumen semanal y mensual: tiempo, calorías, pulsaciones medias, tiempo por apartado, récords y el mapa de los músculos trabajados.',
      'Puedes repetir un entrenamiento, copiarlo a otro día o borrarlo.'] },
  { icon: 'user', title: 'Menú Mis datos', sub: 'Para calcular calorías e IMC y seguir tu peso.', points: [
      'Nombre, edad, altura y sexo: se usan para calcular las calorías y el IMC.',
      'Anota tu peso cuando quieras y mira su evolución en el gráfico, con tu objetivo de peso.',
      'Mi material: marca lo que tienes; los ejercicios sin material se ven siempre.'] },
  { icon: 'settings', title: 'Menú Ajustes', sub: 'Personaliza la app, recordatorios, reloj, copia de seguridad y prémium.', points: [
      'Idioma (català, castellano o English) y modo oscuro, claro o el del móvil.',
      'Personaliza el muñeco: color de piel, pelo y ropa; con prémium, también peinado, ropa, gafas, barba y cuerpo de mujer.',
      'Tiempos, pitidos, voz y frases motivadoras.',
      { h: 'Recordatorios' },
      'Para entrenar, pesarte y hacer la copia de seguridad, los días y a la hora que elijas. Llegan como notificación en la app de Android, aunque esté cerrada.',
      { h: 'Pulsaciones del reloj' },
      'Conecta un reloj o una pulsera que difunda la frecuencia cardíaca por Bluetooth: verás tus pulsaciones durante el entrenamiento y las calorías se calcularán con tu pulso.',
      'En Ajustes › Reloj tienes los pasos para conectarlo.',
      { h: 'Copia de seguridad' },
      'Guarda tus tablas, historial y ajustes en un archivo (por ejemplo, en Drive) y restáuralo si cambias de móvil.',
      { h: 'Gratis y prémium' },
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
        ...GUIDE.map((g) =>
          h('details', { class: 'card guide-item' },
            h('summary', {},
              h('span', { class: 'set-icon' }, icon(g.icon)),
              h('span', { class: 'set-text' }, h('strong', {}, g.title), h('span', { class: 'muted block small' }, g.sub)),
              icon('chevron', 'ico guide-chev')),
            h('ul', { class: 'guide-points' }, ...g.points.map((p) => (typeof p === 'string' ? h('li', {}, p) : h('li', { class: 'guide-sub' }, p.h)))))),
        h('div', { class: 'look-save' },
          h('button', { class: 'btn primary block big', onclick: () => this.app.back() }, icon('check'), 'Entendido'))));
  }
}
