/**
 * Base maps and optional official NASA imagery layers for the observatory map.
 * NASA layers are OFFICIAL IMAGERY served by NASA GIBS; they are never FOREST-SAR results.
 * Identifiers, formats, matrix sets and date coverage must come from GIBS GetCapabilities
 * (see docs/PROGRESS.md, lote G1) — never guessed.
 */

export type LayerTime =
  | { mode: 'none' }
  /** Pick a date from the selected pair (initial or final), clamped to [start, end] if known. */
  | { mode: 'pairDate'; start: string | null; end: string | null; available: readonly string[] | null };

export interface MapLayerDef {
  id: string;
  /** i18n keys under observatory.layers.* are resolved by the UI; this is a fallback label. */
  label: { en: string; es: string };
  description: { en: string; es: string };
  /** Leaflet tile/WMS template. */
  kind: 'xyz' | 'wms';
  url: string;
  /** WMS layer name (kind: 'wms'). */
  wmsLayer?: string;
  format?: 'image/png' | 'image/jpeg';
  transparent?: boolean;
  maxNativeZoom: number;
  attribution: string;
  /** true = official NASA product (shown with a "NASA official imagery" badge). */
  official: boolean;
  /** 'base' replaces the base map; 'overlay' draws over it. */
  role: 'base' | 'overlay';
  time: LayerTime;
}

export const OSM_LAYER: MapLayerDef = {
  id: 'osm',
  label: { en: 'OpenStreetMap', es: 'OpenStreetMap' },
  description: { en: 'Street map (OpenStreetMap).', es: 'Mapa de calles (OpenStreetMap).' },
  kind: 'xyz',
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxNativeZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  official: false,
  role: 'base',
  time: { mode: 'none' },
};

export const SATELLITE_LAYER: MapLayerDef = {
  id: 'satellite',
  label: { en: 'Satellite', es: 'Satelital' },
  description: { en: 'Satellite imagery (Esri World Imagery). Not a FOREST-SAR result.', es: 'Imágenes satelitales (Esri World Imagery). No es un resultado de FOREST-SAR.' },
  kind: 'xyz',
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maxNativeZoom: 19,
  attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  official: false,
  role: 'base',
  time: { mode: 'none' },
};

export const RELIEF_LAYER: MapLayerDef = {
  id: 'relief',
  label: { en: 'Terrain', es: 'Relieve' },
  description: { en: 'Topographic map with contour lines (OpenTopoMap).', es: 'Mapa topográfico con curvas de nivel (OpenTopoMap).' },
  kind: 'xyz',
  url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  maxNativeZoom: 17,
  attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
  official: false,
  role: 'base',
  time: { mode: 'none' },
};

/**
 * NASA GIBS WMS, EPSG:3857 "best" endpoint (public, no Earthdata token needed).
 * Verified 2026-11-15 against GetCapabilities (WMS 1.3.0, formats image/png and image/jpeg, CRS EPSG:3857)
 * and by GetMap probes over the study window (EPSG:3857 bbox -9723729,1574619,-9690334,1614956):
 *   NISAR_L2_Geocoded_Polarimetric_Covariance  2026-10-07 data · 2026-10-19 data · 2026-10-08 empty
 *   VIIRS_NOAA20_CorrectedReflectance_TrueColor 2026-10-07 data (cloudy) · 2026-10-19 data
 *   HLS_S30_Nadir_BRDF_Adjusted_Reflectance     2026-10-07 data (mostly clear) · 2026-10-19 empty
 * `available` lists ONLY the pair dates verified to contain imagery over the study window; any other
 * date is shown as "no NASA coverage for this date". Re-probe when a new pair is published.
 */
const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
const GIBS_ATTRIBUTION = 'Imagery: <a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api">NASA GIBS</a> / ESDIS';

export const NASA_LAYERS: MapLayerDef[] = [
  {
    id: 'gibs-nisar-gcov',
    label: { en: 'NISAR radar (official NASA mosaic)', es: 'Radar NISAR (mosaico oficial NASA)' },
    description: {
      en: 'NISAR L2 GCOV daily mosaic, false-colour RGB of radar backscatter (green = cross-pol HV, red/blue = co-pol). Official NASA visualisation, not a FOREST-SAR result.',
      es: 'Mosaico diario NISAR L2 GCOV, RGB en falso color de la retrodispersión radar (verde = polarización cruzada HV, rojo/azul = copolarizada). Visualización oficial de NASA, no es un resultado de FOREST-SAR.',
    },
    kind: 'wms',
    url: GIBS_WMS,
    wmsLayer: 'NISAR_L2_Geocoded_Polarimetric_Covariance',
    format: 'image/png',
    transparent: true,
    maxNativeZoom: 13,
    attribution: GIBS_ATTRIBUTION,
    official: true,
    role: 'base',
    time: { mode: 'pairDate', start: '2025-10-29', end: '2026-11-13', available: ['2026-10-07', '2026-10-19'] },
  },
  {
    id: 'gibs-hls-s30',
    label: { en: 'Natural colour, 30 m (HLS Sentinel-2)', es: 'Color natural, 30 m (HLS Sentinel-2)' },
    description: {
      en: 'Harmonized Landsat Sentinel-2 (S30) surface reflectance in natural colour. Only available on dates when the satellite passed over the area.',
      es: 'Reflectancia de superficie Harmonized Landsat Sentinel-2 (S30) en color natural. Solo disponible en fechas en que el satélite pasó sobre la zona.',
    },
    kind: 'wms',
    url: GIBS_WMS,
    wmsLayer: 'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',
    format: 'image/png',
    transparent: true,
    maxNativeZoom: 13,
    attribution: GIBS_ATTRIBUTION,
    official: true,
    role: 'base',
    time: { mode: 'pairDate', start: '2015-11-28', end: '2026-11-07', available: ['2026-10-07'] },
  },
  {
    id: 'gibs-viirs-truecolor',
    label: { en: 'Natural colour, daily (VIIRS NOAA-20)', es: 'Color natural, diario (VIIRS NOAA-20)' },
    description: {
      en: 'VIIRS NOAA-20 corrected reflectance, true colour, about 375 m resolution. Daily, but clouds often cover the area.',
      es: 'Reflectancia corregida VIIRS NOAA-20 en color verdadero, unos 375 m de resolución. Diaria, pero las nubes suelen cubrir la zona.',
    },
    kind: 'wms',
    url: GIBS_WMS,
    wmsLayer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
    format: 'image/jpeg',
    transparent: false,
    maxNativeZoom: 9,
    attribution: GIBS_ATTRIBUTION,
    official: true,
    role: 'base',
    time: { mode: 'pairDate', start: '2018-01-05', end: '2026-11-15', available: ['2026-10-07', '2026-10-19'] },
  },
];

export const MAP_LAYERS: MapLayerDef[] = [SATELLITE_LAYER, RELIEF_LAYER, OSM_LAYER, ...NASA_LAYERS];

/** Default base map: satellite imagery, where zone outlines read best. */
export const DEFAULT_BASE_ID = SATELLITE_LAYER.id;
