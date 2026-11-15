# Manual de usuario de FOREST_SAR_HN

Fuente única: `Manual_Usuario_FOREST_SAR_HN.md`. De ahí se generan el HTML, el PDF y el DOCX.

## Regenerar

```
node docs/manual/tools/build-manual.mjs
```

Requiere Node 22+ y el Playwright local de `.bosquevivo-tools` con Chrome del sistema. No instala nada.

El script:

- dibuja los diagramas SVG en `diagramas/` (el gráfico de barras sale de `public/data/snapshots`) y los pasa a PNG;
- convierte el Markdown a HTML, PDF (A4) y DOCX editable (con índice que Word actualiza al abrir);
- avisa si falta una captura de `capturas/` (inserta un recuadro "Captura pendiente");
- valida el PDF y el DOCX, que las imágenes existan y que no haya secretos ni rutas locales.

## Archivos

- `Respuestas_5_preguntas_FOREST_SAR_HN.md`: respuestas del formulario listas para pegar.
- `capturas/`: capturas de la aplicación (no se generan con este script).
- `assets/logo.svg`: logo de marca copiado de `src/components/Navbar.tsx`.

## Pendientes de completar

Enlace público e integrantes del equipo (portada y sección 16.3).
