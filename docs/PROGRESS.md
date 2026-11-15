# Progreso vivo — FOREST_SAR_HN

Registrar cada lote: fecha UTC/HN, ID, etapa, estado, responsable, archivos, comandos ejecutados, código de salida, evidencia, bloqueos, próximo paso. No registrar credenciales ni URLs firmadas.

| ID | Estado | Evidencia | Próximo paso |
|---|---|---|---|
| A0 | DONE | preflight 2026-11-15 ~05:50 UTC (ver abajo) | — |
| S1 | DONE | 52 escenas inspeccionadas, 1326 parejas evaluadas, 162 compatibles (todas PROVISIONAL; V1 sin par) | — |
| S2 | DONE | Harmony subset (COG por variable, EPSG:32616, 10 m, freqA) funcionó; par track 98 / frame 81 / D, 2026-10-07 → 2026-10-19 | — |
| S3 | DONE | snapshot vigente `20261115T061150Z-4847035f` (multilook 100 m) status ready; pytest 35 passed (verificado por coordinador); sin secretos en public/ | — |
| U1/U2 | DONE | shell hash, i18n EN/ES, tokens, componentes, Leaflet lazy, Observations CSV; review corregido | prueba manual navegador |
| I1 | DONE | snapshot multilook integrado; adaptador `metrics_by_pair`; fix colisión mayúsculas routes.tsx | — |
| C1/C2 | TODO (P1) | CommunityHub original en ruta con banner demo; Library mínima | relevo |
| Q1 | PARTIAL | pytest 35 PASS, typecheck/build PASS, secretos 0; Playwright BLOCKED (Chromium ausente) | propietario instala navegador |
| D1 | DONE | README EN, HOW_TO_DEPLOY, SOURCES_AND_AI, ARCHITECTURE, HANDOFF | revisión propietario |

## Baseline importada — 14/11/2026
- Código React/TypeScript/Vite importado sin `node_modules`, `.git`, `dist` ni copia antigua. Ver `BASELINE_AUDIT.md` y `PROGRESS_BASELINE.md`.
- Los datos ilustrativos existentes (`observatoryData.ts`) NO cuentan como ciencia.

## Lote A0 — preflight (coordinador Opus 5.5, sesión principal) — 2026-11-15 ~05:50 UTC
- Rama: `feature/FOREST_SAR_HN-hackathon`. `git status --short`: cambios del propietario en `.claude/*`, CLAUDE.md, docs/PROMPT_INICIO.md, package*.json, scripts de relevo (no tocados).
- `.venv/Scripts/python.exe --version` → Python 3.12.6 (exit 0).
- `.venv/Scripts/python.exe -m pip check` → "No broken requirements found." (aviso `Could not find platform independent libraries <prefix>` conocido, inocuo).
- `npm run typecheck` → exit 0. `npm run build` → exit 0 (dist: index.html 1.20 kB, CSS 48.02 kB, JS 271.52 kB; 746 ms).
- Leaflet 1.9.4 + @types/leaflet 1.9.22 presentes en package.json.
- Catálogo CMR local verificado: consulta 2026-11-15T04:58:34Z, bbox -87.35,14.00,-87.05,14.35, 2026-06-01..2026-10-31; V1 5/5 hits, no truncado. Son registros de catálogo, NO parejas validadas.
- Decisión de frentes paralelos (rutas sin solapamiento):
  - Ciencia (forest-sar): `scientific-engine/`, `config/science.json`, `tests/python/`, `public/data/`, `.science-cache/`.
  - UI (constructor): `src/`, `index.html`.

## Lote S1–S3 — ciencia (forest-sar, Sonnet 5.5 según frontmatter) — 2026-11-15 05:55–06:10 UTC
- Agente se detuvo dos veces por límite de turnos (24) y fue reanudado por el coordinador.
- Archivos: `config/science.json`, `scientific-engine/{run,catalog,pairing,acquisition,processing,process_pair,metrics,render,export,pipeline,util}.py`, `tests/python/*`, `public/data/manifest.json`, `public/data/snapshots/*` (varios snapshots: catalog_only previos y ready). `scripts/search_cmr.py` adaptado a config central.
- Catálogo: 52 escenas (5 V1 de un solo ciclo, 47 PROVISIONAL), 1326 parejas evaluadas, 162 compatibles, todas PROVISIONAL.
- Par procesado `pair-f93b4394cc`: inicial `NISAR_L2_PR_GCOV_032_098_D_081_4005_DHDH_A_20261007T001620_20261007T001654_P05023_N_F_J_001` (2026-10-07), final `NISAR_L2_PR_GCOV_033_098_D_081_4005_DHDH_A_20261019T001620_20261019T001654_P05023_N_F_J_001` (2026-10-19); NISAR_L2_GCOV_PROVISIONAL_V1; track 98, frame 81, descendente (verificado en UMM-G CMR). HVHV frecuencia A, potencia lineal detectada, grid idéntico EPSG:32616 10 m.
- Regla de máscara: válido si mask ∈ 1..254; 0 inválido; 255 fill. Umbral 3 dB exploratorio, noise_floor null, offset 0. TP/CV/rhythm = null.
- Métricas nativas 10 m (snapshot `20261115T060926Z-448a38fa`): valid 118 533.88 ha, candidato 14 917.30 ha (12.58 %), cobertura 94.59 % de la ventana de estudio. Diagnóstico: mediana Δ −0.15 dB, 12.6 % ≤−3 dB vs 10.3 % ≥+3 dB → dominado por speckle.
- Revisión científica del coordinador: no presentar la cifra nativa como principal; se pidió producto multilook (promedio en potencia lineal por bloques) como snapshot nuevo, conservando nativo como diagnóstico.
- Comando verificado por coordinador: `.venv/Scripts/python.exe -m pytest tests/python -q` → 28 passed (exit 0).

### S3 revisión multilook (forest-sar, 3.ª reanudación) — 2026-11-15 06:11 UTC
- Producto principal: multilook 10×10 (celdas 100 m) promediando potencia lineal; celda válida si ≥90 % de píxeles válidos en ambas fechas. Snapshot `20261115T061150Z-4847035f` (no se redescargó; caché).
- Multilook: válido 117 537 ha, candidato 23 ha (0.0196 %), cobertura 93.8 %; shares ≤−3 dB 0.0196 % vs ≥+3 dB 0.0128 %; mediana −0.14 dB. Nativo 10 m conservado en `diagnostics.native_10m`.
- 6 celdas verificadas a mano en processing-log (dif ≤1e-4 dB). Exit codes motor: 0 ready, 3 catalog_only, 4 no_data, 1 error.
- `.venv/Scripts/python.exe -m pytest tests/python -q` → 35 passed (coordinador).
- Grep de secretos (X-Amz, Signature=, access_token, Bearer, JWT) en public/src/config: 0 coincidencias; en motor solo código de saneamiento y test.
- Pendiente no bloqueante: 4 snapshots catalog_only y 2 ready nativos antiguos siguen en `public/data/snapshots/` (sin permiso de borrado); el propietario puede podarlos antes del build.

## Lote Q1-review (critico, Sonnet 5.5) — 2026-11-15
- Veredicto: aprobado con cambios, 8/10. Sin bloqueantes. Fidelidad científica OK (null→"No calculable", semáforo gris, mock no importado, solo pares compatibles, params/limitations del snapshot).
- Importantes: 1326 radios de pareja, 1320 botones de sector, recreación de 1320 capas por selección, Tabs sin foco si capa activa deshabilitada. Menores: lazy-load Leaflet, error de overlay, fitBounds al cambiar idioma, StrictMode, fallback de sectorMetrics, limitations ocultas, 'DEMO' fijo.
- Delegado a detective (Q1-fix). Narrador en paralelo (D1 docs).

## Lote Q1-fix (detective, Sonnet 5.5; 1 reanudación) — 2026-11-15
- 9 puntos corregidos: solo parejas seleccionables como radios (otras en details, máx 50), sectores con candidato + select, capas de sectores creadas una vez + setStyle + preferCanvas, fitBounds solo por bbox, aviso de error de overlay, effectiveLayer/Tabs, React.lazy Observatory, sectorMetrics estricto, limitaciones visibles, 'DEMO' a i18n, StrictMode.
- Regresión introducida y corregida por coordinador: quitar `.tsx` del import de Observations colisionó con `observations.ts` (Windows case-insensitive, TS1261) → import con extensión explícita. Coordinador añadió CSS `observatory__others`/`observatory__limits`.
- `npm run typecheck` exit 0; `npm run build` exit 0.

## Lote Q1 (coordinador, sesión principal; presupuesto de delegaciones agotado) — 2026-11-15
- Nuevos: `playwright.config.mjs`, `tests/e2e/smoke.spec.mjs` (8 casos × 3 viewports: home/título/consola, mapa+fechas reales+atribución OSM, sin duplicar mapa + Atrás, CSV, methodology, comunidad demo, idioma, menú móvil Escape).
- `npm run preview -- --host 127.0.0.1 --port 4173` (background) + `node .bosquevivo-tools/node_modules/@playwright/test/cli.js test` → exit 1, 24/24 fallan al lanzar: `Executable doesn't exist at .bosquevivo-tools\browsers\chromium_headless_shell-1194\chrome-win\headless_shell.exe`. Glob `.bosquevivo-tools/browsers/*` vacío. **BLOCKED**, no reinstalado.
- Grep secretos en dist/public/src: 0. dist sin HDF5/TIF/py/env ni regiones mock.

## Lote D1 (narrador, Haiku 5.5) — 2026-11-15
- README.md (EN), docs/HOW_TO_DEPLOY.md, docs/SOURCES_AND_AI.md, docs/ARCHITECTURE.md. Bash denegado al agente (usó Glob). Coordinador revisó el README (sin afirmaciones no respaldadas). HANDOFF escrito por coordinador.

## Lote U1/U2 — UI (constructor, Sonnet 5.5) — 2026-11-15
- Agente detenido dos veces por límite de turnos (18), reanudado una vez. Algunos comandos Bash fuera de allowlist fueron denegados (usó Read/Glob).
- Nuevos: `src/app/{router.ts,routes.tsx,Shell.tsx}`, `src/config/app.config.ts`, `src/i18n/{en,es}.ts,index.tsx`, `src/styles/tokens.css`, `src/components/*` (Button, Navbar, Modal, Tabs, Card, EmptyState, StatusBadge, ErrorBoundary), `src/services/{science.repository,science.schema,ScienceProvider,storage}`, `src/shared/*`, `src/features/{home,observations,library,methodology}`, `src/features/observatory/{ObservatoryMap,panels}.tsx`, `src/features/community/CommunityPage.tsx`.
- Coordinador: `npm run typecheck` exit 0; `npm run build` exit 0 (JS 479.00 kB / gzip 146.08 kB, CSS 59.03 kB).
- Integración: el motor exporta métricas por sector en `properties.metrics_by_pair`; se añadió esa clave al adaptador.

## Relevo Codex — auditoría P0 de S1–S3 (2026-11-15, inicio)
- Estado: DOING. Prioridad: verificar el catálogo CMR existente y la evidencia local del snapshot real antes de aceptar los DONE heredados; no se buscará red ni se solicitarán credenciales.
- Rama observada: `feature/FOREST_SAR_HN-hackathon`. `git status --short` muestra cambios previos del propietario/coordinador, entre ellos `.claude/*`, `CLAUDE.md`, `docs/PROGRESS.md`, `docs/PROMPT_INICIO.md`, scripts y frontend; se preservan.
- Inventario: catálogo `.bosquevivo-work/catalog/cmr-20261115T045835840671Z.json`; `.science-cache/subsets/` contiene TIFF de ambas escenas (2026-10-07 y 2026-10-19); manifest apunta al snapshot multilook `20261115T061150Z-4847035f` con status `ready` y `data_mode: real`.
- El log de ese snapshot reporta 52 escenas/1326 parejas evaluadas/162 compatibles y ambas adquisiciones como `cache_hit`; verificar conteo, checksums y suite local antes de cerrar el lote.
- Próximo: entrypoint en `--dry-run` con el catálogo guardado (sin red ni publicación), luego pytest/typecheck/build finales. Playwright y prueba manual dependen de disponibilidad local.

## Relevo Codex — auditoría y verificación (2026-11-15, cierre de lote)
- Estado del lote S1–S3: **REVIEW con evidencia local confirmada**. Se inspeccionó el catálogo existente sin volver a consultar red: `retrieved_at=2026-11-15T04:58:34Z`; GCOV V1 = 5 CMR hits/5 escenas; PROVISIONAL V1 = 47/47; BETA V1 = 0/0; ninguna consulta truncada. Esto no equivale a 52 parejas ni detecciones.
- Manifest/snapshot: `public/data/manifest.json` apunta a `20261115T061150Z-4847035f`, `ready`, `data_mode=real`. `results.json` confirma una pareja provisional, 2026-10-07→2026-10-19, track/frame 98/81 según UMM, descendente, HVHV frequencyA, grid EPSG:32616; análisis de potencia lineal con delta final−inicial y multilook 10×10 (100 m). Los seis checksums de los TIFF cacheados usados (HVHV, mask, numberOfLooks para ambas fechas) coinciden con el processing-log. Resultado publicado: 117,537 ha válidas, 23 ha de candidatos radar (0.01957%), 93.80% cobertura de la ventana bbox provisional. CV/TP/rhythm permanecen null; una pareja no prueba pérdida forestal.
- Dry-run del motor **BLOCKED en el intérprete antes de cargar el programa**: `.venv/Scripts/python.exe ... --dry-run` y `-m pytest tests/python -q` terminan con `Fatal Python error ... ModuleNotFoundError: No module named 'encodings'`; configuración informa `sys.prefix` del repo y busca `Lib` ausente. No se reparó ni reinstaló. La evidencia histórica de 35 tests PASS en la ejecución Claude se conserva como histórica, no como repetición de esta sesión.
- Frontend: `npm.cmd run typecheck` exit 0; `npm.cmd run build` exit 0 (Vite 8.3.8; JS app 315.69 kB, observatory 168.99 kB; build actualizado en `dist/`). `npm run` directo en PowerShell fue rechazado por política de ejecución de scripts; variante `npm.cmd` local funcionó.
- Playwright no se repitió: HANDOFF previo registra 24 lanzamientos bloqueados por Chromium inexistente, sin instalación autorizada. Recorrido manual tampoco disponible en esta sesión.
- Se preservaron todos los cambios preexistentes. No se usó red, no se leyeron credenciales, no se ejecutó instalación ni se tocaron `.claude/`, contratos, lanzadores o configuración de permisos.
- Próximo lote P0: propietario debe reparar/restaurar `.venv` (Python estándar `encodings`) dentro del entorno permitido y disponer de Chromium ya autorizado/local; después ejecutar pytest y E2E. Si se requiere instalar herramientas para eso, hacerlo fuera de este relevo conforme a la política del propietario. P1 no iniciado.

## Lote UX2 — rediseño UX del observatorio + capas NASA GIBS (coordinador Opus 5.5) — 2026-11-15 (hora HN ~09:20–11:30)
Orden del propietario: experiencia sencilla para no especialistas sin tocar resultados científicos. No se reprocesó nada ni se modificó `public/data/`, `scientific-engine/` ni `config/science.json`.

Delegaciones (3): constructor Sonnet (observatorio), Haiku (traducción Comunidad/Biblioteca/Metodología, en paralelo con archivos separados), revisor Sonnet (crítico+detective). El coordinador: bug de apilamiento, base compartida, investigación GIBS, integración, ajustes de diseño y QA.

### Cambios
- **Bug Leaflet sobre modales/navbar** (`src/index.css`): `.leaflet-container` no creaba stacking context, así que sus panes (z 400–1000) competían con el modal en portal (z 200) y el header sticky (z 30). Fix: `position: relative; z-index: 0; isolation: isolate`. Verificado en navegador y con test e2e (`elementFromPoint` con el modal abierto).
- **Observatorio en 3 pasos** (`src/features/observatory/*`): 1 Elige las fechas (tarjeta 7 oct 2026 → 19 oct 2026, 12 días; ID solo en detalles), 2 Explora el mapa, 3 Entiende los resultados. Explorador plegado de las 1 326 parejas con búsqueda, filtros (procesadas / compatibles no procesadas / incompatibles), paginación de 20 y motivos legibles; solo la pareja con resultados es seleccionable.
- **Mapa**: por defecto solo ventana de estudio + candidatos; huellas, cuadrícula y "Áreas sin datos (calidad)" en controles avanzados independientes; leyenda con gradientes reales del snapshot y aviso "zonas sin color ≠ sin cambio"; comparador antes/después con divisor (ratón, táctil, teclado, `role=slider`), fechas en cada lado, mismo mapa (navegación sincronizada); opacidad con `setOpacity` solo sobre la capa radar en pane propio.
- **Sectores**: "Zona 1…20" (orden por área candidata) y "Cuadro de 1 km · fila F, columna C" derivados del ID; IDs originales en detalles y CSV. No se usan nombres geográficos (no hay gazetteer verificado). Al elegir zona, `flyToBounds` y resultados del sector.
- **Indicadores**: `formatSmart` (23 ha, 117 537 ha, 0,0196 %, 93,8 %); null → "No calculable"; aviso "Detectar un cambio de radar NO confirma deforestación"; semáforo gris "Aún no hay datos suficientes".
- **Limitaciones**: tarjeta de 6 puntos sencillos + modal con las 12 limitaciones del snapshot traducidas (`src/shared/scienceText.ts`; original EN en detalles técnicos y en Metodología).
- **Traducciones**: Comunidad (antes 100 % inglés literal), Biblioteca y Metodología en `src/i18n/sections/pages.{en,es}.ts`. Corregidos dos textos falsos: Metodología decía que se aplica parche mínimo (no se aplica) y Comunidad decía que el prototipo no procesa NISAR (sí procesa una pareja).
- **Esquema**: `layer.legend` del snapshot es objeto y se perdía (`null`); añadido `legend_spec` aditivo en `science.schema.ts`/`science.types.ts`.
- Favicon SVG inline (evitaba un 404 en consola que hacía fallar el smoke test).

### Lote G1 — NASA GIBS (coordinador)
- GetCapabilities WMS 1.3.0 `https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi` (2026-11-15): formatos image/png, image/jpeg; CRS EPSG:3857.
- Capa NISAR: `NISAR_L2_Geocoded_Polarimetric_Covariance` (mosaico diario GCOV, RGB falso color; tiempo 2025-10-29…2026-11-13 con huecos). No existe en GIBS una capa con el nombre literal "NISAR Normalized Radar Backscatter"; se usa la GCOV (gamma0) documentada en la guía ASF/Worldview.
- Sondeos GetMap sobre la ventana (bbox EPSG:3857 −9723729,1574619,−9690334,1614956): NISAR 10‑07 y 10‑19 con datos (~858 KB), 10‑08 vacío (1 096 B); HLS S30 y L30 10‑07 con datos (casi sin nubes), 10‑19 vacíos; VIIRS NOAA‑20 color verdadero ambos días (nublado). Config en `src/config/mapLayers.config.ts` con `available` solo para fechas verificadas; las demás muestran "Sin cobertura NASA para esta fecha". OSM sigue por defecto; aviso y vuelta a OSM tras errores de teselas. Insignia "Imagen oficial NASA (GIBS)" separada de "Resultado calculado por FOREST-SAR". Sin token Earthdata.

### Verificación
- `npx tsc --noEmit` exit 0; `npm run build` exit 0.
- `.venv/Scripts/python.exe -m pytest tests/python -q` → 35 passed (el `.venv` vuelve a funcionar en esta sesión).
- Playwright: el Chromium de `.bosquevivo-tools/browsers/chromium-1194` está incompleto (solo `chrome.dll`, sin `chrome.exe` ni headless_shell). Sin instalar nada, `playwright.config.mjs` acepta `PW_CHANNEL=chrome` para usar el Google Chrome del sistema: `PW_CHANNEL=chrome node .bosquevivo-tools/node_modules/@playwright/test/cli.js test` → ver resultado final abajo.
- Revisión visual con capturas a 1440 y 390 px: modal sobre el mapa, comparador, capa NASA NISAR con fechas, zona seleccionada, Comunidad/Metodología/Biblioteca en español sin desbordamiento horizontal.
- **Resultado final** (tras revisión y ajustes): `npx tsc --noEmit` exit 0 · `npm run build` exit 0 · pytest **35 passed** · Playwright con `PW_CHANNEL=chrome` **41 passed, 0 failed, 4 skipped** (los 4 son tests solo móviles omitidos a propósito en otros viewports) · 390 px: 0 px de desbordamiento horizontal en observatorio, comunidad, metodología y biblioteca.
- Revisión (Sonnet): aprobado con cambios 8/10. Corregido: porcentajes de Observations con `formatSmart`, limitaciones de Observations traducidas, min/max de leyenda con `formatSmart`. Coordinador: aviso de teselas NASA se limpia al cambiar fecha/comparar; pestañas de capa en una fila desplazable en móvil; orden del selector de sectores (zonas primero, luego fila/columna); etiqueta "Antes" no tapa el zoom; paso 1 compacto en escritorio (el mapa entra en la primera pantalla).
- Pendientes menores: valores crudos del motor en la tabla de escenas (ASCENDING, quality_status) sin traducir; `formatNumber(…,3)` en tablas técnicas de parámetros (sin riesgo con los valores actuales); el selector de mapa base puede mostrar una opción NASA desactivada mientras el mapa cayó a OSM (hay aviso visible).

## Lote T1 — comparación temporal multi-período (coordinador Opus 5.5) — 2026-11-15
Delegaciones (2, en paralelo, archivos sin solapamiento): forest-sar (Sonnet) motor; constructor (Sonnet) interfaz. Coordinador: selección de parejas, contrato del índice, QA y correcciones visuales.

### Selección de parejas (catálogo guardado, sin red)
Todas compatibles, track 98 / frame 81 / DESCENDING / LEFT / A+B / HVHV esperado / PROVISIONAL_V1 / cobertura común 94.66 %, con la fecha final 2026-10-19 ya en caché (1 escena nueva por pareja, mismos criterios que la pareja actual):
- ~3 meses (prioridad): `pair-b791e9876a` 2026-07-27 → 2026-10-19 (84 d)
- 2 meses: `pair-642e3bf57f` 2026-08-20 → 2026-10-19 (60 d)
- ~1 mes: `pair-5517bacb4b` 2026-09-13 → 2026-10-19 (36 d)
(Alternativa de 96 d `pair-cf745abde3` desde 2026-07-15 descartada: granule con bandera de procesamiento distinta `F_F` frente a `N_F` de las demás.)

### Motor (`scientific-engine/`)
- `run.py --pair-id a,b,c`: valida compatibilidad antes de procesar (exit 2 si no); cada pareja publica su propio snapshot transaccional sin tocar el manifest; si una falla, no publica catalog_only ni toca el manifest y sigue (exit 0 si ≥1 ready, **5 = blocked** si ninguna). Al terminar, el manifest apunta a la primera pareja pedida si se publicó.
- `run.py --rebuild-index` y reconstrucción automática tras cada ready: `public/data/snapshots/index.json` (contrato en `snapshot_index.py`), solo snapshots con los mismos parámetros (HVHV, 3 dB, multilook 10, 0.9); los 2 ready nativos 10 m antiguos quedan en `excluded`. Manifest con `index_path` (solo se añadió ese campo; snapshot vigente sin cambios).
- `tests/python/test_index_pairs.py` (+4).
- **Intento real BLOCKED**: `EARTHDATA_TOKEN` ausente (proceso, usuario y máquina; sin .netrc). Harmony y earthaccess fallaron por credenciales en las 3 parejas → exit 5; SHA-256 del manifest idéntico antes/después; ningún snapshot nuevo.

### Interfaz
- Datos: carga de `index.json` validado (rutas solo bajo `snapshots/`), carga perezosa por comparación de results/sectors con caché por snapshot; error si `pair_id`/fechas del results no coinciden con la comparación (nunca resultados de otra pareja). Sin índice válido, recurre al snapshot del manifest.
- Observatorio: selectores "Fecha inicial"/"Fecha final" (fechas reales de la órbita, "· con resultados"), atajos 12 días / 1 / 2 / 3 meses solo si hay comparación en rango, por defecto ~3 meses o la más reciente; fechas sin resultados → mensaje + hasta 3 alternativas reales y el mapa/indicadores se ocultan. `?compare=<snapshot_id>`.
- Eliminados del observatorio el explorador de 1 326 parejas y la tabla de escenas → botón "Información técnica" → vista `#/data` (catálogo 52, comparaciones procesadas, 161 compatibles pendientes, 1 164 incompatibles; búsqueda, filtros, paginación de 20).
- Coordinador: corregida tabla de escenas (`td.data__id` con `display:block` rompía la tabla) y alineación del paso 1 cuando no hay resultados.

### Verificación
`npx tsc --noEmit` exit 0 · `npm run build` exit 0 · pytest **39 passed** · Playwright (`PW_CHANNEL=chrome`) **50 passed, 4 skipped, 0 failed** · 390 px sin desbordamiento · captura: la UI solicita `snapshots/index.json` y muestra 7→19 oct; pedir 27 jul → 19 oct muestra "Todavía no hay resultados procesados" con la alternativa real.

### Pendiente (propietario)
Configurar `EARTHDATA_TOKEN` (p. ej. `setx EARTHDATA_TOKEN "<token>"` en su terminal) y ejecutar:
`.venv/Scripts/python.exe scientific-engine/run.py --config config/science.json --catalog-file .bosquevivo-work/catalog/cmr-20261115T045835840671Z.json --pair-id pair-b791e9876a,pair-642e3bf57f,pair-5517bacb4b`
Luego `npm run build` y verificar en el observatorio que cada atajo carga su propio snapshot. Menor: valores crudos DESCENDING/catalog_metadata_only sin traducir en `#/data`.

## Lote V1 — mapa limpio, zonas delimitadas, mapas base y búsqueda (coordinador Opus 5.5) — 2026-11-15
Delegaciones (2, paralelas): forest-sar (Sonnet) productos derivados + nomenclátor; constructor (Sonnet) interfaz. Coordinador: contrato, derivados de las 3 comparaciones nuevas, QA y correcciones.

### Datos nuevos del propietario
El propietario ejecutó con `EARTHDATA_TOKEN` el motor `--pair-id` (10:34–10:45 HN): 3 snapshots reales nuevos (índice: 4 comparaciones; `20261115T163426Z` excluido por duplicado de pair-b791e9876a). Manifest → comparación de 84 días.
| Comparación | Snapshot | Candidato | Válido |
|---|---|---|---|
| 2026-07-27→10-19 (84 d) pair-b791e9876a | 20261115T163540Z-4847035f | 165 ha (0,140 %) | 117 537 ha |
| 2026-08-20→10-19 (60 d) pair-642e3bf57f | 20261115T164111Z-4847035f | 28 ha | 117 537 ha |
| 2026-09-13→10-19 (36 d) pair-5517bacb4b | 20261115T164514Z-4847035f | 17 ha | 117 537 ha |
| 2026-10-07→10-19 (12 d) pair-f93b4394cc | 20261115T061150Z-4847035f | 23 ha | 117 537 ha |

### Motor (derivados de visualización, sin cambiar resultados)
- `scientific-engine/derive.py`, `run.py --derive-snapshot ID [--force-derived]` (automático tras cada ready): recalcula desde caché las matrices multilook y **aborta si no coinciden** con results.json (celdas candidatas/válidas, áreas) y con los 1 320 sectores. Escribe solo `snapshots/<id>/derived/`: `zones.geojson` (componentes 8-conexas fusionadas si hueco ≤ 2 celdas/200 m; contorno = unión de celdas +50 m, simplificado 10 m; `area_ha` = suma exacta de celdas), `cells.geojson`, `valid_area.geojson`, `viz_before/after.png` (paleta perceptual, −25…−5 dB fija, transparente fuera del área válida), `viz_delta.png` (divergente ±6 dB rojo/azul, alfa ∝ |Δ|), `derived.json`.
- Verificación ejecutada en los 4 snapshots: 23/165/28/17 celdas = ha publicadas; 117 537 válidas; 1 320 sectores OK. Zonas: 20 / 98 / 25 / 11. SHA-256 de results/sectors/layers/manifest sin cambios.
- Nomenclátor OSM (`places.py`, `run.py --fetch-places`, Overpass, ODbL): `public/data/places/places.json` (536 lugares) y `areas.geojson` (P.N. La Tigra, P.N. Naciones Unidas El Picacho, R.B. Cerro de Uyuca, R.V.S. Corralitos). `nearest_place` con distancia haversine; regla documentada en places.py. Los nombres son referencia de ubicación, no causa.
- Índice: `derived_path` por comparación y `places_path`. pytest **45 passed** (+6 test_derive).

### Interfaz
- Mapa base visible: **Satelital (Esri World Imagery, por defecto)**, Relieve (OpenTopoMap), OpenStreetMap y capas NASA GIBS.
- Vista principal: contorno del área válida (fuera = sin datos, nunca "sin cambio"), zonas como polígonos con borde y relleno semitransparente (amarillo/naranja con halo sobre imágenes; rojo sobre mapas claros), capa por defecto Δ dB divergente (azul = aumento de señal, no recuperación). Celdas 100 m, cuadrícula 1 km, ventana bbox y radar en grises = capas avanzadas apagadas.
- "Explora una zona": desplegable (p. ej. "Zona 1 · cerca de Las Flores (2,8 km) · 17 ha") → vuelo, resaltado, popup y tarjeta (área exacta, celdas, Δ medio y mínimo, referencia OSM).
- Búsqueda local de lugares (combobox ARIA, sin red, sin tildes): vuela al lugar; resume zonas a ≤ 2 km o indica que el lugar está fuera del área con datos.
- Coordinador: leyenda `diverging` no se reconocía (normalizador solo aceptaba `gradient`) → corregido; texto "zonas rojas" → "zonas delimitadas"; muestra de leyenda acorde al mapa satelital; nota del contorno traducida (original en `title`).

### Verificación
tsc exit 0 · build exit 0 · pytest 45 passed · Playwright (`PW_CHANNEL=chrome`) **63 passed, 6 skipped (solo móvil), 0 failed** · 390 px sin desbordamiento (las únicas palabras en inglés son la atribución de Esri) · capturas: satelital con zonas, búsqueda "Valle de Ángeles", Zona 1 de 84 días, comparador sobre relieve.

### Pendientes
- Valores crudos del motor en `#/data` (DESCENDING, catalog_metadata_only) sin traducir.
- Esri World Imagery y OpenTopoMap: revisar términos de uso antes de un despliegue público (atribución incluida).
- El período de 84 días cruza la estación lluviosa: la humedad puede explicar parte de las 165 ha (ya advertido en limitaciones).

## Lote A1 — colores, agrupación de zonas, Analytics, línea de tiempo y preparación de publicación (coordinador Opus 5.5) — 2026-11-15
Delegaciones (3): constructor ×2 en paralelo (mapa / Analytics, archivos sin solape), escudo (pruebas). Coordinador: contrato, verificación de datos, publicación, QA visual y correcciones, documentación (rol narrador ejecutado en la sesión principal). Sin procesamiento ni descargas NISAR nuevas; `public/data` sin cambios.

### Mapa (observatorio)
- `src/config/mapColors.ts` (fuente única, publicada como variables CSS `--map-*`): contorno de zona candidata magenta `#d6007a` con halo blanco/oscuro en **todos** los mapas base (antes amarillo sobre satélite y rojo sobre mapas claros); selección = halo cian `#00c2ff` (no cambia relleno ni significado); área válida blanca con halo; sin datos gris con trazo discontinuo (distinto de "estable").
- `src/shared/radarClasses.ts`: 5 clases de Δ dB — aumento ≥ +3, estable, moderada −3…−4,5, fuerte −4,5…−6, muy fuerte ≤ −6. Solo el corte de 3 dB es el umbral publicado; −4,5/−6 son de presentación (exploratorios, no niveles de daño). Relleno de la zona = clase de su Δ medio. El semáforo de cobertura vegetal (TP) no cambió: con TP nulo muestra "No evaluado".
- `clusters.ts`: agrupación propia sin dependencias (centroides a ≤ 56 px, recalculada en zoom/movimiento con debounce 80 ms). Burbuja = nº de zonas (tamaño por log del conteo, nunca por área). Polígonos reales a zoom ≥ 14, en zonas aisladas y en la seleccionada. Clic en burbuja → acerca al conjunto y abre su tarjeta.
- Tarjetas compactas en la columna lateral: zona (referencia OSM con distancia, fechas, área exacta, Δ medio y mínimo con 2 decimales, clase) y agrupación (nº de zonas, área total = suma exacta, rango de Δ medio, referencia más frecuente, período, "Acercar"). Acción **"Ver evolución"** → `#/analytics?compare=<id>&zone=<Z>` (o `&place=` si la agrupación comparte localidad).
- Leyenda sincronizada con lo dibujado (contorno, clases presentes, burbujas, selección).
- Verificado con los datos: la suma de `area_ha` de las zonas = área candidata publicada en los 4 períodos (23/17/28/165) → las agrupaciones no duplican superficie.

### Analytics — `#/analytics` (chunk diferido, 31 kB)
- Resumen del período, tabla de todos los períodos, ámbitos General / Localidad / Zona sincronizados con la URL.
- Gráficos SVG propios con tabla alternativa y detalle accesible: área candidata y nº de zonas por período, distribución de intensidad (celdas candidatas), historial de escenas de la misma órbita por mes, zonas/ha por localidad de referencia, y zona seleccionada en las otras comparaciones (presentado como "misma extensión, distinta fecha inicial", nunca como serie).
- Línea de tiempo de observaciones (catálogo + snapshots, dinámica) y horizontes 1 m / 3 m / 6 m / 1 a / 2 a / 3 a: procesado, "en catálogo sin procesar" o "pendiente de observaciones", sin valores para los no procesados.
- Aviso permanente derivado de los datos: las 4 comparaciones comparten la fecha final 2026-10-19, no se suman, no son pérdida acumulada; tendencia "todavía no hay observaciones suficientes"; sin predicciones.
- Coordinador: período por defecto igual al observatorio (~3 meses); fuente sin texto en español en la versión inglesa; textos de intensidad ("celdas candidatas") y de horizontes ("catálogo consultado", que empieza en 2026-06-01); gráficos legibles a 390 px.

### Publicación
- `vite.config.ts`: `base: './'` (funciona en raíz o subcarpeta). `npm run build:publish` = build + `scripts/prepare-dist.mjs`: solo copia a dist los 4 snapshots usados (7 excluidos/duplicados quedan en `public/data`), falla si hay `.env`, `.netrc`, `.h5`, `.tif`, `.log`, `.py`, `.map`, tokens o rutas locales, y escribe `dist/.htaccess`. Resultado: 79 archivos, 11,2 MB, OK.
- Guía: `docs/PUBLICAR.md`.

### Verificación
`npx tsc --noEmit` exit 0 · `npm run build:publish` exit 0 · pytest **45 passed** · Playwright (`PW_CHANNEL=chrome`) **111 passed, 6 skipped (solo móvil), 0 failed** (nuevos: `clusters.spec.mjs` 7, `analytics.spec.mjs` 9 × 3 proyectos). Un `ECONNRESET` aislado del servidor preview en una primera ejecución; pasó al repetir. Capturas revisadas: escritorio y 390 px.

### Pendientes
- Revisar términos de uso de Esri World Imagery y OpenTopoMap antes del despliegue público.
- `#/data`: valores crudos del motor (DESCENDING, catalog_metadata_only) sin traducir.
- Tendencias reales requieren nuevas observaciones consecutivas o línea base fija con máscara común; los horizontes ≥ 6 meses dependen de ampliar la consulta de catálogo (hoy desde 2026-06-01) y procesar parejas.
- 84 días cruza la estación lluviosa: la humedad puede explicar parte de las 165 ha.

## Lote A2 — observatorio simplificado, Observaciones por localidad y Metodología visual (coordinador Opus 5.5) — 2026-11-15
Delegaciones (2, paralelas, archivos sin solape): constructor Observatorio+Observaciones (+tests), constructor Metodología. Coordinador: QA visual, correcciones, pruebas. Sin cambios en motor ni `public/data`; sin descargas.

- **Observatorio:** retirados de la vista principal el comparador deslizante (`compare-toggle`) y las pestañas Antes/Después; Antes/Después quedan en "Herramientas avanzadas" (`advanced-dates`). Protagonista: mapa de cambios con botones 12 días / 1 mes / 2 meses / 3 meses (no procesados deshabilitados); fechas exactas plegadas. Nuevo `?zone=` (selecciona y vuela a la zona). `viz_before/after` intactos. Coordinador: textos que aún hablaban de "deslizar" y de "cuadros de 1 km numerados" corregidos (ES/EN).
- **Observaciones (reescrita):** observación = zona candidata derivada, agrupada por localidad OSM (`nearest_place`), combobox con buscador sin tildes, "N observaciones · X ha" (suma exacta), localidades ordenadas por área (coordinador), "Observación 1 — 2 ha", tarjeta con ubicación ("Cerca de X (d km)"), fechas, área, clase de intensidad, explicación, "Ver en el mapa" y "Ver evolución"; ids, coordenadas, sectores de 1 km (rotulados como cuadrícula, nunca como zonas), parámetros y limitaciones en "Información científica". CSV: "Zonas candidatas" y "Sectores de 1 km", ambos del período seleccionado. Ya no usa `sectorNames.ts`.
- **Metodología (rediseñada):** "Del espacio a la Tierra" con ilustración SVG original (satélite, haces banda L 24 cm / banda S 12 cm, nubes, bosque; sin logos ni imágenes externas — la imagen de referencia de earthdata.nasa.gov lleva la insignia NASA, de uso restringido), 4 pasos con línea de conexión, tarjetas de tecnología, leyenda de 5 clases desde `radarClasses`/`mapColors`, y "Transparencia científica" en desplegables con toda la información anterior (fuente, versión, fechas, parámetros, umbral desde los datos, resolución, cobertura, limitaciones con originales, método, semáforo TP, documentación).
- Tests: `observations.spec.mjs` nuevo; observatorio/clusters/smoke actualizados (el comparador debe NO estar en la vista principal; HVHV y 3 dB se comprueban dentro de Transparencia).

### Verificación
`npx tsc --noEmit` 0 · `npm run build:publish` OK (77 archivos, 11,2 MB, 4 snapshots) · pytest 45 passed · Playwright (`PW_CHANNEL=chrome`) **136 passed, 8 skipped (solo móvil), 0 failed** · capturas escritorio y 390 px de Observatorio, Observaciones y Metodología.

### Pendientes
- Claves antiguas `observations.*` de sectores sin uso (inofensivas).
- Términos de Esri/OpenTopoMap antes de publicar; valores crudos en `#/data`.

## Lote M1 — Manual de usuario y acceso desde Metodología (coordinador Opus 5.5) — 2026-11-15
Delegaciones (2, paralelas): constructor (capturas reales, `docs/manual/tools/capture.mjs`), narrador en Sonnet (manual + generador). Coordinador: verificación de cifras contra catálogo/índice, revisión de contenido, optimización de imágenes, integración en el sitio, pruebas.

- `docs/manual/`: `Manual_Usuario_FOREST_SAR_HN.md` (fuente), `.html`, `.pdf` (31 págs., 4,9 MB), `.docx` (OOXML propio, 4,1 MB, zip íntegro), `Respuestas_5_preguntas_FOREST_SAR_HN.md`, `README.md`, `capturas/` (29 PNG reales + `optimizadas/` JPEG 1600 px q78 para PDF/DOCX + muestras CSV), `diagramas/` (4 SVG/PNG; barras generadas desde index.json/zones.geojson), `tools/` (build-manual, md, docx, diagrams, capture). Regenerar: `node docs/manual/tools/build-manual.mjs` (valida %PDF, zip DOCX, imágenes, secretos/rutas locales y cifras; copia el PDF a `public/manual/`).
- Cifras verificadas: 52 escenas (47 provisionales, 5 validadas), 1 326 parejas, 162 compatibles, 1 164 incompatibles; 4 comparaciones (23/17/28/165 ha; 20/11/25/98 zonas), 117 537 ha válidas, 93,8 %.
- Sitio: tarjeta "Manual de usuario" en Metodología (`ManualViewer.tsx`) → modal ancho (nueva opción `size="wide"` del Modal compartido) con el PDF incrustado, "Descargar PDF" y "Abrir en otra pestaña"; si el navegador no tiene visor PDF (`navigator.pdfViewerEnabled === false`, p. ej. Android) muestra aviso con las acciones. Ruta en `APP_CONFIG.userManualPdf`.
- Corrección encontrada por las capturas: el CSV anteponía `'` a números negativos (dB, longitud) → solo se neutraliza texto libre; los números quedan numéricos.
- Manual: aclarado que las capas NASA solo se habilitan con cobertura verificada en ambas fechas (hoy período de 12 días; 3 meses no por el 27 jul).

### Verificación
tsc 0 · `npm run build:publish` OK (78 archivos, 16,0 MB, incluye `manual/`) · Playwright **139 passed, 8 skipped, 0 failed** (+ modal del manual) · pytest 45 (sin cambios en motor) · PDF de dist idéntico al de docs/manual.

### Pendientes
- Completar en el manual `[enlace público pendiente]` e `[integrantes: completar]` y regenerar.
- El PDF muestra el encabezado también en la portada (Chrome ignora `@page :first` para el header); cosmético.

## Lote R1 — rediseño UI/UX (observatorio, observaciones, analytics, biblioteca) (coordinador Opus 5.5) — 2026-11-15
Delegaciones (2, paralelas, archivos sin solape): constructor observatorio; constructor observaciones+analytics+biblioteca. Coordinador: QA visual, refinamiento, diagnóstico de fallos e2e, manual. Sin cambios en motor, datos, servicios ni lógica científica.

- **Observatorio:** barra de herramientas sobre el mapa (capa Δ dB · selector segmentado Satelital/Relieve/OSM · menú "Capas NASA" con aviso de cobertura y fechas · "Ver mapa en grande"); chip de origen discreto; "Herramientas avanzadas" plegable; mapa `clamp(520px, 68vh, 760px)` y grilla 1.6fr/1fr; panel derecho ordenado (selección, cifras clave 2×2, semáforo, un aviso, limitaciones plegables) y sticky. **Mapa ampliado**: mismo mapa Leaflet en diálogo casi a pantalla completa (Esc/Cerrar, foco, bloqueo de scroll, leyenda plegable, selector de zona, tarjeta flotante). Coordinador: botón de ampliar solo icono < 1600 px para que la barra quepa en una fila.
- **Corrección (coordinador):** el encuadre inicial animado hacía que Leaflet ignorara el primer zoom del usuario (y causaba fallos e2e intermitentes); el primer encuadre ya no se anima y el `ResizeObserver` espera a que termine una animación de zoom antes de re-medir.
- **Observaciones:** KPIs, tarjetas de localidad con barra proporcional e intensidad predominante, "Mostrar más" (8 localidades / 6 observaciones), acordeón, detalle en tarjetas, preselección de la localidad con más área en escritorio, barra de CSV.
- **Analytics:** aviso compacto con "Leer más", barra de filtros, KPIs grandes, tabla moderna con fila actual y hover, cards de gráficos con más respiro; corregido desbordamiento de 34 px en móvil.
- **Biblioteca:** galería 3/2/1 columnas con miniaturas ilustradas propias por tipo (sin capturas ni logos de terceros), dominio, tipo, descripción y "Abrir recurso".
- **Manual:** capturas regeneradas con el diseño nuevo (+ `06c-mapa-ampliado.png`), textos de barra de herramientas, mapa ampliado, flujo de Observaciones y galería de Biblioteca; PDF 31 págs. copiado a `public/manual/`.

### Verificación
tsc 0 · `npm run build:publish` OK (78 archivos, 16,1 MB) · pytest 45 · Playwright **142 passed, 8 skipped, 0 failed** en dos ejecuciones completas consecutivas (antes de la corrección de zoom hubo fallos intermitentes en clusters/observations) · capturas 1440 y 390 revisadas.
