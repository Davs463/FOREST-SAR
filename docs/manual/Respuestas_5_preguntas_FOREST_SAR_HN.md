# Respuestas del formulario — FOREST_SAR_HN

Textos listos para pegar. Enlace público: [enlace público pendiente]. Integrantes: [completar].

## ¿Qué hace o cómo funciona?

FOREST_SAR_HN es un observatorio web que muestra dónde disminuyó la señal del radar del satélite NISAR (NASA e ISRO) entre dos fechas, sobre una ventana de estudio provisional en Honduras. Funciona en dos partes separadas.

La primera es un motor científico en Python que se ejecuta en el computador del equipo. Consulta el catálogo público de NASA (CMR), elige parejas de escenas NISAR L2 GCOV de la misma órbita (track 98, frame 81, descendente, banda L, polarización HVHV), descarga solo el recorte necesario con Harmony y calcula el cambio. Promedia la señal en celdas de 100 m (1 hectárea), calcula la diferencia en decibelios y marca como candidatas las celdas que bajaron 3 dB o más. Las celdas cercanas se agrupan en zonas. Todo se guarda como archivos versionados con sus identificadores y fechas.

La segunda es una aplicación web en React que solo lee esos archivos y los muestra: mapa con zonas y burbujas, períodos de 12 días, 1, 2 y 3 meses, indicadores, vista de evolución, descarga de CSV, biblioteca, metodología y datos técnicos. No exige cuenta ni claves y está en español e inglés.

Hoy hay cuatro comparaciones procesadas, todas con fecha final 2026-10-19 (de 17 a 165 hectáreas candidatas). Mide un cambio de retrodispersión radar; no identifica deforestación ni causas.

## ¿Qué beneficios tiene?

**Beneficios demostrados.** Ya existe un flujo completo con datos reales de NISAR: 52 escenas catalogadas, 1 326 parejas evaluadas (162 compatibles) y cuatro comparaciones publicadas con identificadores, fechas y métricas. El observatorio es público, no requiere cuenta y muestra los resultados en mapas, indicadores y gráficos, con CSV descargables. Es transparente: cada cifra indica fuente, umbral y limitaciones, y hay páginas de metodología y datos técnicos. Es verificable: 45 pruebas de Python y 142 pruebas de interfaz aprobadas, y una versión de publicación comprobada. Al ser un sitio estático, no necesita servidor, base de datos ni credenciales, por lo que su costo de operación es bajo.

**Beneficios potenciales (todavía no demostrados).** Podría orientar a comunidades y docentes sobre dónde conviene mirar con otras fuentes o en campo, servir como material educativo para entender el radar SAR y, con más observaciones y validación en terreno, apoyar una futura vigilancia del cambio de cobertura. Estos beneficios dependen de datos y validación que aún no existen.

Un candidato es una disminución de retrodispersión radar, no deforestación confirmada, y el proyecto no emite alertas oficiales.

## ¿Cuál es el impacto previsto del proyecto?

**Ambiental.** Hace más visible dónde cambia la señal del radar sobre el paisaje, como invitación a revisar con imágenes ópticas, información local o visitas de campo. No cuantifica pérdida de bosque ni identifica causas.

**Social.** Acerca datos satelitales abiertos a personas sin formación técnica: textos sencillos, español e inglés, sin cuenta, y una sección comunitaria de demostración para imaginar conversaciones sobre el territorio.

**Tecnológico.** Muestra un flujo abierto y reproducible: datos públicos de NASA, procesamiento en Python y publicación estática. Cada paso está documentado y probado, y el patrón puede repetirse en otras ventanas de estudio.

**A largo plazo.** Si se incorporan más observaciones NISAR, la vista de evolución podrá mostrar series más largas, y con validación externa podría apoyar procesos locales de observación del territorio.

**Lo que no prometemos.** El proyecto no tiene convenios con instituciones, no emite alertas oficiales, no predice cambios y no hace monitoreo automático: por ahora los datos se procesan y publican manualmente. Presentamos un prototipo exploratorio cuyas cifras (por ejemplo, 165 ha candidatas en 84 días) deben leerse como pistas, no como conclusiones.

## ¿Qué herramientas, lenguajes de codificación, hardware o software utilizó para desarrollar su proyecto?

**Lenguajes:** TypeScript, JavaScript, Python 3.12, CSS y HTML.

**Aplicación web:** React 19, Vite 8, Leaflet 1.9.4 (mapas) y lucide-react (iconos).

**Motor científico (Python):** earthaccess y harmony-py (acceso a NASA Earthdata y recortes), numpy, rasterio, h5py, shapely y requests.

**Pruebas y construcción:** pytest, Playwright (con Chrome del sistema), comprobación de tipos de TypeScript, Node.js, npm y esbuild.

**Datos y servicios:** NASA Earthdata, CMR, Harmony, ASF DAAC, producto NISAR L2 GCOV, GIBS/Worldview, OpenStreetMap/Overpass (licencia ODbL), Esri World Imagery y OpenTopoMap.

**Entorno:** Git en una rama local y Visual Studio Code con la extensión Claude Code.

**Hardware:** computadoras personales del equipo y conexión a Internet. El satélite NISAR es una misión de NASA e ISRO que no construimos nosotros; usamos sus datos públicos.

**Inteligencia artificial:** Claude Code (Opus 5.5 como coordinador, Sonnet 5.5 como agentes y Haiku 5.5 para documentación) y OpenAI Codex como agente de relevo, siempre con revisión humana. El sitio y el motor no usan IA en tiempo de ejecución y ninguna imagen fue generada por IA.

## ¿Cómo es creativo tu proyecto?

La creatividad de FOREST_SAR_HN está en cómo integra y presenta información existente. No inventamos el radar SAR ni la misión NISAR, que son de NASA e ISRO; lo que hicimos fue convertir datos técnicos en una experiencia que una persona de la comunidad pueda entender.

Traducimos decibelios y retrodispersión a preguntas cotidianas: ¿dónde bajó la señal?, ¿cuánto?, ¿qué no sabemos? Diseñamos la honestidad como parte de la interfaz: el semáforo dice "No evaluado" cuando faltan datos, el mapa advierte que la imagen de fondo no es de la fecha observada y cada cifra lleva sus límites. Unimos en una sola pantalla, en tres pasos (elegir período, explorar el mapa, entender los resultados), datos de NISAR, capas de contexto de NASA GIBS y mapas abiertos de OpenStreetMap, con burbujas que agrupan zonas y búsqueda local de lugares.

También hicimos el procesamiento abierto, versionado y probado para que otras personas puedan repetirlo, y propusimos un espacio comunitario para contrastar la señal satelital con el conocimiento de quienes viven en el territorio. Todas las ilustraciones son originales (SVG y CSS) y no se usaron imágenes generadas por IA.
