# Pendiente para la versión Android (antes de subirla a Play Store)

- **Bajar la música cuando habla la app** (audio focus de Android, `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`):
  pedir el foco justo antes de la voz y de los pitidos y soltarlo al acabar, para que Spotify,
  YouTube Music, la radio, etc. bajen el volumen solos. Sin integrar Spotify (pediría Premium,
  registro de la app y cuenta de cada usuario). Interruptor en Configuració → Avisos:
  «Baixa la música quan parla l'app» (activado por defecto), con su fila en `src/i18n/ui.ts`.
- Barras del sistema (estado y navegación) que sigan el tema claro.
- Gráfico de la ficha de Play sin maniquís (o con el maniquí nuevo).
- Compilar con el workflow manual de Android y probar el APK.
- Crear la app en Play Console cuando acabe la verificación; prueba cerrada.

## Suscripción (1 €/mes o 10 €/año, sin prueba gratis)

La app ya lo tiene programado (`src/services/Access.ts`, pantalla `PaywallScreen`). Modelo: versión gratis con un ejercicio
de cada apartado (saltos de tijera, flexiones, plancha frontal y gato-camello) y el resto con candado; la
suscripción o un código lo desbloquean todo. Solo afecta a la app de Google Play; la web no se cobra (en Configuración hay
una vista previa de la versión gratis). Falta configurarlo en Google:

1. Play Console › Configuración › **Perfil de pagos** (datos fiscales y cuenta bancaria).
2. Subir la app (aunque sea a prueba interna) para que Play Console deje crear productos.
3. Monetización › Productos › **Suscripciones** › crear la suscripción con ID **`premium`**.
4. Dentro, dos **planes base** de renovación automática:
   - ID **`mensual`**: 1 mes, 1,00 €.
   - ID **`anual`**: 1 año, 10,00 €.
5. **Sin oferta de prueba gratis**: la versión gratis de la app ya sirve para probarla. Activar los dos planes.
6. Para probar sin pagar: Configuración › **Pruebas de licencias** › añadir tu cuenta de Google.
7. Ficha de Play: indicar que la app tiene compras dentro de la aplicación; en Seguridad de los datos, que los pagos los
   gestiona Google Play (la app no guarda datos de pago).

## Códigos de acceso gratis

- Generador (privado): https://claude.ai/artifact/EKvF3G6CsbJ1gFWQ4ApaAW — crea la clave y los códigos.
- La clave va como secreto de GitHub **`ACCESS_CODE_SECRET`** (Settings › Secrets and variables › Actions) antes de
  compilar la app con el workflow «App Android». Sin ese secreto, los códigos no funcionan.
- Para anular un código: añadir el nombre a `REVOKED` en `src/services/Access.ts` y publicar una versión nueva.
