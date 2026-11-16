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
- [ ] Gráfica del peso en grande: línea recta desde el último peso hasta hoy, con un puntito hoy con el peso encima; al tocarlo, el peso y la fecha.
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
