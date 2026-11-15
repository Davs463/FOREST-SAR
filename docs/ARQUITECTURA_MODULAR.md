# Arquitectura modular, configuración y sistema de diseño — obligatorio v4.1

Este documento complementa y prevalece sobre ejemplos de estructura de v4/v3. No obliga a migrar el framework existente. El arquitecto debe traducir estas rutas conceptuales a la estructura real del repo y registrar el mapa de equivalencias en `docs/ARCHITECTURE.md`. No crear una segunda app ni mover todo por estética. Modularizar incrementalmente la navegación y los módulos que se toquen. La prioridad sigue siendo el recorrido científico real y el build estático.

## 1. Decisión: una web, un motor de datos, cero backend obligatorio

- **Frontend:** conservar HTML/CSS/JS o el framework de la app ya levantada. Si es React, Vue, Svelte, etc., mantener su router/componentes/build. Si HTML puro, módulos ES (`type="module"`) y rutas HTML o hash; servir por HTTP. No agregar un framework solo por modularidad.
- **Motor científico:** Python independiente; descarga, validación, procesamiento y exportación en la computadora del equipo. Sus resultados versionados son datos estáticos que el frontend consume vía fetch. No se ejecuta Python desde un botón del visitante. No hay necesidad de un API vivo ni de MySQL para la entrega.
- **Persistencia demo:** adaptador localStorage por módulo, con datos semilla ficticios, versión de esquema y reset solo del namespace del proyecto. No almacenar contraseñas ni pedir correo real. El visitante no se autentica; opción de seleccionar rol de prueba. No presentar actividad de QA como usuarios reales.
- **Futuro:** cambiar adaptadores por HTTP/API con backend separado sin reescribir componentes. No implementar endpoints imaginarios, ni crear capas de abstracción complejas innecesarias.

## 2. Árbol de referencia (adaptar, no duplicar)

```text
bosquevivo-hn/
├── CLAUDE.md
├── .claude/agents/               # departamento y especialista FOREST-SAR
├── docs/                         # plan, contrato, arquitectura, backlog, progreso
├── config/                       # configuración científica compartida no secreta
│   └── science.json              # AOI, thresholds, collections, budget, version
├── src/                          # o estructura equivalente ya existente
│   ├── app/                      # bootstrap, router, shell, providers
│   │   ├── main.js
│   │   ├── routes.js
│   │   └── layout.js
│   ├── config/                   # marca, navegación, flags, defaults UI
│   │   └── app.config.js
│   ├── i18n/
│   │   ├── index.js              # t(key, params), formato y cambio de locale
│   │   ├── es.json
│   │   └── en.json
│   ├── styles/
│   │   ├── tokens.css            # colores, tamaños, tipografía, motion
│   │   ├── base.css              # reset, body, links, focus, a11y
│   │   ├── layout.css            # shell y grillas comunes
│   │   └── utilities.css        # utilidades limitadas
│   ├── components/               # UI reusable sin reglas científicas
│   │   ├── Button/
│   │   ├── Modal/
│   │   ├── Navbar/
│   │   ├── Sidebar/
│   │   ├── Tabs/
│   │   ├── StatusBadge/
│   │   ├── Card/
│   │   └── EmptyState/
│   ├── modules/                  # funcionalidades verticales
│   │   ├── home/
│   │   ├── observatory/          # mapa, selector, comparador, leyenda, gráficos
│   │   ├── observations/         # detalle, evidencia, ficha CSV
│   │   ├── community/            # posts, comments, demo roles
│   │   ├── polls/                # preguntas, votar, resultados
│   │   ├── reports/              # reporte demo, seguimiento local
│   │   ├── events/               # actividades demo y voluntariado
│   │   ├── library/              # noticias/recursos, visor PDF
│   │   └── methodology/         # fórmulas, fuentes, evidencia, limitaciones
│   ├── services/                 # acceso a datos, nunca manipula DOM
│   │   ├── science.repository.js # carga/validación manifest y snapshots
│   │   ├── storage.js            # adaptador localStorage seguro
│   │   └── community.repository.js
│   ├── shared/                   # utilidades puras, tipos/contratos, formatters
│   └── assets/                   # fuentes, imágenes, iconos, licencias
├── scientific-engine/
│   ├── run.py                    # comando principal local
│   ├── catalog.py
│   ├── acquisition.py
│   ├── pairing.py
│   ├── processing.py
│   ├── metrics.py
│   └── export.py
├── public/data/                  # manifest + snapshots reales verificados
├── tests/                        # unitarios, integración, e2e, fixtures aisladas
├── scripts/                      # preflight, catálogo CMR, export/build auxiliares
├── .bosquevivo-work/             # logs y crudos privados, gitignore
└── dist/                        # solo salida publicable, regenerable
```

Cada módulo puede tener `index`, `view`, `components`, `service`, `state` y `styles` SOLO si los necesita. Un módulo pequeño puede ser dos archivos. No crear decenas de archivos vacíos ni carpetas de arquitectura empresarial. Componentes comunes en `components`, componentes exclusivos dentro de su módulo. No copiar un Navbar a cada HTML; reutilizar plantilla/render compartido o mecanismo nativo del framework. El mismo principio aplica a footer y modal. No publicar carpetas `.git`, `.claude`, `.venv`, logs, crudos ni scripts privados.

## 3. Marca, textos y rutas: una única fuente por valor

Usar `app.config` para identidad, links de navegación y flags. Ejemplo ilustrativo, adaptar formato al stack:

```js
export const APP_CONFIG = Object.freeze({
  brand: { name: 'BosqueVivo HN', engine: 'FOREST-SAR', country: 'Honduras' },
  defaultLocale: 'en', supportedLocales: ['en', 'es'],
  dataManifest: 'data/manifest.json',
  features: { communityDemo: true, demoRoles: true, liveUpdates: false },
  storageNamespace: 'bosquevivo:v1',
  routes: { home: '/', observatory: '/observatory', observations: '/observations', community: '/community', library: '/library', methodology: '/methodology' }
});
```

No hardcodear marca en títulos, navbar, footer, traducciones ni plantillas; usar `APP_CONFIG.brand.name` e interpolación `{brand}`. Título de documento, metadata y textos que se generan en build deben derivar de esta misma fuente (si HTML estático sin build, inicializar document.title desde config y documentar fallback). No confundir nombre visible con identificador estable de almacenamiento/rutas o IDs científicos: renombrar marca no borra datos. Mantener enlaces y navegación desde registro central con `labelKey`; no repetir rutas entre módulos. Para rutas estáticas respetar paths relativos/base path del servidor, o hash router si no hay rewrite. No duplicar nombre en HTML generado y editable manualmente. No hardcodear secretos; ninguna variable de entorno del frontend es secreta.

`es.json`/`en.json` agrupan traducciones por dominio (common, nav, observatory, observations, community, library, methodology, errors). Ejemplo:

```json
{"nav":{"observatory":"Observatorio"},"home":{"welcome":"Bienvenido a {brand}"},"common":{"close":"Cerrar","noData":"No hay datos disponibles"},"observatory":{"candidate":"Cambio candidato por verificar"}}
```

`t('home.welcome', {brand: APP_CONFIG.brand.name})`. Formatear fechas/números con Intl y unidades desde contrato; no concatenar frases que rompan traducción. Comprobar paridad de claves ES/EN, no mostrar claves crudas ni HTML sin escapar. Actualizar `lang` y labels accesibles. Los títulos, botones, errores, tooltips, labels de gráficos y mensajes de no datos salen de i18n. Inglés completo en el enlace de jueces; español fácil para Honduras. Contenido editorial/noticias y documentos pueden vivir en JSON/Markdown de biblioteca con metadatos y traducciones propias. Los valores medidos, IDs, unidades y fuentes proceden del dataset, nunca del diccionario. Los textos de usuarios demo proceden de fixtures marcados, no del sistema de traducción.

## 4. Parámetros científicos: una fuente y trazabilidad

Crear `config/science.json` (o equivalente existente) con bbox provisional, colección/intervalo de búsqueda, polarización preferida, umbral exploratorio, cortes experimentales, tamaño de sector, mínimos de cobertura/área si justificados, presupuesto de descarga y versión de configuración. Inicializar valores desde `docs/CONTRATO_CIENTIFICO.md`. Si el script CMR incluido trae defaults históricos, modificarlo de forma compatible para leer config central o pasar los valores explícitos desde `run.py`; no mantener dos listas editables de defaults. Separar umbral radar dB de cortes porcentuales de pérdida de cobertura. No permitir que la UI cambie resultados publicados como si fueran una medición nueva: un cambio de umbral requiere ejecutar el motor, generar snapshot distinto y guardar parámetros exactos en manifest. Si se ofrece slider educativo, etiquetarlo como simulación. El frontend muestra los parámetros del snapshot, no un valor actual de config que podría diferir. Nunca recalcular área de hectáreas desde píxeles visuales del mapa. La configuración científica no es un lugar para guardar credenciales.

## 5. CSS racional y reutilizable

Conservar la identidad y motion existentes. Extraer los valores que YA usa la plantilla a `tokens.css`: colores semánticos (`--color-primary`, `--color-surface`, `--color-text`, `--color-border`, `--color-danger`), roles del semáforo, familia/tamaños de fuente, espaciado, radios, sombras, z-index, duraciones/easing. Los ejemplos de valores del chat no sustituyen la paleta real. No duplicar hex de marca ni font sizes repetidos en cada módulo. Los colores científicos conservan leyenda y significado, no cambian por un ajuste decorativo de tema. Un botón base `.btn` + variantes primary/secondary/ghost y disabled; usar el componente común para navegación/acciones cuando corresponda; estilos locales solo excepciones justificadas. Tabs y modal usan componentes comunes y variantes, no un CSS copiado por página. En React/Vue usar CSS modules/scoped styles si ya disponibles; HTML usar clases prefijadas por módulo (`observatory__...`, `community__...`) para impedir colisiones. No usar selectores globales indiscriminados, `!important` salvo justificación, estilos inline repetidos o CSS duplicado. Breakpoints acordados, contraste, teclado, foco visible, target táctil, `prefers-reduced-motion`. No instalar Tailwind o biblioteca UI por preferencia si ya hay diseño funcionando.

## 6. Aislamiento de módulos y errores

- Dirección de dependencias: app → modules → services/shared/components. `shared` y `components` no importan features. Módulos no acceden a variables privadas de otros ni modifican su DOM; comparten datos por props, interfaces públicas o pequeño estado común (región, par, idioma), no un objeto global gigante. Evitar dependencias circulares.
- Separar estado local, UI y lógica: repositorio carga/valida datos, funciones puras calculan o formatean, vista renderiza. Eventos de un módulo usan listeners propios y cleanup al salir. Leaflet y gráficos se inicializan al montar y se destruyen al desmontar. No duplicar listeners ni IDs. El navbar y shell viven fuera de paneles que pueden fallar.
- Cada módulo exporta una interfaz clara (por ejemplo `mount(container, context)` que retorna `dispose()`, o componente de framework). Las rutas pueden cargar bajo demanda si el stack lo permite. No volver obligatorio un módulo P1 para iniciar observatorio.
- Error boundaries por ruta/feature en frameworks que las soporten; en HTML envolver carga/montaje async con try/catch y estado de error local. Un fallo de PDF, encuestas, fetch o mapa muestra un mensaje, reintentar/descargar cuando corresponda y mantiene navegación. Un error de JavaScript en bootstrap global sí puede afectar toda la app: no prometer aislamiento total; testear shell y dependencias críticas.
- Cada servicio valida schema y estados `ready`, `loading`, `empty`, `error`, `catalog_only`, `no_data` según corresponda. AbortController/cleanup de peticiones si cambia región; prevenir respuestas viejas sobre selección nueva. No convertir error en cero ni usar fixtures científicas como fallback. Mantener última publicación válida con su fecha si falla un update.
- localStorage: claves por dominio, manejo de JSON inválido, cuota/denegación, migración sencilla, reset solo datos demo del proyecto. Sin cuentas reales. Un fallo de almacenamiento no debe bloquear mapas. No hacer `localStorage.clear()`.

## 7. Criterios de aceptación obligatorios de modularidad

1. Cambiar marca en un solo archivo actualiza navbar, inicio, título y footer, ES/EN, sin cambiar IDs ni datos; comprobar con test o inspección reproducible.
2. Cambiar un token de botón actualiza variantes coherentes y no altera semáforo. Botones comparten implementación; no CSS repetido por página.
3. Cambiar un texto en un diccionario se refleja sin modificar componentes. Paridad ES/EN y ausencia de claves sin traducir.
4. Deshabilitar `communityDemo` (o provocar error de almacenamiento) no rompe observatorio/menú. Simular fetch fallido del manifest: mostrar error local y navegación operativa; no resultados ficticios. PDF ausente: modal muestra fallback. Error del mapa no bloquea biblioteca.
5. Navegar entre tabs/rutas repetidamente no duplica gráficos, mapas ni eventos; estado de selección coherente y botón Atrás correcto. Verificar ancho móvil.
6. No rutas/dependencias circulares; comprobar imports, tamaño build, secretos ausentes y `git diff`. Documentar dónde cambiar marca, textos, CSS, región y umbrales; el cambio científico exige nuevo snapshot.
7. El motor Python y web pueden ejecutarse por separado; build estático carga snapshot verificable sin Python en el host. Si faltan datos reales, catálogo/no-data explícito. No crear backend de producción solo para cumplir un árbol.

## 8. Asignación y orden

Arquitecto: inventario y mapa de carpetas, decidir estructura mínima, contrato de interfaces, identificar módulos ya existentes. Constructor: centralizar config/i18n/tokens, shell y componentes al tocar primero P0, migrar vistas incrementales. FOREST-SAR: config científica y export versionado. Detective: corregir errores locales sin cambiar API de otros módulos. Crítico: revisar duplicación, imports, hardcodes de marca/URLs/umbrales y fronteras. Optimizador: reducir CSS/JS y validar que no cambia métricas. Escudo: pruebas de aceptación 1–7 y recorrido NASA. Narrador: documentar árbol real, variables editables, traducciones, reglas de CSS, datos y cómo añadir un módulo.

No dedicar toda la noche a refactorizar: si el sitio ya posee buenas convenciones, aprovecharlas; aplicar estas reglas primero a los componentes y módulos modificados. No eliminar carpetas de usuario ni reorganizar masivamente sin pruebas. Mantener PROGRESS actualizado, identificar deuda restante y dejar build demostrable.
