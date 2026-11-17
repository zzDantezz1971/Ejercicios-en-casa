import { IS_NATIVE } from '../../platform/native';
import type { App, Screen } from '../App';
import { h } from '../dom';
import { icon, type IconName } from '../icons';
import { HAS_BACKUP } from '../../services/Backup';

/** Qué puede hacer la app, menú a menú (los textos se traducen con i18n/ui.ts); { h } es un subtítulo dentro del menú. */
const GUIDE: Array<{ icon: IconName; title: string; sub: string; points: Array<string | { h: string }> }> = [
  { icon: 'play', title: 'Primeros pasos', sub: 'Empieza a entrenar en tres pasos.', points: [
      'En Mis datos, marca el material que tienes en casa: verás los ejercicios que puedes hacer.',
      'En Tablas, crea una tabla y elige los ejercicios de cada bloque: Calentamiento, Fuerza, Abdominales y Estiramientos.',
      'En Inicio, pulsa Empezar y sigue al muñeco.'] },
  { icon: 'home', title: 'Menú Inicio', sub: 'Tu tabla, tu semana y el entrenamiento.', points: [
      'La tabla que vas a hacer, con su contenido y el botón para empezar. Puedes cambiar de tabla desde aquí.',
      'Si la tabla está vacía, «Créala por mí» te prepara una al momento según tu objetivo, la zona, el tiempo y el nivel.',
      'Con un plan de la semana en uso, la tabla es la del día (o la del próximo día de entrenamiento): arriba pone «Plan de la semana» y el día.',
      'Tu semana: minutos y calorías, con unas metas que puedes cambiar.',
      'Una frase motivadora distinta cada día (se puede quitar en Ajustes).',
      HAS_BACKUP ? 'Si los tienes activados en Recordatorios, al acabar un entrenamiento te avisa cuando toca anotar el peso o hacer la copia de seguridad.'
        : 'Si lo tienes activado en Recordatorios, al acabar un entrenamiento te avisa cuando toca anotar el peso.',
      { h: 'Entrenar' },
      'Cada ejercicio con el muñeco animado y una cuenta atrás.',
      'Pitidos, vibración y voz te avisan del siguiente ejercicio, del cambio de lado y de los últimos segundos.',
      'Puedes pausar, saltar un ejercicio, volver al anterior o terminar antes: lo que hayas hecho se guarda en el historial.',
      { h: 'Música' },
      'El botón verde de arriba pausa el entrenamiento y abre Spotify o la app de música del móvil. Al volver, pulsa Reanudar.',
      'En la app de Android, la música baja de volumen mientras la app habla o pita y luego vuelve a subir (se puede apagar en Ajustes).',
      'La pausa entre ejercicios y la cuenta atrás de cada bloque se cambian en Ajustes.'] },
  { icon: 'tables', title: 'Menú Tablas', sub: 'Más de 200 ejercicios para armar tus tablas.', points: [
      'Crea tantas tablas como quieras, cámbiales el nombre, duplícalas o bórralas.',
      'Con Editar ves la tabla por bloques: cambia el tiempo de cada ejercicio (− +), cámbialo por otro eligiéndolo de la lista, quítalo, arrástralo por el asa para moverlo o añade otros; también las vueltas de cada bloque y el peso de las mancuernas. Los botones están a la izquierda, para que puedas desplazar la pantalla por la derecha sin tocarlos.',
      'En «Añadir un ejercicio» toca la imagen o el nombre para ver cómo se hace, marca con el + los que quieras, ajusta su tiempo (y el peso, si llevan mancuernas) y añádelos todos con el botón de abajo. Debajo del título de cada bloque ves el material que necesita (en naranja, el que no está en tu material).',
      'Para pasar un bloque entero a otra tabla: en Editar, ábrelo y pulsa «Copiar el bloque»; después, en el mismo bloque de la otra tabla, pulsa «Pegar».',
      'Con Nueva puedes crearla de tres maneras: «Créala por mí» (eliges objetivo, zona, tiempo y nivel, y la app la arma con tu material), una de las «Tablas hechas» o vacía, eligiendo tú los ejercicios.',
      'Con «Grupo» puedes crear carpetas para ordenar tus tablas: en los tres puntos de una tabla, «Mover a un grupo». Toca un grupo para abrirlo o cerrarlo.',
      'Antes de guardarla, toca un ejercicio para ver cómo se hace, cambia su tiempo con − y +, cámbialo por otro de la lista o quítalo con sus botones (te pregunta antes de quitarlo), ordénalos arrastrándolos por el asa y añade otros con «Añadir un ejercicio». En «Créala por mí» también puedes pedir otra propuesta.',
      { h: 'Plan de la semana (Prémium)' },
      'En Nueva › Plan de la semana eliges objetivo, días (de 2 a 6), minutos y nivel, y la app crea una tabla para cada día, repartiendo las zonas para que descansen entre sesiones. Antes de crearlo, toca un día para ver sus ejercicios y el tiempo de cada uno y cambiar lo que quieras. Al final te pregunta si quieres que te avise esos días (cada plan tiene su aviso en Recordatorios › Plan de la semana).',
      'Con un plan, la tabla en uso de Inicio es la del día (o, si hoy descansas, la del próximo día de entrenamiento). Si eliges otra tabla tuya, se respeta y el plan deja de salir en Inicio hasta que vuelvas a ponerlo en uso.',
      'Puedes tener varios planes (por ejemplo, uno de fuerza y otro de estiramientos). Arriba en Tablas, toca el plan para ver la lista, elegir el que quieres usar, cambiarle el nombre o crear otro.',
      'En «Mi plan de la semana» (arriba de tus tablas) ves la semana de lunes a domingo con lo ya hecho. Toca un día para ver su tabla, cambiarla, pedir otra propuesta o empezar.',
      'Con «Renovar los ejercicios cada semana», cada lunes cambian los ejercicios de cada día (las zonas no). Al cumplir todos los días de una semana, ganas la medalla «Plan cumplido».',
      'Cuatro bloques: Calentamiento, Fuerza, Abdominales y Estiramientos.',
      'Toca un ejercicio para ver al muñeco haciéndolo, cómo se hace paso a paso y los músculos que trabaja (en rojo) o estira (en turquesa) en un cuerpo de frente y de espaldas. Desliza para pasar al siguiente.',
      'Gira el muñeco con el dedo para verlo desde otro ángulo: se queda así para ese ejercicio, también al entrenar y en la lista.',
      'Busca por nombre o zona, marca favoritos con la estrella y ordena la lista por zona, músculo, material o nombre, o a tu manera con «Personalizada».',
      'En los ejercicios elegidos puedes cambiar los segundos, el orden y, si usan pesas, anotar el peso.',
      'Vueltas: repite todos los ejercicios de un bloque 2, 3 o más veces seguidas.'] },
  { icon: 'trophy', title: 'Menú Medallas', sub: 'Premios por tu constancia.', points: [
      'Gana medallas por entrenamientos, constancia, tiempo entrenado, calorías, peso, fuerza y bloques, y alguna especial. Cuentan los entrenamientos de 10 minutos o más.'] },
  { icon: 'calendar', title: 'Menú Historial', sub: 'Todo lo que has entrenado, día a día.', points: [
      'Calendario con los días entrenados; toca uno para ver el detalle de ese entrenamiento.',
      'Resumen semanal y mensual: tiempo, calorías, pulsaciones medias, tiempo por bloque, récords y el mapa de los músculos trabajados.',
      'Puedes repetir un entrenamiento, copiarlo a otro día o borrarlo.'] },
  { icon: 'user', title: 'Menú Mis datos', sub: 'Para calcular calorías e IMC y seguir tu peso.', points: [
      'Nombre, edad, altura y sexo: se usan para calcular las calorías y el IMC.',
      'Anota tu peso cuando quieras y mira su evolución en el gráfico, con tu objetivo de peso.',
      'Mi material: marca lo que tienes; los ejercicios sin material se ven siempre.'] },
  { icon: 'settings', title: 'Menú Ajustes', sub: HAS_BACKUP ? 'Personaliza la app, recordatorios, reloj, copia de seguridad y prémium.' : 'Personaliza la app, recordatorios, reloj y prémium.', points: [
      'Idioma (català, castellano o English), modo oscuro, claro o el del móvil, y tema de color: azul y verde gratis; terracota, oro, lila, rosa y grafito con Prémium.',
      'Los ajustes están por grupos: toca uno para abrirlo o cerrarlo. Con el botón atrás se cierran todos.',
      'Personaliza el muñeco: color de piel, pelo y ropa; con prémium, también peinado, ropa, gafas, barba y cuerpo de mujer. Toca el muñeco para verlo en grande.',
      'Tiempos de los ejercicios, pitidos, voz y frases motivadoras.',
      'En Avisos › Voz eliges la voz de los avisos entre las de tu móvil (de hombre o de mujer): escúchalas con ▶ antes de elegir.',
      { h: 'Recordatorios' },
      HAS_BACKUP ? 'Para entrenar con tus tablas, pesarte y hacer la copia de seguridad, los días y a la hora que elijas. Llegan como notificación en la app de Android, aunque esté cerrada.'
        : 'Para entrenar con tus tablas y pesarte, los días y a la hora que elijas. Llegan como notificación, aunque la app esté cerrada.',
      'En Recordatorios › Plan de la semana, cada plan tiene su propio aviso: sus días, a la hora que elijas. Si borras el plan, se borra también su aviso.',
      'El aviso de «Hace X días que no te pesas» (al acabar un entrenamiento) sigue los días y la hora del recordatorio de peso.',
      { h: 'Pulsaciones del reloj' },
      'Conecta un reloj o una pulsera que difunda la frecuencia cardíaca por Bluetooth: verás tus pulsaciones durante el entrenamiento y las calorías se calcularán con tu pulso.',
      'En Ajustes › Smartwatch tienes los pasos para conectarlo.',
      'Samsung Galaxy Watch, Pixel Watch y otros Wear OS: instala en el reloj una app que emita el pulso por Bluetooth (en Ajustes › Smartwatch te explicamos cómo).',
      ...(IS_NATIVE ? [{ h: 'Apps de salud' },
        'En Ajustes › Apps de salud puedes guardar tus entrenamientos (tiempo, calorías y pulsaciones) y tu peso en Health Connect, para verlos en Samsung Health, Google Fit, Fitbit y otras apps de salud. Kasa Fit solo escribe: nunca lee tus datos de salud.'] : []),
      { h: 'Copia de seguridad' }, 'Guarda tus tablas, historial y ajustes en un archivo (por ejemplo, en Drive) y restáuralo si cambias de móvil.',
      { h: 'Gratis y prémium' },
      'Gratis: todos los ejercicios, con el muñeco y cómo se hacen; una tabla (con «Tabla vacía») y el historial de la semana en curso.',
      'Prémium: tablas sin límite, «Créala por mí», tablas hechas, el plan de la semana, todo el historial, los resúmenes, el objetivo de peso, la personalización completa del muñeco, todos los temas de color y la copia de seguridad. Se paga y se cancela en Google Play.'] },
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
