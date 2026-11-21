# Vídeo «Despertador» con IA — Fit, el muñeco de Kasa Fit

## Qué hay en esta carpeta
- `fit-de-frente.png`, `fit-tres-cuartos.png`, `fit-de-lado.png`, `fit-de-espaldas.png`: Fit desde 4 ángulos (referencias).
- `fit-celebrando.png`, `fit-dormido.png`: dos posturas para escenas concretas.
- `fit-hoja-personaje.png`: todas juntas en una sola imagen.
- `final-logo-kasa-fit.mp4`: el cierre con el logo (2,6 s), para ponerlo al final del vídeo.

## Herramienta recomendada: Google Flow (Veo)
1. Entra en Flow, crea un proyecto y elige formato **vertical 9:16**.
2. Usa **«Ingredients to video»** (Ingredientes): sube `fit-de-frente.png`, `fit-tres-cuartos.png` y `fit-de-lado.png`.
   Así Fit sale siempre parecido. Para la escena 1 puedes usar también `fit-dormido.png`.
3. Pega el **texto de cada escena** (en inglés: la IA lo entiende mejor). Pon SIEMPRE delante la descripción de Fit.
4. Genera 2-4 versiones de cada escena y quédate con la mejor (la IA a veces deforma manos o piernas: descarta esas).
5. Une las escenas en **CapCut** (gratis), añade los textos en catalán y el clip `final-logo-kasa-fit.mp4` al final.
6. En Instagram, añade la música desde su biblioteca.

Alternativas si Flow no convence: **Kling AI** (función «Elements» para mantener el personaje; muy buen movimiento) o
**Runway Gen-4** (función «References»).

## Descripción de Fit (pegar delante de cada escena)
Fit, a friendly stylized 3D cartoon mannequin character, like a smooth wooden artist's mannequin turned into a cute toy:
bald round head, simple cute face with small black dot eyes, thin eyebrows and a small smile, matte light-tan skin,
visible round ball joints at elbows and knees, slim segmented limbs. He wears a bright royal-blue t-shirt with big
puffy rounded shoulders and thin white trim on the sleeves, black shorts with a white stripe and white hem, short white
socks and orange-yellow sneakers, an orange wristband on one wrist and a black watch on the other. Clean soft 3D render,
Pixar-like toy style, soft lighting. Vertical 9:16.

## Escenas (8 s cada una como máximo)
**1 · Dormido (gancho)**
Early morning in a cozy modern bedroom with soft blue dawn light. Fit is fast asleep, lying on his back spread-eagle
on a navy-blue exercise mat on the floor, snoring peacefully. A vintage yellow alarm clock next to his head shows 7:00,
then starts ringing loudly and shaking. Fit's eyes pop open in surprise. Slow camera push-in, playful comedic mood.
*(Texto en CapCut: «Dilluns, 7:00 h»)*

**2 · Se levanta de un salto**
Fit springs up from the mat in one bouncy, energetic jump, lands on his feet, stretches both arms up with a big smile
as warm morning sunlight floods the room. Camera does a quick half orbit around him. Upbeat and fun.
*(Texto: «Bon dia, Fit!»)*

**3 · Los 4 bloques** (4 clips cortos; cada uno con la luz del color del bloque)
- Fit does energetic jumping jacks in a bright modern living room, warm orange accent lighting. *(«Escalfament»)*
- Fit does powerful kettlebell swings with a grey kettlebell, cool blue accent lighting. *(«Força»)*
- Fit does fast mountain climbers on the navy mat, pink-magenta accent lighting. *(«Abdominals»)*
- Fit does a slow cat-cow stretch on all fours on the mat, calm teal accent lighting. *(«Estiraments»)*

**4 · Celebración**
Fit stands proudly with both arms raised in victory, big happy smile, colorful confetti in orange, blue, pink and teal
falls around him, he winks at the camera. Bright, joyful.
*(Texto: «Activat en 10 minuts»)*

**5 · Final**: el clip `final-logo-kasa-fit.mp4`.

## Consejos
- Que cada clip dure poco (1,5-2 s en el montaje): engancha más y se notan menos los fallos de la IA.
- Revisa que la técnica de los ejercicios sea razonable (es una app de ejercicio: la gente se fija).
- Si la IA cambia demasiado a Fit (pelo, ropa…), repite la escena o añade «same character as the reference images».

## Cómo se hicieron las imágenes de referencia
Con `npm run dev`, `tools/figures.html?ids=saltos-suaves-en-el-sitio&t=0&w=1500&mood=happy&az=90&el=6` (de frente;
az 50 = tres cuartos, 0 = de lado, 270 = de espaldas), `ids=saltos-de-tijera-jumping-jacks&t=0.5&mood=happy`
(celebrando) y `ids=torsion-lumbar-tumbado&t=0&mood=relaxed` (dormido). Se recorta sin la sombra y se pone sobre fondo
gris claro (#E8ECF2), 1536×1536.
