# Ejercicios en casa

App para el móvil (Android) para hacer en casa rutinas de **calentamiento, pesas, abdominales y estiramientos**,
con un maniquí 3D que enseña cada ejercicio.

- Eliges los ejercicios de cada apartado; se hacen en el orden en que los marcas, con la duración que pongas.
- Pausa configurable entre ejercicios (5 s por defecto) y cuenta atrás de 10 s al empezar cada apartado.
- Entre apartados espera a que toques la pantalla.
- Ejercicios por lados: aviso de cambio de lado a mitad del tiempo.
- Pitidos, avisos por voz, pantalla siempre encendida, botones de anterior, pausa y saltar.
- Guarda la última rutina y un historial sencillo. Funciona sin conexión una vez instalada.

## Uso

Se publica automáticamente en GitHub Pages con cada cambio. En el móvil, abre la dirección en Chrome y pulsa
**Añadir a pantalla de inicio** para instalarla como una app.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm test         # pruebas de la lógica
npm run build    # comprobación de tipos y versión final en dist/
```

## Organización del código

| Carpeta | Contenido |
|---|---|
| `src/domain` | Lógica sin pantallas: tipos, `WorkoutPlan` (rutina → lista de pasos), `WorkoutSession` (máquina de estados del entrenamiento), `RoutineEditor`, `Store` (guardado con versión). |
| `src/services` | `Sounds` (pitidos), `Voice` (voz en castellano), `ScreenAwake` (pantalla encendida), `Coach` (une la sesión con sonido y voz). |
| `src/data` | Catálogo de ejercicios (`rawExercises.ts`), descripciones y qué ejercicios van por lados (`catalog.ts`). |
| `src/figure` | Motor de posturas (`poses.ts`), maniquí 3D con Three.js (`Mannequin.ts`) y lienzos/miniaturas (`FigureView.ts`). |
| `src/ui` | `App` (navegación y botón atrás) y una clase por pantalla en `screens/`. |
| `tests` | Pruebas con Vitest. |

### Añadir un ejercicio

Añade una entrada en `src/data/rawExercises.ts` dentro de su apartado (nombre, zona y fotogramas del movimiento),
su descripción en `src/data/descriptions.ts` y, si se hace por lados, su id en `ONE_SIDED` de `src/data/catalog.ts`.
