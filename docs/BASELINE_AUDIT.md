# Auditoría de la base recibida — BosqueVivo HN

Fecha local: 14 de noviembre de 2026. Fuente: `NASA - Copy.zip`, inspección de su inventario y archivos fuente; sin ejecutar la aplicación.

## 1. Decisión

Nuevo repositorio, no nueva aplicación. La raíz de este paquete es la aplicación Vite existente que originalmente estaba en `NASA - Copy/NASA_PROJECT/mossline/`. Se descarta de esta copia el proyecto anidado `NASA_PROJECT/mossline`, cuyo `App.tsx` retorna un div vacío y cuyo package.json mantiene dependencias del scaffold Google AI Studio. No se ha eliminado nada del ZIP original ni de la computadora del propietario.

El archivo original contiene 14.367 entradas y 318.134.559 bytes descomprimidos; el ZIP pesa 90.245.160 bytes. La carpeta node_modules de la versión seleccionada ocupa 133.658.316 bytes; la copia anidada suma otros ~184 MB de archivos (incluye dependencias y metadatos Git). No subir ninguna de estas dependencias ni el historial Git anterior.

## 2. Inventario y estado verificable

| Archivo / módulo | Estado encontrado | Próximo paso |
|---|---|---|
| package.json + package-lock.json | React 19, TypeScript 7, Vite 8, lucide-react; scripts dev/build/preview/typecheck | conservar lockfile, ejecutar npm ci y typecheck/build |
| src/App.tsx | header, marca, navegación por anclas, hero, introducción, observatorio y comunidad | centralizar marca/rutas/textos; shell y vistas navegables |
| src/features/story/StoryHero.tsx y story-hero.css | narrativa scroll, SVG, parallax, progreso y variantes de movimiento reducido | preservar diseño, evitar rediseño innecesario |
| src/features/observatory/Observatory.tsx y observatoryData.ts | controles y dibujos ilustrativos; tres regiones antiguas; fechas, series y señales de ejemplo | convertir a mapa real y datos verificables; Distrito Central, sectores y estado sin datos |
| src/features/community/CommunityHub.tsx | notas locales, encuestas, eventos, educación y listas | mantener base; modularizar y persistir solo datos demo |
| src/index.css | estilos globales | separar tokens CSS y layout sin romper diseño |
| index.html | título, metadatos, fuentes Google | derivar marca de config, revisar licencia y fallback offline |
| vite.config.ts | servidor de desarrollo puerto 3000; build estático | usar host local en pruebas; rutas hash para hosting estático si no hay rewrites |

El README original documenta que typecheck y build pasaron en el equipo anterior; no se ha reproducido aquí esa ejecución. La copia aportada incluía un `dist` compilado, que se omitió por ser regenerable. Las dependencias binarias de Node del ZIP corresponden a Windows y no se reutilizan en esta copia.

## 3. Hallazgos científicos

La base existente declara explícitamente que no está conectada a NISAR, no tiene geodatos ni API, no analiza satélites ni emite alertas. Los gráficos y superficies son SVG/CSS ilustrativos; `observatoryData.ts` contiene valores, series y fechas de ejemplo. Las opciones Río Plátano, La Tigra y Valle de Sula deben sustituirse por el alcance vigente: Distrito Central y sus sectores, conservando La Tigra cuando corresponda a la zona analizada. No presentar estos valores como datos reales. Ver `CONTRATO_CIENTIFICO.md`.

## 4. Arquitectura elegida

Conservar `src/features` como equivalente de `src/modules` (no duplicar carpetas). Separar paulatinamente:
- `src/app`: shell, registro de rutas, navegación hash y manejo de fallos por vista.
- `src/config`: nombre visible y opciones de interfaz.
- `src/i18n`: textos en/es y traducción.
- `src/styles`: tokens, base y layout; estilos propios dentro de cada feature.
- `src/components`: botones, navbar, modal, tabs y estados compartidos.
- `src/services`: carga de manifest científico y adaptadores de persistencia demo.
- `scientific-engine`: motor Python independiente; `public/data`: artefactos científicos reales y trazables.
- `tests`: pruebas Python/Playwright; `docs`: especificaciones, avance y handoff.

No crear backend obligatorio; no pedir login para los jueces; no cambiar framework. No reinstalar dependencias del scaffold viejo. El nombre del producto debe tener una sola fuente, incluso si aparece en metadata del HTML. Los textos no deben depender de números ficticios. Ver `ARQUITECTURA_MODULAR.md`.

## 5. Orden de implementación específico

1. Repetir build base y revisar capturas; registrar herramientas instaladas, branch y deuda técnica.
2. Ejecutar la búsqueda CMR real y preparar una pareja compatible; mientras tanto, construir shell y componentes con estados sin datos.
3. Preparar mapa de la región (Leaflet opcional, instalado por el propietario antes de iniciar), consumir exportaciones reales, mantener la ilustración de portada separada de los resultados.
4. Conectar indicadores, capas, fichas, metodología y alertas candidatas. Sin medición válida, mostrar no disponible.
5. Adaptar comunidad a vistas independientes y datos de prueba explícitos. Biblioteca y visor PDF con fallback. No sacrificar P0.
6. QA, build, README inglés y handoff. Publicación manual de `dist`.

## 6. Dependencias

No se incluyó `node_modules`. `npm ci` reproduce el lockfile existente. Si se elige Leaflet, instalar antes de iniciar el agente:
`npm install --save-exact leaflet@1.9.4`
`npm install --save-dev --save-exact @types/leaflet@1.9`
Revisar el diff del lockfile y volver a ejecutar build; estos comandos no se ejecutaron en este entorno. No instalar React Leaflet si no es necesario: encapsular Leaflet en un componente React con lifecycle y cleanup.
No ejecutar npm install global ni agregar servidor Node.

## 7. Criterio de aceptación

Nuevo repositorio contiene una única app en la raíz; sin `.git`, `dist`, `node_modules` ni copias anidadas. Código de la base conservado; agentes y docs de v4.1 incluidos. El motor científico sigue siendo trabajo pendiente; este paquete no acredita resultados científicos reales, build nuevo ni deployment. No conectar automáticamente a repositorios remotos.
