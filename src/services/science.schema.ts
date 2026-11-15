import {
  LAYER_KEYS,
  type BBox,
  type Catalog,
  type CandidateCell,
  type Comparison,
  type DerivedData,
  type DerivedViz,
  type Gazetteer,
  type Place,
  type PlaceArea,
  type PolyGeometry,
  type ValidArea,
  type Zone,
  type ZonePlaceRef,
  type ComparisonIndex,
  type CatalogPair,
  type LatLng,
  type LatLngBounds,
  type LegendSpec,
  type LayerKey,
  type Manifest,
  type OverlayLayer,
  type PairMetrics,
  type PairParams,
  type Results,
  type ResultsPair,
  type Scene,
  type ScienceErrorInfo,
  type Sector,
  type SectorCollection,
} from '../shared/science.types';

// Minimal schema validation + normalisation. Tolerates extra fields and null everywhere:
// missing values become null, never 0 and never invented.

export class ScienceError extends Error {
  info: ScienceErrorInfo;
  constructor(info: ScienceErrorInfo) {
    super(info.code);
    this.info = info;
  }
}

type Rec = Record<string, unknown>;
const isRec = (value: unknown): value is Rec => typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value : null);
const strList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

function expectRecord(raw: unknown, file: string): Rec {
  if (!isRec(raw)) throw new ScienceError({ code: 'shape', file });
  return raw;
}

function checkSchema(raw: Rec, file: string): number {
  const version = num(raw.schema_version);
  if (version === null) throw new ScienceError({ code: 'shape', file });
  if (version !== 1) throw new ScienceError({ code: 'schemaUnsupported', file });
  return version;
}

function resolveHttpUrl(value: unknown, base: URL): string | null {
  const text = str(value);
  if (!text) return null;
  try {
    const url = new URL(text, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function parseBBox(value: unknown): BBox | null {
  let parts: unknown[] | null = null;
  if (Array.isArray(value)) parts = value;
  else if (isRec(value)) parts = [value.west, value.south, value.east, value.north];
  if (!parts || parts.length !== 4) return null;
  const [w, s, e, n] = parts.map(num);
  if (w === null || s === null || e === null || n === null) return null;
  if (s >= n || w >= e || s < -90 || n > 90 || w < -180 || e > 180) return null;
  return [w, s, e, n];
}

function parseRing(value: unknown): LatLng[] | null {
  if (!Array.isArray(value)) return null;
  const ring: LatLng[] = [];
  for (const point of value) {
    if (!Array.isArray(point)) return null;
    const lon = num(point[0]);
    const lat = num(point[1]);
    if (lon === null || lat === null) return null;
    ring.push([lat, lon]);
  }
  return ring.length >= 3 ? ring : null;
}

/** Accepts a GeoJSON Polygon/MultiPolygon, a [w,s,e,n] bbox or a ring of [lon,lat]. */
export function parseFootprint(value: unknown): LatLng[][] | null {
  const rings: LatLng[][] = [];
  if (isRec(value) && Array.isArray(value.coordinates)) {
    if (value.type === 'Polygon') {
      const outer = parseRing((value.coordinates as unknown[])[0]);
      if (outer) rings.push(outer);
    } else if (value.type === 'MultiPolygon') {
      for (const polygon of value.coordinates as unknown[]) {
        const outer = parseRing(Array.isArray(polygon) ? polygon[0] : null);
        if (outer) rings.push(outer);
      }
    }
  } else {
    const box = parseBBox(value);
    if (box) {
      const [w, s, e, n] = box;
      rings.push([[s, w], [s, e], [n, e], [n, w]]);
    } else {
      const ring = parseRing(value);
      if (ring) rings.push(ring);
    }
  }
  return rings.length > 0 ? rings : null;
}

function parseBounds(value: unknown): LatLngBounds | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [sw, ne] = value as unknown[];
  if (!Array.isArray(sw) || !Array.isArray(ne)) return null;
  const s = num(sw[0]);
  const w = num(sw[1]);
  const n = num(ne[0]);
  const e = num(ne[1]);
  if (s === null || w === null || n === null || e === null || s >= n || w >= e) return null;
  return [[s, w], [n, e]];
}

/**
 * A path relative to the data folder that must stay under snapshots/: no scheme, no absolute path,
 * no backslashes, query or fragment, no "." / ".." segments. Returns null when it does not qualify.
 */
export function safeDataPath(value: unknown, root = 'snapshots'): string | null {
  const text = str(value);
  if (!text) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('/') || /[\\?#]/.test(text)) return null;
  const parts = text.split('/');
  if (parts.length < 2 || parts[0] !== root) return null;
  if (parts.some((part) => part === '' || part === '.' || part === '..' || /%2e|%2f|%5c/i.test(part))) return null;
  return text;
}

export function normalizeManifest(raw: unknown): Manifest {
  const file = 'manifest.json';
  const rec = expectRecord(raw, file);
  const schema_version = checkSchema(rec, file);
  return {
    schema_version,
    status: str(rec.status),
    snapshot_id: str(rec.snapshot_id),
    updated_at: str(rec.updated_at),
    catalog_path: str(rec.catalog_path),
    results_path: str(rec.results_path),
    sectors_path: str(rec.sectors_path),
    index_path: safeDataPath(rec.index_path),
  };
}

function normalizeScene(raw: unknown): Scene | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  const track = typeof raw.track === 'string' ? str(raw.track) : num(raw.track);
  return {
    id,
    collection: str(raw.collection),
    acquired_at: str(raw.acquired_at),
    track,
    frame: typeof raw.frame === 'string' ? str(raw.frame) : num(raw.frame),
    pass: str(raw.pass),
    look_side: str(raw.look_side),
    frequency: str(raw.frequency),
    polarization: str(raw.polarization),
    crs: str(raw.crs),
    spacing_m: num(raw.spacing_m),
    footprint: parseFootprint(raw.footprint),
    quality_status: str(raw.quality_status),
    source_url: str(raw.source_url),
  };
}

function normalizeCatalogPair(raw: unknown): CatalogPair | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    initial_id: str(raw.initial_id),
    final_id: str(raw.final_id),
    status: str(raw.status),
    reason: str(raw.reason),
    common_coverage_pct: num(raw.common_coverage_pct),
  };
}

export function normalizeCatalog(raw: unknown): Catalog {
  const file = 'catalog.json';
  const rec = expectRecord(raw, file);
  const schema_version = checkSchema(rec, file);
  if (!Array.isArray(rec.scenes) || !Array.isArray(rec.pairs ?? [])) throw new ScienceError({ code: 'shape', file });
  const query = isRec(rec.query) ? rec.query : {};
  return {
    schema_version,
    source: str(rec.source),
    query: { bbox: parseBBox(query.bbox), start: str(query.start), end: str(query.end) },
    scenes: rec.scenes.map(normalizeScene).filter((scene): scene is Scene => scene !== null),
    pairs: (Array.isArray(rec.pairs) ? rec.pairs : []).map(normalizeCatalogPair).filter((pair): pair is CatalogPair => pair !== null),
  };
}

function normalizeLegend(raw: unknown): LegendSpec | null {
  if (!isRec(raw)) return null;
  const colorOk = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value);
  if ((raw.type === 'gradient' || raw.type === 'diverging') && Array.isArray(raw.colors)) { // diverging = gradient through a neutral midpoint (viz_delta)
    const colors = raw.colors.filter(colorOk);
    return colors.length >= 2 ? { type: 'gradient', min: num(raw.min), max: num(raw.max), colors, note: str(raw.note) } : null;
  }
  if (raw.type === 'categorical' && Array.isArray(raw.items)) {
    const items = raw.items.filter(isRec).map((item) => ({ label: str(item.label), color: item.color })).filter((item): item is { label: string; color: string } => item.label !== null && colorOk(item.color));
    return items.length > 0 ? { type: 'categorical', items, note: str(raw.note) } : null;
  }
  return null;
}

function normalizeLayer(raw: unknown, base: URL): OverlayLayer | null {
  if (!isRec(raw)) return null;
  const url = resolveHttpUrl(raw.url, base);
  const bounds = parseBounds(raw.bounds);
  if (!url || !bounds) return null;
  return { url, bounds, crs: str(raw.crs), legend: str(raw.legend), legend_spec: normalizeLegend(raw.legend), unit: str(raw.unit) };
}

function normalizeMetrics(raw: unknown): PairMetrics {
  const m = isRec(raw) ? raw : {};
  return {
    valid_area_ha: num(m.valid_area_ha),
    candidate_area_ha: num(m.candidate_area_ha),
    candidate_pct: num(m.candidate_pct),
    coverage_pct: num(m.coverage_pct),
    cv_initial_ha: num(m.cv_initial_ha),
    cv_final_ha: num(m.cv_final_ha),
    tp_pct: num(m.tp_pct),
    rhythm_12d: num(m.rhythm_12d),
  };
}

function normalizeParams(raw: unknown): PairParams {
  const p = isRec(raw) ? raw : {};
  return {
    threshold_db: num(p.threshold_db),
    noise_floor_db: num(p.noise_floor_db),
    normalization_offset_db: num(p.normalization_offset_db),
    mask_rule: str(p.mask_rule),
    minimum_patch_ha: num(p.minimum_patch_ha),
  };
}

function normalizeResultsPair(raw: unknown, base: URL): ResultsPair | null {
  if (!isRec(raw)) return null;
  const pair_id = str(raw.pair_id);
  if (!pair_id) return null;
  const rawLayers = isRec(raw.layers) ? raw.layers : {};
  const layers = {} as Record<LayerKey, OverlayLayer | null>;
  for (const key of LAYER_KEYS) layers[key] = normalizeLayer(rawLayers[key], base);
  const provenance = isRec(raw.provenance) ? raw.provenance : {};
  const level = typeof raw.evidence_level === 'number' ? num(raw.evidence_level) : str(raw.evidence_level);
  return {
    pair_id,
    region_id: str(raw.region_id),
    initial_id: str(raw.initial_id),
    final_id: str(raw.final_id),
    initial_date: str(raw.initial_date),
    final_date: str(raw.final_date),
    source: str(raw.source),
    maturity: str(raw.maturity),
    metrics: normalizeMetrics(raw.metrics),
    params: normalizeParams(raw.params),
    evidence_level: level,
    limitations: strList(raw.limitations),
    layers,
    provenance: { source_urls: strList(provenance.source_urls), processing_log: str(provenance.processing_log) },
  };
}

export function normalizeResults(raw: unknown, base: URL): Results {
  const file = 'results.json';
  const rec = expectRecord(raw, file);
  const schema_version = checkSchema(rec, file);
  if (!Array.isArray(rec.pairs)) throw new ScienceError({ code: 'shape', file });
  return {
    schema_version,
    snapshot_id: str(rec.snapshot_id),
    data_mode: str(rec.data_mode),
    processed_at: str(rec.processed_at),
    algorithm_version: str(rec.algorithm_version),
    pairs: rec.pairs.map((pair) => normalizeResultsPair(pair, base)).filter((pair): pair is ResultsPair => pair !== null),
  };
}

export function normalizeSectors(raw: unknown): SectorCollection {
  const file = 'sectors.geojson';
  const rec = expectRecord(raw, file);
  if (rec.type !== 'FeatureCollection' || !Array.isArray(rec.features)) throw new ScienceError({ code: 'shape', file });
  const features: Sector[] = [];
  for (const feature of rec.features) {
    if (!isRec(feature) || !isRec(feature.geometry)) continue;
    const geometry = feature.geometry;
    if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') continue;
    const properties = isRec(feature.properties) ? feature.properties : {};
    const sector_id = str(properties.sector_id) ?? (typeof feature.id === 'string' || typeof feature.id === 'number' ? String(feature.id) : null);
    if (!sector_id) continue;
    features.push({
      sector_id,
      region_id: str(properties.region_id),
      geometry: { type: geometry.type, coordinates: geometry.coordinates },
      properties,
    });
  }
  return { features };
}

const ISO_DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function normalizeComparison(raw: unknown): Comparison | null {
  if (!isRec(raw)) return null;
  const snapshot_id = str(raw.snapshot_id);
  const pair_id = str(raw.pair_id);
  const initial_date = str(raw.initial_date);
  const final_date = str(raw.final_date);
  const catalog_path = safeDataPath(raw.catalog_path);
  const results_path = safeDataPath(raw.results_path);
  if (!snapshot_id || !pair_id || !initial_date || !final_date || !catalog_path || !results_path) return null;
  if (!ISO_DAY.test(initial_date) || !ISO_DAY.test(final_date)) return null;
  const sectors_path = raw.sectors_path == null ? null : safeDataPath(raw.sectors_path);
  if (raw.sectors_path != null && !sectors_path) return null;
  const processing_log_path = raw.processing_log_path == null ? null : safeDataPath(raw.processing_log_path);
  // A bad derived path only disables the derived products; the comparison itself stays valid.
  const derived_path = raw.derived_path == null ? null : safeDataPath(raw.derived_path);
  const metrics = isRec(raw.metrics) ? raw.metrics : {};
  return {
    snapshot_id, pair_id,
    initial_id: str(raw.initial_id),
    final_id: str(raw.final_id),
    initial_date, final_date,
    interval_days: num(raw.interval_days),
    track: typeof raw.track === 'string' ? str(raw.track) : num(raw.track),
    frame: typeof raw.frame === 'string' ? str(raw.frame) : num(raw.frame),
    pass: str(raw.pass),
    collection: str(raw.collection),
    maturity: str(raw.maturity),
    common_coverage_pct: num(raw.common_coverage_pct),
    catalog_path, results_path, sectors_path, processing_log_path, derived_path,
    metrics: {
      valid_area_ha: num(metrics.valid_area_ha),
      candidate_area_ha: num(metrics.candidate_area_ha),
      candidate_pct: num(metrics.candidate_pct),
      coverage_pct: num(metrics.coverage_pct),
    },
  };
}

/** Validates snapshots/index.json. Invalid entries are dropped (never repaired); an index with none is rejected. */
export function normalizeIndex(raw: unknown): ComparisonIndex {
  const file = 'index.json';
  const rec = expectRecord(raw, file);
  const schema_version = checkSchema(rec, file);
  if (!Array.isArray(rec.comparisons)) throw new ScienceError({ code: 'shape', file });
  const seen = new Set<string>();
  const comparisons: Comparison[] = [];
  for (const item of rec.comparisons) {
    const comparison = normalizeComparison(item);
    if (!comparison || seen.has(comparison.snapshot_id)) continue;
    seen.add(comparison.snapshot_id);
    comparisons.push(comparison);
  }
  if (comparisons.length === 0) throw new ScienceError({ code: 'shape', file });
  const method = isRec(rec.method) ? rec.method : {};
  return {
    schema_version,
    updated_at: str(rec.updated_at),
    places_path: rec.places_path == null ? null : safeDataPath(rec.places_path, 'places'),
    method: {
      algorithm_version: str(method.algorithm_version),
      polarization: str(method.polarization),
      threshold_db: num(method.threshold_db),
      multilook_px: num(method.multilook_px),
      multilook_min_valid_fraction: num(method.multilook_min_valid_fraction),
    },
    comparisons,
    excluded: (Array.isArray(rec.excluded) ? rec.excluded : []).filter(isRec).map((item) => ({ snapshot_id: str(item.snapshot_id), reason: str(item.reason) })),
  };
}


// ---------------------------------------------------------------- derived products & gazetteer

function parseLonLat(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lon = num(value[0]);
  const lat = num(value[1]);
  if (lon === null || lat === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lon, lat];
}

function validRing(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 4 && value.every((pt) => parseLonLat(pt) !== null);
}

/** Strict Polygon/MultiPolygon validation: any malformed ring discards the geometry. */
export function parsePolyGeometry(value: unknown): PolyGeometry | null {
  if (!isRec(value) || !Array.isArray(value.coordinates)) return null;
  if (value.type === 'Polygon') {
    const rings = value.coordinates as unknown[];
    return rings.length > 0 && rings.every(validRing) ? { type: 'Polygon', coordinates: rings } : null;
  }
  if (value.type === 'MultiPolygon') {
    const polys = value.coordinates as unknown[];
    const ok = polys.length > 0 && polys.every((poly) => Array.isArray(poly) && poly.length > 0 && poly.every(validRing));
    return ok ? { type: 'MultiPolygon', coordinates: polys } : null;
  }
  return null;
}

function featuresOf(raw: unknown): Rec[] {
  if (!isRec(raw)) return [];
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) return raw.features.filter(isRec);
  if (raw.type === 'Feature') return [raw];
  return [];
}

function placeRef(raw: unknown): ZonePlaceRef | null {
  if (!isRec(raw)) return null;
  const name = str(raw.name);
  return name ? { name, kind: str(raw.kind), osm_ref: str(raw.osm_ref) } : null;
}

export function normalizeZones(raw: unknown): Zone[] {
  const zones: Zone[] = [];
  const seen = new Set<string>();
  for (const feature of featuresOf(raw)) {
    const props = isRec(feature.properties) ? feature.properties : {};
    const geometry = parsePolyGeometry(feature.geometry);
    const zone_id = str(props.zone_id);
    const area_ha = num(props.area_ha);
    const bbox = parseBBox(props.bbox);
    const c = props.centroid;
    const lat = Array.isArray(c) ? num(c[0]) : null;
    const lon = Array.isArray(c) ? num(c[1]) : null;
    if (!geometry || !zone_id || seen.has(zone_id) || area_ha === null || area_ha < 0 || !bbox || lat === null || lon === null) continue;
    seen.add(zone_id);
    const near = isRec(props.nearest_place) ? props.nearest_place : null;
    const nearRef = placeRef(near);
    const distance = near ? num(near.distance_km) : null;
    zones.push({
      zone_id,
      rank: num(props.rank),
      area_ha,
      cell_count: num(props.cell_count),
      mean_delta_db: num(props.mean_delta_db),
      min_delta_db: num(props.min_delta_db),
      centroid: [lat, lon],
      bbox,
      sector_ids: strList(props.sector_ids),
      outline_note: str(props.outline_note),
      nearest_place: nearRef && distance !== null && distance >= 0 ? { ...nearRef, distance_km: distance } : null,
      within_area: placeRef(props.within_area),
      geometry,
    });
  }
  return zones.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || a.zone_id.localeCompare(b.zone_id, undefined, { numeric: true }));
}

export function normalizeValidArea(raw: unknown): ValidArea | null {
  for (const feature of featuresOf(raw)) {
    const geometry = parsePolyGeometry(feature.geometry);
    if (geometry) return { geometry, area_ha: num((isRec(feature.properties) ? feature.properties : {}).area_ha) };
  }
  const direct = parsePolyGeometry(raw);
  return direct ? { geometry: direct, area_ha: null } : null;
}

export function normalizeCells(raw: unknown): CandidateCell[] {
  const cells: CandidateCell[] = [];
  for (const feature of featuresOf(raw)) {
    const geometry = parsePolyGeometry(feature.geometry);
    if (!geometry) continue;
    const props = isRec(feature.properties) ? feature.properties : {};
    cells.push({ delta_db: num(props.delta_db), zone_id: str(props.zone_id), geometry });
  }
  return cells;
}

function dataUrl(value: unknown, base: URL): string | null {
  const path = safeDataPath(value);
  return path ? new URL(path, base).href : null;
}

function normalizeViz(raw: unknown, base: URL): DerivedViz | null {
  if (!isRec(raw)) return null;
  const url = dataUrl(raw.url, base);
  const bounds = parseBounds(raw.bounds);
  if (!url || !bounds) return null;
  return { url, bounds, legend: normalizeLegend(raw.legend) };
}

/** What derived.json says; the heavy files are fetched separately. null = ignore derived entirely. */
export interface DerivedHead {
  meta: Omit<DerivedData, 'zones' | 'validArea' | 'cellsUrl'>;
  zonesUrl: string;
  validAreaUrl: string | null;
  cellsUrl: string | null;
}

export function normalizeDerivedHead(raw: unknown, base: URL): DerivedHead | null {
  if (!isRec(raw) || num(raw.schema_version) !== 1) return null;
  const verification = isRec(raw.verification) ? raw.verification : null;
  if (!verification || verification.ok !== true) return null;
  const files = isRec(raw.files) ? raw.files : {};
  const zonesUrl = dataUrl(files.zones, base);
  if (!zonesUrl) return null;
  const rawViz = isRec(raw.viz) ? raw.viz : {};
  const viz: DerivedData['viz'] = {};
  for (const key of ['before', 'after', 'delta'] as const) {
    const item = normalizeViz(rawViz[key], base);
    if (item) viz[key] = item;
  }
  const used = isRec(raw.places_used) ? raw.places_used : null;
  return {
    meta: {
      snapshot_id: str(raw.snapshot_id),
      pair_id: str(raw.pair_id),
      generated_at: str(raw.generated_at),
      method_note: str(raw.method_note),
      cluster_rule: str(raw.cluster_rule),
      viz,
      places_used: used ? { path: str(used.path), retrieved_at: str(used.retrieved_at), license: str(used.license) } : null,
    },
    zonesUrl,
    validAreaUrl: dataUrl(files.valid_area, base),
    cellsUrl: dataUrl(files.cells, base),
  };
}

const PLACE_KINDS = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'locality', 'peak']);

export function normalizeGazetteer(rawPlaces: unknown, rawAreas: unknown): Gazetteer | null {
  if (!isRec(rawPlaces) || !Array.isArray(rawPlaces.places)) return null;
  const places: Place[] = [];
  for (const item of rawPlaces.places) {
    if (!isRec(item)) continue;
    const name = str(item.name);
    const kind = str(item.kind);
    const lat = num(item.lat);
    const lon = num(item.lon);
    if (!name || !kind || !PLACE_KINDS.has(kind) || lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    places.push({ id: str(item.id) ?? `${name}|${lat}|${lon}`, name, kind, lat, lon });
  }
  const areas: PlaceArea[] = [];
  for (const feature of featuresOf(rawAreas)) {
    const props = isRec(feature.properties) ? feature.properties : {};
    const name = str(props.name);
    const geometry = parsePolyGeometry(feature.geometry);
    if (!name || !geometry) continue;
    areas.push({ name, kind: str(props.kind) ?? 'locality', osm_ref: str(props.osm_ref), geometry });
  }
  if (places.length === 0 && areas.length === 0) return null;
  return {
    retrieved_at: str(rawPlaces.retrieved_at),
    source: str(rawPlaces.source),
    license: str(rawPlaces.license),
    places,
    areas,
  };
}

export function placesAreasPath(rawPlaces: unknown): string | null {
  return isRec(rawPlaces) && rawPlaces.areas_path != null ? safeDataPath(rawPlaces.areas_path, 'places') : null;
}
