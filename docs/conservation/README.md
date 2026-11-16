# Bosques y Conservación (`#/conservation`)

Vista educativa independiente que complementa el observatorio. No procesa datos, no toca el motor científico ni los snapshots. Fuente del contenido: documento del equipo con las secciones *Forests and Forest Cover*, *Types of Forests*, *Protected Areas of the Central District*, deforestación, tecnología SAR/NISAR y *Join forest monitoring efforts* (entregado el 2026-11-15).

## Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Página y orden de secciones | `src/features/conservation/Conservation.tsx` |
| Cifras, fuentes, créditos de imágenes, roles, municipios | `src/features/conservation/conservation.data.ts` |
| Textos EN / ES (misma forma, la exige TypeScript) | `src/i18n/sections/conservation.en.ts`, `conservation.es.ts` |
| Componentes | `ConservationHero`, `sectionNav`, `ForestStatistics`, `ForestTypesChart`, `ProtectedAreas`, `RegionalContext`, `EnvironmentalThreats`, `ConservationBenefits`, `SatelliteTechnology`, `SarAnimation`, `ResearchExamples`, `ParticipationRoles`, `ParticipationForm`, `ConservationReferences`, `shared.tsx` |
| Estilos | `src/features/conservation/conservation.css` |
| Fotos (WebP optimizado) | `public/conservation/*.webp` |
| Pruebas e2e | `tests/e2e/conservation.spec.mjs` |
| Capturas de revisión | `docs/conservation/capturas/` |

Ruta lazy (`src/app/routes.tsx`), entrada de menú con icono de pino (`Shell.tsx`, `NavItem.icon` opcional en `Navbar`). Con 8 entradas, el menú principal pasa al botón hamburguesa entre 821 y 1120 px (`src/index.css`).

## Reglas de contenido aplicadas

- **Cifras nacionales (ICF, 2018):** 5,384,424.88 ha, 48 %, y la distribución por tipo, etiquetadas "Cifra histórica · 2018 · No es un resultado de FOREST-SAR".
- **Escalas separadas:** Honduras / Francisco Morazán (ICF, s. f.) / Distrito Central (Bustillo, 2026) / La Tigra / ventana FOREST-SAR. El único dato del sistema (117,537 ha de área válida por comparación) se lee del snapshot publicado.
- **Diferencias entre fuentes (La Tigra):** superficie 17,657 ha (ICF, 2021) frente a ~24,000 ha (SINIT, 2024); agua 30 % (SINIT, 2024) frente a 40 % (plan de manejo, datos SANAA 1997). Se muestran ambas con su fuente, sin combinar, con nota de que no se pudo verificar el motivo.
- **Causas:** aviso visible en Amenazas y en cada modal: FOREST-SAR no identifica causas ni atribuye amenazas a zonas candidatas.
- **NISAR:** las capacidades de la misión (biomasa, 25 m, InSAR, incertidumbre) se separan de lo implementado hoy en FOREST-SAR. Las investigaciones (JERS-1, ALOS, ALOS-2, UAVSAR, radar aerotransportado) llevan la etiqueta "Misión anterior"; la densidad "del tamaño de una cancha" se marca como "Capacidad prevista de NISAR".
- **Animación SAR:** ilustrativa, con nota visible; con movimiento reducido arranca en pausa mostrando el diagrama completo.
- **"Nuestro sistema":** escenas (52), pares compatibles (162), comparaciones (4) y área candidata por comparación (23/17/28/165 ha) desde el snapshot; nota de que no se suman.
- **Participación:** prototipo. No hay campos de nombre, teléfono ni correo; no hay red ni `localStorage`; la vista previa vive en memoria. Texto obligatorio: "Prototipo de participación: los servicios de registro y contacto todavía no están activos." Botón a `#/community`.
- **Mapa de áreas protegidas:** no se incluyó; no hay límites oficiales verificados en el repositorio y no se dibujan límites inventados.

## Fuentes y enlaces

El documento solo trae citas en el texto (autor, año), sin lista de referencias. La lista de la página reproduce esas citas sin inventar títulos. Solo se enlazaron páginas abiertas y comprobadas el 2026-11-15 (HTTP 200 y título coincidente):

- Ritchie (2021) → https://ourworldindata.org/deforestation
- Chazdon et al. (2016) → https://doi.org/10.1007/s13280-016-0772-y
- National Geographic (2024) → https://education.nationalgeographic.org/resource/deforestation/
- NASA Earthdata (s. f.-a) → https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing
- NASA Earthdata (s. f.-b) → https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar
- ICF (2018, 2021, s. f.) → sitio institucional https://www.icf.gob.hn/ (no el documento específico)
- Página oficial de NISAR: https://science.nasa.gov/mission/nisar/ y https://nisar.jpl.nasa.gov/

Sin enlace verificado (se muestran como "Sin enlace verificado"): Brand Studio 2024, BBVA 2026, FAO s. f., Ortiz 2022, Aquae s. f., NASA JPL 2017a–d y 2023, NASA/JPL-Caltech 2023, NASA Earthdata 2026, NASA s. f.-a/b/c, SINIT 2024 (el dominio no respondió), plan de manejo de La Tigra, Bustillo 2026, Saatchi et al. 2007.

## Fotografías (Wikimedia Commons, licencias consultadas por la API de Commons)

| Archivo | Lugar | Autor | Licencia |
|---|---|---|---|
| hero-la-tigra | Parque Nacional La Tigra, Rancho Quemado | Jorge Luis Murillo Palma | CC BY-SA 3.0 |
| la-tigra-san-juancito | San Juancito con La Tigra al fondo | Blindc1rca | Dominio público |
| la-tigra-waterfall | Cascada en La Tigra | Blindc1rca | Dominio público |
| broadleaf-rio-platano | Reserva de la Biosfera del Río Plátano | Caracho de corazón | CC BY-SA 4.0 |
| coniferous-la-labor | La Labor, Ocotepeque | THEHN4LIFE | CC0 |
| mixed-cusuco | Parque Nacional Cusuco | Timc tree | CC BY-SA 4.0 |
| mangrove-san-lorenzo | San Lorenzo, Golfo de Fonseca | Carlos Funes | CC BY 4.0 |
| threat-agriculture | Santa Rosa de Copán (causa no especificada) | Katherin Osorio | CC BY-SA 4.0 |
| threat-urban | Tegucigalpa | — | Dominio público |
| threat-fire-la-tigra | Incendio en La Tigra, 18-03-2024 | Unión Europea, Copernicus Sentinel-2 | Atribución |
| threat-fragmentation | Celaque | Emeinke (Wikipedia en inglés) | CC BY-SA 3.0 |
| mero-santa-lucia-entorno | Cerros de Santa Lucía (entorno del refugio "Mero"), recortada | Nan Palmero | CC BY 2.0 |

Las fotos de tipos de bosque se marcan "Foto representativa" porque ilustran el tipo, no un sitio medido. La de "Mero" también lleva esa marca y el pie dice que es paisaje del entorno, no el área protegida. Openverse y Wikimedia Commons (búsqueda del 2026-11-15) no tienen fotos con licencia libre de Corralitos ni de Yerba Buena: se muestra un marcador con el texto "No hay una fotografía verificada de esta área". No se usan imágenes copiadas de buscadores sin autor ni licencia. Las obras CC BY-SA se redimensionaron (adaptación); se mantienen bajo la misma licencia con crédito visible.

## Pendientes

- Sustituir citas sin enlace por referencias completas cuando el equipo aporte la bibliografía (títulos y URL).
- Añadir fotos propias del equipo de Corralitos, Yerba Buena y "Mero" si se dispone de ellas.
- Si se obtienen límites oficiales (ICF/SINAPH) con licencia clara, añadir el botón "Ver en el mapa".
- Registro real de participación: requiere un servicio seguro y aviso de privacidad; fuera del alcance del prototipo estático.
