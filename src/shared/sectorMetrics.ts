import type { PairMetrics, Sector } from './science.types';

const METRIC_KEYS: readonly (keyof PairMetrics)[] = [
  'valid_area_ha', 'candidate_area_ha', 'candidate_pct', 'coverage_pct', 'cv_initial_ha', 'cv_final_ha', 'tp_pct', 'rhythm_12d',
];

type Rec = Record<string, unknown>;
const isRec = (value: unknown): value is Rec => typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function toMetrics(source: Rec): PairMetrics {
  const inner = isRec(source.metrics) ? source.metrics : source;
  const out = {} as PairMetrics;
  for (const key of METRIC_KEYS) out[key] = num(inner[key]);
  return out;
}

/**
 * Metrics of a sector for one pair: properties.metrics_by_pair[pairId] (or metrics[pairId] as alternative).
 * No flat fallback, so metrics are never attributed to the wrong pair. Returns null when absent (never zeros).
 */
export function sectorMetrics(sector: Sector, pairId: string): PairMetrics | null {
  const props = sector.properties;
  for (const field of ['metrics_by_pair', 'metrics']) {
    const container = props[field];
    if (isRec(container) && isRec(container[pairId])) return toMetrics(container[pairId] as Rec);
  }
  return null;
}

/** Approximate centre (bbox centre) of a Polygon/MultiPolygon in [lat, lon]; null if unreadable. */
export function sectorCenter(sector: Sector): [number, number] | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  const visit = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      const [lon, lat] = node as number[];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      return;
    }
    node.forEach(visit);
  };
  visit(sector.geometry.coordinates);
  return Number.isFinite(minLat) ? [(minLat + maxLat) / 2, (minLon + maxLon) / 2] : null;
}
