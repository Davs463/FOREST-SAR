import type { CandidateCell, Comparison, Scene, Zone } from '../../shared/science.types';
import { CELL_KEY_DECIMALS, HISTOGRAM_BIN_DB, HORIZONS, PLACES_TOP_N, TREND_MIN_POINTS, intensityOf, type HorizonId, type IntensityId } from './analytics.config';

export type Scope = { kind: 'general' } | { kind: 'place'; place: string } | { kind: 'zone'; zoneId: string };

/** Everything loaded for one comparison. zones/cells are null when the derived products are unavailable. */
export interface PeriodData {
  comparison: Comparison;
  zones: Zone[] | null;
  cells: CandidateCell[] | null;
}

export const dayKey = (iso: string | null | undefined): string | null => (iso ? iso.slice(0, 10) : null);
const dayMs = (key: string) => new Date(`${key}T00:00:00Z`).getTime();
export const daysApart = (a: string, b: string) => Math.round(Math.abs(dayMs(a) - dayMs(b)) / 86_400_000);

export function zonesInScope(period: PeriodData, scope: Scope): Zone[] | null {
  if (!period.zones) return null;
  if (scope.kind === 'place') return period.zones.filter((zone) => zone.nearest_place?.name === scope.place);
  if (scope.kind === 'zone') return period.zones.filter((zone) => zone.zone_id === scope.zoneId);
  return period.zones;
}

export function cellsInScope(period: PeriodData, scope: Scope): CandidateCell[] | null {
  if (!period.cells) return null;
  if (scope.kind === 'general') return period.cells;
  if (scope.kind === 'zone') return period.cells.filter((cell) => cell.zone_id === scope.zoneId);
  const ids = new Set((zonesInScope(period, scope) ?? []).map((zone) => zone.zone_id));
  return period.cells.filter((cell) => cell.zone_id !== null && ids.has(cell.zone_id));
}

export function placeNames(periods: PeriodData[]): string[] {
  const names = new Set<string>();
  for (const period of periods) for (const zone of period.zones ?? []) if (zone.nearest_place?.name) names.add(zone.nearest_place.name);
  return [...names].sort((a, b) => a.localeCompare(b));
}

// ---- Histogram

export interface Bin { from: number; to: number; count: number; cls: IntensityId }

export function histogram(cells: CandidateCell[]): { bins: Bin[]; classCounts: Record<IntensityId, number>; total: number } {
  const values = cells.map((cell) => cell.delta_db).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const classCounts: Record<IntensityId, number> = { increase: 0, stable: 0, moderate: 0, strong: 0, veryStrong: 0 };
  if (values.length === 0) return { bins: [], classCounts, total: 0 };
  let min = values[0]; let max = values[0];
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  const lo = Math.floor(min / HISTOGRAM_BIN_DB);
  const hi = Math.floor(max / HISTOGRAM_BIN_DB);
  const bins: Bin[] = [];
  for (let i = lo; i <= hi; i += 1) {
    const from = i * HISTOGRAM_BIN_DB;
    bins.push({ from, to: from + HISTOGRAM_BIN_DB, count: 0, cls: intensityOf(from + HISTOGRAM_BIN_DB / 2) });
  }
  for (const v of values) {
    bins[Math.floor(v / HISTOGRAM_BIN_DB) - lo].count += 1;
    classCounts[intensityOf(v)] += 1;
  }
  return { bins, classCounts, total: values.length };
}

// ---- Places

export interface PlaceRow { name: string | null; zones: number; ha: number }

/** Top N places by hectares plus "others" (name null). Zones with no nearest place also go to others. */
export function placeRows(zones: Zone[]): PlaceRow[] {
  const map = new Map<string, PlaceRow>();
  const other: PlaceRow = { name: null, zones: 0, ha: 0 };
  for (const zone of zones) {
    const name = zone.nearest_place?.name;
    if (!name) { other.zones += 1; other.ha += zone.area_ha; continue; }
    const row = map.get(name) ?? { name, zones: 0, ha: 0 };
    row.zones += 1;
    row.ha += zone.area_ha;
    map.set(name, row);
  }
  const sorted = [...map.values()].sort((a, b) => b.ha - a.ha);
  for (const row of sorted.slice(PLACES_TOP_N)) { other.zones += row.zones; other.ha += row.ha; }
  const top = sorted.slice(0, PLACES_TOP_N);
  return other.zones > 0 ? [...top, other] : top;
}

// ---- Cells across comparisons (same extent, different initial date)

function outerRing(cell: CandidateCell): number[][] | null {
  const c = cell.geometry.coordinates as unknown;
  if (!Array.isArray(c)) return null;
  const poly = cell.geometry.type === 'MultiPolygon' ? (c as unknown[])[0] : c;
  const outer = Array.isArray(poly) ? (poly as unknown[])[0] : null;
  return Array.isArray(outer) ? (outer as number[][]) : null;
}

/** Geometric id of a cell: bbox centre rounded to 1e-5 degrees. */
export function cellKey(cell: CandidateCell): string | null {
  const points = outerRing(cell);
  if (!points || points.length === 0) return null;
  let w = Infinity; let e = -Infinity; let s = Infinity; let n = -Infinity;
  for (const p of points) {
    if (typeof p[0] !== 'number' || typeof p[1] !== 'number') return null;
    w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1]);
  }
  return `${((s + n) / 2).toFixed(CELL_KEY_DECIMALS)},${((w + e) / 2).toFixed(CELL_KEY_DECIMALS)}`;
}

export interface ZoneOverlapRow { comparison: Comparison; matched: number; meanDelta: number | null; self: boolean; available: boolean }

export function zoneOverlap(periods: PeriodData[], selectedId: string, zoneId: string): { total: number; rows: ZoneOverlapRow[] } | null {
  const base = periods.find((p) => p.comparison.snapshot_id === selectedId);
  if (!base?.cells) return null;
  const keys = new Set<string>();
  for (const cell of base.cells) {
    if (cell.zone_id !== zoneId) continue;
    const k = cellKey(cell);
    if (k) keys.add(k);
  }
  const rows = periods.map((period): ZoneOverlapRow => {
    const self = period.comparison.snapshot_id === selectedId;
    if (!period.cells) return { comparison: period.comparison, matched: 0, meanDelta: null, self, available: false };
    let matched = 0; let sum = 0; let count = 0;
    for (const cell of period.cells) {
      const k = cellKey(cell);
      if (!k || !keys.has(k)) continue;
      matched += 1;
      if (typeof cell.delta_db === 'number') { sum += cell.delta_db; count += 1; }
    }
    return { comparison: period.comparison, matched, meanDelta: count > 0 ? sum / count : null, self, available: true };
  });
  return { total: keys.size, rows };
}

// ---- Scenes

export interface OrbitKey { track: string; frame: string; pass: string }

/** Orbit/frame/pass of the processed comparisons (first complete one; they are expected to match). */
export function orbitOf(comparisons: Comparison[]): OrbitKey | null {
  const c = comparisons.find((item) => item.track !== null && item.frame !== null && item.pass !== null);
  return c ? { track: String(c.track), frame: String(c.frame), pass: String(c.pass).toUpperCase() } : null;
}

export function sameOrbit(scene: Scene, orbit: OrbitKey | null): boolean {
  return !orbit || (String(scene.track) === orbit.track && String(scene.frame) === orbit.frame && String(scene.pass ?? '').toUpperCase() === orbit.pass);
}

export function mergeScenes(lists: Scene[][]): Scene[] {
  const map = new Map<string, Scene>();
  for (const list of lists) for (const scene of list) if (!map.has(scene.id)) map.set(scene.id, scene);
  return [...map.values()];
}

export interface DateMark { date: string; scenes: number; initialOf: Comparison[]; finalOf: Comparison[] }

/** One mark per distinct date: catalog scenes (same orbit) plus every date used by a processed comparison. */
export function dateMarks(scenes: Scene[], comparisons: Comparison[], orbit: OrbitKey | null): DateMark[] {
  const map = new Map<string, DateMark>();
  const get = (date: string): DateMark => {
    let mark = map.get(date);
    if (!mark) { mark = { date, scenes: 0, initialOf: [], finalOf: [] }; map.set(date, mark); }
    return mark;
  };
  for (const scene of scenes) {
    const d = dayKey(scene.acquired_at);
    if (d && sameOrbit(scene, orbit)) get(d).scenes += 1;
  }
  for (const c of comparisons) { get(c.initial_date).initialOf.push(c); get(c.final_date).finalOf.push(c); }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const isUsed = (mark: DateMark) => mark.initialOf.length + mark.finalOf.length > 0;

export function monthCounts(marks: DateMark[]): { month: string; scenes: number; used: number }[] {
  const map = new Map<string, { month: string; scenes: number; used: number }>();
  for (const m of marks) {
    const month = m.date.slice(0, 7);
    const row = map.get(month) ?? { month, scenes: 0, used: 0 };
    row.scenes += m.scenes;
    if (isUsed(m)) row.used += 1;
    map.set(month, row);
  }
  return [...map.values()];
}

// ---- Horizons

export type HorizonStatus = 'processed' | 'inCatalog' | 'pending';
export interface HorizonRow { id: HorizonId; status: HorizonStatus; comparisons: Comparison[] }

export function horizonRows(comparisons: Comparison[], marks: DateMark[]): HorizonRow[] {
  const dates = marks.filter((m) => m.scenes > 0).map((m) => m.date);
  return HORIZONS.map((h) => {
    const processed = comparisons.filter((c) => c.interval_days !== null && c.interval_days >= h.minDays && c.interval_days <= h.maxDays);
    if (processed.length > 0) return { id: h.id, status: 'processed', comparisons: processed };
    let found = false;
    for (let i = 0; i < dates.length && !found; i += 1) {
      for (let j = i + 1; j < dates.length; j += 1) {
        const d = daysApart(dates[i], dates[j]);
        if (d >= h.minDays && d <= h.maxDays) { found = true; break; }
      }
    }
    return { id: h.id, status: found ? 'inCatalog' : 'pending', comparisons: [] };
  });
}

// ---- Trend

/** The final date when every processed comparison ends on the same day, else null. */
export function sharedFinalDate(comparisons: Comparison[]): string | null {
  if (comparisons.length < 2) return null;
  const first = comparisons[0].final_date;
  return comparisons.every((c) => c.final_date === first) ? first : null;
}

/** True only if processed comparisons share a fixed baseline with several end dates, or chain end-to-start. */
export function hasTrendBasis(comparisons: Comparison[]): boolean {
  const byInitial = new Map<string, Set<string>>();
  for (const c of comparisons) {
    const set = byInitial.get(c.initial_date) ?? new Set<string>();
    set.add(c.final_date);
    byInitial.set(c.initial_date, set);
  }
  if ([...byInitial.values()].some((set) => set.size >= TREND_MIN_POINTS)) return true;
  const next = new Map<string, string[]>();
  for (const c of comparisons) next.set(c.initial_date, [...(next.get(c.initial_date) ?? []), c.final_date]);
  const longest = (date: string, depth: number): number => Math.max(depth, ...(next.get(date) ?? []).map((end) => longest(end, depth + 1)));
  return [...next.keys()].some((start) => longest(start, 1) >= TREND_MIN_POINTS);
}
