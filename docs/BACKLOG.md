# Backlog operativo — lotes y criterios de aceptación

Estados: TODO / DOING / BLOCKED / REVIEW / DONE. Solo DONE con evidencia. Deadline interno: domingo 15 nov 16:00 HN, confirmar local 17:00; no continuar agregando features si queda poco tiempo. Coordinador asigna rutas sin conflicto. Cada lote sigue siete etapas. P0 no depende de comunidad.

| ID | Prioridad | Lote / propietario | Aceptación / evidencia | Depende |
|---|---|---|---|---|
| A0 | P0 | Arquitecto + coordinador: inventario y preflight | stack/rutas/build/lockfile, branch, herramientas, mapa de carpetas y contrato modular en ARCHITECTURE/PROGRESS | ninguna |
| S1 | P0 | forest-sar + constructor: catálogo CMR | respuesta real guardada por colección, IDs/fechas/madurez, errores, no inventar; listado de candidatos | A0 |
| S2 | P0 | forest-sar: adquisición/pareja | metadata, intersección, HVHV, autenticación, prueba de descarga/subset, tamaño controlado | S1 |
| S3 | P0 | constructor ciencia + escudo | pipeline delta/validez/áreas, test sintético y ejecución real si par, manifest y capas; si bloqueado status explícito | S2 |
| U1 | P0 | constructor UI | navegación/rutas, config de marca, i18n ES/EN, tokens CSS, componentes comunes, desktop/móvil, estado sin datos; diseño actual preservado | A0 |
| U2 | P0 | constructor mapas | selectores, par compatible, mapa/overlay/slider, indicadores, método, estados vacíos; consumir contrato | U1, contrato S3 (UI puede avanzar con fixtures aisladas) |
| I1 | P0 | coordinador + escudo | integración snapshot real, sector, alertas candidatas/ficha CSV, fuentes; si sin par no fingir | S3/U2 |
| C1 | P1 | constructor comunidad | posts/comentarios/voto/reporte y rol demo en localStorage, validación, etiquetas demo; sin registro obligatorio | U1 |
| C2 | P1 | constructor biblioteca | recursos oficiales, contingencia educativa, PDF modal y fallback, eventos/encuestas demo | U1 |
| Q1 | P0 | critico/escudo | build, tests ciencia, Playwright en 390/768/1440, console errors, links, modal, no-data, demo vs real; criterios de ARQUITECTURA_MODULAR | I1 + lo terminado |
| D1 | P0 | narrador + coordinador | README EN, HOW_TO_DEPLOY, dist zip, references, AI disclosure, HANDOFF; no push/deploy automático | Q1 |
| F1 | P2 | propietario futuro | backend real/login, scheduler nube, más territorios/OPERA validado, modelo/alertas, seguridad de producción | después |

## Secuencia nocturna
Preflight y branch antes de dormir. A0 y S1 inmediatamente; U1 puede ocurrir en paralelo con S1/S2, sin compartir archivos. S3/U2 se integran con contrato; C1/C2 solo tras garantizar P0 o si independientes y sobra capacidad. Q1 + D1 antes de detener. Dos reintentos por lote, no bucles. Si se agota cuota/permisos, conservar cambios y PROGRESS. No realizar commit automático si permiso Git no concedido; propietario revisa diff. No push ni merge a main durante ejecución.

## QA mínimo
Python: delta esperado (1→0.1), invalid/no overlap, umbrales y porcentajes, no datos=null, máscara y cobertura. Playwright Chromium: inicio→observatorio; seleccionar par/sector o estado no disponible; slider/leyenda; detalle/ficha CSV; comunidad demo publicar/votar persistencia local; modal abre/cierra Escape y foco; mobile menú, no overflow; idioma; no console errors críticos. Test fixture en entorno local separado, capturas y trazas ignoradas por Git; no simular actividad real ni crear usuarios públicos. Testear build servido por HTTP, no file://. Verificar enlace público manual antes de enviar.
