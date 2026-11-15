# Publicar FOREST_SAR_HN en el hosting (GoDaddy, cPanel/Apache)

Sitio 100 % estático: no necesita backend, base de datos, Node en el servidor ni el token Earthdata.
Las rutas usan `#/` (p. ej. `/#/observatory`), así que no hace falta configurar reescrituras.

## 1. Generar la versión publicable (en tu PC)
```
npm run typecheck
npm run build:publish
```
`build:publish` ejecuta `vite build` y luego `scripts/prepare-dist.mjs`, que trabaja solo sobre `dist/`:
- copia únicamente los snapshots que el sitio carga (manifest + comparaciones del índice); los excluidos o duplicados quedan en `public/data` como registro, pero no se suben;
- **se detiene con error** si encuentra en `dist/` archivos `.env`, `.netrc`, `.h5`, `.tif`, `.log`, `.py`, `.map`, tokens o rutas de tu PC;
- escribe `dist/.htaccess` (tipos MIME para `.geojson`, caché larga para `assets/`, sin listado de carpetas).

Debe terminar con `prepare-dist: OK — N files, X MB`. Si falla, no publiques.

Prueba local opcional: `npm run preview -- --host 127.0.0.1 --port 4173` y abre http://127.0.0.1:4173/.

## 2. Subir
1. En GoDaddy → cPanel → **Administrador de archivos** → `public_html/` (o la subcarpeta del dominio/subdominio).
2. Haz una copia de lo que haya (descarga o renómbralo) antes de reemplazar.
3. Sube **el contenido** de `dist/` (no la carpeta `dist` en sí): `index.html`, `.htaccess`, `assets/`, `data/`.
   Lo más rápido: comprime el contenido de `dist/` en un .zip, súbelo y usa "Extraer".
4. Activa "Mostrar archivos ocultos" para comprobar que `.htaccess` quedó subido.
5. Funciona igual en una subcarpeta (`dominio.com/forest/`) porque la base es relativa.

## 3. Comprobar en el dominio
- `https://tu-dominio/` carga la portada; `#/observatory` muestra el mapa satelital con zonas.
- `https://tu-dominio/data/snapshots/index.json` responde JSON (no 404).
- Cambiar de período actualiza mapa y `#/analytics`.
- Activa HTTPS (certificado SSL de GoDaddy) antes de compartir el enlace: los mapas base se cargan por HTTPS.

## 4. Proveedores de mapas y licencias (revisar antes de publicar)
| Capa | Proveedor | Condición |
|---|---|---|
| Satelital (por defecto) | Esri World Imagery | Atribución visible (incluida). Revisar términos de uso de Esri para uso público no comercial. |
| Relieve | OpenTopoMap | CC-BY-SA, atribución incluida; servidor voluntario, uso moderado. |
| OpenStreetMap | tile.openstreetmap.org | Atribución incluida; política de uso de teselas de OSMF (sin uso intensivo). |
| Capas NASA | NASA GIBS | Datos abiertos NASA, sin token. |
| Lugares | OpenStreetMap (Overpass) | ODbL, atribución en Biblioteca/Metodología. |
| Radar | NASA-ISRO NISAR L2 GCOV (provisional) | Procesado por FOREST-SAR; resultados exploratorios. |

## 5. Actualizar con nuevos datos
Tras procesar nuevas parejas con el motor (en tu PC, con `EARTHDATA_TOKEN` en el entorno), repite los pasos 1–2.
Solo cambian `data/` y `index.html`/`assets/`; el token nunca forma parte de `dist/`.

No se ha hecho deploy, push ni cambios DNS: estos pasos los ejecuta el propietario.
