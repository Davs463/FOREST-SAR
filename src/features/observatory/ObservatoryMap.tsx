import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapLayerDef } from '../../config/mapLayers.config';
import type { BBox, CandidateCell, LatLngBounds, PolyGeometry, Scene, Sector, Zone } from '../../shared/science.types';
import { MAP_COLORS, RADAR_CLASS_COLORS, ZONE_FILL_OPACITY, ZONE_NODATA_DASH } from '../../config/mapColors';
import { RADAR_CLASS_ORDER, classifyDelta, type RadarClass } from '../../shared/radarClasses';
import { buildTileLayer } from './basemap';
import { POLYGON_ZOOM, clusterZones, unionBBox, type ZoneCluster } from './clusters';
import { geometryBounds } from './geo';
import type { PlaceFocus } from './PlaceSearch';

/** Intensity key of a zone: its radar class, or 'noData' when there is no mean change value. */
export type IntensityKey = RadarClass | 'noData';

/** What the map is drawing right now, so the legend only lists visible layers. */
export interface ZoneView {
  clusters: number;
  polygons: number;
  classes: IntensityKey[];
}

export const zoneIntensity = (zone: Zone, thresholdDb?: number): IntensityKey => classifyDelta(zone.mean_delta_db, thresholdDb) ?? 'noData';

export interface MapOverlay {
  url: string;
  bounds: LatLngBounds;
}

/** A tile/WMS definition plus the pair date shown on the left/right of the swipe divider (equal when not comparing). */
export interface TileSelection {
  def: MapLayerDef;
  left: string | null;
  right: string | null;
}

interface Props {
  bbox: BBox | null;
  scenes: Scene[];
  sectors: Sector[];
  selectedSectorId: string | null;
  highlightIds: ReadonlySet<string>;
  sectorLabels: ReadonlyMap<string, string>;
  onSelectSector: (id: string) => void;
  /** Candidate zones (derived products); empty when not published. */
  zones: Zone[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
  zoneTip: (zone: Zone) => string;
  zonePopup: (zone: Zone) => { title: string; lines: string[] };
  /** Published detection threshold (dB) used for the intensity class. */
  thresholdDb?: number;
  /** A bubble was clicked: the ids of the zones it groups (the map also zooms to them). */
  onSelectCluster: (zoneIds: string[]) => void;
  /** Ask the map to zoom to these zones (the nonce makes repeated requests fire again). */
  zoomTo: { ids: string[]; nonce: number } | null;
  onZoneView: (view: ZoneView) => void;
  clusterAria: (count: number) => string;
  /** Outline of the area with valid data; replaces the study-window rectangle as the main frame. */
  validArea: PolyGeometry | null;
  showWindow: boolean;
  /** 100 m candidate cells (advanced layer); null = layer off. */
  cells: CandidateCell[] | null;
  /** Place found with the search box. */
  focus: PlaceFocus | null;
  /** Single radar layer (ignored while `compare` is set). */
  radar: MapOverlay | null;
  compare: { before: MapOverlay; after: MapOverlay } | null;
  quality: MapOverlay | null;
  /** 0..1 opacity of the radar layer(s); never touches base maps. */
  opacity: number;
  showFootprints: boolean;
  showGrid: boolean;
  base: TileSelection;
  officialOverlay: TileSelection | null;
  onTileFailure: (id: string) => void;
  labels: {
    window: string; footprint: string; map: string; unavailable: string; overlayError: string;
    before: string; after: string; divider: string;
  };
  children?: ReactNode;
}

const HONDURAS_CENTER: L.LatLngExpression = [14.1, -87.2];
const PANES: Record<string, number> = {
  fsBase: 200, fsBaseL: 201, fsBaseR: 202, fsOver: 300, fsOverL: 301, fsOverR: 302,
  fsRadar: 350, fsRadarL: 351, fsRadarR: 352, fsQuality: 360,
  fsCells: 380, fsFrame: 410, fsSectors: 420, fsZones: 430, fsClusters: 435, fsFocus: 440,
};
const CLUSTER_DEBOUNCE_MS = 80;
const ZONE_MAX_FOCUS_ZOOM = 17;
const LEFT_PANES = ['fsBaseL', 'fsOverL', 'fsRadarL'];
const RIGHT_PANES = ['fsBaseR', 'fsOverR', 'fsRadarR'];
const TILE_FAILURE_LIMIT = 4;
const QUALITY_OPACITY = 0.55;
const CANDIDATE_RED = '#e62814';
const FOCUS_BLUE = '#1d4ed8';

function mapColors() {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return { forest: read('--forest', '#102820'), moss: read('--moss', '#52796f') };
}

function sectorStyle(kind: 'grid' | 'candidate' | 'selected'): L.PathOptions {
  const c = mapColors();
  if (kind === 'selected') return { color: c.forest, weight: 3, fillColor: c.forest, fillOpacity: 0.12 };
  if (kind === 'candidate') return { color: CANDIDATE_RED, weight: 2, fillColor: CANDIDATE_RED, fillOpacity: 0.12 };
  return { color: c.moss, weight: 1, fillColor: c.moss, fillOpacity: 0.04 };
}

/**
 * Zone styling, identical on every base map: fixed outline + white and dark halos; fill tone = intensity class.
 * Selection only adds a thick cyan halo underneath (fill and outline keep their meaning).
 */
interface ZoneLayers { group: L.LayerGroup; sel: L.GeoJSON; dark: L.GeoJSON; light: L.GeoJSON; main: L.GeoJSON; key: IntensityKey }

function applyZoneStyles(layers: ZoneLayers, selected: boolean): void {
  const weight = selected ? 3.5 : 2.5;
  const noData = layers.key === 'noData';
  layers.sel.setStyle({ color: MAP_COLORS.selection, weight: weight + 9, opacity: selected ? 0.95 : 0, fill: false });
  layers.dark.setStyle({ color: MAP_COLORS.zoneHaloDark, weight: weight + 5, opacity: 0.5, fill: false });
  layers.light.setStyle({ color: MAP_COLORS.zoneHaloLight, weight: weight + 2.5, opacity: 0.9, fill: false });
  layers.main.setStyle({
    color: MAP_COLORS.zoneOutline, weight, opacity: 1,
    dashArray: noData ? ZONE_NODATA_DASH : undefined,
    fillColor: layers.key === 'noData' ? MAP_COLORS.noData : RADAR_CLASS_COLORS[layers.key],
    fillOpacity: noData ? 0.35 : ZONE_FILL_OPACITY,
  });
}

const FRAME_STYLES: { main: L.PathOptions; halo: L.PathOptions } = {
  main: { color: MAP_COLORS.validOutline, weight: 2, fill: false, interactive: false },
  halo: { color: MAP_COLORS.validHalo, weight: 5, opacity: 0.55, fill: false, interactive: false },
};

const feature = (geometry: PolyGeometry) => ({ type: 'Feature', properties: {}, geometry }) as unknown as GeoJSON.Feature;

// Tooltips take a DOM node so dataset strings are never parsed as HTML.
function textNode(text: string): HTMLElement {
  const node = document.createElement('span');
  node.textContent = text;
  return node;
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const bboxToBounds = (bbox: BBox): L.LatLngBoundsExpression => [[bbox[1], bbox[0]], [bbox[3], bbox[2]]];

/** Leaflet map: created once, data layers update in place. Language changes never re-frame it. */
export function ObservatoryMap(props: Props) {
  const { bbox, scenes, sectors, selectedSectorId, highlightIds, sectorLabels, onSelectSector, zones, selectedZoneId, onSelectZone, zoneTip, zonePopup, thresholdDb, onSelectCluster, zoomTo, onZoneView, clusterAria, validArea, showWindow, cells, focus, radar, compare, quality, opacity, showFootprints, showGrid, base, officialOverlay, onTileFailure, labels, children } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const frameGroup = useRef<L.LayerGroup | null>(null);
  const footprintGroup = useRef<L.LayerGroup | null>(null);
  const sectorGroup = useRef<L.LayerGroup | null>(null);
  const zoneGroup = useRef<L.LayerGroup | null>(null);
  const cellGroup = useRef<L.LayerGroup | null>(null);
  const focusGroup = useRef<L.LayerGroup | null>(null);
  const sectorPaths = useRef<Map<string, L.Path>>(new Map());
  const clusterGroup = useRef<L.LayerGroup | null>(null);
  const zonePaths = useRef<Map<string, ZoneLayers>>(new Map());
  const zonesRef = useRef(zones);
  zonesRef.current = zones;
  const lastClusterKey = useRef('');
  const lastViewKey = useRef('');
  const debounceTimer = useRef<number | undefined>(undefined);
  const onSelectClusterRef = useRef(onSelectCluster);
  onSelectClusterRef.current = onSelectCluster;
  const onZoneViewRef = useRef(onZoneView);
  onZoneViewRef.current = onZoneView;
  const clusterAriaRef = useRef(clusterAria);
  clusterAriaRef.current = clusterAria;
  const tileLayers = useRef<L.TileLayer[]>([]);
  const imageLayers = useRef<{ single?: L.ImageOverlay; before?: L.ImageOverlay; after?: L.ImageOverlay; quality?: L.ImageOverlay }>({});
  const onSelectRef = useRef(onSelectSector);
  onSelectRef.current = onSelectSector;
  const onSelectZoneRef = useRef(onSelectZone);
  onSelectZoneRef.current = onSelectZone;
  const zoneTipRef = useRef(zoneTip);
  zoneTipRef.current = zoneTip;
  const zonePopupRef = useRef(zonePopup);
  zonePopupRef.current = zonePopup;
  const labelsRef = useRef(sectorLabels);
  labelsRef.current = sectorLabels;
  const onTileFailureRef = useRef(onTileFailure);
  onTileFailureRef.current = onTileFailure;
  const selectedZoneRef = useRef(selectedZoneId);
  selectedZoneRef.current = selectedZoneId;
  const selectedSectorRef = useRef(selectedSectorId);
  selectedSectorRef.current = selectedSectorId;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [overlayFailed, setOverlayFailed] = useState(false);
  const [split, setSplit] = useState(50);
  const splitRef = useRef(50);
  splitRef.current = split;
  const comparing = compare !== null;
  const comparingRef = useRef(comparing);
  comparingRef.current = comparing;
  // Clip the "after" panes to the right of the divider and the "before" panes to its left.
  const applyClip = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pane = (name: string) => map.getPane(name);
    if (!comparingRef.current) {
      for (const name of [...LEFT_PANES, ...RIGHT_PANES]) pane(name)?.style.removeProperty('clip-path');
      return;
    }
    const size = map.getSize();
    const tl = map.containerPointToLayerPoint([0, 0]);
    const br = map.containerPointToLayerPoint(size);
    const x = tl.x + (splitRef.current / 100) * size.x;
    const pad = 80;
    const top = tl.y - pad;
    const bottom = br.y + pad;
    const left = `polygon(${tl.x - pad}px ${top}px, ${x}px ${top}px, ${x}px ${bottom}px, ${tl.x - pad}px ${bottom}px)`;
    const right = `polygon(${x}px ${top}px, ${br.x + pad}px ${top}px, ${br.x + pad}px ${bottom}px, ${x}px ${bottom}px)`;
    for (const name of LEFT_PANES) pane(name)?.style.setProperty('clip-path', left);
    for (const name of RIGHT_PANES) pane(name)?.style.setProperty('clip-path', right);
  }, []);

  // Zoom to a set of zones; always makes progress (at least one level deeper) unless already at the map's max zoom.
  const zoomToBBox = useCallback((box: BBox) => {
    const map = mapRef.current;
    if (!map || map.getZoom() >= map.getMaxZoom()) return;
    const bounds = L.latLngBounds([box[1], box[0]], [box[3], box[2]]);
    const fit = map.getBoundsZoom(bounds, false, L.point(48, 48));
    const target = Math.min(ZONE_MAX_FOCUS_ZOOM, map.getMaxZoom(), Math.max(fit, map.getZoom() + 1));
    if (reducedMotion()) map.setView(bounds.getCenter(), target, { animate: false });
    else map.flyTo(bounds.getCenter(), target, { duration: 0.6 });
  }, []);

  // Zones are either real polygons (zoom >= POLYGON_ZOOM, lone zones, the selected zone) or count bubbles.
  const refreshZones = useCallback(() => {
    const map = mapRef.current;
    const zg = zoneGroup.current;
    const cg = clusterGroup.current;
    if (!map || !zg || !cg) return;
    const zoom = map.getZoom();
    const selectedId = selectedZoneRef.current;
    const polygons = new Set<string>();
    const bubbles: ZoneCluster[] = [];
    if (zoom >= POLYGON_ZOOM) {
      for (const zone of zonesRef.current) polygons.add(zone.zone_id);
    } else {
      const pool = zonesRef.current.filter((zone) => zone.zone_id !== selectedId);
      if (selectedId) polygons.add(selectedId);
      for (const cluster of clusterZones(pool, (ll) => map.project(ll, zoom))) {
        if (cluster.zones.length === 1) polygons.add(cluster.zones[0].zone_id);
        else bubbles.push(cluster);
      }
    }
    for (const [id, layers] of zonePaths.current) {
      const has = zg.hasLayer(layers.group);
      if (polygons.has(id) && !has) zg.addLayer(layers.group);
      else if (!polygons.has(id) && has) zg.removeLayer(layers.group);
    }
    const key = bubbles.map((c) => c.id).sort().join('|');
    if (key !== lastClusterKey.current) {
      lastClusterKey.current = key;
      cg.clearLayers();
      for (const cluster of bubbles) {
        const count = cluster.zones.length;
        const size = Math.round(Math.min(58, 28 + 7 * Math.log2(count))); // size follows the number of zones, never the area
        const num = document.createElement('span');
        num.className = 'zone-cluster__num';
        num.textContent = String(count);
        num.setAttribute('aria-hidden', 'true');
        const marker = L.marker(cluster.center, { icon: L.divIcon({ html: num, className: 'zone-cluster', iconSize: [size, size] }), pane: 'fsClusters', keyboard: true });
        marker.on('click', () => {
          onSelectClusterRef.current(cluster.zones.map((z) => z.zone_id));
          zoomToBBox(cluster.bbox);
        });
        marker.addTo(cg);
        const el = marker.getElement();
        if (el) {
          el.setAttribute('data-testid', 'zone-cluster');
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', clusterAriaRef.current(count));
        }
      }
    }
    const present = new Set<IntensityKey>();
    for (const id of polygons) { const layers = zonePaths.current.get(id); if (layers) present.add(layers.key); }
    const classes = ([...RADAR_CLASS_ORDER, 'noData'] as IntensityKey[]).filter((k) => present.has(k));
    const viewKey = `${bubbles.length}|${polygons.size}|${classes.join(',')}`;
    if (viewKey !== lastViewKey.current) {
      lastViewKey.current = viewKey;
      onZoneViewRef.current({ clusters: bubbles.length, polygons: polygons.size, classes });
    }
  }, [zoomToBBox]);
  const refreshZonesRef = useRef(refreshZones);
  refreshZonesRef.current = refreshZones;

  // Map lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: L.Map;
    try {
      map = L.map(container, { center: HONDURAS_CENTER, zoom: 8, zoomControl: true });
      for (const [name, z] of Object.entries(PANES)) map.createPane(name).style.zIndex = String(z);
    } catch {
      setFailed(true);
      return;
    }
    mapRef.current = map;
    frameGroup.current = L.layerGroup().addTo(map);
    footprintGroup.current = L.layerGroup();
    sectorGroup.current = L.layerGroup().addTo(map);
    zoneGroup.current = L.layerGroup().addTo(map);
    clusterGroup.current = L.layerGroup().addTo(map);
    cellGroup.current = L.layerGroup().addTo(map);
    focusGroup.current = L.layerGroup().addTo(map);
    map.on('move zoom viewreset resize zoomend moveend', applyClip);
    // Re-cluster after zoom/pan settles (light debounce).
    const scheduleRefresh = () => {
      window.clearTimeout(debounceTimer.current);
      debounceTimer.current = window.setTimeout(() => refreshZonesRef.current(), CLUSTER_DEBOUNCE_MS);
    };
    map.on('zoomend moveend', scheduleRefresh);
    // Exposes the view for tests/automation (and nothing else).
    const publish = () => {
      const c = map.getCenter();
      container.dataset.center = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      container.dataset.zoom = String(map.getZoom());
    };
    map.on('moveend zoomend', publish);
    publish();
    const sectorMap = sectorPaths.current;
    const zoneMap = zonePaths.current;
    setReady(true);
    return () => {
      map.off('move zoom viewreset resize zoomend moveend', applyClip);
      map.off('moveend zoomend', publish);
      map.off('zoomend moveend', scheduleRefresh);
      window.clearTimeout(debounceTimer.current);
      lastClusterKey.current = '';
      lastViewKey.current = '';
      sectorMap.clear();
      zoneMap.clear();
      tileLayers.current = [];
      imageLayers.current = {};
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [applyClip]);

  // Frame to show when nothing is selected: the valid-data area when known, else the study window.
  const fitAll = useCallback((animate: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    if (validArea) map.fitBounds(geometryBounds(validArea), { padding: [24, 24], animate });
    else if (bbox) map.fitBounds(bboxToBounds(bbox), { padding: [24, 24], animate });
  }, [bbox, validArea]);
  const fitAllRef = useRef(fitAll);
  fitAllRef.current = fitAll;

  // Initial frame only when the bbox or the valid area itself changes.
  const bboxKey = bbox ? bbox.join(',') : '';
  // The first frame is not animated: Leaflet ignores zoom requests while a zoom animation runs, so an
  // animated initial fit swallowed the user's first "+" click right after the page loaded.
  const framedOnce = useRef(false);
  useEffect(() => {
    if (!ready) return;
    fitAllRef.current(framedOnce.current && !reducedMotion());
    framedOnce.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, bboxKey, validArea]);

  // Main frame: outline of the area with valid data (halo + line). The study-window rectangle is optional.
  useEffect(() => {
    const g = frameGroup.current;
    if (!ready || !g) return;
    g.clearLayers();
    const styles = FRAME_STYLES;
    if (validArea) {
      L.geoJSON(feature(validArea), { pane: 'fsFrame', style: () => styles.halo, interactive: false }).addTo(g);
      L.geoJSON(feature(validArea), { pane: 'fsFrame', style: () => styles.main, interactive: false }).addTo(g);
    }
    if (bbox && showWindow) {
      const [w, s, e, n] = bbox;
      const corners: L.LatLngBoundsExpression = [[s, w], [n, e]];
      L.rectangle(corners, { pane: 'fsFrame', color: MAP_COLORS.validHalo, weight: 5, opacity: 0.55, fill: false, interactive: false }).addTo(g);
      L.rectangle(corners, { pane: 'fsFrame', color: MAP_COLORS.validOutline, weight: 2, dashArray: '8 6', fill: false, interactive: false }).addTo(g);
    }
  }, [ready, bbox, validArea, showWindow]);

  // Scene footprints: built per scene list, shown only on request.
  useEffect(() => {
    const g = footprintGroup.current;
    if (!ready || !g) return;
    g.clearLayers();
    const colors = mapColors();
    for (const scene of scenes) {
      if (!scene.footprint) continue;
      const polygon = L.polygon(scene.footprint, { pane: 'fsFrame', color: colors.moss, weight: 1, fillOpacity: 0.04 });
      polygon.bindTooltip(textNode(`${labels.footprint}: ${scene.id}`), { sticky: true });
      polygon.addTo(g);
    }
  }, [ready, scenes, labels.footprint]);
  useEffect(() => {
    const map = mapRef.current;
    const g = footprintGroup.current;
    if (!ready || !map || !g) return;
    if (showFootprints) g.addTo(map);
    else g.remove();
  }, [ready, showFootprints]);

  // Base / official-imagery tiles: rebuilt only when the selection (layer or dates) changes.
  const tileKey = [base.def.id, base.left, base.right, officialOverlay?.def.id, officialOverlay?.left, officialOverlay?.right, comparing].join('|');
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    for (const layer of tileLayers.current) layer.remove();
    tileLayers.current = [];
    const add = (sel: TileSelection, prefix: 'fsBase' | 'fsOver') => {
      const make = (date: string | null, pane: string) => {
        const layer = buildTileLayer(sel.def, date, pane);
        let errors = 0;
        layer.on('tileerror', () => {
          errors += 1;
          if (errors === TILE_FAILURE_LIMIT) onTileFailureRef.current(sel.def.id);
        });
        layer.addTo(map);
        tileLayers.current.push(layer);
      };
      if (comparingRef.current && sel.left !== sel.right) {
        make(sel.left, `${prefix}L`);
        make(sel.right, `${prefix}R`);
      } else {
        make(sel.left, prefix);
      }
    };
    add(base, 'fsBase');
    if (officialOverlay) add(officialOverlay, 'fsOver');
    applyClip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tileKey]);

  // Radar PNGs: recreated only when the set of images changes; opacity is updated in place below.
  const radarKey = compare ? `cmp|${compare.before.url}|${compare.after.url}` : `one|${radar?.url ?? ''}`;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const refs = imageLayers.current;
    refs.single?.remove();
    refs.before?.remove();
    refs.after?.remove();
    refs.single = refs.before = refs.after = undefined;
    setOverlayFailed(false);
    const make = (overlay: MapOverlay, pane: string) => {
      const image = L.imageOverlay(overlay.url, overlay.bounds, { opacity, interactive: false, pane });
      image.on('error', () => setOverlayFailed(true));
      image.addTo(map);
      return image;
    };
    if (compare) {
      refs.before = make(compare.before, 'fsRadarL');
      refs.after = make(compare.after, 'fsRadarR');
    } else if (radar) {
      refs.single = make(radar, 'fsRadar');
    }
    applyClip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, radarKey]);

  const qualityUrl = quality?.url ?? '';
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const refs = imageLayers.current;
    refs.quality?.remove();
    refs.quality = undefined;
    if (quality) {
      const image = L.imageOverlay(quality.url, quality.bounds, { opacity: QUALITY_OPACITY, interactive: false, pane: 'fsQuality' });
      image.on('error', () => setOverlayFailed(true));
      image.addTo(map);
      refs.quality = image;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, qualityUrl]);

  // Opacity: only the selected radar layer(s) change; the base map is untouched.
  useEffect(() => {
    const refs = imageLayers.current;
    refs.single?.setOpacity(opacity);
    refs.before?.setOpacity(opacity);
    refs.after?.setOpacity(opacity);
  }, [opacity, radarKey, ready]);

  // Divider position
  useEffect(() => { applyClip(); }, [split, comparing, applyClip]);

  // Sector paths: built once per sector list.
  useEffect(() => {
    const g = sectorGroup.current;
    if (!ready || !g) return;
    g.clearLayers();
    const byId = sectorPaths.current;
    byId.clear();
    for (const sector of sectors) {
      const id = sector.sector_id;
      const layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: sector.geometry } as unknown as GeoJSON.Feature, { pane: 'fsSectors', style: () => sectorStyle('grid') });
      layer.eachLayer((child) => {
        const path = child as L.Path;
        path.on('click', () => onSelectRef.current(id));
        path.bindTooltip(() => textNode(labelsRef.current.get(id) ?? id), { sticky: true });
        byId.set(id, path);
      });
    }
  }, [ready, sectors]);

  // Visibility/style: grid only on request; candidate sectors and the selected one are drawn when asked for.
  useEffect(() => {
    const g = sectorGroup.current;
    if (!ready || !g) return;
    for (const [id, path] of sectorPaths.current) {
      const selected = id === selectedSectorId;
      const candidate = highlightIds.has(id);
      const visible = showGrid || candidate || selected;
      if (visible && !g.hasLayer(path)) g.addLayer(path);
      else if (!visible && g.hasLayer(path)) g.removeLayer(path);
      if (visible) path.setStyle(sectorStyle(selected ? 'selected' : candidate ? 'candidate' : 'grid'));
      if (selected) path.bringToFront();
    }
  }, [ready, sectors, selectedSectorId, highlightIds, showGrid]);

  // Candidate zones: outline polygons (halo underneath for contrast), built per zone list.
  useEffect(() => {
    const g = zoneGroup.current;
    if (!ready || !g) return;
    g.clearLayers();
    const byId = zonePaths.current;
    byId.clear();
    lastClusterKey.current = '';
    lastViewKey.current = '';
    for (const zone of zones) {
      const plain = () => L.geoJSON(feature(zone.geometry), { pane: 'fsZones', interactive: false });
      const sel = plain();
      const dark = plain();
      const light = plain();
      const main = L.geoJSON(feature(zone.geometry), { pane: 'fsZones' });
      main.on('click', () => onSelectZoneRef.current(zone.zone_id));
      main.eachLayer((child) => (child as L.Path).bindTooltip(() => textNode(zoneTipRef.current(zone)), { sticky: true }));
      // Layers are added to the map by refreshZones (polygon vs bubble).
      byId.set(zone.zone_id, { group: L.layerGroup([sel, dark, light, main]), sel, dark, light, main, key: zoneIntensity(zone, thresholdDb) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, zones, thresholdDb]);

  useEffect(() => {
    if (!ready) return;
    for (const [id, layers] of zonePaths.current) applyZoneStyles(layers, id === selectedZoneId);
    refreshZonesRef.current();
  }, [ready, zones, thresholdDb, selectedZoneId]);

  // Zoom request from the cluster card ("Zoom in").
  const zoomNonce = zoomTo?.nonce ?? null;
  useEffect(() => {
    if (!ready || !zoomTo) return;
    const members = zonesRef.current.filter((z) => zoomTo.ids.includes(z.zone_id));
    if (members.length > 0) zoomToBBox(unionBBox(members));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, zoomNonce]);

  // 100 m candidate cells (advanced): one canvas layer under the vector panes.
  useEffect(() => {
    const g = cellGroup.current;
    if (!ready || !g) return;
    g.clearLayers();
    if (!cells || cells.length === 0) return;
    const collection = { type: 'FeatureCollection', features: cells.map((cell) => ({ type: 'Feature', properties: {}, geometry: cell.geometry })) } as unknown as GeoJSON.FeatureCollection;
    const renderer = L.canvas({ pane: 'fsCells' });
    L.geoJSON(collection, {
      pane: 'fsCells', interactive: false,
      style: () => ({ renderer, color: '#ff8c1a', weight: 0.6, fillColor: '#ff8c1a', fillOpacity: 0.55 }),
    }).addTo(g);
  }, [ready, cells]);

  // Selected zone: fly to it and open a small popup. Cleared selection returns to the whole area.
  const previousZone = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const animate = !reducedMotion();
    map.closePopup();
    const zone = selectedZoneId ? zones.find((z) => z.zone_id === selectedZoneId) : undefined;
    if (zone) {
      const bounds = bboxToBounds(zone.bbox);
      if (animate) map.flyToBounds(bounds, { maxZoom: 17, padding: [60, 60], duration: 0.6 });
      else map.fitBounds(bounds, { maxZoom: 17, padding: [60, 60], animate: false });
      const info = zonePopupRef.current(zone);
      const body = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = info.title;
      body.appendChild(title);
      for (const line of info.lines) { const p = document.createElement('div'); p.textContent = line; body.appendChild(p); }
      L.popup({ autoPan: false, closeOnClick: false, offset: [0, -4] }).setLatLng(zone.centroid).setContent(body).openOn(map);
    } else if (previousZone.current && !selectedSectorRef.current) {
      fitAllRef.current(animate);
    }
    previousZone.current = selectedZoneId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedZoneId, zones]);

  // Frame the selected sector; go back to the whole window when it is cleared.
  const previousSelected = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const animate = !reducedMotion();
    if (selectedSectorId) {
      const path = sectorPaths.current.get(selectedSectorId) as L.Polygon | undefined;
      if (path) {
        const bounds = path.getBounds();
        if (animate) map.flyToBounds(bounds, { maxZoom: 15, padding: [40, 40], duration: 0.6 });
        else map.fitBounds(bounds, { maxZoom: 15, padding: [40, 40], animate: false });
      }
    } else if (previousSelected.current && !selectedZoneRef.current) {
      fitAllRef.current(animate);
    }
    previousSelected.current = selectedSectorId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedSectorId]);

  // Searched place: temporary marker (point) or outline (area) with its name, and a fly-to.
  useEffect(() => {
    const map = mapRef.current;
    const g = focusGroup.current;
    if (!ready || !map || !g) return;
    g.clearLayers();
    if (!focus) return;
    const animate = !reducedMotion();
    if (focus.geometry && focus.bounds) {
      const outline = L.geoJSON(feature(focus.geometry), { pane: 'fsFocus', style: () => ({ color: FOCUS_BLUE, weight: 3, dashArray: '6 4', fillColor: FOCUS_BLUE, fillOpacity: 0.08 }), interactive: false }).addTo(g);
      outline.eachLayer((child) => (child as L.Path).bindTooltip(textNode(focus.name), { permanent: true, direction: 'center', className: 'explore-focus-tip' }));
      if (animate) map.flyToBounds(focus.bounds, { maxZoom: 16, padding: [40, 40], duration: 0.8 });
      else map.fitBounds(focus.bounds, { maxZoom: 16, padding: [40, 40], animate: false });
    } else {
      const marker = L.circleMarker([focus.lat, focus.lon], { pane: 'fsFocus', radius: 9, color: '#ffffff', weight: 3, fillColor: FOCUS_BLUE, fillOpacity: 1, interactive: false }).addTo(g);
      marker.bindTooltip(textNode(focus.name), { permanent: true, direction: 'top', offset: [0, -8], className: 'explore-focus-tip' });
      if (animate) map.flyTo([focus.lat, focus.lon], 15, { duration: 0.8 });
      else map.setView([focus.lat, focus.lon], 15, { animate: false });
    }
  }, [ready, focus]);

  // The container changes size when the map is expanded / collapsed (or the layout reflows): keep Leaflet in sync.
  useEffect(() => {
    const el = containerRef.current;
    if (!ready || !el || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const sync = () => {
      const map = mapRef.current;
      if (!map) return;
      // Re-measuring in the middle of a zoom animation can stall it; wait for the zoom to finish.
      if ((map as L.Map & { _animatingZoom?: boolean })._animatingZoom) { map.once('zoomend', sync); return; }
      map.invalidateSize({ animate: false });
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    });
    observer.observe(el);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [ready]);

  // --- Swipe divider interaction (mouse, touch, keyboard) ---
  const dragging = useRef(false);
  const moveTo = (clientX: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setSplit(Math.min(98, Math.max(2, ((clientX - rect.left) / rect.width) * 100)));
  };
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    moveTo(event.clientX);
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (dragging.current) moveTo(event.clientX); };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') setSplit((v) => Math.max(2, v - step));
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') setSplit((v) => Math.min(98, v + step));
    else if (event.key === 'Home') setSplit(2);
    else if (event.key === 'End') setSplit(98);
    else return;
    event.preventDefault();
  };

  if (failed) return <div className="observatory__map observatory__map--failed" role="alert">{labels.unavailable}</div>;
  return (
    <div className="observatory__stage" ref={stageRef}>
      <div className="observatory__map" ref={containerRef} role="region" aria-label={labels.map} data-testid="obs-map" />
      {comparing && (
        <>
          <span className="observatory__side-label observatory__side-label--left" data-testid="label-before">{labels.before}</span>
          <span className="observatory__side-label observatory__side-label--right" data-testid="label-after">{labels.after}</span>
          <div className="observatory__divider" style={{ left: `${split}%` }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className="observatory__handle" role="slider" tabIndex={0} aria-label={labels.divider} aria-orientation="horizontal"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(split)} onKeyDown={onKey} data-testid="swipe-divider" />
          </div>
        </>
      )}
      {children}
      {overlayFailed && <p className="observatory__map-alert" role="alert">{labels.overlayError}</p>}
    </div>
  );
}
