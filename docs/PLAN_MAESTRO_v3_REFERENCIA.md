# BosqueVivo HN / FOREST-SAR — Plan maestro técnico y de entrega

**Versión 3.0 — 14 de noviembre de 2026, 21:04, Honduras (UTC−6)**  
**Evento:** NASA Space Apps Challenge 2026 · Dancing with the SARs  
**Piloto:** Municipio del Distrito Central, Francisco Morazán, Honduras  
**Estado:** especificación para implementación inmediata; no es un informe de resultados científicos ni prueba de un despliegue.  
**Documento rector:** sustituye las decisiones provisionales de las versiones 1 y 2 cuando hay diferencias. Las decisiones de implementación aquí propuestas deben ser aprobadas por el equipo; la investigación y los resultados deben verificarse por separado.

> Objetivo de la entrega: publicar una aplicación web navegable, accesible, visualmente cuidada y científicamente responsable que demuestre cómo los datos reales de NISAR pueden ayudar a comprender cambios de vegetación y organizar su verificación en el Distrito Central. No hace falta construir un sistema de producción mundial en un hackathon.

## Índice

1. Resumen ejecutivo y reconciliación de documentos
2. Alcance, usuarios y propuesta de valor
3. Viabilidad y criterios de decisión
4. Territorio y fuentes de datos
5. Metodología científica reproducible
6. Semáforo y métricas
7. Arquitectura de información y experiencia de usuario
8. Especificación funcional por vista
9. Diseño, motion y accesibilidad
10. Arquitectura técnica y estructura del repositorio
11. Contratos de datos y persistencia
12. Backend comunitario mínimo y seguridad
13. Plan de implementación por agentes
14. Despliegue en GoDaddy y alternativas
15. Pruebas, criterios de aceptación y contingencias
16. Cronograma, pendientes vivos y decisiones
17. Presentación, rúbrica y referencias
18. Visión de crecimiento y hoja de ruta
19. Instrucciones maestras para agentes

---

## 1. Resumen ejecutivo y reconciliación de documentos

### 1.1 La idea del equipo

La propuesta convierte observaciones de radar en información comprensible para detectar cambios candidatos en la vegetación del Distrito Central. Una persona explora un mapa, compara fechas compatibles, comprende la señal, consulta sectores de interés y puede colaborar con un reporte, una encuesta o una iniciativa. Un técnico puede consultar la evidencia, priorizar inspecciones y descargar fichas de verificación. Una autoridad puede utilizar resultados como insumo, no como prueba de infracción ni como orden de emergencia.

El documento `La_Idea_Dancing_with_the_SARs.docx` propone una coreografía científica que distingue al proyecto:

1. **Find your partner — Encontrar pareja:** seleccionar observaciones comparables.
2. **Tune the step — Afinar el paso:** estimar variabilidad y probar normalización.
3. **Spot the moves — Detectar movimientos:** identificar cambios candidatos y calidad de los datos.
4. **Decide together — Decidir juntos:** presentar semáforo, prioridades, fichas y acciones a verificar.

Esa coreografía será la historia de inicio, el flujo del observatorio y la estructura de la presentación. Se conserva la idea original del equipo; los agentes ayudan a diseñar, programar, documentar y comprobar su ejecución.

### 1.2 Nombres y versiones

| Elemento | Propuesta de unificación |
|---|---|
| Marca pública | BosqueVivo HN (la marca ya está presente en el sitio existente) |
| Motor o método científico | FOREST-SAR (nombre de la idea estructurada) |
| Reto oficial | Dancing with the SARs; SAR significa Synthetic Aperture Radar, no una sigla inventada para la aplicación |
| TIGRA-SAR | Nombre de la propuesta anterior enfocada en La Tigra; conservar en historial, no crear otra marca para el piloto |
| Eslogan | From radar echoes to green-cover decisions / De los ecos del radar a decisiones para nuestro territorio verde |
| Alcance | Distrito Central, con La Tigra como área de interés y sectores seleccionables; no cobertura nacional actual |

El equipo debe confirmar el nombre definitivo para el formulario NASA; no mezclar nombres en sitio, repositorio y presentación. El texto de la idea original priorizaba La Tigra y bosque/incendios; la instrucción más reciente amplía el piloto al municipio y conserva la cobertura vegetal como fenómeno principal. Incendios, agricultura y agua serán contextos educativos o futuras extensiones, no resultados de un modelo no implementado.

### 1.3 Qué se encontró en los archivos

- `Reto seleccionado por el equipo Dancing with the SARs.docx`: reto, requisitos de envío, rúbrica, uso de SI/IA, idea original TIGRA-SAR y ruta local. En sus últimas páginas propone voluntariado y reportes; incluye una entrega local DOM 17:00.
- `La_Idea_Dancing_with_the_SARs.docx`: cinco páginas de metodología, indicadores, hipótesis, flujo científico, núcleo/visión, presentación y pendientes. Menciona datos junio–octubre 2026; no adjunta granulos HDF5 ni prueba de compatibilidad.
- `plan_estrategico_nasa_space_apps_2026_v2(1).md`: planificación previa, con Río Plátano y otras zonas candidatas; esas opciones quedan fuera del piloto por decisión posterior del usuario.
- `info(1).pdf`: Judging & Awards Guide, páginas 3 (elegibilidad), 5–7 (rúbrica), 11 (premios). Señala cierre general domingo 15 de noviembre a las 23:59 hora local y condiciones de elegibilidad. Confirmar con líder local porque la documentación del equipo también indica 17:00; operar con el plazo anterior mientras se confirma.
- Imagen de fórmula: TP = (CVi − CVf)/CVi × 100. Su ejemplo de 10,000 ha a 8,500 ha es ilustrativo, no evidencia local.
- `bosquevivo-hn-mapa(1).rar`: se abrió y se inspeccionó el índice, README, HTML y CSS. Contiene `index.html`, `css/styles.css`, `css/fonts.css`, una imagen JPEG y cuatro archivos de fuentes, sin scripts, rutas adicionales ni base de datos. El README describe una copia local de la página mapa-y-semaforo. En el HTML los enlaces de navegación apuntan a rutas no incluidas en el RAR. Hay contenido sobre GFW, Sentinel-1 y FIRMS, no integración real NISAR. El semáforo original usa cuatro cortes anuales 0.5%, 1.5%, 3%. El archivo no permite afirmar que el sitio nuevo que el usuario desarrolló después tenga las mismas limitaciones: inspeccionar el repositorio actualizado antes de editar.

**Decisión:** preservar el lenguaje visual (Karla, Young Serif, crema #f4f1e8, verde #1e7a45, tono editorial), no asumir que las funciones descritas en los textos ya existen. Sustituir los umbrales viejos por configuración única y construir vistas reales. No afirmar que la imagen del archivo RAR es una escena NISAR; identificar su procedencia y licencia antes de usarla.

### 1.4 Plazo y éxito mínimo

El plazo global indicado es 15/11/2026 23:59 local; la ruta de mentoría señala 15/11 17:00. Confirmarlo de inmediato, pero planificar entrega antes de las 16:00 del domingo. Desde las 21:04 del sábado quedan unas 20 horas hasta las 17:00, y menos horas productivas. No se promete completar todo el núcleo avanzado del documento científico. La versión mínima defendible tiene una pareja real reproducible (o, si no es posible, evidencia real NISAR disponible y declaración de limitaciones), mapa con fechas y fuentes, experiencia interactiva y enlace público. Un prototipo únicamente ficticio no demuestra el uso de datos requerido por el reto.

## 2. Alcance, usuarios y propuesta de valor

**Pregunta científica del piloto:** ¿dónde se observan variaciones negativas relevantes de retrodispersión HV entre dos adquisiciones comparables de NISAR en el área analizada del Distrito Central, y cuáles requieren verificación adicional?

**Pregunta de producto:** ¿cómo puede una persona entender qué se observa, dónde ocurre, qué tan confiable es la observación y qué hacer después sin tener experiencia en teledetección?

| Audiencia | Necesidad | Experiencia |
|---|---|---|
| Niño/estudiante | Comprender el radar y por qué cuidar el bosque | Mapa simple, iconos, frases, glosario, comparación visual |
| Persona mayor/ciudadanía | Conocer su entorno y participar sin tecnicismos | Selector claro, texto legible, reporte guiado y recursos |
| Técnico ambiental | Datos, calidad, sectores y fichas | Vista avanzada, metadatos, descarga, método reproducible |
| Municipalidad/ONG | Priorizar visitas y coordinar acciones | Lista de sectores, ficha y exportación; decisiones humanas |
| Agricultor | Conocer el contexto ambiental | Recursos educativos y enlaces agronómicos verificados; no calendario de siembra automático |

Principios: exploración sin cuenta; ninguna dirección personal necesaria; datos y limitaciones accesibles; diseño con lenguaje local en español y demo completa en inglés; acciones transparentes; no acusaciones ni promesas de prevención garantizada.

### 2.1 Alcance y no alcance

**Incluido:** municipio como piloto, selección por sectores, comparación NISAR, indicadores condicionados a datos, fichas, metodología, biblioteca, comunidad básica y preparación educativa.

**No incluido:** monitoreo en tiempo real, detección de tala ilegal o responsables, operación oficial de emergencias, pronóstico agrícola, cálculo de biomasa sin modelo, clasificación mundial, automatización de descarga y procesamiento desde el navegador, autenticación institucional de producción. El radar GCOV de amplitud tampoco mide desplazamiento centimétrico directamente; para deformaciones se requiere metodología interferométrica/productos específicos.

## 3. Viabilidad y criterios de decisión

| Función | Prioridad | Entrega mínima comprobable | Condición / recorte |
|---|---|---|---|
| Navegación multi-vista, responsive, ES/EN | P0 | Rutas, navegación y enlaces reales | Reutilizar plantilla |
| Mapa y selector DC/sector | P0 | Polígono verificable, zoom, selección y ficha | AOI de estudio claramente etiquetada si falta límite |
| Catálogo y parejas NISAR | P0 | Una pareja real seleccionada con metadatos; validación previa | No exigir automatización completa |
| Radar antes/después | P0 | Dos imágenes comparables, misma escala, fechas | Si falta pareja, mostrar una escena real sin inventar comparación |
| Cambios candidatos | P0 condicionado | ΔdB y máscara válida, resultados reproducibles | Si no se puede procesar, mostrar observación real sin inferencia |
| Semáforo/indicadores | P0 | Métrica correcta o N/D, simulador aparte | Solo usar TP real con base y final comparables |
| Sectores y fichas CSV | P0/P1 | Celdas con resultados, exportación | Si falta análisis, ficha de observación sin cifra |
| Método y fuentes, PDF modal | P0 | Documentos propios/autorizados con lector alternativo | No publicar documentos internos sin permiso |
| Gráficos | P1 | Datos de la pareja o serie real, ejes/unidades | Con dos fechas no inferir tendencia larga |
| Reportes/foro/encuestas | P1 | En modo compartido seguro, o local explícito | No construir cuentas ni moderación compleja |
| Voluntariado, noticias, educación, contingencia | P1 | Directorio y contenido curado, interacciones simples | No inventar organizaciones, fechas ni eventos |
| OPERA | P1 condicionado | Capa independiente y fuente | No confundir con NISAR ni declarar validación automática |
| Piso de ruido/normalización | P1 condicionado | Si se prueban, registrar comparación antes/después | Dejar sin calibrar si evidencia insuficiente |
| Escalera de evidencia | P2 | Pares independientes y persistencia comprobada | Con una pareja, solo una observación |
| IA predictiva, alertas oficiales, agricultura operativa | Futuro | Ninguna afirmación de funcionamiento | Requiere datos, investigación, acuerdos y validación |

**Regla de corte:** si el procesamiento bloquea, el equipo frontend no espera. Usa un contrato JSON con valores nulos y modo demo independiente. Si GoDaddy no está listo, desplegar frontend estático en alojamiento aprobado y apuntar dominio posteriormente. Si el backend comunitario falla, usar modo local y mostrarlo claramente; nunca simular confirmaciones de envío real.

## 4. Territorio y fuentes de datos

### 4.1 AOI y sectores

Caja inicial WGS84 (longitud/latitud): `[-87.3500, 14.0000, -87.0500, 14.3500]`. Solo es una ventana de búsqueda suministrada por el equipo, no un límite oficial. El enlace Earthdata usa una caja más amplia `[-87.65342, 13.86974, -86.71046, 14.92791]` para localizar escenas. El enlace Vertex especifica centro y zoom, no garantiza escenas ni cobertura.

- Obtener polígono municipal de fuente institucional o capa administrativa con versión/licencia documentada (buscar INE/IGN/AMDC, geoportal ICF; si no hay, seleccionar fuente abierta verificable e identificarla). Validar CRS, geometría y cobertura. No inventar polígonos de colonias.
- La Tigra es una zona de interés, no asumir que todo el parque cae dentro del municipio; mostrar intersección y, si se desea, capa de contexto externa por separado.
- Generar celdas de 1 km × 1 km en CRS métrico UTM 16N (EPSG:32616, validar ubicación y producto), recortadas al municipio/área analizada. Guardar IDs estables DC-001 etc., área real recortada, geometría GeoJSON WGS84 para mapa.
- Vista `Distrito Central completo` = totalidad del polígono, pero indicadores solo sobre cobertura válida común. Resaltar las áreas sin dato. Si no existe polígono comprobado, mostrar `Área piloto de búsqueda (no límite municipal)` y no atribuir cifras a todo el distrito.
- Zonas de interfaz: DC completo, Tegucigalpa, Comayagüela, La Tigra (área de interés), sectores de cuadrícula. Solo habilitar filtro estadístico de las primeras tres si existen polígonos verificables; si no, son accesos de enfoque, no unidades estadísticas.
- No promediar porcentajes de sectores: agregar numeradores/denominadores válidos no solapados y recalcular. No contar dos veces sectores/áreas de interés superpuestos.

### 4.2 Fuentes y papel de cada una

| Fuente | Para qué se usa | Estado/precaución |
|---|---|---|
| NASA–ISRO NISAR L2 GCOV banda L | Núcleo: retrodispersión geocodificada, HVHV si existe, máscara y looks | Identificar escenas, versión, cobertura y unidades reales |
| ASF Vertex | Buscar/descargar granulos NISAR y revisar footprint | https://search.asf.alaska.edu/#/?zoom=9.917&center=-87.060,14.040 |
| NASA Earthdata Search | Buscar catálogo, colecciones y metadatos | https://search.earthdata.nasa.gov/search?sb%5B0%5D=-87.65342%2C13.86974%2C-86.71046%2C14.92791&lat=14.455789732141824&long=-86.22770798701929&zoom=8.746130990633292 |
| earthaccess | Búsqueda/descarga Python, fuera del servidor web | Earthdata Login para acceso a archivos; no exponer secretos |
| OPERA DIST-ALERT-HLS / DIST-ANN-HLS | Contexto independiente de perturbación de vegetación óptica | No es NISAR; consultar disponibilidad, QA y fechas |
| OPERA RTC-S1 / DIST-S1 | Contexto radar Sentinel-1 si está disponible para zona/fecha | Otro sensor y producto, no reemplazo del núcleo |
| OPERA DSWx | Agua/inundaciones como futura capa temática | No es evidencia de pérdida forestal; verificar producto/sensor |
| ICF / fuente oficial o abierta de cobertura forestal | Máscara y línea base, estadísticas de referencia | Confirmar definición de bosque, año, resolución, licencia |
| GFW | Contexto de pérdida de cobertura arbórea | No equivale automáticamente a deforestación neta; no mezclar métricas |
| FIRMS NASA | Contexto de anomalías térmicas/focos de calor | Un foco no prueba incendio activo en un punto exacto; no generar alertas oficiales |
| Base cartográfica | Orientación, calles y límites | Atribución visible, respetar términos del proveedor; fallback local |
| NASA ARSET | Capacitación y metodología | https://appliedsciences.nasa.gov/what-we-do/capacity-building/arset |

OPERA (Observational Products for End-Users from Remote Sensing Analysis) es una familia de productos, no un único mapa ni una app que haga todo. Usar primero DIST-HLS como contexto si la consulta devuelve datos. RTC-S1 y DIST-S1 son alternativas radar de Sentinel-1. JPL lista productos específicos NISAR para otros fenómenos; no asumir cobertura/estado sin consultar. En la entrega, separar siempre el producto, sensor, fechas, resolución y fuente. Ver [NASA Earthdata OPERA](https://www.earthdata.nasa.gov/data/projects/opera/data-access-tools) y [JPL OPERA products](https://www.jpl.nasa.gov/go/opera/products/).

### 4.3 Tareas inmediatas del agente científico

1. Pedir a las compañeras los archivos HDF5, lista de IDs, fechas, capturas de búsqueda y metadatos. La idea menciona junio a octubre de 2026, pero los adjuntos revisados no incluyen escenas. No inventar IDs, fechas exactas ni disponibilidad. Revisar si ya tienen datos procesados y código.
2. En Vertex, elegir colección NISAR L-SAR L2 GCOV, dibujar AOI y revisar junio–octubre 2026; ampliar período si es necesario. En Earthdata Search confirmar la colección, `short_name` o `concept_id`, versión y acceso. Registrar capturas e IDs; no confundir el centro del mapa con una búsqueda ejecutada.
3. Verificar footprint, cobertura común y cantidad de datos; bajar solo candidatos útiles. Considerar disco/RAM y tiempo; primero un subconjunto pequeño. Usar cuenta Earthdata del miembro autorizado, no pedir ni compartir contraseñas en el repositorio o agentes.
4. Crear `catalog.json` con escenas realmente inspeccionadas; marcar motivo si no hay HVHV o compatibilidad.
5. Entregar una pareja y un informe de calidad antes de invertir en más escenas.

Ejemplo de búsqueda Python (plantilla, no ejecutado aquí; rellenar `NISAR_GCOV_SHORT_NAME` con la colección confirmada):

```python
import os
import earthaccess
bbox = (-87.35, 14.0, -87.05, 14.35)
results = earthaccess.search_data(
    short_name=os.environ['NISAR_GCOV_SHORT_NAME'],
    bounding_box=bbox,
    temporal=('2026-06-01', '2026-10-31'),
    count=100,
)
for g in results:
    print(g)  # extraer metadatos e IDs después de inspeccionar estructura
# Elegir una pareja compatible; no descargar todos los resultados.
# earthaccess.login()  # configuración privada del equipo
# earthaccess.download(selected_granules, './private-data')
```

Instalar `earthaccess h5py numpy rasterio geopandas shapely pyproj scipy` en entorno virtual local. Si ya hay un flujo validado, conservarlo. Registrar versiones realmente instaladas en `requirements.txt` o lockfile; no instalar dependencias innecesarias en hosting.

## 5. Metodología científica reproducible

Referencia técnica principal: https://nisar-docs.asf.alaska.edu/gcov/. GCOV ofrece potencia gamma-0 calibrada y corregida por terreno, en grilla UTM; las polarizaciones y espaciados dependen del producto. No aplicar de nuevo corrección radiométrica de forma indiscriminada.

### 5.1 Paso 1 — Encontrar pareja

Inventariar metadatos: ID, colección, versión, tiempo UTC, footprint, CRS, transformada, espaciado, dimensiones, frecuencia/subbanda A/B, polarización, dirección ascendente/descendente, geometría/track/órbita relativa, modo, ángulo de incidencia cuando esté disponible, calidad. Consultar el grupo `identification` y documentación de la versión del HDF5; no inferir geometría por sufijos `098/033`. Inspeccionar la ruta de datos real; el producto puede tener `.../grids/frequencyA/HVHV` o `frequencyB/HVHV`. No asumir que todos los archivos incluyen HV.

Comparabilidad: mismo tipo de producto, frecuencia, polarización, geometría de observación compatible, resolución/grilla comparable, cobertura común y calidad suficiente. Si faltan metadatos críticos, marcar pareja `not_evaluated`. Distintas grillas pueden requerir reproyección explícita; reproyectar no resuelve diferencias de geometría de radar.

Guardar parejas `compatible`, `incompatible`, `unverified` y razón. Frontend ofrece solo parejas compatibles y muestra las demás deshabilitadas con motivo. El ciclo orbital aproximado de 12 días no implica que haya escena utilizable cada 12 días, ni que el dato sea en vivo. Mostrar fechas disponibles, no calendario de fechas inventadas.

### 5.2 Paso 2 — Afinar el paso

1. Leer datos de potencia HVHV y variables de máscara/numberOfLooks según esquema real. Abrir HDF5 por bloques o ventanas; no cargar todo si es grande.
2. Excluir NaN, valores de relleno, potencia no positiva, zonas fuera de AOI y píxeles inválidos de la máscara según especificación. Identificar sombra, layover y otras banderas relevantes sin adivinar sus códigos. Documentar filtro de looks, si se aplica, y justificarlo; no tratar looks como probabilidad de acierto.
3. Alinear sobre una grilla métrica común. Usar método de remuestreo apropiado para potencia (documentar) y vecino más cercano para máscaras/categorías. Comparar solamente intersección válida en ambas fechas. Calcular áreas con tamaño de píxel en CRS métrico, no con grados.
4. Convertir potencia lineal a dB: `10 * log10(gamma0_power)`. No aplicar 20 log10 a una potencia. Si los datos ya vienen en dB, no convertir dos veces. Usar una escala de visualización fija para ambas imágenes.
5. Calcular diferencia bruta `delta = final_db - initial_db`. Estimar offset mediano en zonas de referencia estables, no necesariamente toda la escena; `delta_norm = delta - median(delta_ref)`. Usar normalización solo si mejora estabilidad en controles y no borra cambio real extendido; conservar resultados brutos y documentar prueba. Si no hay referencias, desactivar y explicar.
6. Piso de ruido: con varias observaciones compatibles y zonas estables estimar distribución de diferencias de referencia; ejemplo experimental `T_noise = percentil 95 de abs(delta_ref)` o una medida robusta basada en MAD. Indicar número de pares, controles, estacionalidad y procedimiento. No afirmar que elimina toda variación natural. Si solo hay una pareja, el estimador es exploratorio o se deja N/D; no inventar calibración temporal.

### 5.3 Paso 3 — Detectar movimientos

- Hipótesis: una caída de HV de banda L puede asociarse a pérdida o modificación de estructura vegetal, pero humedad, geometría, relieve, speckle, agricultura y estación pueden alterar la señal.
- Umbral exploratorio de caída de 3 dB: `delta_db <= -3.0` (aprox. mitad de potencia); no usar `abs(delta)>=3` para etiquetar pérdida, porque también incluye aumentos. Si hay piso de ruido defendible, puede probarse `T = max(3, T_noise)` como regla conservadora experimental, no estándar. Documentar sensibilidad y cambiar tras validar.
- Aplicar regla a píxeles válidos; si hay máscara forestal fiable, calcular candidatos dentro de ella y especificar año/fuente. Sin máscara, etiquetar únicamente cambio de retrodispersión de superficie, no pérdida de bosque. Filtrar componentes pequeños con área mínima declarada y justificada, por ejemplo empezar a probar 0.5 ha y revisar sensibilidad; no afirmar que es umbral oficial. Mantener archivo de parámetros.
- Calcular aumentos por separado si interesa (`delta >= T`), como aumento de señal, no recuperación ni crecimiento de biomasa confirmado. Colores divergentes con leyenda.
- Cuadrícula: por celda, área evaluable, candidata, fracción válida, número de observaciones, rango de ΔdB. Priorizar por área candidata y fracción válida con criterio explícito; no ordenar como emergencia real. Marcar sin dato si no pasa requisitos de calidad. Un mínimo operativo de 70% de cobertura válida por sector puede ensayarse y documentarse; no es un estándar.
- Comparar con OPERA o imágenes ópticas de fecha cercana, mapa de bosque y comprobación de campo cuando existan. Una coincidencia apoya interpretación, no confirma automáticamente causa.
- Escalera de evidencia: E1 = una pareja; E2 = observación repetida en parejas comparables e independientes (sin tratar pares que comparten escena como independientes); E3 = persistencia sin recuperación en serie posterior y evidencia complementaria cuando exista. No usar niveles E2/E3 sin datos suficientes. Separar verificación humana como estado adicional. En MVP con una pareja mostrar E1 y limitaciones.
- Confianza: utilizar indicadores de cobertura válida y calidad de observación, no un porcentaje de probabilidad de deforestación. Mostrar máscara/looks cuando estén disponibles; si no, `quality_status: unknown`. Si se diseña puntuación más compleja, validar antes de publicar.

Pseudocódigo esencial (no sustituye lectura del esquema HDF5 ni reproyección):

```python
valid = mask_initial & mask_final & aoi_mask & (p0 > 0) & (p1 > 0)
valid &= np.isfinite(p0) & np.isfinite(p1)
delta = np.full(p0.shape, np.nan, dtype='float32')
delta[valid] = 10*np.log10(p1[valid]) - 10*np.log10(p0[valid])
# offset=0 si no se ha validado normalización
corrected = delta - offset
candidate = valid & (corrected <= -threshold_db)
# Si existe línea base: candidate &= forest_mask
# Aplicar filtro de área mínima documentado antes del resumen.
pixel_ha = abs(pixel_width_m * pixel_height_m) / 10_000
candidate_ha = candidate.sum() * pixel_ha
valid_ha = valid.sum() * pixel_ha
```

Para cobertura vegetal fraccional ponderar por fracción en cada píxel si el método lo requiere. No usar el pseudocódigo como cálculo de pérdida neta. Registrar escala, resolución y efecto del recorte/remuestreo sobre área.

### 5.4 Paso 4 — Decidir juntos

Exportar `catalog.json`, `pairs.json`, `sectors.geojson`, `metrics.json`, capas raster visuales, ficha CSV, metodología y `provenance.json`. Los archivos científicos de trabajo quedan privados; publicar productos derivados ligeros y los enlaces/IDs originales, respetando términos. Cada resultado lleva `dataset_id`, `pair_id`, `source_url`, `processed_at`, `method_version`, `parameters`, `status` y limitaciones. Separar hechos observados de hipótesis.

### 5.5 Entregas científicas escalonadas

- **A (ideal realista):** pareja real GCOV HVHV, cobertura común válida, diferencia y mapa de candidatos exploratorios; ficha con datos reales, fuentes y método. TP si hay línea base y final comparables; si no, N/D.
- **B:** dos escenas compatibles reales y comparación visual, sin algoritmo validado: explicar por qué no se cuantifica aún; no colorear como pérdida confirmada.
- **C:** una escena real con metadatos/footprint y explicación educativa; la comparación demostrativa está separada. Es una reducción de alcance, no una respuesta completa al reto. Registrar brecha y consultar mentor.
- **D:** únicamente mockups: no afirmar integración real NISAR, presentar como visión/prototipo incompleto y señalar que no satisface plenamente el núcleo del desafío.

## 6. Semáforo y métricas

### 6.1 Fórmulas y distinciones

`TP = 100 × (CVi − CVf) / CVi`, con CVi y CVf medidos en hectáreas comparables de cobertura vegetal de igual definición, misma región/área válida, método y fechas. TP es pérdida **neta**, no pérdida bruta de bosque. Si CVi=0, no calculable. Si TP<0, ganancia neta, no necesariamente recuperación ecológica. Si faltan datos, `null`. No aplicar a cualquier descenso de dB.

Ejemplo ilustrativo: 10,000 ha a 8,500 ha = 1,500 ha de pérdida neta, TP=15%. No son datos medidos de Tegucigalpa.

`Área candidata (ha) = n_píxeles_candidatos × área_píxel_m² / 10,000`, sobre intersección válida. `Fracción candidata (%) = 100 × área candidata / área válida analizada` (o área válida forestal si hay máscara, nombrar denominador). No equivale a TP.

`Cobertura válida (%) = 100 × área válida común / área geométrica de la unidad`. Mostrar denominador y fecha.

`Ritmo promedio por 12 días = TP / (días transcurridos / 12)` si TP es calculable y días>0. Es una tasa lineal promedio normalizada al período de referencia, no pérdida real de cada ciclo, ni predicción, ni anualización. Si solo hay candidatos, se puede indicar intervalo y fracción; no calcular ritmo TP con candidatos. Mostrar fechas UTC y local de forma clara.

### 6.2 Configuración única y rangos sin huecos

El HTML anterior usa cuatro rangos; documento FOREST-SAR usa límite alto 20%; mensaje más reciente usa 18%. Adoptar provisionalmente **18%**, sujeto a aprobación del equipo. No usar estos cortes como norma oficial NASA/ICF ni como disparadores automáticos de denuncias, emergencias o cabildos. Aplicarlos exclusivamente a TP, con período visible y fuente validada. No comparar automáticamente colores de períodos distintos. No redondear antes de clasificar.

| Nivel | Rango TP | Texto UI | Acción orientativa, no oficial |
|---|---|---|---|
| 1, verde | 0 a 2 inclusive | Estable según métrica | Continuar monitoreo |
| 2, amarillo | >2 a 5 inclusive | Vigilancia | Revisar evolución |
| 3, naranja | >5 a 10 inclusive | Precaución | Verificar en campo con organización competente |
| 4, rojo | >10 a 18 inclusive | Prioridad alta | Solicitar revisión técnica |
| 5, morado | >18 | Prioridad muy alta | Evaluación especializada; decisiones de autoridad |
| Ganancia | <0 | Ganancia neta estimada | Revisar contexto |
| Gris | null, inválido o insuficiente | Sin evaluación | Buscar datos comparables |

En la interfaz, el título debe ser `Indicador experimental de cambio de cobertura`, no `Riesgo de incendio`. Colores + números + etiquetas + patrón opcional. El indicador de candidatos tiene su propia escala (área/fracción, sin reutilizar colores como equivalentes a TP). Si el equipo quiere simular TP, crear pestaña separada `Simulador educativo`, con banner en todos sus resultados.

Implementación JS de referencia:

```js
export function lossPercent(initial, final) {
  if (!Number.isFinite(initial) || !Number.isFinite(final) || initial <= 0 || final < 0) return null;
  return 100 * (initial - final) / initial;
}
export function classify(tp) {
  if (!Number.isFinite(tp) || tp > 100) return 'not_evaluated';
  if (tp < 0) return 'net_gain';
  if (tp <= 2) return 'level_1';
  if (tp <= 5) return 'level_2';
  if (tp <= 10) return 'level_3';
  if (tp <= 18) return 'level_4';
  return 'level_5';
}
```

No enviar aviso automático por este código. Guardar configuración y versión en `territory.json`; no copiar valores en múltiples componentes. La función de cálculo sólo recibe áreas válidas de la misma metodología y dominio, no datos nulos convertidos a cero.

## 7. Arquitectura de información y experiencia de usuario

### 7.1 Navegación

Usar páginas reales estáticas o rutas hash si el frontend actual lo requiere. En hosting compartido, preferir directorios con `index.html` o enlaces `.html` que funcionan sin reglas de rewrite. Menú principal: Inicio | Observatorio | Alertas | Comunidad | Aprende. Footer: Metodología, fuentes, documentos, acerca, privacidad. Botón claro `Reportar una observación`. ES/EN visible; recordar preferencia local. La versión inglesa debe estar completa para jueces.

| Ruta propuesta | Contenido y acción principal |
|---|---|
| `/index.html` | Inicio, narrativa y CTA explorar |
| `/observatorio.html` | Mapa, sectores, parejas, semáforo, gráficos, comparador |
| `/alertas.html` | Observaciones, filtros, fichas y reporte guiado |
| `/comunidad.html` | Pestañas foro, encuestas, voluntariado/eventos |
| `/aprende.html` | Educación, recursos, noticias y contingencia |
| `/metodologia.html` | Método, fórmulas, datos, fuentes, PDF, repositorio |
| `/acerca.html` | Equipo, propósito, limitaciones, privacidad y contacto autorizado |

El observatorio tiene pestañas internas `Resumen / Comparar / Capas / Sectores`. Enlaces profundos con query `?sector=DC-001&pair=<id-real>` y URL validada. Mantener selección al abrir ficha o regresar. No usar rutas antiguas que fallen al recargar; redirigir o enlazar a nuevas páginas.

### 7.2 Dos niveles de lectura

**Modo sencillo (default):** ¿Qué vemos? ¿Dónde? ¿Qué significa? ¿Qué puedo hacer? Texto sin siglas sin explicación, fechas fáciles, una acción por bloque, tarjetas con indicador y leyenda. **Detalle científico:** metadata, fórmulas, precisión, QA, metodología, fuentes, descarga. Un botón `Cómo se calculó` abre panel/modal con información, no un sitio separado obligatorio. No inferir edad del usuario ni solicitarla.

### 7.3 Flujo de demostración

Inicio → `Explorar Distrito Central` → elegir sector o todo → elegir pareja compatible → mover comparador → activar cambio candidato → ver ficha de sector y fuente → descargar CSV → ver forma de reportar (sin envío oficial) → metodología. El recorrido principal no requiere registro, contraseña ni acceso a Earthdata. Los jueces no deben depender de que el investigador esté conectado.

## 8. Especificación funcional por vista

### 8.1 Inicio: narrativa de exploración

**Hero:** bosque/montañas o visual satelital con procedencia, encabezado `Nuestros bosques están cambiando. Descubramos cómo.`, CTA directo al observatorio, secundario `Cómo funciona`. Banner de piloto Distrito Central. No mostrar números sin fuente. Usar tres escenas animadas cortas: Tierra → Honduras/Distrito Central → señal radar; puede lograrse con SVG, CSS y capas 2D; no hace falta WebGL. Si son ilustraciones, etiquetar y no llamarlas imágenes NISAR.

**Coreografía:** cuatro pasos interactivos; botones permiten saltar a la etapa; cada paso muestra una breve explicación y vínculo a observatorio/método. Incluir tarjetas de `Qué puedo hacer` y sección comunitaria. Evitar scroll hijacking y pantallas bloqueadas. Mantener CTA accesible desde el header.

### 8.2 Observatorio (máxima prioridad)

Desktop: encabezado compacto, panel de control a izquierda (240–300 px), mapa central, panel de detalle/indicadores a derecha (280–340 px según espacio); en móvil controles en acordeón o sheet inferior y mapa de altura útil. Vista de mapa, modo comparación, panel de lista accesible.

Controles:
- Selector `Distrito Central completo`, sectores, accesos de enfoque de La Tigra/Tegucigalpa/Comayagüela. Mostrar nombre, tipo de geometría y cobertura válida.
- Fecha inicial/final; solo parejas válidas del catálogo. Deshabilitar alternativas incompatibles y explicar. No ofrecer fechas arbitrarias ni usar un calendario ficticio en modo real.
- Capas: base, GCOV HVHV inicial/final (misma paleta y rango dB), ΔdB, candidatos, áreas no válidas, cuadrícula, OPERA si verificado. Descripciones y fuente en cada capa. Un mapa de calidad si disponible; sino porcentaje válido.
- Comparador: dos capas georreferenciadas sincronizadas; control `range` accesible que recorta overlay o compara paneles, con teclado y touch. Para la demo, imágenes raster georreferenciadas con idéntica extensión/CRS visual y escala. Slider simple (preferir dos paneles sincronizados si el plugin falla). No superponer dos imágenes de distintos límites y llamarlo comparación. Si no hay segunda imagen, ocultar slider real y explicar.
- Indicadores: área analizada y válida, área candidata, fracción candidata, TP y ritmo si calculables, período, nivel de evidencia. Botón `Cómo se calculó`. Estado gris/guion para N/D. Sin indicador de biomasa si no está modelado.
- Gráfico: comparación de dos fechas o barras de área candidata por sector; serie temporal solo si hay más fechas comparables. Ejes, unidades y tabla accesible. Al elegir sector cambia el panel y gráfico; estado sin datos si no hay resultados.
- Ficha: sector, área, coordenadas del centro, par de escenas, fecha, calidad, estado de evidencia, explicación, `Descargar CSV`, `Ver metodología`, `Crear reporte sobre esta zona`. Descargar CSV real de los campos existentes, no datos inventados.

Ejemplo de layout textual:

```text
[Logo] [Inicio] [Observatorio] [Alertas] [Comunidad] [Aprende] [EN/ES]
[Distrito Central > Sector DC-...] [Fecha inicial] [Fecha final] [Modo sencillo]
┌───────────────┬────────────────────────────┬────────────────────┐
│ Área / capas  │ Mapa y comparador          │ Qué observamos     │
│ Parejas       │ Zoom / leyenda / fuente    │ Área válida, cambio │
│ Filtros       │ Selector por sector        │ TP o N/D, calidad   │
└───────────────┴────────────────────────────┴────────────────────┘
[Gráfico y tabla] [Ficha de verificación] [Cómo se calculó]
```

### 8.3 Alertas / centro de observaciones

Tres tipos visualmente separados: `satellite_candidate` (producido por el análisis, no editable por ciudadanía), `citizen_report` (sin verificar), `external_official` (fuente institucional real, link y fecha). No generar tipos oficiales de ejemplo como si fueran verdaderos.

Lista + mapa: filtro por sector, origen, fecha, estado y nivel de evidencia; orden por criterio de prioridad documentado; encabezado `Observaciones para verificar`. Cada card muestra origen, fecha, estado, descripción y acción. Al abrir, modal/drawer con ficha, fuente, recomendaciones y descarga. Para emergencias reales dirigir a canales oficiales verificados por equipo (ICF, COPECO, Bomberos, 911), sin integración ni confirmación de envío; no indicar salir a investigar un incendio ni acercarse a zona peligrosa.

**Reporte ciudadano, 3 pasos:** (1) elegir sector aproximado y categoría (vegetación, humo/incendio observado, agua, otro), (2) fecha y descripción de lo observado, (3) revisar texto y confirmar que no es un canal de emergencias. Campos mínimos: alias opcional, sector, categoría, fecha, descripción de 20–1000 caracteres, consentimiento. No datos personales, acusaciones, direcciones de domicilios ni nombres de presuntos responsables. Sin imágenes subidas públicamente en P0; permitir una vista previa local de foto opcional que no se envía ni persiste, o aplazar por seguridad. Si backend activo, queda `pending_review`; si modo local, confirmar `Guardado en este navegador; no enviado a autoridades`. No afirmar que el equipo verifica todos los reportes.

### 8.4 Comunidad

Foro: categorías bosque, ciencia, observaciones, educación, voluntariado; lista de temas, detalle de tema y comentarios, publicación sencilla. Sin rich text, sin HTML de usuario, sin adjuntos ni mensajes privados. En modo compartido, todos los posts/comentarios nuevos quedan pendientes y solo se publican por revisión del equipo; ejemplos iniciales identificados. No exigir registro para navegar. En modo demo, estado guardado localmente y aviso visible.

Encuestas: pregunta de opción única, 2–5 opciones, descripción y estado. Ejemplo `¿Qué tema ambiental querés conocer mejor?` con alternativas bosque, agua, agricultura, incendios. Votar actualiza barras y conteo; resultado inicial claramente demo si es semilla ficticia. Crear encuesta como propuesta (pendiente de moderación) con título y opciones únicas. Una respuesta por sesión de demo; si se usa backend, control técnico básico mediante identificador aleatorio de sesión y restricción única; no garantizar una persona/un voto ni representatividad. No usar resultados como verdad estadística de la población.

Voluntariado: directorio de grupos y organizaciones con nombre real, zona, enlace oficial y área de trabajo, verificados antes de publicación. Registro de interés local o enlace externo; no afirmar alianzas ni convocatorias. Eventos: lista de actividades reales confirmadas o tarjetas explícitas de ejemplo; fecha, ubicación aproximada, categoría, detalle en modal y enlace oficial cuando exista. Proponer evento como sugerencia, sin inscripción oficial automática. Si faltan datos, mostrar invitación a consultar recursos y estado vacío útil.

### 8.5 Aprende / biblioteca / noticias / contingencias

Pestañas `Aprende`, `Noticias y fuentes`, `Documentos`, `Preparación`. Tarjetas con categoría, título, resumen, fuente, fecha real si disponible y CTA. Contenido inicial: qué es SAR, por qué banda L/HV, qué significa cambio candidato, diferencia entre observación y verificación, funciones de bosques/agua y educación sobre incendios. En agricultura, recursos oficiales/agronómicos y límites; no inferir fecha de siembra, rendimiento o riego desde este radar. Para una fase agrícola se necesitarán cultivos, lluvia, suelo, temperatura, calendarios locales, validación y expertos.

Noticias: usar enlace y resumen propio de fuentes oficiales, fecha verificable; si se muestra tema educativo sin publicación, etiquetar `Recurso educativo`, no noticia de última hora. No usar logos NASA/ICF como marca propia. Si no hay noticias confirmadas, publicar biblioteca de recursos, no crear noticias ficticias.

Planes educativos: listas de preparación para incendio/inundación y cuidado ambiental; usar guías oficiales verificadas, indicar organismo y fecha, no planes de evacuación personalizados ni instrucciones de respuesta derivadas de semáforo. Checklist local (no envía datos); advertencia `No sustituye instrucciones de autoridades`. Nunca prometer coordinación con autoridades sin acuerdo.

**Visor documental:** usar `<dialog>` nativo o modal accesible, título, botón cerrar, Escape, foco inicial/restaurado, bloqueo del scroll del fondo, navegación de teclado. Para PDF de origen autorizado, `iframe` del mismo dominio con título y `loading=lazy`; mostrar enlace `Abrir PDF en otra pestaña` y `Descargar`. En móvil si no renderiza, ofrecer alternativa; preferir resumen HTML del documento. Solo URLs de una lista permitida, no iframe arbitrario introducido por usuario. No incrustar PDF externo que bloquea framing; enlazarlo. No publicar DOCX internos ni datos personales; publicar PDFs propios/autorizados, metodología y fichas. Si no hay generador PDF, entregar CSV y ficha HTML imprimible (PDF mediante impresión del navegador), no afirmar reporte PDF dinámico ya disponible.

### 8.6 Metodología y acerca de

Metodología: explicación escalonada de las cuatro fases, catálogo, pares, calidad, fórmulas, límites, umbrales experimentales, fuentes NASA y externas, fecha de actualización y versión del método, enlace a código y descargas. Incluir comparación bruta/normalizada si existe evidencia, y qué se ha probado/no probado. Publicar ejemplo matemático separado de datos reales. Acerca: autores autorizados, evento, licencia de código, atribuciones, declaración SI/IA, privacidad y estado del piloto; no afirmar patrocinio/aprobación NASA.

## 9. Diseño, motion y accesibilidad

### 9.1 Sistema visual

Conservar tokens de la plantilla inspeccionada: `--bg:#f4f1e8`, `--ink:#1d2b1f`, `--accent:#1e7a45`, `--accent-2:#e0a458`, `--muted:#556153`, `--line:#cfcab8`, `--card-radius:14px`, `--btn-radius:999px`. Usar Karla para interfaz y Young Serif para títulos editoriales, sujeto a verificar licencia de las fuentes. Mantener apariencia premium y humana. Añadir fondo oscuro verde para hero si mejora el contraste; no abusar de degradados o tarjetas. Alertas: verde, amarillo, naranja, rojo, morado y gris con texto e iconos, no solo color. Revisar contraste real, especialmente amarillo/naranja sobre crema. Tipos: cuerpo 16–18px, títulos responsivos, line-height 1.5, zoom al 200% sin pérdida esencial; áreas táctiles idealmente 44×44 px.

### 9.2 Motion con intención

| Elemento | Interacción propuesta | Restricción |
|---|---|---|
| Hero | Secuencia suave Tierra→Distrito, líneas radar decorativas | 2D/SVG, sin obligar a verla; alternativa estática |
| Coreografía | Reveal de cuatro pasos con click/scroll | No ocultar contenido si JS falla |
| Mapa | Fly-to moderado al seleccionar sector; transición de panel | No animar continuamente; no bloquear zoom |
| Comparador | Arrastre inmediato, teclado, transición de indicador | Sin retraso artificial ni escalas variables |
| Indicadores | Animación breve al actualizar valor | Mostrar valor real final, sin animar N/D |
| Modales | Entrada/salida 150–220 ms | Escape, foco, cierre sin animación si reduced motion |
| Gráficos | Dibujo/reveal al cargar o filtrar | Una sola vez, sin volver a contar en loop |

Usar CSS transitions + IntersectionObserver como primera opción. Si el repositorio actualizado ya utiliza GSAP u otra librería, conservarla y evitar duplicar dependencias. `prefers-reduced-motion: reduce` desactiva movimiento no esencial, scroll suave y parallax; controles siguen funcionando. No scroll-jacking, intro obligatoria, video pesado autoplay, cursor personalizado que oculta puntero ni animación infinita. El diseño debe ser multi-vista, no únicamente landing larga.

### 9.3 Accesibilidad y responsive

Objetivo WCAG 2.2 AA como guía, no certificación. Navegación por teclado, foco visible, skip link, landmarks, botones con texto, ARIA solo donde proceda, labels, errores vinculados a campos, `aria-live` para estado de carga, tablas alternativas a gráficos/mapa, contraste mínimo 4.5:1 texto normal. Evitar mostrar datos solo en hover. Mapas con lista equivalente y controles táctiles. Probar 360/390, 768, 1024, 1440 px, orientación vertical/horizontal, zoom 200%, teclado y reduced motion. Menú móvil desplegable con cierre y foco gestionado. No exigir mouse para slider, PDF, filtro ni encuesta.

## 10. Arquitectura técnica y estructura del repositorio

### 10.1 Decisión: frontend estático + pipeline offline + API opcional

No ejecutar Python/HDF5/GDAL en cada visita. Procesar fuera del hosting y subir productos ligeros. El sitio permanece operativo incluso si Earthdata o base de datos no están disponibles. El usuario ya tiene plantilla HTML/CSS; recomendar JS ES modules sin framework adicional para esta entrega, salvo que el repositorio nuevo ya funcione con Vite/React u otro stack (no migrarlo por estética). Leaflet para mapa (GeoJSON, overlays georreferenciados, controles); Chart.js o SVG accesible para gráficos; CSS/JS para animaciones; `<dialog>` para documentos. Descargar/versionar librerías permitidas localmente si es viable para no depender de CDN durante demo. Registrar licencias. Evitar múltiples motores de mapas/animaciones.

```text
NASA / ASF / OPERA + límite municipal y línea base
                  |
       descarga y análisis offline (Python)
                  |
      catálogo + resultados + QA + provenance
                  |
     public/data (JSON/GeoJSON/PNG/WebP/tiles)
                  |
      frontend estático (HTML/CSS/JS/Leaflet)
                  |
    opcional API PHP/PDO ── MySQL/MariaDB
                  |
 reportes, foro, encuestas y revisión humana
```

**Modo A:** GoDaddy con hosting Linux cPanel compatible PHP/MySQL → frontend estático + API PHP del mismo origen. **Modo B:** si solo hay dominio, hosting estático o cPanel no disponible → frontend con JSON y localStorage, publicación de demo sin BD. Un dominio no incluye necesariamente alojamiento. Confirmar plan, PHP, MySQL, espacio, SSL, acceso y DNS. La documentación oficial GoDaddy indica soporte PHP y MySQL en Web Hosting cPanel, pero no confirma el plan asignado al equipo. No exigir Node en servidor, contenedores ni VPS para esta fase. Si se usa Vite/React, subir la salida `dist/`, no `node_modules` ni source crudo. Preferir rutas reales `.html` o hash; si SPA history, configurar fallback sólo para rutas frontend, no API/archivos.

### 10.2 Estructura propuesta

```text
bosquevivo/
  README.md                   # inglés, instrucciones y demo
  PROGRESS.md                 # estados y evidencias
  LICENSE                     # decisión del equipo, verificar terceros
  REFERENCES.md               # fuentes, licencias, SI/IA
  .gitignore                  # secretos, HDF5, venv, datos privados, .env
  docs/
    plan-maestro.md
    methodology.md
    QA.md
    data-inventory.md
  science/
    requirements.txt
    search_catalog.py
    inspect_gcov.py
    process_pair.py
    export_web.py
    tests/
  private-data/               # ignorado, no publicar
  db/
    schema.sql
    seed-demo.sql             # explícitamente ficticio, sin datos personales
  server/
    config.example.php        # plantilla sin secretos
    api-src/                  # lógica PHP; empaquetar solo endpoints necesarios
  public/                     # raíz de publicación, no todo el repo
    index.html
    observatorio.html
    alertas.html
    comunidad.html
    aprende.html
    metodologia.html
    acerca.html
    css/{fonts.css,tokens.css,styles.css}
    js/{app.js,map.js,metrics.js,community.js,dialogs.js,i18n.js}
    vendor/                   # Leaflet, gráficos si necesarios + licencias
    assets/{img,fonts,documents}/
    locales/{es.json,en.json}
    data/
      territory.json
      boundary.geojson
      sectors.geojson
      catalog.json
      pairs.json
      metrics.json
      provenance.json
      resources.json
      layers/
      demo/                   # separado del directorio científico
    api/                      # solo si habilitado; endpoints PHP públicos
```

En repositorio existente adaptar nombres en vez de duplicar. Servir local con `python -m http.server 8000 --directory public` para estático. Para PHP, `php -S 127.0.0.1:8000 -t public` más una BD de prueba si existe; servidor PHP local no es producción. Si usa frontend compilado, seguir script de build existente.

### 10.3 Rendimiento

Meta práctica: hero <500 KB ideal, imágenes optimizadas WebP/PNG, carga diferida de noticias/PDF, evitar enviar HDF5 o raster completos. Para área pequeña generar imagen por capa con bounds correctos en EPSG:3857, transparente fuera de AOI, adecuada a resolución de visualización; para mayor escala usar teselas pre-generadas o COG con lector compatible y rangos HTTP verificados. Leaflet imageOverlay no reproyecta GeoTIFF por sí mismo; preparar el raster al CRS de mapa. Conservar GeoTIFF métrico analítico separado; no calcular hectáreas desde imagen web ni EPSG:3857. Evitar API de teselas no autorizada; si se usa proveedor OSM, mostrar atribución y respetar su política de uso. Preparar base local simplificada para fallo de internet. Cache busting por versión para evitar catálogos desactualizados; datos de usuario no cachear públicamente.

## 11. Contratos de datos y persistencia

### 11.1 Contratos JSON (esquema de ejemplo, no datos reales)

```json
{
  "schema_version": "1.0",
  "territory_id": "hn-dc",
  "name": {"es": "Distrito Central", "en": "Central District"},
  "bbox": [-87.35, 14.0, -87.05, 14.35],
  "bbox_is_official_boundary": false,
  "boundary_url": null,
  "boundary_source": null,
  "grid_size_m": 1000,
  "analysis_crs": "EPSG:32616",
  "thresholds_version": "team-provisional-18-v1",
  "tp_upper_bounds": [2, 5, 10, 18],
  "data_status": "not_evaluated"
}
```

`catalog.json`: array de registros `{id, collection, version, acquired_at_utc, footprint, crs, pixel_spacing_m, frequency, polarizations, orbit_direction, relative_track, mode, geometry_status, source_url, file_checksum, inspected_at}`. ID real del granulo, no placeholder publicado como real. Campos desconocidos `null`.

`pairs.json`: array `{id, initial_id, final_id, status, reason, days, common_coverage_pct, method_version, threshold_db, noise_floor_db, normalization_offset_db, layer_ids, data_status}`. Si no existen parejas, array vacío y banner explicativo. Estado `real_observation`, `real_derived`, `demo`, `not_evaluated`; nunca combinar sin etiqueta.

`metrics.json`: una fila por territorio/sector/par. Ejemplo de estructura no evaluada:

```json
{
  "territory_id": "hn-dc",
  "sector_id": "dc-all",
  "pair_id": null,
  "status": "not_evaluated",
  "valid_ha": null,
  "valid_pct": null,
  "candidate_ha": null,
  "candidate_pct": null,
  "candidate_denominator": null,
  "initial_cover_ha": null,
  "final_cover_ha": null,
  "tp_pct": null,
  "tp_per_12_days_pct": null,
  "quality_status": "unknown",
  "evidence_level": null,
  "method_version": null,
  "provenance_id": null
}
```

`sectors.geojson`: FeatureCollection WGS84 con `id`, `territory_id`, `name`, `area_ha`, `geometry_source`; no guardar falsos sectores en capa real. `layers` manifest: `id, type, url, bounds, render_crs, legend, unit, date, source_id, data_status`; bounds de Leaflet en `[south,west],[north,east]` a diferencia de bbox CMR. `provenance.json`: IDs de insumos, URLs, tiempos, QA, versiones, fuente de máscara, método, parámetros y limitaciones. `resources.json`: documentos/noticias/enlaces con `{id, type, title_es, title_en, source, url, published_at, verified_at, license, status}`. No divulgar secretos, HDF5 URLs temporales con tokens ni datos personales.

**Interfaz de consumo:** `getTerritory()`, `getCompatiblePairs(sector)`, `getMetrics(sector,pair)`, `getLayers(pair)`, `getObservations(sector,pair)`. Todo usa estado único de filtros; cambios actualizan panel, lista, gráfico y URL. Validar IDs antes de interpolar rutas; mostrar estado de carga, vacío y error. Distinguir un valor real 0 de `null` o falta de datos.

### 11.2 Base de datos portable, pequeña y opcional

La ciencia se mantiene en archivos versionados (rápidos, sin BD geoespacial). Para comunidad compartida, usar MySQL/MariaDB (SQL portable, utf8mb4, PDO). No usar SQLite público en webroot, JSON editable por múltiples usuarios ni guardar claves en JS. Si el hosting no ofrece BD, no bloquear la entrega; usar adaptador local y dejar claro que no hay sincronización.

Esquema inicial sugerido, no ejecutado. Ajustar tipos a versión real y crear en BD de prueba. Las entidades de territorio y sectores se validan contra catálogos del servidor; evitar duplicar geometrías en SQL. Los estados deben validarse en API y moderación.

```sql
CREATE TABLE reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  territory_id VARCHAR(64) NOT NULL,
  sector_id VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  alias_name VARCHAR(60) NULL,
  observed_on DATE NOT NULL,
  description VARCHAR(1000) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports (territory_id, sector_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE posts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  territory_id VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  title VARCHAR(140) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  alias_name VARCHAR(60) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_posts (territory_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id BIGINT UNSIGNED NOT NULL,
  body VARCHAR(1000) NOT NULL,
  alias_name VARCHAR(60) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE polls (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  territory_id VARCHAR(64) NOT NULL,
  question VARCHAR(200) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending_review',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE poll_options (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  poll_id BIGINT UNSIGNED NOT NULL,
  option_text VARCHAR(140) NOT NULL,
  UNIQUE KEY uq_poll_option (poll_id, id),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE votes (
  poll_id BIGINT UNSIGNED NOT NULL,
  option_id BIGINT UNSIGNED NOT NULL,
  voter_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id, voter_hash),
  FOREIGN KEY (poll_id, option_id)
    REFERENCES poll_options(poll_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Eventos, ONG y noticias: JSON editorial curado, sin BD en P0. Propuestas de evento se pueden almacenar como post categoría `event_proposal` si moderado. No construir sistema de registro personal/roles completo. Moderación inicial a través del panel privado autorizado del equipo (por ejemplo phpMyAdmin con acceso administrativo), sin exponerlo ni dar permisos al público. Si no hay revisión disponible, desactivar publicaciones públicas compartidas y usar demo local.

## 12. Backend comunitario mínimo y seguridad

### 12.1 API propuesta

Endpoints PHP simples para hosting compartido; `Content-Type: application/json`, mismo origen. No exponer secretos, trazas ni errores SQL. El servidor controla campos/estados, no confiar en frontend.

| Método y ruta | Función | Validación |
|---|---|---|
| GET `/api/posts.php` | Posts aprobados, paginados | Filtro territorio/categoría |
| POST `/api/posts.php` | Enviar post pendiente | Longitud, alias opcional, categoría permitida |
| GET `/api/comments.php?post_id=...` | Comentarios aprobados de post aprobado | ID positivo, paginar |
| POST `/api/comments.php` | Enviar comentario pendiente | Post aprobado, texto plano |
| GET `/api/polls.php` | Encuestas aprobadas y conteos | No datos de votantes |
| POST `/api/polls.php` | Proponer encuesta pendiente | 2–5 opciones únicas, transacción |
| POST `/api/vote.php` | Registrar voto | Encuesta abierta, opción pertenece, sesión, restricción única |
| POST `/api/reports.php` | Reporte pendiente | Sector válido, fecha, categoría, texto, consentimiento |
| GET `/api/health.php` | Estado básico API | No revelar credenciales ni versión sensible |

Respuesta estándar `{ok:true,data:...}` o `{ok:false,error:{code,message}}`; 400 inválido, 403 no permitido, 409 duplicado, 429 límite, 500 error genérico. Para POST exitoso `201`, aclarar estado pendiente. Votos y creación de opciones en transacción. Rate limit por sesión/servidor; CSRF token de sesión para POST y origen válido, cookies Secure/HttpOnly/SameSite, HTTPS; CORS no abierto. Consultas parametrizadas PDO, escapado HTML al mostrar texto (usar `textContent`), validación de longitud y categorías, sin SQL construido con texto usuario. Probar XSS con texto literal y no renderizar HTML. No permitir uploads ni URL de usuario en iframe. No almacenar contraseñas de usuarios porque no habrá cuentas públicas en MVP. No publicar IP, email, ubicación exacta, nombres de menores ni datos sensibles. Política de privacidad simple con finalidad, retención y contacto del equipo. Identificador aleatorio de sesión para voto, hash con secreto del servidor, no garantizar anonimato absoluto ni voto por persona.

**Configuración:** credenciales MySQL en archivo fuera de document root o variables del entorno; permisos restringidos, usuario de BD de mínimo privilegio, sin `root`, no hardcode, no publicar `.env`, `schema.sql`, logs o backup en webroot. Desactivar `display_errors` en público; log privado. Copia de seguridad antes de despliegue; si no hay controles básicos, desactivar escritura remota. Moderación, borrado y respuesta a abuso son requisitos antes de un foro público real.

### 12.2 Modo demo y estado de persistencia

Adaptador `CommunityStore` con métodos `listPosts`, `createPost`, `comment`, `listPolls`, `vote`, `submitReport`; implementación `ApiStore` o `LocalDemoStore`. Selección explícita por config, mostrar banner `Modo demostración: cambios solo en este navegador`. No degradar silenciosamente una solicitud que falló a éxito local; ofrecer reintento o guardar borrador local con aviso. Versionar claves localStorage (`bosquevivo:v1:demo:*`); botón reiniciar demo, no recoger datos personales. Las observaciones científicas no se escriben desde estos adaptadores.

## 13. Plan de implementación por agentes y equipo

Separar responsabilidades y archivos para evitar conflictos. Un integrante humano aprueba decisiones de alcance y ciencia; un responsable integra/mergea y publica. Las compañeras de investigación deben proporcionar evidencias, no únicamente resúmenes de IA. Reusar trabajo ya realizado.

| Agente / responsable | Archivos | Entregable mínimo | Dependencia / prueba |
|---|---|---|---|
| A1 Ciencia y datos | `science/`, `docs/data-inventory.md`, datos reales | IDs, pareja, rasters, QA, metodología | Archivos reales, prueba de unidades y cobertura |
| A2 Geoespacial | `public/data/boundary*`, sectors, map.js | Polígono/sector, mapa y comparador | A1 contrato, máscara y bounds; selección real |
| A3 UI/Motion | `public/*.html`, CSS, i18n, dialogs.js | Shell, portada, navegación, responsive, modal | Plantilla actual; no modificar ciencia |
| A4 Backend/comunidad | `db/`, `server/`, community.js | Modo local + opcional PHP, formularios | Plan hosting; validación y estados |
| A5 QA/Release | QA.md, deployment, integraciones | Prueba de rutas, datos, móvil, HTTPS, fallback | Build y dominio, informe |
| A6 Comunicación/edición | README, REFERENCES, docs públicos, demo | Texto inglés, 7 slides o video, citas y SI | Evidencia real, no afirmar futuro |

Puede haber menos agentes y agrupar roles. Congelar contratos de datos primero. A1 no necesita esperar diseño; A3 usa valores nulos/demo marcados. A5 prueba enlaces y captura pantallas reales. A6 comienza mientras se programa y actualiza cifras solo al recibir evidencia. Evitar editar el mismo archivo en paralelo; ramas `science`, `map`, `ui`, `community`, `release`, merge con revisión.

### 13.1 Recursos mínimos

- Repositorio Git y copia de la plantilla/versión nueva, VS Code o agente de código, navegador Chrome/Edge/Firefox, herramientas de dev responsive.
- Una máquina para Python con disco y RAM suficientes según tamaños reales; comenzar con ventanas pequeñas. QGIS opcional para revisar footprints, capas y reproyecciones. Earthdata Login y conexión de descarga.
- Hosting con document root y HTTPS; si PHP/MySQL, acceso a cPanel, credenciales de BD, phpMyAdmin, límite de subida, espacio y backup. Si no, hosting estático y dominio. Un integrante administra credenciales.
- Fuentes oficiales, logos propios/autorizados, atribuciones de mapas/fuentes/librerías, documentos públicos en inglés, iconos accesibles.
- Recursos a pedir ya: lista/archivos NISAR junio–octubre; polígono municipal y máscara forestal con licencias; plan exacto GoDaddy/dominio y ruta; repo actualizado y tecnologías; hora local definitiva; lista de ONG y materiales autorizados. No esperar todos para comenzar shell y datos de ejemplo separados.

## 14. Despliegue en GoDaddy y alternativas

### 14.1 Comprobación temprana (responsable A5)

Preguntar al organizador qué entregó: ¿dominio solamente, Web Hosting Linux cPanel, Plesk, WordPress administrado, VPS, otro proveedor? Verificar acceso al dashboard y document root de ese dominio, certificado TLS, DNS, espacio, PHP/PDO MySQL, tamaño máximo de archivos y posibilidad de base de datos. La tabla oficial [componentes compatibles GoDaddy](https://www.godaddy.com/help/which-components-does-my-hosting-support-5614) indica PHP/MySQL para cPanel; no asumir Node/Python de aplicación persistente ni que todos los planes permitan lo mismo.

### 14.2 Publicación estática — camino seguro

1. Generar `public/` final (o `dist/` del build existente) con `index.html`, rutas, assets y datos públicos. Excluir archivos privados, `node_modules`, fuente HDF5, `.env`, configuraciones y SQL. Validar referencias relativas si se aloja en subdirectorio. Crear zip de **contenido** de la raíz pública, no carpeta adicional que deje index anidado.
2. Entrar a GoDaddy → Web Hosting → Manage → cPanel Admin → File Manager, seleccionar document root real del dominio (habitualmente `public_html` para dominio principal; verificar, no sobrescribir otros sitios). Hacer backup previo. Subir zip, extraer, comprobar que `index.html` está en raíz, retirar zip y archivos de muestra innecesarios.
3. Vincular dominio al hosting con DNS indicado por proveedor; comprobar A/CNAME/nameservers según panel y no inventar IP. Si el dominio apunta a otro servicio, coordinar antes de cambiar. DNS/certificados pueden demorar, por lo que publicar y probar temprano. Usar URL provisional del hosting si está disponible y mantener enlace alternativo probado.
4. Activar/verificar certificado HTTPS y redirección desde HTTP según plan; no incluir credenciales ni formularios compartidos sin HTTPS. Probar recursos sin mixed content, rutas y PDF. Añadir cache razonable a assets versionados; no cachear respuestas privadas.
5. Abrir URL en incógnito y desde teléfono con datos móviles; probar enlace final sin login. Registrar URL, fecha, build/commit, evidencia y responsable. Hacer copia local y captura de pantallas. No decir que está publicado hasta verificarlo.

### 14.3 Si hay MySQL y PHP

1. Crear base y usuario desde cPanel MySQL Databases (privilegios mínimos necesarios para la API); registrar host, puerto, prefijos y nombre asignados. No usar root. Importar `schema.sql` con phpMyAdmin en BD correcta; `seed-demo.sql` solo si marcado demo y aprobado. [Guía GoDaddy importación](https://www.godaddy.com/help/import-a-mysql-database-in-web-hosting-cpanel-41371).
2. Colocar config privada fuera de `public_html` (si el plan permite), o variables seguras; verificar que no es descargable vía URL. Subir endpoints y código necesario. Configurar `community_mode=api` solo tras prueba. `health.php` sin información sensible.
3. Probar crear reporte, que queda pendiente, votar, impedir duplicado, mostrar errores, validar textos; probar que las publicaciones pendientes no aparecen públicamente y que no se exponen IDs de votantes o secretos. Revisar rate limit, CSRF, CORS, XSS, sesiones y SQL preparado. Si falla, apagar API de escritura y activar demo explícita. No usar phpMyAdmin como acceso público de usuarios.
4. Exportar copia `.sql` de backup a ubicación privada, documentar migración y procedimiento de restauración. Mantener catálogo científico como archivos; no migrar GIS a BD en esta entrega.

### 14.4 Alternativas / rollback

Si sólo hay dominio o el plan limita PHP, alojar estático en servicio autorizado por el equipo (GoDaddy u otro ya provisto; alternativas: GitHub Pages, Netlify). Verificar políticas, DNS y licencia. No comprar servicios ni cambiar dominio sin autorización. Backend puede migrar luego a servidor PHP/MySQL u otro API sin cambiar el contrato del frontend. Guardar zip estable `release-v1.zip`, versión anterior de archivos y respaldo BD; ante fallo recuperar build anterior y probar. Si el DNS no resuelve al cierre, usar enlace alternativo público verificado en formulario, actualizar dominio solo cuando esté operativo. El enlace a demo (slides/video) es independiente del enlace al sitio.

## 15. Pruebas, aceptación y contingencias

### 15.1 Checklist científico P0

- [ ] IDs/fechas/fuente reales; registro de acceso y producto; no usar únicamente mapa base como NISAR.
- [ ] Polígono municipal/área de estudio identificado; footprint y cobertura común verificados.
- [ ] Misma polarización/frecuencia/geometría compatible y unidades; comprobar que HVHV existe.
- [ ] Enmascarar inválidos, verificar reproyección y píxel/área; 0 y NaN diferenciados.
- [ ] Misma escala visual antes/después; diferencia con signo correcto; no confundir potencia con amplitud.
- [ ] Umbral y normalización documentados y evaluados; si no validados, explicitar limitación.
- [ ] TP solo con áreas comparables; cálculo de candidatos por separado; sin inferir causa o culpable.
- [ ] Nivel evidencia y calidad correctos; agregaciones por sector no solapadas, denominadores claros.
- [ ] Fuentes NASA y externas, versión, datos simulados diferenciados, resultados reproducibles con script.

### 15.2 Casos de prueba de métricas

| Caso | Resultado esperado |
|---|---|
| CVi=10000 CVf=8500 | TP=15; nivel 4 con corte 18, ejemplo |
| CVi=0 o null | TP=null, gris |
| CVf>CVi | TP negativo, ganancia neta |
| TP 2 / 2.0001 / 5 / 5.0001 | niveles 1/2/2/3 |
| TP 10 / 10.0001 / 18 / 18.0001 | niveles 3/4/4/5 |
| Diferencia +3 dB | No es candidato de pérdida negativa |
| Píxel inválido o fuera de AOI | No contabilizado como válido ni candidato |
| Sector sin cobertura | Sin evaluación, no cero ni verde |
| Pareja incompatible | Bloqueo selección + razón |
| Un solo par | E1; no tendencia/confirmación de persistencia |
| Área analizada 100 ha, candidata 10 ha | fracción candidata=10%; TP puede seguir N/D |

### 15.3 QA de producto y despliegue

- [ ] Todas las rutas y botones conducen a vista o acción real, sin 404 al recargar, sin consola crítica.
- [ ] Mapa y lista por sector; selección sincronizada con gráficos/indicadores y ficha; slider teclado/touch.
- [ ] Cambiar idioma, menú móvil, tabulación, contraste, focus, reduced motion, zoom 200%.
- [ ] Modales PDF accesibles, botón cerrar y descarga; fallback móvil; enlaces a fuentes públicos.
- [ ] Formularios: límites, categorías, campos faltantes, doble clic, errores de red, estados visibles y conservación de borrador; sin afirmación de envío a autoridades.
- [ ] API: inyección, XSS, CSRF, voto duplicado, datos pendientes no públicos, secretos fuera de webroot. Si falla → solo local.
- [ ] Datos demo marcados en cada vista, fuente y fecha reales donde corresponda, ninguna cifra ficticia en modo real.
- [ ] Sitio inglés completo, ES accesible, README y referencias públicas; link de demo público.
- [ ] HTTPS, móvil en red externa, incógnito, enlaces sin login, fallback base mapa/archivo, tamaño/carga razonables.
- [ ] Revisión humana de contenido: riesgos, privacidad, licencias, IA, no logos NASA generados/modificados.

### 15.4 Definición de listo

Una tarea no está completa por un screenshot de diseño. Debe tener implementación en rama integrada, caso de prueba, evidencia (captura/archivo/commit o resultado reproducible), fuente/licencia cuando aplique, y revisión humana. Clasificar `implementado`, `demostrativo`, `parcial`, `futuro`. Los datos reales tienen trazabilidad. Si se recorta alcance, documentar brecha en README y página NASA, no inventar prueba de funcionamiento.

## 16. Cronograma, pendientes vivos y decisiones

### 16.1 Cronograma orientativo de emergencia

Horarios Honduras; fecha de referencia sábado 14/11 21:04. Operar con cierre local posible domingo 17:00 hasta confirmar; meta publicar antes de medianoche y entregar versión final 15/11 antes de 16:00. No prometer todas las tareas. Distribuir en paralelo, reservar descanso y tiempo de revisión.

| Ventana | Trabajo | Salida / gate |
|---|---|---|
| Sáb 21:05–21:45 | Confirmar repo, nombre, hora local, hosting, datos y responsables | Contrato congelado, acceso y alcance |
| Sáb 21:45–23:30 | A1 inspecciona pareja; A3 shell/observatorio; A5 publica versión mínima; A6 referencias | URL provisional comprobada; catálogo preliminar |
| Sáb 23:30–dom 01:00 | Integrar mapa y una capa real si existe, comparador/fichas, QA inicial | Corte ciencia A/B/C; versión estable; no extender alcance |
| Dom 01:00–07:00 | Descanso rotado; si una descarga ya iniciada requiere supervisión, responsable asignado | Evitar depender de tareas críticas nocturnas |
| Dom 07:00–10:30 | Completar pareja/cambios y métricas; UI, accesibilidad, comunidad mínima | MVP integrado con modo real/demo explícito |
| Dom 10:30–12:30 | Congelar funcionalidades; validar, fuentes, traducción, capturas | Build candidato, informe de QA |
| Dom 12:30–14:30 | Demo 7 slides o video; documentación; probar URL y formularios | Material final, pruebas externas |
| Dom 14:30–16:00 | Envío, verificación y margen de fallos | Confirmación en página NASA; líder local confirma horario |

Si el cierre oficial local es anterior, adelantar. Si es 23:59, conservar margen y no reabrir alcance sin necesidad. Decidir en el primer gate si el backend compartido vale la pena: si tarda, local demo. La ciencia no debe quedar para el final.

### 16.2 Pendientes vivos

Estados: `[ ]` pendiente; `en curso`, `bloqueado`, `en revisión`, `[x]` completo solo con evidencia. Los estados iniciales indican lo que sabemos en este momento, no avances de agentes no comprobados. Mantener histórico, no borrar tareas terminadas.

| ID | Prioridad | Tarea | Responsable sugerido | Estado inicial / evidencia requerida |
|---|---|---|---|---|
| 01 | P0 | Confirmar nombre BosqueVivo HN/FOREST-SAR y cierre local | Equipo | Pendiente; decisión escrita |
| 02 | P0 | Obtener repo actualizado y auditar build | A3/A5 | RAR anterior inspeccionado; repo nuevo pendiente |
| 03 | P0 | Confirmar plan GoDaddy, dominio y HTTPS | A5 | Pendiente; acceso y URL |
| 04 | P0 | Obtener granulos reales / inventario junio–octubre | A1 | Pendiente; IDs, archivos, fuentes |
| 05 | P0 | Verificar polígono DC y La Tigra, licencia | A2 | Pendiente; GeoJSON/metadata |
| 06 | P0 | Emparejar 2 observaciones y documentar por qué | A1 | Pendiente; catálogo |
| 07 | P0 | Extraer HVHV, máscara, looks, cobertura común | A1 | Pendiente; QA |
| 08 | P0 | Exportar capas web y fuente | A1/A2 | Pendiente; manifest + raster |
| 09 | P0 | Implementar navegación y responsive | A3 | Pendiente en repo actualizado; prueba rutas |
| 10 | P0 | Mapa/selector de sector/comparador real | A2 | Pendiente; captura/prueba |
| 11 | P0 | Semáforo único y métricas nulas correctas | A1/A3 | Pendiente; pruebas de bordes |
| 12 | P0 | Probar y publicar build estable | A5 | Pendiente; URL pública |
| 13 | P0 | Página metodología/fuentes y ES/EN | A6/A3 | Pendiente; páginas públicas |
| 14 | P0 | Demo de entrega, referencias, SI, equipo | A6 | Pendiente; enlace y envío |
| 15 | P1 | Delta y umbral exploratorio con QA | A1 | Condicionado a par válido |
| 16 | P1 | Obtener línea base y cobertura final comparables | A1 | Pendiente; si no, TP N/D |
| 17 | P1 | Piso ruido/normalización: probar o desactivar | A1 | Pendiente; método y controles |
| 18 | P1 | Fichas y CSV por sector; gráfico | A2/A3 | Pendiente; valores reales/null |
| 19 | P1 | Modal PDF, biblioteca, contingencia | A3/A6 | Pendiente; docs autorizados |
| 20 | P1 | Foro, reportes, encuestas modo local | A4 | Pendiente; interacciones y aviso |
| 21 | P1 | PHP/MySQL, moderación y pruebas | A4/A5 | Condicionado a hosting/tiempo |
| 22 | P1 | Directorio, eventos, noticias verificadas | A6 | Pendiente; fuentes reales |
| 23 | P1 | OPERA contexto y comparación | A1/A2 | Condicionado a datos |
| 24 | P1 | Motion y accesibilidad | A3/A5 | Pendiente; reduced motion y móvil |
| 25 | P2 | Más parejas, evidencia E2/E3, tendencias | A1 | Futuro/condicionado |
| 26 | P2 | Reporte PDF generado, imágenes ciudadanas | A4 | Futuro; seguridad/licencias |
| 27 | P2 | Automatización, multi-país, gobiernos, agricultura | Equipo | Roadmap, no implementado |
| 28 | P0 | Confirmar envío y guardar evidencia | Líder | Pendiente; confirmación NASA |

Plantilla para `PROGRESS.md`:

```markdown
## Actualización YYYY-MM-DD HH:mm (HN)
- ID / responsable:
- Estado:
- Resultado comprobable (ruta, commit, captura, ID de escena):
- Datos reales / demo / sin evaluación:
- Problema o bloqueo:
- Próxima decisión y fecha límite:
- Cambios a alcance / impacto en presentación:
```

### 16.3 Registro inicial de decisiones y riesgos

| Decisión | Estado |
|---|---|
| Distrito Central como piloto | Confirmado en mensaje reciente |
| Marca BosqueVivo HN, FOREST-SAR motor | Propuesta, aprobar equipo |
| Corte alto 18% en semáforo TP | Propuesta basada en mensaje reciente; documento usa 20% |
| NISAR real como núcleo, OPERA complemento | Adoptado |
| Pipeline offline y frontend estático | Recomendación técnica adoptable |
| PHP/MySQL solo si plan y seguridad lo permiten | Condicional |
| Geometrías de barrio/La Tigra no inventadas | Requisito |
| Hora de cierre 17:00 vs 23:59 | Bloqueo, confirmar; meta 16:00 |

Riesgos: datos pesados/incompatibles → A/B/C; ausencia de base vegetal → TP N/D; límite municipal ausente → área piloto no oficial; DNS/hosting → publicación alternativa; backend vulnerable → modo demo local; alcance excesivo → congelar y recortar P1/P2; licencia faltante → retirar recurso; fecha de presentación → confirmar y adelantar; resultados sobreinterpretados → revisión científica independiente. No ocultar estas limitaciones a jueces.

## 17. Presentación, rúbrica y referencias

### 17.1 Demostración de 7 diapositivas (recomendación)

1. **Title:** BosqueVivo HN / FOREST-SAR, reto y equipo.
2. **The problem:** necesidad de entender cambios en Distrito Central; no citar cifra forestal no verificada. Si se usa dato GFW/ICF, fuente, período, definición y verificación directa.
3. **Our solution:** cuatro pasos de coreografía.
4. **NASA data at the core:** NISAR L2 GCOV, IDs reales, fechas, polarización, QA; OPERA y máscara externa separadas.
5. **Live prototype:** captura real del mapa/comparador/ficha y flujo.
6. **Why it is reliable:** limitaciones, calidad, umbral experimental, qué está real y qué falta.
7. **Impact and next steps:** ciudadanía/técnicos, verificación, despliegue, replicabilidad y futuro.

Alternativa video <=30 segundos con subtítulos EN si audio ES. Guion sugerido, adaptar solo a lo implementado: 0–4 s problema; 4–9 s NISAR; 9–18 s comparar/mapa; 18–24 s ficha y verificación; 24–30 s impacto y expansión. No dedicar 30 s a animaciones intro. El sitio público no reemplaza demo corta obligatoria.

### 17.2 Rúbrica (1–5 cada criterio)

| Criterio | Evidencia que debemos mostrar |
|---|---|
| Impacto | Usuario técnico/ciudadano, caso local, acción concreta de verificación |
| Creatividad | Coreografía de cuatro pasos, visual claro y conexión comunidad-ciencia |
| Validez | Pareja real, método reproducible, unidades, QA y límites, interfaz usable |
| Relevancia | NISAR es insumo principal, no un logo o enlace; OPERA complementa |
| Presentación | Historia, demo pública, inglés, capturas y navegación sin errores |

No afirmar que un premio o nominación está garantizado. Priorizar relevancia/validez frente a cantidad de módulos.

### 17.3 Envío y uso de SI/IA

Según documentos aportados: todos miembros registrados en mismo evento y dentro de límite de seis, mínimo uno local/dos universal; completar campos obligatorios; resumen, detalle, enlace final público, enlace demo público (máx 7 diapositivas incluidas intro y título o video <=30 s), idioma inglés en envío y materiales enlazados, video ES permitido con subtítulos EN, referencias completas y permisos, aceptar casillas de elegibilidad/originalidad. Verificar plazo con líder y formulario, incluida política de elegibilidad del evento. Nominados globales indicados 3/12/2026. Confirmar envío real antes del cierre.

La guía compartida de 2026 llama SI (Super Intelligence) a herramientas de IA. Permite acelerar código, documentación, prototipos y creatividad; no sustituir la idea del equipo ni inventar resultados. Declarar dónde/cómo se usó ChatGPT, agentes, herramientas de código, texto, datos o imágenes. Según documento, imágenes/videos generados por SI requieren marca visible; audio generado debe reconocerse en texto y metadatos; código/datos generados deben reconocerse en descripción/metadatos. No usar/modificar marcas/logos NASA mediante contenido generado; no sugerir que NASA avala el producto. Revisar la guía oficial y registrar todas las atribuciones/licencias de código, fuentes, fotos, basemap, gráficos y datos. El equipo humano debe revisar y verificar la entrega.

Texto base en inglés (editar según resultado; no presentar futuro como real):

> BosqueVivo HN is a prototype designed to help people understand vegetation changes in Honduras' Central District through NASA–ISRO NISAR radar observations. Its four-step workflow connects acquisition compatibility, radar-change analysis, interactive maps, and field-verification guidance. The interface separates measured observations, experimental candidate-change indicators, and community reports. The pilot is designed to support—not replace—scientific review and local decision-making. [Insert actual datasets, implemented features, dates and limitations before submission.]

Ejemplo declaración SI en inglés (adaptar a uso real): `Our team defined the environmental problem and the four-step workflow. We used ChatGPT and coding agents to assist with planning, interface prototyping, code implementation/debugging and documentation. Team members reviewed the output, verified source data and tested the application. Any generated illustrative assets are labeled; no synthetic values are represented as NISAR observations.`

### 17.4 Fuentes de referencia y evidencias pendientes

**Materiales del equipo (revisados):** los cinco documentos/archivos indicados en 1.3 y la propuesta escrita más reciente. El archivo RAR es una versión antigua de página mapa; no representa toda la plantilla nueva. No hay granulos NISAR, polígonos oficiales, datos de cobertura inicial/final ni configuración GoDaddy adjuntos verificados. La estadística GFW/El Heraldo de la idea (6.7 a 5.3 millones ha, 20.9%) requiere confirmación primaria y reconciliar discrepancias; no usar en presentación sin verificar definición y período.

**Recursos oficiales/técnicos (consulta documental):**

- Reto/guía de envío: https://www.spaceappschallenge.org/resources/project-submission-guide/#project-submission-start-end-times
- Judging & Awards Guide: https://www.spaceappschallenge.org/resources/judging-awards-guide/
- NISAR GCOV ASF: https://nisar-docs.asf.alaska.edu/gcov/
- NISAR ASF acceso: https://nisar-docs.asf.alaska.edu/ (usar navegación Accessing NISAR Data / Available Data / Metadata)
- NISAR forest disturbance (referencia del equipo): https://assets.science.nasa.gov/content/dam/science/missions/nisar/nisar-jpl/pdf/NISAR_Applications_Timber_and_Forest_Disturbance.pdf
- ASF Vertex: https://search.asf.alaska.edu/
- Earthdata Search: https://search.earthdata.nasa.gov/
- Earthaccess búsqueda y autenticación: https://earthaccess.readthedocs.io/en/stable/user/explanation/search/ ; https://earthaccess.readthedocs.io/en/stable/user/explanation/authenticate/
- NASA OPERA recursos: https://www.earthdata.nasa.gov/data/projects/opera/data-access-tools
- JPL OPERA productos: https://www.jpl.nasa.gov/go/opera/products/
- HLS / OPERA-DIST: https://hls.gsfc.nasa.gov/data-products/
- NASA ARSET: https://appliedsciences.nasa.gov/what-we-do/capacity-building/arset
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- Global Forest Watch Honduras (contexto externo): https://www.globalforestwatch.org/dashboards/country/HND/
- GoDaddy cPanel componentes: https://www.godaddy.com/help/which-components-does-my-hosting-support-5614
- GoDaddy importar MySQL: https://www.godaddy.com/help/import-a-mysql-database-in-web-hosting-cpanel-41371
- Leaflet documentación: https://leafletjs.com/reference.html
- WCAG: https://www.w3.org/TR/WCAG22/

Antes de entrega, `REFERENCES.md` debe listar **solo recursos realmente utilizados** con autor, título, URL, versión, fecha de acceso y licencia/atribución aplicable. Añadir granulos reales, fuente de límites, datos auxiliares, librerías y assets. Las fuentes sugeridas no prueban que se hayan descargado escenas.

## 18. Visión de crecimiento y hoja de ruta

**Fase 1 — Hackathon:** piloto DC, una comparación real, sectores, ficha, visualización y comunidad de prototipo. **Fase 2 — Validación local:** series multitemporales, calibración, comparación óptica/campo, línea base oficial, evaluación de falsos positivos y errores, accesibilidad con usuarios reales, acuerdos con técnicos/ONG. **Fase 3 — Operación Honduras:** nuevos municipios, automatización de catálogos/colas de procesamiento, PostgreSQL/PostGIS u otra BD espacial si escala, almacenamiento de objetos/COG, autenticación/roles, moderación, auditoría, monitoreo, copias de seguridad, disponibilidad, política de datos. **Fase 4 — Internacional:** instancia por país o configuración multi-territorio, idiomas, límites y unidades locales, adaptadores por sensor, catálogos y políticas legales/contextuales por jurisdicción. No desplegar misma calibración de bosque a todos los ecosistemas sin validar.

Para replicabilidad, cada territorio tiene `territory_id`, geometría, CRS de análisis, catálogo, fuentes locales, idioma, configuración de umbrales y versión científica; frontend y pipeline no contienen coordenadas/umbrales duplicados. En futuro rutas por país (`/hn/...`, `/gt/...`), separación de datos/permisos, estadísticas comparables con definiciones armonizadas. Un portal global podrá enlazar instancias y mostrar métricas verificadas; no afirmar una implementación mundial ya hecha.

Agricultura: combinar observaciones de superficie con lluvia, clima, suelo, mapas de cultivo, calendarios y validación agronómica. Recomendaciones específicas de siembra o riego requieren estudios locales y responsables expertos. Incendios: integrar fuentes oficiales de focos/alertas y protocolos acordados, nunca deducir emergencia de pérdida candidata. Gobierno/ONG: pilotos, acuerdos, revisión de campo, gobernanza, privacidad y responsabilidad antes de adoptar como sistema operativo. La plataforma complementa, no reemplaza, autoridades ni expertos.

## 19. Instrucciones maestras para agentes (copiar al repo)

> Actúa como un equipo de desarrollo que implementa la idea original de nuestros participantes. Lee este documento, el repositorio actual y los archivos científicos que se entreguen. El tiempo de hackathon es limitado: prioriza la ruta P0 (datos NISAR verificables, mapa/comparador, métricas correctas o no disponibles, fichas, navegación, despliegue y demo). Conserva el diseño editorial y el motion de la plantilla, no reconstruyas todo con otro framework si ya funciona. Implementa vistas reales, no una sola landing, con interfaz accesible, responsive, idioma inglés completo y español para Honduras. Usa archivos JSON/GeoJSON/raster preprocesados y no ejecutes HDF5 en cada visita. Mantén datos reales y simulados separados, documenta fuentes, evita valores inventados, no etiquetes cambio radar como tala confirmada. Implementa comunidad básica local y, solo con hosting confirmado y controles de seguridad, API PHP/MySQL portable. Respeta privacidad y moderación; no hagas alertas oficiales. Publica primero versión estática estable y prueba en móvil/incógnito. Cada tarea debe terminar con prueba y evidencia en PROGRESS.md; deja bloqueos explícitos, no digas que algo funciona sin comprobarlo. El equipo humano revisará ciencia, textos y envío. No esperes aprobación para ajustes menores, pero no cambies alcance, umbrales científicos, fuente o decisiones de seguridad sin documentarlo. No solicites credenciales en chat ni las incluyas en código. No despliegues cambios en el dominio sin autorización del responsable.

### Primera salida esperada de cada agente (antes de codificar más de lo necesario)

- A1: `data-inventory.md` con granulos reales, pares, cobertura, producto, plan A/B/C y tiempos de procesamiento medidos, no inventados.
- A2: contrato GeoJSON/layers, mapa mínimo y evidencia de alineación y sectores.
- A3: auditoría del repo actual, rutas funcionales y estilo preservado, plan de componentes, shell y observatorio primero.
- A4: adaptador local funcional y plan de API si hosting confirmado; esquema y pruebas de moderación.
- A5: URL de prueba, checklist de hosting, QA y rollback; documentar bloqueos.
- A6: fuentes y materiales en inglés, historia y demo basadas en funciones reales; declaración SI.

**Último principio:** la mejor entrega no es la que promete más, sino la que muestra un dato real, una interacción clara, un resultado defendible y una acción útil. Todo lo que exceda ese núcleo debe quedar como demostración etiquetada o trabajo futuro.
