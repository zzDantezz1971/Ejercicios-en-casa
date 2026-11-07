# Notas para el desarrollo

- Cada cambio que se publique debe añadir una entrada AL PRINCIPIO de `public/novedades.json`
  (fecha ISO en UTC, y el texto en `es`, `ca` y `en`, traducido a mano). Es lo que se ve al pulsar
  "Ver novedades" cuando hay una versión nueva.
- La app está en catalán (por defecto), castellano e inglés: todo texto nuevo de la interfaz necesita
  su fila en `src/i18n/ui.ts`.
