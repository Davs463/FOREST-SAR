import * as L from 'leaflet';
import type { MapLayerDef } from '../../config/mapLayers.config';

/** 'none' = the official layer has no imagery for this date (option must be disabled). */
export function layerCoverage(def: MapLayerDef, date: string | null): 'ok' | 'none' {
  if (def.time.mode === 'none') return 'ok';
  if (!date) return 'none';
  const day = date.slice(0, 10);
  const { start, end, available } = def.time;
  if (start && day < start) return 'none';
  if (end && day > end) return 'none';
  if (available && !available.includes(day)) return 'none';
  return 'ok';
}

/** Generic tile layer factory for xyz and WMS definitions (time from the pair date when required). */
export function buildTileLayer(def: MapLayerDef, date: string | null, pane?: string): L.TileLayer {
  const day = date ? date.slice(0, 10) : null;
  const common: L.TileLayerOptions = { attribution: def.attribution, maxNativeZoom: def.maxNativeZoom, maxZoom: 18, pane };
  if (def.kind === 'wms') {
    const params: L.WMSOptions & Record<string, unknown> = {
      ...common,
      layers: def.wmsLayer ?? '',
      format: def.format ?? 'image/png',
      transparent: def.transparent ?? false,
      version: '1.3.0',
    };
    if (def.time.mode === 'pairDate' && day) params.TIME = day;
    return L.tileLayer.wms(def.url, params);
  }
  const url = day ? def.url.replace('{time}', day) : def.url;
  return L.tileLayer(url, common);
}
