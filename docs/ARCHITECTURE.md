# Arquitectura de FOREST_SAR_HN

Este documento describe el mapa real de carpetas y cómo fluyen los datos. Fuentes: estructura del repositorio, `config/science.json`, `scientific-engine/run.py`, `src/config/app.config.ts`, `src/app/routes.tsx` y `public/data/manifest.json`.

## 1. Vista general

```
CMR / Harmony (red, sólo motor)        Navegador (estático, sin backend)
        │                                      │
scientific-engine/  ──►  public/data/  ──►  src/services/  ──►  src/features/
 (Python, local)        (artefactos JSON,      (carga y valida     (vistas React)
                         PNG, GeoJSON)          manifest/resultados)
```

- **Motor científico (Python 3.12, local):** la única parte con red. Busca en CMR, empareja granulos, descarga subconjuntos vía Harmony, procesa y exporta artefactos estáticos.
- **Artefactos publicados:** `public/data/` contiene el manifiesto y las instantáneas. La app los lee; no los modifica.
- **Aplicación web (React 19 + TypeScript + Vite 8):** sólo consume artefactos estáticos. No hay backend, login ni base de datos. La comunidad es una demostración con `localStorage`.

## 2. Mapa de carpetas

### Raíz

| Ruta | Contenido |
|---|---|
| `README.md` | Guía de entrada (inglés). |
| `config/science.json` | Fuente única de parámetros científicos: AOI, fechas, umbral, máscara, presupuesto de descarga, rutas. |
| `scientific-engine/` | Motor Python. Punto de entrada: `run.py`. |
| `scripts/` | `requirements-science.txt` (dependencias Python) y `search_cmr.py`. |
| `tests/python/` | Pruebas pytest del motor (`test_export`, `test_metrics`, `test_multilook`, `conftest`). |
| `public/data/` | `manifest.json` y `snapshots/<id>/` con `results.json`, capas PNG, `catalog.json`, `sectors.geojson`, `processing-log.json`. |
| `src/` | Código de la aplicación web. |
| `docs/` | Contratos, planes, arquitectura, despliegue, fuentes, progreso y entrega. |
| `index.html`, `vite.config.ts`, `package.json`, `tsconfig.json` | Configuración del frontend. |

### Motor científico (`scientific-engine/`)

| Módulo | Responsabilidad |
|---|---|
| `run.py` | Entrada única. Argumentos (`--config`, `--catalog-only`, `--dry-run`, `--local-input`, `--max-granules`, `--catalog-file`) y códigos de salida. |
| `pipeline.py` | Orquesta las etapas y escribe el resultado. |
| `catalog.py` | Consulta CMR y genera el informe de catálogo. |
| `pairing.py` | Evalúa y selecciona parejas compatibles. |
| `acquisition.py` | Descarga vía Harmony / earthaccess. Lee `EARTHDATA_TOKEN` del entorno. |
| `processing.py` | Lectura de GCOV, máscara, potencia lineal, multilook 10×10, dB y delta. |
| `metrics.py` | Áreas, cobertura, candidatos y diagnósticos. |
| `render.py` | Genera capas PNG para la vista antes/después. |
| `export.py` | Escribe artefactos JSON/GeoJSON de forma atómica. |
| `process_pair.py` | Procesamiento de una pareja. |
| `util.py` | Configuración, registro, saneamiento de mensajes, escritura atómica. |

### Aplicación web (`src/`)

| Ruta | Responsabilidad |
|---|---|
| `main.tsx`, `App.tsx` | Arranque y composición de la página. |
| `app/routes.tsx` | Mapa ruta → vista. |
| `app/router.ts` | Navegación por rutas hash. |
| `app/Shell.tsx` | Cabecera, navegación y contenedor común. |
| `config/app.config.ts` | Marca, rutas, banderas de funcionalidad, espacio de almacenamiento y ruta del manifiesto. Cambiar la marca sólo aquí. |
| `i18n/` | Textos en inglés (`en.ts`), español (`es.ts`) e índice de traducción. |
| `services/` | Carga de artefactos (`science.repository.ts`), validación de esquema (`science.schema.ts`), proveedor de datos (`ScienceProvider.tsx`) y almacenamiento local (`storage.ts`). |
| `shared/` | Tipos científicos (`science.types.ts`), formato, semáforo, métricas por sector y errores. |
| `components/` | Componentes reutilizables: `Button`, `Navbar`, `Tabs`, `Modal`, `Card`, `EmptyState`, `StatusBadge`, `ErrorBoundary`. |
| `features/home/` | Página de inicio. |
| `features/story/` | Hero narrativo (`StoryHero.tsx`, base visual original). |
| `features/observatory/` | Observatorio: mapa Leaflet (`ObservatoryMap.tsx`), paneles (`panels.tsx`), vista (`Observatory.tsx`) y datos de la vista (`observatoryData.ts`). |
| `features/observations/` | Vista de observaciones: modelo (`observations.model.ts`), lógica (`observations.ts`) y vista. |
| `features/community/` | Comunidad (demo local): `CommunityPage.tsx`, `CommunityHub.tsx`. |
| `features/library/` | Biblioteca de contenidos educativos. |
| `features/methodology/` | Metodología visible para la persona usuaria. |
| `styles/`, `index.css` | Tokens de diseño y estilos globales. |

### Datos publicados (`public/data/`)

| Archivo | Uso |
|---|---|
| `manifest.json` | Apunta a la instantánea activa (`snapshot_id`, rutas, `data_mode`, `status`). La app lo lee primero. |
| `snapshots/<id>/results.json` | Métricas, capas, límites y procedencia de la pareja. |
| `snapshots/<id>/catalog.json` | Catálogo CMR consultado (grande; no abrir sin necesidad). |
| `snapshots/<id>/sectors.geojson` | Sectores de 1 km (grande). |
| `snapshots/<id>/processing-log.json` | Registro de etapas del procesamiento. |

## 3. Rutas de la aplicación

| Ruta | Vista |
|---|---|
| `#/` | Inicio |
| `#/observatory` | Observatorio |
| `#/observations` | Observaciones |
| `#/community` | Comunidad (demo) |
| `#/library` | Biblioteca |
| `#/methodology` | Metodología |

Las rutas son hash: no requieren reglas de reescritura en el servidor.

## 4. Flujo de datos

1. `config/science.json` define el área, el periodo y los parámetros.
2. El motor consulta CMR (o reutiliza `--catalog-file`) y empareja granulos.
3. Si hay descarga, Harmony entrega subconjuntos (HVHV, mask, numberOfLooks). El token viene sólo del entorno.
4. `processing.py` y `metrics.py` calculan la máscara, el multilook 10×10 (100 m), dB y el delta.
5. Se exportan artefactos a `public/data/snapshots/<id>/` y se actualiza `manifest.json`.
6. La app carga `manifest.json`, valida el esquema y muestra los resultados o un estado de datos insuficientes.

## 5. Límites conocidos

- La carpeta `src/features/observatory` y las vistas de observaciones deben distinguir datos reales de ilustrativos. Ver `README.md`, sección de límites.
- No hay licencia de proyecto (`LICENSE`) en el repositorio.
- La arquitectura modular y las reglas de capas están en `docs/ARQUITECTURA_MODULAR.md`. Este documento describe el estado actual, no sustituye a ese contrato.
