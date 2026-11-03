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
