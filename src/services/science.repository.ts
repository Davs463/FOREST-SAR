import { APP_CONFIG } from '../config/app.config';
import type { CandidateCell, Catalog, Comparison, ComparisonIndex, DerivedData, Gazetteer, Manifest, Results, ScienceState, SectorCollection, SnapshotData } from '../shared/science.types';
import {
  ScienceError,
  normalizeCatalog,
  normalizeCells,
  normalizeDerivedHead,
  normalizeGazetteer,
  placesAreasPath,
  normalizeValidArea,
  normalizeZones,
  normalizeIndex,
  normalizeManifest,
  normalizeResults,
  normalizeSectors,
} from './science.schema';

// Loads manifest -> catalog/results/sectors. No fixtures, no fallbacks: failures surface as states.

type Fetched = { kind: 'ok'; data: unknown } | { kind: 'missing' };

async function fetchJson(url: URL, file: string, signal: AbortSignal, missingOk: boolean): Promise<Fetched> {
  let response: Response;
  try {
    response = await fetch(url, { signal, cache: 'no-cache' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ScienceError({ code: 'network', file });
  }
  if (!response.ok) {
    if (missingOk && response.status === 404) return { kind: 'missing' };
    throw new ScienceError({ code: 'fetchFailed', file, httpStatus: response.status });
  }
  const text = await response.text();
  try {
    return { kind: 'ok', data: JSON.parse(text) as unknown };
  } catch {
    // Dev servers answer a missing static file with index.html (HTTP 200): treat as absent.
    const isHtml = (response.headers.get('content-type') ?? '').includes('text/html');
    if (missingOk && isHtml) return { kind: 'missing' };
    throw new ScienceError({ code: 'parse', file });
  }
}

async function required(url: URL, file: string, signal: AbortSignal): Promise<unknown> {
  const result = await fetchJson(url, file, signal, false);
  return (result as { kind: 'ok'; data: unknown }).data;
}

export function manifestUrl(): URL {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  return new URL(APP_CONFIG.dataManifest, base);
}

/** In-memory cache of lazily loaded comparison snapshots, keyed by snapshot_id. Cleared on every full reload. */
const snapshotCache = new Map<string, SnapshotData>();
const snapshotInflight = new Map<string, Promise<SnapshotData>>();

export function cachedSnapshot(snapshotId: string): SnapshotData | null {
  return snapshotCache.get(snapshotId) ?? null;
}

/** Loads snapshots/index.json; any failure returns null so callers fall back to the manifest snapshot. */
async function loadIndex(manifest: Manifest, base: URL, signal: AbortSignal): Promise<ComparisonIndex | null> {
  if (!manifest.index_path) return null;
  try {
    const result = await fetchJson(new URL(manifest.index_path, base), 'index.json', signal, true);
    return result.kind === 'ok' ? normalizeIndex(result.data) : null;
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}

/**
 * Derived products (zones, valid area, perceptual rasters). Strictly optional: any failure, an unverified
 * file (verification.ok !== true) or an unreadable zones file yields null so the app falls back to the PNG candidates.
 */
async function loadDerived(path: string, base: URL, signal: AbortSignal): Promise<DerivedData | null> {
  try {
    const head = await fetchJson(new URL(path, base), 'derived.json', signal, true);
    if (head.kind !== 'ok') return null;
    const parsed = normalizeDerivedHead(head.data, base);
    if (!parsed) return null;
    const zonesRaw = await fetchJson(new URL(parsed.zonesUrl), 'zones.geojson', signal, true);
    if (zonesRaw.kind !== 'ok') return null;
    const zones = normalizeZones(zonesRaw.data);
    let validArea = null;
    if (parsed.validAreaUrl) {
      try {
        const raw = await fetchJson(new URL(parsed.validAreaUrl), 'valid_area.geojson', signal, true);
        validArea = raw.kind === 'ok' ? normalizeValidArea(raw.data) : null;
      } catch (error) {
        if (signal.aborted) throw error;
      }
    }
    return { ...parsed.meta, zones, validArea, cellsUrl: parsed.cellsUrl };
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  }
}

const cellsCache = new Map<string, Promise<CandidateCell[]>>();

/** 100 m candidate cells: fetched only when the advanced layer is switched on; cached per url. */
export function loadCells(url: string): Promise<CandidateCell[]> {
  const hit = cellsCache.get(url);
  if (hit) return hit;
  const promise = fetchJson(new URL(url), 'cells.geojson', new AbortController().signal, true)
    .then((result) => (result.kind === 'ok' ? normalizeCells(result.data) : []))
    .catch((error: unknown) => { cellsCache.delete(url); throw error; });
  cellsCache.set(url, promise);
  return promise;
}

let gazetteerPromise: Promise<Gazetteer | null> | null = null;
let gazetteerPath: string | null = null;

/** Place-name gazetteer (places.json + areas.geojson), loaded once. Absent or malformed files yield null. */
export function loadGazetteer(placesPath: string | null): Promise<Gazetteer | null> {
  if (!placesPath) return Promise.resolve(null);
  if (gazetteerPromise && gazetteerPath === placesPath) return gazetteerPromise;
  gazetteerPath = placesPath;
  const base = new URL('./', manifestUrl());
  const signal = new AbortController().signal;
  gazetteerPromise = (async () => {
    try {
      const places = await fetchJson(new URL(placesPath, base), 'places.json', signal, true);
      if (places.kind !== 'ok') return null;
      const areasPath = placesAreasPath(places.data);
      let areasRaw: unknown = null;
      if (areasPath) {
        try {
          const areas = await fetchJson(new URL(areasPath, base), 'areas.geojson', signal, true);
          areasRaw = areas.kind === 'ok' ? areas.data : null;
        } catch { /* areas are optional */ }
      }
      return normalizeGazetteer(places.data, areasRaw);
    } catch {
      return null;
    }
  })();
  return gazetteerPromise;
}

/** Loads one comparison's catalog, results and sectors. Cached per snapshot_id; failures are not cached. */
export function loadSnapshot(comparison: Comparison): Promise<SnapshotData> {
  const cached = snapshotCache.get(comparison.snapshot_id);
  if (cached) return Promise.resolve(cached);
  const running = snapshotInflight.get(comparison.snapshot_id);
  if (running) return running;
  const base = new URL('./', manifestUrl());
  // The shared request is not tied to one caller (a later caller may reuse it); callers just ignore stale results.
  const shared = new AbortController();
  const promise = (async (): Promise<SnapshotData> => {
    const catalogPromise = required(new URL(comparison.catalog_path, base), 'catalog.json', shared.signal).then(normalizeCatalog);
    const resultsPromise = required(new URL(comparison.results_path, base), 'results.json', shared.signal).then((raw) => normalizeResults(raw, base));
    const sectorsPromise: Promise<SectorCollection | null> = comparison.sectors_path
      ? fetchJson(new URL(comparison.sectors_path, base), 'sectors.geojson', shared.signal, true)
          .then((result) => (result.kind === 'ok' ? normalizeSectors(result.data) : null))
      : Promise.resolve(null);
    const derivedPromise = comparison.derived_path ? loadDerived(comparison.derived_path, base, shared.signal) : Promise.resolve(null);
    const [catalog, results, sectors, derived] = await Promise.all([catalogPromise, resultsPromise, sectorsPromise, derivedPromise]);
    const pair = results.pairs.find((item) => item.pair_id === comparison.pair_id) ?? null;
    // Never present another pair's results under these dates.
    if (!pair || pair.initial_date?.slice(0, 10) !== comparison.initial_date || pair.final_date?.slice(0, 10) !== comparison.final_date) {
      throw new ScienceError({ code: 'shape', file: 'results.json' });
    }
    const data: SnapshotData = { catalog, results, sectors, derived, pair };
    snapshotCache.set(comparison.snapshot_id, data);
    return data;
  })().finally(() => snapshotInflight.delete(comparison.snapshot_id));
  snapshotInflight.set(comparison.snapshot_id, promise);
  return promise;
}

export function scienceErrorInfo(error: unknown) {
  return error instanceof ScienceError ? error.info : { code: 'network' as const };
}

export async function loadScience(signal: AbortSignal): Promise<ScienceState> {
  snapshotCache.clear();
  try {
    const url = manifestUrl();
    const base = new URL('./', url); // snapshot paths are relative to the manifest folder
    const fetched = await fetchJson(url, 'manifest.json', signal, true);
    if (fetched.kind === 'missing') return { status: 'no_data', reason: 'manifest_missing' };

    const manifest = normalizeManifest(fetched.data);
    const status = manifest.status?.toLowerCase() ?? null;
    if (status === 'no_data') return { status: 'no_data', reason: 'manifest_no_data' };
    if (status === 'error') return { status: 'error', error: { code: 'manifestStatusError', file: 'manifest.json' } };
    if ((status !== 'ready' && status !== 'catalog_only') || !manifest.catalog_path) {
      return { status: 'error', error: { code: 'manifestInvalid', file: 'manifest.json' } };
    }
    if (status === 'ready' && !manifest.results_path) {
      return { status: 'error', error: { code: 'manifestInvalid', file: 'manifest.json' } };
    }

    const catalogPromise = required(new URL(manifest.catalog_path, base), 'catalog.json', signal).then(normalizeCatalog);
    if (status === 'catalog_only') {
      return { status: 'catalog_only', manifest, catalog: await catalogPromise, index: null };
    }

    const resultsPromise = required(new URL(manifest.results_path as string, base), 'results.json', signal)
      .then((raw) => normalizeResults(raw, base));
    const sectorsPromise: Promise<SectorCollection | null> = manifest.sectors_path
      ? fetchJson(new URL(manifest.sectors_path, base), 'sectors.geojson', signal, true)
          .then((result) => (result.kind === 'ok' ? normalizeSectors(result.data) : null))
      : Promise.resolve(null);
    const [catalog, results, sectors, index]: [Catalog, Results, SectorCollection | null, ComparisonIndex | null] = await Promise.all([
      catalogPromise, resultsPromise, sectorsPromise, loadIndex(manifest, base, signal),
    ]);
    return { status: 'ready', manifest, catalog, results, sectors, index };
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof ScienceError) return { status: 'error', error: error.info };
    return { status: 'error', error: { code: 'network' } };
  }
}
