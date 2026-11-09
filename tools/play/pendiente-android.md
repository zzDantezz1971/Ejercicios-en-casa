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
