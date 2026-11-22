# Qué probar en la app de Android (no se puede probar en la web)

Recordatorio: **cuando instales la app de prueba** (el APK de GitHub o la prueba interna de Play), repasa esta lista.
Marca cada punto al probarlo. Si algo falla, haz una captura y cuéntamelo.

## 0e. Para probar en el build 20
- [ ] Edita › un bloc › Afegeix un exercici › Ordena «Per múscul»: grups per múscul principal (Trapezi, Espatlles, Pit, Esquena…) com a la llista de crear una taula, no un grup per cada zona. També «Per material» i «Zona».
- [ ] En acabar un entrenament ja no surt cap finestra d’avisos (pes): el recordatori de pes només arriba com a notificació el dia i l’hora triats.
- [ ] Entrenament amb un bloc de 2 o 3 voltes: al costat del nom del bloc (a dalt) surt «x2» / «x3» amb el color del bloc; als blocs d’una sola volta, res.
- [ ] En acabar un entrenament amb pes ja no surt cap suggeriment de pujar de pes; a la fitxa de l’exercici, «Els teus pesos» mostra els quilos però sense «Provem amb…».
- [ ] Llista d’exercicis › ⇅ Ordena: «Zona del cos», «Per múscul», «Per material» i «Alfabètic»; dins de cada grup, per ordre alfabètic. En castellà, «Puntillas» abans que «Puñetazos». Per material, «Bandes elàstiques + Barra de dominades» just després de «Bandes elàstiques».
- [ ] Edita una taula: targetes dels blocs com a Inici (amb «X2» si es repeteix); arrossegar-les per la nansa ≡ canvia l’ordre. En tocar-ne una s’obre el bloc (exercicis, temps, voltes, canviar, treure, afegir, copiar) i el total de dalt és el del bloc. Comprovar que Inici › Contingut de la taula, l’entrenament (anuncis «Següent…») i l’historial d’aquest entrenament surten en el nou ordre. Duplicar la taula conserva l’ordre (i les voltes).
- [ ] Les meves taules con un grup obert: el grup té fons blavós i el nom en lletra normal; les seves taules són més petites (sense les pastilles de colors, botons més baixos) i es distingeixen de les soltes. Mirar-ho també en mode clar.
- [ ] Desde Inici, botón «enrere» de Android: la app se cierra y NO aparece en la lista de apps recientes (botón ▢). Al abrirla de nuevo, arranca desde el principio. Desde otra pestaña, «enrere» sigue llevando a Inici.
- [ ] Configuració › al final: «Versió 20» con «2026.11.xx-20» y la fecha; al tocarla, «Novetats de la versió 20» con solo lo hecho desde el build 19 (agrupado por día).
- [ ] Configuració › Recordatoris (al abrir el grupo): una fila por recordatorio (Entrenament y Pes) con días y hora o «Desactivat»; con «Segueix el pla setmanal», pone «Pla setmanal · días · hora». Tocar cualquiera abre la pantalla de recordatorios.
- [ ] Pilates: en una taula, Abdominals o Estiraments › «Pilates» (a dalt): només surten els de pilates, amb l’etiqueta «Pilates». Mirar els 9 nous (el cent, enrotllar-se, rodar com una pilota, cercles de cama…) i la seva animació. «+ Taula» › Taules fetes: les tres de pilates. «Crea-la per mi» i Pla setmanal: objectiu «Pilates» (no pregunta la zona).
- [ ] Força › «Pilates»: 3 exercicis (planxa invertida amb puntada, elevació de dues cames de costat i abducció de maluc). Estiraments › «Pilates»: «Natació» (la versió de pilates del nedador suau). Mirar-ne les animacions; «Rodar com una pilota» amb els genolls cap endavant.
- [ ] Força › «Core i zona lumbar»: ara hi són els ponts, gos de caça, nedador suau, natació, puntada de bocaterrosa, pont d’espatlles… (ja no surten a Estiraments). Una taula antiga que els tenia a Estiraments: en obrir l’app, passen al bloc de Força.
- [ ] Taules fetes, «Crea-la per mi» i un dia del Pla setmanal (abans de crear-lo): targetes per blocs amb l’asa ≡; arrossegar un bloc canvia l’ordre i es desa en guardar la taula; en tocar un bloc s’obren els seus exercicis (canviar, treure, afegir, arrossegar).
- [ ] Crear un Pla setmanal nou un dia que ja hagis entrenat abans aquesta setmana: cap dia surt marcat com a fet.
- [ ] Pla setmanal amb algun dia fet aquesta setmana › «Canvia el pla»: surt l’avís que els dies fets deixaran de sortir com a fets (Cancel·la no canvia res). Sense dies fets, no surt cap avís.

## 0d. Para probar en el build 19
- [ ] Recordatoris: ya no está la tarjeta «Pla setmanal». En «Entrenament», con un plan en uso, sale «Segueix el pla setmanal»: encendido, los días son los del plan (fijos) y la notificación dice «Pla setmanal: … / Avui toca: …»; apagado, eliges los días y dice «Hora d’entrenar».
- [ ] Quien tenía activado el aviso de un plan (build 18): al actualizar, «Entrenament» queda activado siguiendo el plan (con la hora del aviso del plan si el de entrenar estaba apagado). Solo llega una notificación.
- [ ] Crear un plan nuevo: pregunta «¿Vols que t’avisi els dies d’entrenament?» y, si dices que sí, activa «Entrenament» siguiendo el plan.
- [ ] Recordatoris (y Recordatoris › Pla de la setmana): si Android no deja avisos a la hora exacta, sale la tarjeta «Avisos a l’hora exacta» con «Permet»; al permitirlo en el ajuste del móvil y volver, desaparece.
- [ ] Recordatorio de un plan de la semana para dentro de 3–5 minutos, un día del plan y sin haber entrenado hoy: llega la notificación a la hora (con la app cerrada).
- [ ] Configuració › Avisos › «Música mentre parla l’app»: la primera opción es «Baixa» y es la de serie en una instalación nueva (quien ya tenía elegida otra la conserva).

## 0c. Para probar en el build 18 (probado: la pausa y la voz amplificada van bien)
- [ ] Configuració › Avisos › «Música mentre parla l’app»: de serie «S’atura». Con Spotify sonando, en un entrenamiento la música se para cuando habla la app y sigue sola después (los pitidos solo la bajan).
- [ ] «Baixa»: la música baja y la voz suena claramente más alta que antes (también con la voz elegida en Veu). Si en algún momento no habla, apuntarlo.
- [ ] «No canvia»: la música sigue igual.

## 0b. Para probar en el build 17
- [ ] Prèmium › Codi d’accés: un código recién generado entra. Si sale «Aquesta versió de l’app no pot comprovar codis», el build se hizo sin el secreto ACCESS_CODE_SECRET.
- [ ] Medalles › Força: 15 medallas de 3 en 3, cada fila con su título pequeño (Entrenaments de força, Pujar de pes, Manuelles, Pesa russa, Barra amb discs). Un ejercicio de barra con 40 kg da «Barra carregada», no las de manuelles.
- [ ] Llista d’exercicis: ya no hay «Mostra’ls»; al final, aviso «N exercicis necessiten material que no tens. Per veure’ls, afegeix aquest material…». «Selecciona» no hace saltar la pantalla arriba.
- [ ] Con pesa russa o barra (marcadas en El meu material): al seleccionar uno de sus ejercicios pide el pes («pesa russa» / «barra amb discs (total)», en la barra los atajos 10–60 kg); también en Edita la taula y Afegeix exercicis.
- [ ] Con una voz elegida en català, pasar la app a castellano: «Prova el so i la veu» / «Probar sonido y voz» suena con voz de España, no catalana.
- [ ] Configuració › Avisos › Veu (con el motor de Google y varias voces instaladas): salen hasta 3 voces del idioma («Veu 1, 2, 3»), cada una suena distinta con ▶, y al elegir una los avisos del entrenamiento usan esa.
- [ ] Configuració › Temps d’exercicis › Pausa entre exercicis: tocar − / + no hace saltar la pantalla arriba (también en los demás ajustes).

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
- [ ] Edita la taula: tocar en cualquier parte del título del apartado (nombre, icono, «N exercicis · min») lo abre y lo cierra; los botones − / + de vueltas no lo cierran. En Escalfament (nombre largo), «Voltes − x1 +» se ve entero: si no cabe al lado, pasa a la línea de abajo. Con los bloques plegados (en castellano, «CALENTAMIENTO»), a la derecha solo sale «N ejercicios» (sin el tiempo), en la misma línea que el nombre.
- [ ] «Afegeix exercicis»: tocar la imagen o el nombre abre la ficha del ejercicio (solo información, sin botones de añadir, treure ni eliminar; igual se abra desde la lista de ejercicios, «Edita la taula», «Contingut de la taula» o el historial); al volver, lo elegido sigue marcado; el + / ✓ de la derecha lo elige o lo quita. Al marcarlo salen debajo − tiempo + y, si lleva mancuernas, el peso; al añadir, la tabla los guarda con ese tiempo y peso.
- [ ] «Taula buida» (lista con Selecciona): los cuatro apartados en un cuadro con el título «Tria el bloc»; al bajar, el cuadro se queda fijo arriba. Las voltes: botón pequeño «↻ Voltes x1» a la derecha del primer título de la lista (p. ej. «Mobilitat articular»); al tocarlo se abre debajo − x1 + con la explicación.
- [ ] «Apartat» pasa a llamarse «Bloc» en toda la app (lista de ejercicios, «Edita la taula», «Copia el bloc», entrenamiento, resúmenes, medallas, ajustes y guía).
- [ ] «Taula buida» (lista con Selecciona): debajo de Tots / Preferits / Triats, el cercador («Cerca un exercici», menos espacio entre los cuadros) y a su lado el botón «⇅ Ordena» (abre Zona del cos, Per múscul, Per material, A-Z, Personalitzada, con ✓ en el actual); ya no sale el texto «Toca un exercici per veure…».
- [ ] Modo clar: el fondo del ninot en las fichas de la lista, la animación grande, el entrenamiento y el mapa de músculos es gris claro (no negro). En modo fosc, el fondo del ninot es gris pizarra (no negro) y se ve su sombra oscura; probar también otro tema de color (verd, taronja…).
- [ ] Medalles: ahora 66 (0 oro, plata y bronce más difíciles); al abrir la app se recalculan una vez con las reglas nuevas (se quitan las que ya no se cumplen, sin aviso). Un entrenamiento de menos de 10 minutos no da medallas. Arriba: «Compten els entrenaments de 10 minuts o més».
- [ ] Menú de abajo: Inici · Taules · Historial · Medalles · Les meves dades · Configuració.
- [ ] «Edita la taula» y «Afegeix exercicis»: los ejercicios por lados (p. ej. Rem a una mà recolzat al banc) muestran «⇄ per costats» debajo del nombre.
- [ ] Historial: orden calendario del mes → Resum setmanal / Resum del mes → rècords.
- [ ] Historial: tocar los récords (ratxa, entrenament més llarg, calories, millor mes) no hace nada; «Esborra tot l’historial» es un enlace pequeño en rojo al final (sigue pidiendo doble confirmación).
- [ ] Historial › tocar un día: «Contingut de l’entrenament» con una fila por bloque (como Inici); al tocar un bloque, sus ejercicios numerados (temps fet / previst, kg, per costats, «Saltat»); sin «Repeteix» ni «Copia a un altre dia»; «Esborra aquest entrenament» pequeño al final.
- [ ] Inici › un bloque y Historial › entrenamiento › un bloque: al final, botones pequeños «‹ [icono] Escalfament» / «[icono] Estiraments ›» (sin el texto «Bloc anterior/següent»); el botón atrás vuelve a Inici / al entrenamiento.
- [ ] Inici: la frase motivadora cambia al volver a Inici; ahora hay 150 (en el idioma elegido, algunas con tu nombre).
- [ ] Les meves taules: título en una línea y debajo, pequeños y a la derecha, «+ Grup» y «+ Taula» (los dos azules). «+ Grup»: crear un grupo; en los ··· de una taula, «Mou a un grup» (también «+ Grup nou»); si ya está en un grupo, «Mou a un altre grup» y «Treu del grup» directamente en los ···; al entrar en Taules (también al volver de editar), todos los grupos salen plegados con «N taules · En ús»; al tocarlo se abren sus tablas; ··· del grupo: canviar nom / esborrar: casilla «Esborra també les taules» desmarcada (sin marcar, las tablas vuelven a la lista; marcada, segundo aviso «Esborra-ho tot» y se borran grupo y tablas). Se guarda al cerrar la app y en la copia.
- [ ] Edita la taula: asa de arrastrar (izquierda) y botones Canvia / Treu (derecha) más grandes y centrados en vertical en cada ejercicio; arrastrar sigue funcionando.
- [ ] Inici › «Aquesta setmana»: tocar un día entrenado abre su entrenamiento; deslizar / flechas solo pasan por los de esta semana (también con Prèmium).
- [ ] Inici › «Aquesta setmana»: «N dies seguits» solo cuenta desde el dilluns (si entrenaste domingo y lunes, el lunes/martes pone 1).
- [ ] Resum setmanal / Resum del mes: deslizar a la derecha = semana/mes anterior; a la izquierda = siguiente (no pasa de la actual).
- [ ] **Versión gratis nueva** (sin suscripción ni código):
  - [ ] Todos los ejercicios se pueden ver y elegir, sin candados.
  - [ ] Inicio con la tabla vacía: «Tabla vacía» funciona; «Créala por mí», «Tablas hechas» y «Plan de la semana» con candado (abren Prémium).
  - [ ] Tablas › Nueva: con tu única tabla ya llena, «Tabla vacía» también con candado; «Duplicar» abre Prémium.
  - [ ] Historial: solo la semana en curso (de dilluns a diumenge), con el aviso (sin borde blanco) «Versió gratuïta: veus els entrenaments d’aquesta setmana. N entrenaments anteriors desats. Fes-te prèmium». Al abrir un entrenamiento, las flechas / deslizar no llevan a entrenamientos de semanas anteriores.
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
