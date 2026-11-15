// Normalised model of the web data contract (docs/CONTRATO_CIENTIFICO.md section 5).
// Every field that the contract allows to be unknown is nullable; the adapter in
// services/science.schema.ts converts raw JSON into these types and tolerates extra fields.

export type LatLng = [number, number]; // [lat, lon]
export type LatLngBounds = [LatLng, LatLng]; // [[south, west], [north, east]]
export type BBox = [number, number, number, number]; // [west, south, east, north] (CMR/GeoJSON order)

export interface Manifest {
  schema_version: number;
  status: string | null;
  snapshot_id: string | null;
  updated_at: string | null;
  catalog_path: string | null;
  results_path: string | null;
  sectors_path: string | null;
  /** Relative to the data folder, under snapshots/; null when the engine publishes no comparison index. */
  index_path: string | null;
}

export interface Scene {
  id: string;
  collection: string | null;
  acquired_at: string | null;
  track: number | string | null;
  frame: number | string | null;
  pass: string | null;
  look_side: string | null;
  frequency: string | null;
  polarization: string | null;
  crs: string | null;
  spacing_m: number | null;
  footprint: LatLng[][] | null; // polygon rings as [lat, lon]
  quality_status: string | null;
  source_url: string | null;
}

export interface CatalogPair {
  id: string;
  initial_id: string | null;
  final_id: string | null;
  status: string | null; // only 'compatible' enables selection
  reason: string | null;
  common_coverage_pct: number | null;
}

export interface Catalog {
  schema_version: number;
  source: string | null;
  query: { bbox: BBox | null; start: string | null; end: string | null };
  scenes: Scene[];
  pairs: CatalogPair[];
}

export interface ComparisonMetrics {
  valid_area_ha: number | null;
  candidate_area_ha: number | null;
  candidate_pct: number | null;
  coverage_pct: number | null;
}

/** One processed comparison (one snapshot) from snapshots/index.json, or derived from the manifest snapshot. */
export interface Comparison {
  snapshot_id: string;
  pair_id: string;
  initial_id: string | null;
  final_id: string | null;
  initial_date: string; // YYYY-MM-DD
  final_date: string; // YYYY-MM-DD
  interval_days: number | null;
  track: number | string | null;
  frame: number | string | null;
  pass: string | null;
  collection: string | null;
  maturity: string | null;
  common_coverage_pct: number | null;
  /** Paths relative to the data folder (validated to live under snapshots/). */
  catalog_path: string;
  results_path: string;
  sectors_path: string | null;
  processing_log_path: string | null;
  /** Derived visual products (zones, viz rasters); null when the engine did not publish them. */
  derived_path: string | null;
  metrics: ComparisonMetrics;
}

export interface ComparisonIndex {
  schema_version: number;
  updated_at: string | null;
  /** Place-name gazetteer (places/…); null when absent. */
  places_path: string | null;
  method: {
    algorithm_version: string | null;
    polarization: string | null;
    threshold_db: number | null;
    multilook_px: number | null;
    multilook_min_valid_fraction: number | null;
  };
  comparisons: Comparison[];
  excluded: { snapshot_id: string | null; reason: string | null }[];
}

/** Everything one comparison needs, loaded lazily and cached per snapshot_id. */
export interface SnapshotData {
  catalog: Catalog;
  results: Results;
  sectors: SectorCollection | null;
  /** Verified derived products (verification.ok === true) or null. */
  derived: DerivedData | null;
  /** The results pair that matches the comparison (pair_id and dates verified). */
  pair: ResultsPair;
}

export type LayerKey = 'before' | 'after' | 'delta' | 'candidates' | 'quality';
export const LAYER_KEYS: readonly LayerKey[] = ['before', 'after', 'delta', 'candidates', 'quality'];

export type LegendSpec =
  | { type: 'gradient'; min: number | null; max: number | null; colors: string[]; note: string | null }
  | { type: 'categorical'; items: { label: string; color: string }[]; note: string | null };

export interface OverlayLayer {
  url: string; // already resolved against the data folder
  bounds: LatLngBounds;
  crs: string | null;
  legend: string | null;
  /** Structured legend published by the engine (gradient or categorical); null when absent/unreadable. */
  legend_spec: LegendSpec | null;
  unit: string | null;
}

export interface PairMetrics {
  valid_area_ha: number | null;
  candidate_area_ha: number | null;
  candidate_pct: number | null;
  coverage_pct: number | null;
  cv_initial_ha: number | null;
  cv_final_ha: number | null;
  tp_pct: number | null;
  rhythm_12d: number | null;
}

export interface PairParams {
  threshold_db: number | null;
  noise_floor_db: number | null;
  normalization_offset_db: number | null;
  mask_rule: string | null;
  minimum_patch_ha: number | null;
}

export interface ResultsPair {
  pair_id: string;
  region_id: string | null;
  initial_id: string | null;
  final_id: string | null;
  initial_date: string | null;
  final_date: string | null;
  source: string | null;
  maturity: string | null;
  metrics: PairMetrics;
  params: PairParams;
  evidence_level: string | number | null;
  limitations: string[];
  layers: Record<LayerKey, OverlayLayer | null>;
  provenance: { source_urls: string[]; processing_log: string | null };
}

export interface Results {
  schema_version: number;
  snapshot_id: string | null;
  data_mode: string | null;
  processed_at: string | null;
  algorithm_version: string | null;
  pairs: ResultsPair[];
}

export interface Sector {
  sector_id: string;
  region_id: string | null;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  properties: Record<string, unknown>;
}

export interface SectorCollection {
  features: Sector[];
}

export type ScienceErrorCode = 'manifestInvalid' | 'schemaUnsupported' | 'fetchFailed' | 'network' | 'parse' | 'shape' | 'manifestStatusError';

export interface ScienceErrorInfo {
  code: ScienceErrorCode;
  file?: string;
  httpStatus?: number;
}

export type ScienceState =
  | { status: 'loading' }
  | { status: 'ready'; manifest: Manifest; catalog: Catalog; results: Results; sectors: SectorCollection | null; index: ComparisonIndex | null }
  | { status: 'catalog_only'; manifest: Manifest; catalog: Catalog; index: null }
  | { status: 'no_data'; reason: 'manifest_missing' | 'manifest_no_data' }
  | { status: 'error'; error: ScienceErrorInfo };

// ---- Derived products (zones, valid area, perceptual rasters) and gazetteer

export type PolyGeometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };

export interface ZonePlaceRef {
  name: string;
  kind: string | null;
  osm_ref: string | null;
}

export interface Zone {
  zone_id: string;
  rank: number | null;
  /** Exact sum of the candidate cells of the zone. */
  area_ha: number;
  cell_count: number | null;
  mean_delta_db: number | null;
  min_delta_db: number | null;
  centroid: LatLng;
  bbox: BBox;
  sector_ids: string[];
  outline_note: string | null;
  nearest_place: (ZonePlaceRef & { distance_km: number }) | null;
  within_area: ZonePlaceRef | null;
  /** Visualisation outline of the zone. */
  geometry: PolyGeometry;
}

export interface DerivedViz {
  url: string;
  bounds: LatLngBounds;
  legend: LegendSpec | null;
}

export interface ValidArea {
  geometry: PolyGeometry;
  area_ha: number | null;
}

export interface DerivedData {
  snapshot_id: string | null;
  pair_id: string | null;
  generated_at: string | null;
  method_note: string | null;
  cluster_rule: string | null;
  zones: Zone[];
  validArea: ValidArea | null;
  /** Url (resolved) of the 100 m candidate cells; loaded only when the layer is switched on. */
  cellsUrl: string | null;
  viz: Partial<Record<'before' | 'after' | 'delta', DerivedViz>>;
  places_used: { path: string | null; retrieved_at: string | null; license: string | null } | null;
}

export interface CandidateCell {
  delta_db: number | null;
  zone_id: string | null;
  geometry: PolyGeometry;
}

export interface Place {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
}

export interface PlaceArea {
  name: string;
  kind: string;
  osm_ref: string | null;
  geometry: PolyGeometry;
}

export interface Gazetteer {
  retrieved_at: string | null;
  source: string | null;
  license: string | null;
  places: Place[];
  areas: PlaceArea[];
}
