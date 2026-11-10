# Maniquí con piel (pruebas)

Scripts que generan los datos del maniquí de una sola pieza (`SkinnedFigure`). No forman parte de la app todavía.

- `build_a.py`: opción A, cuerpo propio modelado con formas suaves y convertido en malla (surface nets).
- `build_mh.py`: opción B, modelo base de MakeHuman (CC0) con forma de hombre joven atlético.
  Necesita en esta carpeta, descargados del repositorio `makehumancommunity/makehuman` (todo CC0):
  `base.obj`, `default.mhskel`, `w.mhw` (= `rigs/default_weights.mhw`), `caucasian-male-young.target`,
  `universal-male-young-maxmuscle-averageweight.target`, `universal-male-young-maxmuscle-minweight.target`.
- `smooth_regions.py`: limpia los bordes de los colores de la ropa.

Los scripts escriben `skin_a.json` / `skin_b.json`; copiarlos a `tools/` y ejecutar `tools/build-compare.sh`
para generar la página de comparación.

## Maniquí actual (Meshy) y cómo volver al anterior

- Se probó como `public/maniqui.json` (8-11-2026) el cuerpo anatómico creado con Meshy AI, con el esqueleto
  puesto por `build_meshy.py`; se retiró el mismo día (deformaciones y pies). La app vuelve a usar el anterior.
- `maniqui_anterior.json` es el maniquí que había antes (MakeHuman, opción B). Para volver a él:
  `cp tools/maniqui/maniqui_anterior.json public/maniqui.json` (commit anterior al cambio: 0bd453d).

## Maniquí del usuario (Blender + MPFB)

- `Humanoide.glb`: cuerpo hecho por el usuario en Blender 5.2 con MPFB (MakeHuman), con su esqueleto y sus pesos.
- `build_glb.py Humanoide.glb` lo convierte en `skin_glb.json` (mismo formato que `public/maniqui.json`):
  junta los 160 huesos en los 15 de la app, escala a la altura del maniquí anterior y añade puño, ropa y labios.
  Para probarlo en la app: `cp tools/maniqui/skin_glb.json public/maniqui.json`.
