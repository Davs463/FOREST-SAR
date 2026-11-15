# HANDOFF — FOREST_SAR_HN (ejecución 2026-11-15, ~05:50–06:45 UTC)

Coordinador: Claude Opus 5.5 (sesión principal). Subagentes (modelo de frontmatter): forest-sar, constructor, critico, detective (Sonnet 5.5); narrador (Haiku 5.5). Se usaron las 10 delegaciones del presupuesto (5 lanzamientos + 5 reanudaciones por límite de turnos). Q1 (escudo) lo ejecutó el coordinador en la sesión principal.

## Qué funciona (verificado en esta ejecución)
- **Motor científico real** `scientific-engine/run.py` (+ módulos), config central `config/science.json`.
  - Catálogo CMR público (2026-11-15T04:58Z, bbox provisional −87.35,14.00,−87.05,14.35 = "study window", no límite municipal, 2026-06-01..2026-10-31): 52 escenas (5 V1 de un único ciclo → sin par V1; 47 PROVISIONAL; 0 BETA). 1326 parejas evaluadas, 162 compatibles (todas PROVISIONAL).
  - Par procesado `pair-f93b4394cc` — NISAR_L2_GCOV_PROVISIONAL_V1, track 98, frame 81, descendente, mirada izquierda, frecuencia A, HVHV, EPSG:32616 10 m:
    - inicial `NISAR_L2_PR_GCOV_032_098_D_081_4005_DHDH_A_20261007T001620_20261007T001654_P05023_N_F_J_001` (2026-10-07)
    - final `NISAR_L2_PR_GCOV_033_098_D_081_4005_DHDH_A_20261019T001620_20261019T001654_P05023_N_F_J_001` (2026-10-19)
  - Adquisición: NASA Harmony subset (COG por variable HVHV/mask/numberOfLooks) con `EARTHDATA_TOKEN` del entorno (no guardado). Caché en `.science-cache/` (ignorado por git).
  - Método: potencia lineal → multilook 10×10 (100 m) en lineal, celda válida si ≥90 % píxeles válidos en ambas fechas → dB → Δ = final − inicial; candidato Δ ≤ −3 dB (exploratorio). Máscara válida 1..254 (0 inválido, 255 fill). noise_floor null, offset 0, sin filtro de parche.
  - **Resultado (snapshot `20261115T061150Z-4847035f`)**: válido 117 537 ha; candidato 23 ha (0.0196 %); cobertura 93.8 % de la ventana. Diagnóstico nativo 10 m: 12.58 % ≤−3 dB vs 10.32 % ≥+3 dB (speckle) → por eso el producto principal es multilook. TP/CV/rhythm_12d = null; semáforo "not evaluated". Es **cambio candidato de retrodispersión radar**, no pérdida de bosque ni alerta oficial. Evidencia nivel 1 (una pareja).
  - Export transaccional `public/data/manifest.json` → `snapshots/<id>/{catalog.json,results.json,sectors.geojson (1320 celdas 1 km),processing-log.json,layers/*.png}`. 6 celdas verificadas a mano en processing-log.
- **Web** React 19 + TS + Vite + Leaflet: rutas hash `#/`, `#/observatory`, `#/observations`, `#/community`, `#/library`, `#/methodology`; marca en `src/config/app.config.ts`; i18n EN (por defecto)/ES en `src/i18n/` con paridad forzada por tipo `Messages`; tokens `src/styles/tokens.css`; componentes comunes `src/components/`; adaptador `src/services/science.repository.ts` (estados ready/catalog_only/no_data/error, sin fixtures de fallback). StoryHero conservado. Observatory con Leaflet lazy-loaded, overlays con bounds del snapshot, sectores con `setStyle`, selector solo de parejas compatibles. Observations con CSV del snapshot real. Comunidad = demo localStorage rotulada.

## Pruebas
| Prueba | Resultado |
|---|---|
| `.venv/Scripts/python.exe -m pytest tests/python -q` | **PASS** 35 passed |
| `npm run typecheck` | **PASS** exit 0 |
| `npm run build` | **PASS** exit 0 (index JS 315.69 kB / 99.68 kB gzip; Observatory JS 168.99 kB / 48.71 kB gzip) |
| Grep secretos/URLs firmadas en `dist/`, `public/`, `src/` | **PASS** 0 coincidencias |
| `dist/` sin HDF5/TIF/py/env ni regiones mock | **PASS** |
| Playwright `node .bosquevivo-tools/node_modules/@playwright/test/cli.js test` (24 tests, 3 viewports) | **BLOCKED**: `browserType.launch: Executable doesn't exist at .bosquevivo-tools\browsers\chromium_headless_shell-1194\chrome-win\headless_shell.exe`; la carpeta `.bosquevivo-tools/browsers` está vacía. No se reinstaló (política). |
| Revisión de código (critico) | Aprobado con cambios 8/10; todos los hallazgos importantes corregidos por detective |
| Prueba manual en navegador | **NO EJECUTADA** (sin navegador automatizable) |

## Reproducir
```
.venv/Scripts/python.exe -m pytest tests/python -q
.venv/Scripts/python.exe scientific-engine/run.py --config config/science.json --catalog-file .bosquevivo-work/catalog/cmr-20261115T045835840671Z.json
npm run typecheck && npm run build
npm run preview -- --host 127.0.0.1 --port 4173
node .bosquevivo-tools/node_modules/@playwright/test/cli.js test     # requiere Chromium de Playwright
```
Exit codes del motor: 0 ready, 3 catalog_only, 4 no_data, 1 error, 2 uso/config.

## Pendientes (dueño / estado / siguiente paso)
1. **Propietario — E2E BLOCKED**: instalar navegador de Playwright en `.bosquevivo-tools` (p.ej. `npx playwright install chromium` con `PLAYWRIGHT_BROWSERS_PATH` apuntando a `.bosquevivo-tools/browsers`), luego ejecutar el comando de arriba con el preview levantado. Specs en `tests/e2e/smoke.spec.mjs`, config `playwright.config.mjs`.
2. **Propietario — prueba manual** en 390/768/1440: inicio → observatorio → par → capa candidates/delta → sector → observations CSV → methodology; cambio de idioma; menú móvil.
3. **Propietario — podar snapshots antiguos** en `public/data/snapshots/` (4 catalog_only + 2 ready nativos 10 m) dejando solo `20261115T061150Z-4847035f` antes del build final; los agentes no tienen permiso de borrado. También `git rm` de `src/features/observatory/observatoryData.ts` y `src/features/observations/observations.ts` (sin uso, rotulados UNUSED; si se borra `observations.ts`, se puede quitar la extensión `.tsx` del import en `src/app/routes.tsx`).
4. **P1 (relevo autorizado) — C1/C2**: comunidad (posts/comentarios/votos/reporte con validación, roles demo) y biblioteca (recursos oficiales, modal PDF con fallback, eventos demo). Hoy: CommunityHub original en su ruta con banner demo; Library mínima con enlaces oficiales.
5. **Propietario — LICENSE** del repo ausente; revisar declaración de IA en `docs/SOURCES_AND_AI.md` contra la guía del evento.
6. **Ciencia futura**: más parejas independientes (mismo track 98/frame 81) para repetición y estimación de ruido; polígono municipal oficial verificable; máscara de bosque base; OPERA DIST como complemento separado.
7. **Despliegue**: manual por el propietario según `docs/HOW_TO_DEPLOY.md` (subir solo `dist/`). No se hizo push, merge, deploy ni DNS.

## Documentos
README.md (EN), docs/HOW_TO_DEPLOY.md (EN), docs/SOURCES_AND_AI.md (EN), docs/ARCHITECTURE.md (ES), docs/PROGRESS.md.

## Anexo de continuidad — Codex (2026-11-15)

Se reconstruyó el estado desde el árbol y se verificó sin red el catálogo CMR guardado: 5 escenas validadas, 47 provisionales, 0 beta, sin truncamiento. No contar esto como parejas ni detecciones. El manifest local apunta al snapshot real `20261115T061150Z-4847035f`; la caché incluye ambos subsets del par provisional y los seis checksums de HVHV/máscara/numberOfLooks coinciden. El resultado de 23 ha es únicamente un candidato de cambio de retrodispersión radar en celdas de 100 m; no hay máscara forestal, estimaciones CV/TP ni evidencia de pérdida forestal. Cobertura está referida a bbox provisional, no al límite municipal.

Verificaciones ejecutadas en este relevo:

| Comando/artefacto | Resultado |
|---|---|
| Inspección PowerShell del JSON CMR guardado | PASS: V1 5, PROVISIONAL 47, BETA 0; todos `truncated=false` |
| Comparación SHA-256 de seis TIFF cacheados con `processing-log.json` | PASS: 6/6 |
| `.venv/Scripts/python.exe scientific-engine/run.py ... --dry-run` | BLOCKED antes del programa: intérprete no encuentra `encodings` |
| `.venv/Scripts/python.exe -m pytest tests/python -q` | BLOCKED por el mismo fallo fatal del intérprete; no equivale a fallo de tests |
| `npm.cmd run typecheck` | PASS, exit 0 |
| `npm.cmd run build` | PASS, exit 0 (Vite 8.3.8) |
| Playwright / navegador manual | BLOCKED/no disponible en este relevo; el intento Playwright previo reporta ejecutable Chromium ausente. No se instaló nada. |

El historial Claude contiene 35 pytest PASS, pero esa ejecución no se repitió aquí. La sesión no intentó red, no recuperó credenciales, ni alteró archivos de política o contratos. Se conservaron los cambios existentes y solo se añadieron notas a PROGRESS/HANDOFF.

**Siguiente paso concreto (Q1 P0):** restaurar el Python `.venv` autorizado para que incluya su biblioteca estándar `encodings`, y proporcionar Chromium de Playwright en la ubicación local esperada sin saltarse la política; entonces correr pytest y los 24 smoke cases. La navegación manual responsive también queda para el propietario. `typecheck` y `build` están verificados en este relevo. P1 comunidad/biblioteca no iniciado.

## Actualización UX2 + NASA GIBS — 2026-11-15 (Claude Opus 5.5 coordinador; Sonnet constructor/revisor; Haiku traducciones)
Detalle completo en `docs/PROGRESS.md` (lotes UX2 y G1). Ciencia intacta: mismo snapshot `20261115T061150Z-4847035f`, sin reprocesar.

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` / `npm run build` | PASS / PASS |
| `.venv/Scripts/python.exe -m pytest tests/python -q` | PASS 35 |
| `PW_CHANNEL=chrome node .bosquevivo-tools/node_modules/@playwright/test/cli.js test` (con `npm run preview -- --host 127.0.0.1 --port 4173`) | PASS 41, 4 omitidos (solo móvil), 0 fallos |

Qué ver en la demo: `#/observatory` → paso 1 (fechas) → paso 2 (comparar antes/después, controles avanzados → mapa base "Radar NISAR (mosaico oficial NASA)" o "Color natural, 30 m (HLS)" del 7 oct) → paso 3 (Zona 1, limitaciones). Cambiar a ES/EN.

Pendientes del propietario:
1. Chromium de Playwright en `.bosquevivo-tools/browsers/chromium-1194` está incompleto (falta `chrome.exe`/headless_shell). Mientras tanto usar `PW_CHANNEL=chrome` (Chrome del sistema). No se instaló nada.
2. GIBS depende de red pública; si falla, la app avisa y vuelve a OpenStreetMap. Re-sondear `available` en `src/config/mapLayers.config.ts` si se publica otra pareja.
3. Pendientes de baja severidad listados al final del lote UX2 en PROGRESS.
4. Sin commit, push ni deploy (según instrucciones).

## Actualización T1 — comparación temporal — 2026-11-15
Ver lote T1 en `docs/PROGRESS.md`. Estado: interfaz multi-período y motor `--pair-id`/índice **listos y probados**; las 3 comparaciones nuevas (84, 60, 36 días hasta el 19‑oct) están **BLOCKED por falta de `EARTHDATA_TOKEN`**. Hoy el observatorio muestra solo la comparación real 7→19 oct y explica que otras fechas aún no tienen resultados.

Para completar (propietario):
1. En tu terminal: `setx EARTHDATA_TOKEN "<token de urs.earthdata.nasa.gov>"` y abre una terminal nueva (no pegues el token en el chat ni en archivos).
2. `.venv/Scripts/python.exe scientific-engine/run.py --config config/science.json --catalog-file .bosquevivo-work/catalog/cmr-20261115T045835840671Z.json --pair-id pair-b791e9876a,pair-642e3bf57f,pair-5517bacb4b` (exit 0 = al menos una publicada; 5 = bloqueado, manifest intacto).
3. `npm run build`, `npm run preview -- --host 127.0.0.1 --port 4173`, `PW_CHANNEL=chrome node .bosquevivo-tools/node_modules/@playwright/test/cli.js test`.
4. Revisar en `#/observatory` los atajos 1/2/3 meses y en `#/data` la pestaña de comparaciones procesadas.
Pruebas actuales: tsc/build PASS · pytest 39 PASS · Playwright 50 PASS / 4 omitidos. Sin commit, push ni deploy.

## Actualización V1 — mapa limpio y búsqueda — 2026-11-15
Ver lote V1 en `docs/PROGRESS.md`. 4 comparaciones reales disponibles (12, 36, 60 y 84 días hasta el 19‑oct); el observatorio abre en 84 días con mapa satelital, zonas delimitadas, área válida, búsqueda de lugares y selector de zonas. Pruebas: tsc/build PASS · pytest 45 · Playwright 63 PASS / 6 omitidos.
Para regenerar derivados tras procesar nuevas parejas: se hace automáticamente; manualmente `.venv/Scripts/python.exe scientific-engine/run.py --config config/science.json --derive-snapshot <id>` y `--rebuild-index`. Antes de desplegar: revisar términos de Esri/OpenTopoMap. Sin commit, push ni deploy.

## Actualización A1 — 2026-11-15
- Nuevo: agrupación de zonas por zoom, colores de zona iguales en todos los mapas base (magenta; selección en cian), 5 clases de intensidad de radar, tarjetas de zona/agrupación con "Ver evolución", vista **#/analytics** (resumen, 6 gráficos, línea de tiempo, horizontes 1 m–3 a, aviso de no sumar períodos).
- Publicar: `npm run build:publish` y seguir `docs/PUBLICAR.md` (subir el contenido de `dist/` a `public_html/`). No se hizo deploy, push ni cambios DNS.
- Pruebas: tsc 0 · build 0 · pytest 45 · Playwright 111 passed / 6 skipped / 0 failed (`PW_CHANNEL=chrome`, preview en 127.0.0.1:4173).
- Antes de publicar: revisar términos de Esri y OpenTopoMap; activar HTTPS en el dominio.

## Actualización A2 — 2026-11-15
- Observatorio sin comparador deslizante (Antes/Después solo en "Herramientas avanzadas"); períodos 12 d / 1 / 2 / 3 meses como control principal.
- Observaciones por localidad (combobox con buscador, tarjeta de detalle, "Ver en el mapa", "Ver evolución", CSV de zonas y de sectores de 1 km del período).
- Metodología visual "Del espacio a la Tierra" con toda la información científica en "Transparencia científica".
- `npm run build:publish` OK · Playwright 136/8/0 · pytest 45. Sin commit, push ni deploy.

## Actualización M1 — 2026-11-15
- Manual de usuario en `docs/manual/` (PDF, DOCX editable, MD fuente, HTML, respuestas de las 5 preguntas). Regenerar con `node docs/manual/tools/build-manual.mjs` (también actualiza `public/manual/`).
- En el sitio: Metodología → "Manual de usuario" → modal con el PDF y botón de descarga.
- Antes de publicar: completar enlace público e integrantes en el manual, regenerar y `npm run build:publish`.

## Actualización R1 — 2026-11-15
- Rediseño visual de Observatorio (barra de herramientas, mapa más grande, "Ver mapa en grande"), Observaciones, Evolución y Biblioteca. Lógica y datos sin cambios.
- Manual regenerado con capturas del diseño nuevo. Pruebas: Playwright 142/8/0 (dos ejecuciones), pytest 45.
