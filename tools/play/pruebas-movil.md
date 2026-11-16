# Qué probar en la app de Android (no se puede probar en la web)

Recordatorio: **cuando instales la app de prueba** (el APK de GitHub o la prueba interna de Play), repasa esta lista.
Marca cada punto al probarlo. Si algo falla, haz una captura y cuéntamelo.

## 0. Para probar en el build 16 (cambios hechos durante la prueba del build 15)
- [ ] Botón atrás de Android: vuelve a la pantalla anterior; en Inici cierra la app (antes cerraba la app desde cualquier pantalla).
- [ ] Versión gratis, «Afegeix un exercici»: primero el grupo «Gratis»; los de Prèmium con candado y al tocarlos se abre Prèmium (antes se podían marcar).
- [ ] Configuració › Avisos › Veu: como mucho 3 voces por idioma, sin repetidas (en inglés, británicas), y que suenen distintas.
- [ ] Configuració: al entrar, todos los grupos cerrados; con atrás se cierran los abiertos.
- [ ] Al cambiar el idioma, la app vuelve a Configuració (no a Inici).
- [ ] Entrenamiento: arriba ya no sale el nombre pequeño de la tabla.
- [ ] Versión gratis: ejercicios de Prèmium con etiqueta dorada y candado sobre la miniatura (listas, Edita, Crea-la per mi, Taules fetes).
- [ ] Versión gratis: en cada apartado (también Estiraments) salen arriba los 2 gratis y se pueden seleccionar.
- [ ] Versión gratis: «Crea-la per mi» y «Taules fetes» se ven enteras; el botón «Fes-la servir amb Prèmium» abre Prèmium.
- [ ] Configuració › Còpia de seguretat: al pulsar Restaura, la pregunta avisa de que se borra todo y el botón es «Esborra i restaura».
- [ ] Gráfica del peso en grande con el móvil en vertical: sale girada y ocupando toda la pantalla.
- [ ] Gráfica del peso en grande (horizontal): el último peso y su número se ven enteros, sin quedar debajo de la barra de botones.
- [ ] Gráfica del peso en grande: línea recta desde el último peso hasta hoy, con un puntito hoy con el peso encima; al tocarlo, la fecha.
- [ ] Les meves dades › Pes (gráfica pequeña): llega hasta hoy con línea recta y un puntito con el peso.
- [ ] Nova taula: «Taula buida» es la primera opción.
- [ ] Inici con la tabla vacía: salen las 4 opciones (Taula buida, Crea-la per mi, Taules fetes, Pla setmanal).
- [ ] Lista de ejercicios: al volver a entrar, siempre ordenada «Per zona».
- [ ] Edita: «Afegeix un exercici» en un apartado vacío abre la pantalla completa; en uno con ejercicios, la lista para añadir (el botón de abajo no se mezcla con los títulos).
- [ ] Contingut de la taula (al tocar un apartado en Inici): filas con número, tiempo, peso y zona.
- [ ] Edita: al entrar, todos los apartados plegados; se abren/cierran con el botón ⌄ de su título.
- [ ] Estiraments: vuelve «Torsió de columna amb les cames creuades» (también tras restaurar la copia de la web).
- [ ] «Torsió de columna amb les cames creuades»: vídeo nuevo visto un poco de lado (brazos en cruz, una pierna pasa por encima de la otra y las piernas bajan al suelo con la de encima cruzada en X por encima de la otra).
- [ ] Historial: ya no salen arriba los botones «Todas / Estiraments / De força»; récords y calendario cuentan todos los entrenamientos.
- [ ] Ficha de un ejercicio: debajo del muñeco, cuerpo de frente y de espaldas con la zona que trabaja en rojo y la que estira en turquesa (probar uno de fuerza y uno de estiramiento). Al tocarlo se ve en grande; se cierra tocando, con la X o con el botón atrás de Android.
- [ ] Edita la taula: tocar en cualquier parte del título del apartado (nombre, icono, «N exercicis · min») lo abre y lo cierra; los botones − / + de vueltas no lo cierran. En Escalfament (nombre largo), «Voltes − x1 +» se ve entero: si no cabe al lado, pasa a la línea de abajo. Con los bloques plegados (en castellano, «CALENTAMIENTO»), el resumen «N ejercicios · min» sigue en la misma línea que el nombre (si no cabe, en dos líneas a la derecha).
- [ ] «Afegeix exercicis»: tocar la imagen o el nombre abre la ficha del ejercicio (solo información, sin botones de añadir, treure ni eliminar; igual se abra desde la lista de ejercicios, «Edita la taula», «Contingut de la taula» o el historial); al volver, lo elegido sigue marcado; el + / ✓ de la derecha lo elige o lo quita. Al marcarlo salen debajo − tiempo + y, si lleva mancuernas, el peso; al añadir, la tabla los guarda con ese tiempo y peso.
- [ ] «Taula buida» (lista con Selecciona): los cuatro apartados en un cuadro con el título «Tria el bloc»; al bajar, el cuadro se queda fijo arriba. Las voltes: botón pequeño «↻ Voltes x1» a la derecha del primer título de la lista (p. ej. «Mobilitat articular»); al tocarlo se abre debajo − x1 + con la explicación.
- [ ] «Apartat» pasa a llamarse «Bloc» en toda la app (lista de ejercicios, «Edita la taula», «Copia el bloc», entrenamiento, resúmenes, medallas, ajustes y guía).
- [ ] «Taula buida» (lista con Selecciona): debajo de Tots / Preferits / Triats, el cercador («Cerca un exercici», menos espacio entre los cuadros) y a su lado el botón «⇅ Ordena» (abre Zona del cos, Per múscul, Per material, A-Z, Personalitzada, con ✓ en el actual); ya no sale el texto «Toca un exercici per veure…».
- [ ] Modo clar: el fondo del ninot en las fichas de la lista, la animación grande, el entrenamiento y el mapa de músculos es gris claro (no negro). En modo fosc, el fondo del ninot es gris pizarra (no negro) y se ve su sombra oscura; probar también otro tema de color (verd, taronja…).
- [ ] Medalles: ahora 66 (0 oro, plata y bronce más difíciles); al abrir la app se recalculan una vez con las reglas nuevas (se quitan las que ya no se cumplen, sin aviso). Un entrenamiento de menos de 10 minutos no da medallas. Arriba: «Compten els entrenaments de 10 minuts o més».
- [ ] **Versión gratis nueva** (sin suscripción ni código):
  - [ ] Todos los ejercicios se pueden ver y elegir, sin candados.
  - [ ] Inicio con la tabla vacía: «Tabla vacía» funciona; «Créala por mí», «Tablas hechas» y «Plan de la semana» con candado (abren Prémium).
  - [ ] Tablas › Nueva: con tu única tabla ya llena, «Tabla vacía» también con candado; «Duplicar» abre Prémium.
  - [ ] Historial: los 7 primeros días, aviso «puedes ver el historial hasta el …»; después, pantalla «Tu historial está guardado» con «Hazte prémium».
  - [ ] Resumen semanal y del mes con candado; en Inicio no salen los avisos de resumen.
  - [ ] Copia de seguridad: Guardar y Restaurar abren Prémium.
  - [ ] Mis datos › Peso: el objetivo va dentro del cuadro de Peso, debajo de la gráfica (ya no es un cuadro aparte). Sin Prémium: botón «Prémium» con candado; la gráfica del peso sin la línea de objetivo; en la bienvenida no se pide el objetivo.
  - [ ] Pantalla Prémium con la lista nueva («Organiza todo tu entrenamiento»).
  - [ ] Con un código: todo desbloqueado.
- [ ] Edita: «Copia l’apartat» en una tabla y «Enganxa» en el mismo apartado de otra (en la misma tabla no sale «Enganxa»; después de pegar, «Enganxa» desaparece).
- [ ] Afegeix exercicis: buscador y «Ordena» (zona, múscul, material, A-Z) fijos arriba al desplazar.
- [ ] «Restaura» con la copia de la web recupera tablas, historial, peso y ajustes.

## 1. Health Connect (Configuració › Apps de salut)
- [ ] Sale la tarjeta «Health Connect». Si pide instalarla, el botón abre Play Store; al volver a la app, la tarjeta cambia sola.
- [ ] Al activar «Desa els entrenaments a Health Connect» sale la pantalla de permisos del sistema. Acepta todo.
- [ ] Si deniegas el permiso, el interruptor se vuelve a apagar y sale un aviso.
- [ ] Haz un entrenamiento corto (más de 1 minuto) y termínalo: aparece en Samsung Health / Google Fit / Fitbit
      (como «Entrenamiento de fuerza», con el nombre de la tabla, las calorías y, con reloj, las pulsaciones).
- [ ] Anota el peso en Les meves dades: aparece en la app de salud.
- [ ] Quita el permiso desde los ajustes de Health Connect del móvil y vuelve a la app: el interruptor se apaga solo.
- [ ] En Health Connect, «¿Por qué pide estos permisos?» abre la política de privacidad.

## 2. Música
- [ ] Con Spotify (o la radio) sonando, durante el entrenamiento la música baja de volumen cuando la app habla o pita
      y luego vuelve a subir.
- [ ] Configuració › Avisos › «Baixa la música quan parla l’app» apagado: la música ya no baja.
- [ ] Botón verde de música: pausa el entrenamiento y abre Spotify (o la app de música si no hay Spotify).
      Al volver, «Reprèn» sigue el entrenamiento.

## 3. Barras del sistema y temas
- [ ] La barra de arriba (hora, batería) y la de abajo (botones) tienen el color de fondo de la app.
- [ ] En modo clar, los iconos de las barras se ven oscuros; en modo fosc, claros.
- [ ] Cambia entre los 7 temas de color (Blau, Verd sàlvia, Terracota, Or, Lila, Rosa, Grafit): las barras cambian de color.
- [ ] El contenido no queda tapado por la barra de arriba ni por la de abajo (ni por el teclado al escribir).

## 4. Recordatorios (notificaciones)
- [ ] Al activar un recordatorio, pide permiso de notificaciones.
- [ ] Llega el aviso de entrenar a la hora puesta, aunque la app esté cerrada.
- [ ] Pla setmanal: al crearlo y aceptar «Vols que t’avisi…», en Recordatoris › Pla setmanal sale su aviso activado; llega la notificación «Pla setmanal: …» esos días.
- [ ] Al borrar el plan, ya no llegan sus avisos.
- [ ] Recordatorio de pesarse.

## 5. Prémium y códigos
- [ ] Versión gratis: solo 2 ejercicios por apartado; los demás con candado.
- [ ] El código de acceso (creado con el generador) desbloquea Prémium.
- [ ] Compra de la suscripción con la cuenta de pruebas de licencias (cuando esté creada en Play Console):
      mensual y anual, sin cobrar de verdad.
- [ ] «Ja hi estic subscrit» recupera Prémium después de reinstalar la app.

## 6. Reloj (pulsaciones por Bluetooth)
- [ ] Pide el permiso de Bluetooth (y en Android 11 o anterior, el de ubicación).
- [ ] Conecta el reloj (con la app que emite el pulso) y se ven las pulsaciones durante el entrenamiento.
- [ ] Las calorías del resumen se calculan con el pulso.

## 7. Durante el entrenamiento
- [ ] La pantalla no se apaga.
- [ ] Vibra en los avisos.
- [ ] La voz habla en el idioma de la app (catalán, castellano o inglés) con la voz del móvil.
- [x] Configuració › Avisos › Veu: la elegida es la que habla al entrenar (build 15).
- [ ] Con la pantalla bloqueada o la app en segundo plano y al volver, el entrenamiento sigue bien.

## 8. Generales
- [ ] Icono y nombre «Kasa Fit» en el móvil; pantalla de inicio al abrir.
- [ ] Botón atrás de Android: vuelve a la pantalla anterior (y no cierra la app desde una sub-pantalla).
- [ ] Compartir (por ejemplo, el resumen o la copia) abre el menú de compartir del móvil.
- [ ] Al instalar una versión nueva encima, no se pierden las tablas, el historial ni la configuración.
