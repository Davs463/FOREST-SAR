import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CandidateCell, Comparison, ComparisonIndex, DerivedData, Gazetteer, ScienceErrorInfo, ScienceState, SnapshotData } from '../shared/science.types';
import { daysBetween } from '../shared/format';
import { useScience } from './ScienceProvider';
import { cachedSnapshot, loadCells, loadGazetteer, loadSnapshot, scienceErrorInfo } from './science.repository';

export interface ComparisonSet {
  comparisons: Comparison[];
  /** 'index' = snapshots/index.json; 'manifest' = the single snapshot of the manifest (no index published). */
  source: 'index' | 'manifest';
  index: ComparisonIndex | null;
}

const EMPTY: ComparisonSet = { comparisons: [], source: 'manifest', index: null };

/** Comparisons from the validated index, else one per processed pair of the manifest snapshot. Never invented. */
export function buildComparisons(state: ScienceState): ComparisonSet {
  if (state.status !== 'ready') return EMPTY;
  if (state.index && state.index.comparisons.length > 0) {
    return { comparisons: sortComparisons(state.index.comparisons), source: 'index', index: state.index };
  }
  const { manifest, catalog, results, sectors } = state;
  const scenes = new Map(catalog.scenes.map((scene) => [scene.id, scene]));
  const comparisons: Comparison[] = [];
  for (const pair of results.pairs) {
    const initial = pair.initial_date?.slice(0, 10);
    const final = pair.final_date?.slice(0, 10);
    const snapshotId = manifest.snapshot_id;
    if (!initial || !final || !snapshotId || !manifest.catalog_path || !manifest.results_path) continue;
    const scene = pair.initial_id ? scenes.get(pair.initial_id) : undefined;
    const catalogPair = catalog.pairs.find((item) => item.id === pair.pair_id);
    comparisons.push({
      snapshot_id: snapshotId, pair_id: pair.pair_id, initial_id: pair.initial_id, final_id: pair.final_id,
      initial_date: initial, final_date: final, interval_days: daysBetween(initial, final),
      track: scene?.track ?? null, frame: scene?.frame ?? null, pass: scene?.pass ?? null,
      collection: scene?.collection ?? null, maturity: pair.maturity,
      common_coverage_pct: catalogPair?.common_coverage_pct ?? null,
      catalog_path: manifest.catalog_path, results_path: manifest.results_path,
      sectors_path: sectors ? manifest.sectors_path : null, processing_log_path: null, derived_path: null,
      metrics: {
        valid_area_ha: pair.metrics.valid_area_ha, candidate_area_ha: pair.metrics.candidate_area_ha,
        candidate_pct: pair.metrics.candidate_pct, coverage_pct: pair.metrics.coverage_pct,
      },
    });
  }
  return { comparisons: sortComparisons(comparisons), source: 'manifest', index: null };
}

function sortComparisons(list: Comparison[]): Comparison[] {
  return [...list].sort((a, b) => b.final_date.localeCompare(a.final_date) || b.initial_date.localeCompare(a.initial_date));
}

export function useComparisons(): ComparisonSet {
  const { state } = useScience();
  return useMemo(() => buildComparisons(state), [state]);
}

export type SnapshotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: SnapshotData }
  | { status: 'error'; error: ScienceErrorInfo };

type Loaded = { id: string; result: { status: 'ready'; data: SnapshotData } | { status: 'error'; error: ScienceErrorInfo } };

/** Lazily loads the selected comparison's snapshot (cached per snapshot_id, loading/error per comparison). */
export function useSnapshot(comparison: Comparison | null): { snapshot: SnapshotState; retry: () => void } {
  const { state } = useScience();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const id = comparison?.snapshot_id ?? null;

  // The manifest snapshot is already in memory.
  const seeded = useMemo<SnapshotData | null>(() => {
    if (!comparison || state.status !== 'ready' || comparison.snapshot_id !== state.manifest.snapshot_id || comparison.derived_path) return null;
    const pair = state.results.pairs.find((item) => item.pair_id === comparison.pair_id);
    if (!pair || pair.initial_date?.slice(0, 10) !== comparison.initial_date || pair.final_date?.slice(0, 10) !== comparison.final_date) return null;
    return { catalog: state.catalog, results: state.results, sectors: state.sectors, derived: null, pair };
  }, [comparison, state]);

  useEffect(() => {
    if (!comparison || seeded || cachedSnapshot(comparison.snapshot_id)) return undefined;
    let current = true;
    loadSnapshot(comparison)
      .then((data) => { if (current) setLoaded({ id: comparison.snapshot_id, result: { status: 'ready', data } }); })
      .catch((error: unknown) => { if (current) setLoaded({ id: comparison.snapshot_id, result: { status: 'error', error: scienceErrorInfo(error) } }); });
    return () => { current = false; };
  }, [comparison, seeded, attempt]);

  const retry = useCallback(() => { setLoaded(null); setAttempt((n) => n + 1); }, []);

  let snapshot: SnapshotState = { status: 'idle' };
  if (comparison && id) {
    const hit = seeded ?? cachedSnapshot(id);
    if (hit) snapshot = { status: 'ready', data: hit };
    else if (loaded && loaded.id === id) snapshot = loaded.result;
    else snapshot = { status: 'loading' };
  }
  return { snapshot, retry };
}

/** Place gazetteer (places.json + areas.geojson), loaded once; null while loading or when not published. */
export function usePlaces(): Gazetteer | null {
  const { state } = useScience();
  const path = state.status === 'ready' ? state.index?.places_path ?? null : null;
  const [loaded, setLoaded] = useState<{ path: string; data: Gazetteer | null } | null>(null);
  useEffect(() => {
    if (!path) return undefined;
    let current = true;
    loadGazetteer(path).then((data) => { if (current) setLoaded({ path, data }); }).catch(() => { if (current) setLoaded({ path, data: null }); });
    return () => { current = false; };
  }, [path]);
  return path && loaded?.path === path ? loaded.data : null;
}

/** 100 m candidate cells, fetched only while `enabled` (advanced layer). */
export function useCells(derived: DerivedData | null, enabled: boolean): CandidateCell[] | null {
  const url = derived?.cellsUrl ?? null;
  const [loaded, setLoaded] = useState<{ url: string; data: CandidateCell[] } | null>(null);
  useEffect(() => {
    if (!enabled || !url) return undefined;
    let current = true;
    loadCells(url).then((data) => { if (current) setLoaded({ url, data }); }).catch(() => { /* layer simply stays empty */ });
    return () => { current = false; };
  }, [enabled, url]);
  return enabled && url && loaded?.url === url ? loaded.data : null;
}
