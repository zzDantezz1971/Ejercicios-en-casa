# Pendiente para la versión Android (antes de subirla a Play Store)

- ✅ Hecho (falta probarlo en el móvil): **bajar la música cuando habla la app** (foco de audio «transitorio, se puede
  bajar»; `src/services/MusicDuck.ts` + `KasaNativePlugin.java`), con interruptor en Configuració › Avisos; **barras del
  sistema** del color del tema (iconos oscuros en el claro); botón **Música** en el entrenamiento (pausa y abre Spotify
  o la app de música del móvil). Sin controlar Spotify desde la app: Spotify solo lo permite a 25 usuarios en apps de particulares.
- Gráfico de la ficha de Play sin maniquís (o con el maniquí nuevo).
- Compilar con el workflow manual de Android y probar el APK: **lista de pruebas en `tools/play/pruebas-movil.md`**
  (recordársela a David cuando instale la app de prueba).
- Crear la app en Play Console cuando acabe la verificación; prueba cerrada.

## Suscripción (0,99 €/mes o 9,99 €/año, sin prueba gratis)

**Estado (17 nov 2026): HECHO en Play Console** — perfil de pagos creado; suscripción `premium` (nombre «Kasa Fit Prèmium»,
ventajas en ca/es/en-GB) con planes base `mensual` (0,99 €) y `anual` (9,99 €) activos, precios convertidos a todos los
países. Notificaciones en tiempo real desactivadas (no hay servidor). Falta: pruebas de licencias y probar la compra en el build 16.

La app ya lo tiene programado (`src/services/Access.ts`, pantalla `PaywallScreen`). Modelo (nov 2026): versión gratis con
todos los ejercicios, una sola tabla (con «Tabla vacía») y el historial de la semana en curso; «Créala por mí»,
tablas hechas, plan de la semana, resúmenes, objetivo de peso, personalizar el muñeco, temas de color, copia de seguridad y algunos avisos
son de Prémium. La suscripción o un código lo desbloquean todo. Solo afecta a la app de Google Play; la web no se cobra (en Configuración hay
una vista previa de la versión gratis). Falta configurarlo en Google:

1. Play Console › Configuración › **Perfil de pagos** (datos fiscales y cuenta bancaria).
2. Subir la app (aunque sea a prueba interna) para que Play Console deje crear productos.
3. Monetización › Productos › **Suscripciones** › crear la suscripción con ID **`premium`**.
4. Dentro, dos **planes base** de renovación automática:
   - ID **`mensual`**: 1 mes, 0,99 €.
   - ID **`anual`**: 1 año, 9,99 €.
5. **Sin oferta de prueba gratis**: la versión gratis de la app ya sirve para probarla. Activar los dos planes.
6. Para probar sin pagar: Configuración › **Pruebas de licencias** › añadir tu cuenta de Google.
7. Ficha de Play: indicar que la app tiene compras dentro de la aplicación; en Seguridad de los datos, que los pagos los
   gestiona Google Play (la app no guarda datos de pago).

## Códigos de acceso gratis

- Generador (privado): https://claude.ai/artifact/EKvF3G6CsbJ1gFWQ4ApaAW — crea la clave y los códigos.
- La clave va como secreto de GitHub **`ACCESS_CODE_SECRET`** (Settings › Secrets and variables › Actions) antes de
  compilar la app con el workflow «App Android». Sin ese secreto, los códigos no funcionan.
- Para anular un código: añadir el nombre a `REVOKED` en `src/services/Access.ts` y publicar una versión nueva.
- Más adelante (decidido dejarlo para cuando haga falta): **servidor de activaciones** (p. ej. Cloudflare, plan gratis)
  para limitar cada código a 2 móviles, ver qué códigos se han canjeado y liberar plazas. Ahora la app comprueba los códigos
  sin internet y nadie sabe si se usan ni en cuántos móviles. Los códigos ya repartidos seguirían valiendo.

## Prueba cerrada (después del build 19)

Los probadores se apuntan solos a un **Grupo de Google** con el Gmail que usan en Play Store. Requisito de Google
para cuentas personales: **al menos 12 probadores apuntados durante 14 días seguidos** antes de pedir el acceso a producción.

1. **Grupo de Google** (groups.google.com): crear el grupo (p. ej. «Kasa Fit probadors»), tipo de correo
   `...@googlegroups.com`; en Configuración: «Quién puede unirse: cualquier persona en la web» (o «Pedir unirse» si se
   quieren aprobar a mano); que no se pueda ver la lista de miembros. Copiar el enlace del grupo.
2. Play Console › **Contenido de la app**: que no quede nada en rojo (sobre todo **Permisos de salud / Health Connect**,
   Seguridad de los datos, Clasificación de contenido, Público objetivo, Anuncios = no, Acceso a la app).
3. Play Console › Prueba › **Prueba cerrada** › pista «Alpha» (o crear una) › pestaña **Testers**: «Grupos de Google» →
   pegar el correo del grupo. Guardar.
4. **Países**: España (y los que se quieran).
5. **Versión**: en Prueba interna, «Promocionar versión › Prueba cerrada» del build 19 (o subir el mismo .aab).
6. **Resumen de la publicación › Enviar cambios a revisión.** La primera revisión puede tardar unos días.
7. Aprobada: en Testers, copiar el **enlace para unirse** («Unirse en la web» / opt-in).
8. Mensaje a los probadores (orden importante): ① unirse al grupo con su Gmail de Play Store; ② abrir el enlace de
   prueba y pulsar «Convertirse en tester»; ③ instalar desde Play Store (enlace de la ficha). Que no se salgan del
   grupo ni desinstalen durante los 14 días.
9. Prémium para probadores: un **código de acceso** para cada uno (generador) o añadir su Gmail a Pruebas de licencias
   (compras de prueba sin cobro). Si no, la suscripción se cobra de verdad.
10. Pasados 14 días con ≥12 probadores: Panel › **Solicitar acceso a producción** (preguntas sobre la prueba: cuántos,
    qué opinaron, qué se cambió). Mientras tanto, ir subiendo versiones a la prueba cerrada con lo que digan.

## Versión 1.1 (después del lanzamiento)

- **Health Connect: HECHO (adelantado a la 1.0).** Configuració › Apps de salut: interruptor «Desa els entrenaments a
  Health Connect» (solo app Android, Android 9+; en 9-13 con botón para instalarlo). Solo ESCRIBE: sesión de fuerza,
  calorías activas, pulsaciones del reloj y peso. Código: android/.../KasaHealthPlugin.kt y HealthPrivacyActivity.kt,
  src/services/Health.ts. Política de privacidad actualizada (también en kasa-fit-privacidad, sección #health-connect).
  - Pendiente en Play Console: Contenido de la app › Permisos de salud (Health Connect): declarar los 4 permisos de
    escritura (ejercicio, calorías activas, frecuencia cardíaca, peso), explicar el uso y enlazar la política.
- Más adelante, si hace falta: servidor de activaciones de los códigos (ver arriba), app para iPhone, ficha de Play en castellano.

## Ideas para más adelante
- «Mode esquena» dentro de Kasa Fit (o un plan semanal de espalda bien trabajado): ver si se usa antes de pensar en una
  app dedicada. Si un día se hace app aparte: contenido propio (programas progresivos, niveles según el dolor, consejos
  de postura), revisión de un fisioterapeuta, avisos de salud y su propia prueba cerrada de 12 personas y 14 días.
