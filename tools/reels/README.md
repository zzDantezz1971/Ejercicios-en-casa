# Reels de Kasa Fit

> **Decisión (24/11/2026): los vídeos se hacen SIN Fit.** Se enseña cómo funciona la app con capturas reales
> (modo oscuro) en un móvil inclinado en 3D sobre el fondo azul noche, una pantalla cada ~4,5 s con su titular y una
> frase que explica qué hace (`anunci.html` / `anunci.ts`). Las capturas se sacan con `tools/play/demo-data.ts`
> (modo oscuro) y se guardan en `tools/reels/assets/`. La habitación y Fit (`reel.*`, `hola.*`, `room.ts`) quedan
> como estaban, por si algún día se quieren usar.

Vídeos verticales (1080 × 1920, 30 fps) con Fit, el muñeco de la app, en su habitación.

- `scripts.ts`: los guiones (clips con ejercicio, textos y duración; frase del póster de cada reel).
- `room.ts`: la habitación (siempre igual) y la colocación de la cámara.
- `reel.html` / `reel.ts`: la página que pinta cada instante (`window.__reel.render(ms)`).
- `record.cjs`: graba el mp4 (`node tools/reels/record.cjs presentacio <carpeta>`, con
  `npx vite --port 5174 --strictPort --host 127.0.0.1` en marcha).

## Reglas acordadas (no romperlas)

- **La habitación se ve siempre igual** en todos los clips y vídeos: solo cambian Fit y el material del ejercicio.
  Nada de acercar la cámara a la escena: lo que se acerca o se aleja es Fit.
- **La posición y el tamaño de Fit dependen de varias cosas** y se calculan solos en cada clip (`addRoom`):
  - Fit va **siempre centrado**, haga el ejercicio que haga (se mide todo el movimiento, con el material).
  - Se acerca a la cámara todo lo posible (hasta `EYE.near`), pero se queda más atrás si:
    - el ejercicio ocupa mucho a lo ancho (p. ej., tumbado en la esterilla);
    - bajaría hasta la barra de los textos;
    - taparía el **nombre del ejercicio**: si el nombre es largo (o ocupa dos líneas), Fit va más atrás.
  - Si se añade algo nuevo encima de la imagen, hay que pasarlo en `avoid` para que Fit no lo tape.
- **Nombre del ejercicio**: encima de la barra, a la izquierda, en una etiqueta oscura con ▶ naranja (nombre del
  catálogo en catalán, sin el inglés entre paréntesis; `name` en el clip para cambiarlo).
- **Textos del mensaje**: dentro de la barra de abajo, junto al logo (título blanco y etiqueta naranja).
- **Póster**: una frase motivadora distinta en cada vídeo (`poster` en el guion, líneas separadas por «|»).
- **Pantalla final**: fondo dorado (más intenso arriba, degradado suave), marco negro con sombra, logo, «Kasa Fit»,
  «Entrena a casa, en català. Sense anuncis.» y el botón «Gratis a Google Play».
- **Aspecto de Fit en estos primeros vídeos**: calvo, gafas de sol, barba de tres días, camiseta de tirantes azul,
  mallas granates y bambas rojas.
