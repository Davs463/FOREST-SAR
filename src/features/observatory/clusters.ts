import type { BBox, LatLng, Zone } from '../../shared/science.types';

/** Pixel distance under which zone centroids are merged into one bubble. */
export const CLUSTER_RADIUS_PX = 56;
/** From this zoom on every zone is drawn as its real polygon. */
export const POLYGON_ZOOM = 14;

export interface ZoneCluster {
  /** Stable for a given member set. */
  id: string;
  zones: Zone[];
  center: LatLng;
  /** Union of the member bboxes. */
  bbox: BBox;
}

export function unionBBox(zones: readonly Zone[]): BBox {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const zone of zones) {
    w = Math.min(w, zone.bbox[0]); s = Math.min(s, zone.bbox[1]);
    e = Math.max(e, zone.bbox[2]); n = Math.max(n, zone.bbox[3]);
  }
  return [w, s, e, n];
}

/**
 * Greedy clustering by pixel distance. Largest zones seed first (deterministic), each seed absorbs every
 * unassigned zone whose centroid lies within `radiusPx` of the seed. `project` maps [lat, lon] to pixels at the current zoom.
 */
export function clusterZones(zones: readonly Zone[], project: (latlng: LatLng) => { x: number; y: number }, radiusPx = CLUSTER_RADIUS_PX): ZoneCluster[] {
  const items = zones
    .map((zone) => ({ zone, p: project(zone.centroid), taken: false }))
    .sort((a, b) => b.zone.area_ha - a.zone.area_ha || a.zone.zone_id.localeCompare(b.zone.zone_id));
  const out: ZoneCluster[] = [];
  for (const seed of items) {
    if (seed.taken) continue;
    seed.taken = true;
    const members = [seed];
    for (const other of items) {
      if (other.taken) continue;
      if (Math.hypot(other.p.x - seed.p.x, other.p.y - seed.p.y) <= radiusPx) { other.taken = true; members.push(other); }
    }
    const list = members.map((m) => m.zone);
    const lat = list.reduce((sum, z) => sum + z.centroid[0], 0) / list.length;
    const lon = list.reduce((sum, z) => sum + z.centroid[1], 0) / list.length;
    out.push({ id: list.map((z) => z.zone_id).sort().join('+'), zones: list, center: [lat, lon], bbox: unionBBox(list) });
  }
  return out;
}

/**
 * Total area of a set of zones. Each candidate cell belongs to exactly ONE zone, so summing area_ha over
 * different zones never counts a cell twice (the sum over all zones equals metrics.candidate_area_ha).
 */
export function totalAreaHa(zones: readonly Zone[]): number {
  return zones.reduce((sum, zone) => sum + zone.area_ha, 0);
}

/** Dev-only consistency check: the area of all zones must match the published candidate area. */
export function checkZoneAreaSum(zones: readonly Zone[], candidateAreaHa: number | null | undefined): void {
  if (typeof candidateAreaHa !== 'number' || zones.length === 0) return;
  const sum = totalAreaHa(zones);
  if (Math.abs(sum - candidateAreaHa) > Math.max(0.05, candidateAreaHa * 0.005)) {
    console.warn(`[zones] sum of zone areas (${sum.toFixed(2)} ha) differs from candidate_area_ha (${candidateAreaHa} ha)`);
  }
}

export interface ReferenceSummary {
  /** Most frequent reference name, null when none. */
  top: string | null;
  /** True when every zone with a reference shares the same one. */
  unique: boolean;
  /** True when references are mixed and none dominates (> half of the referenced zones). */
  several: boolean;
}

export function zoneReference(zone: Zone): string | null {
  return zone.within_area?.name ?? zone.nearest_place?.name ?? null;
}

export function summarizeReferences(zones: readonly Zone[]): ReferenceSummary {
  const counts = new Map<string, number>();
  for (const zone of zones) {
    const name = zoneReference(zone);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (counts.size === 0) return { top: null, unique: false, several: false };
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const referenced = [...counts.values()].reduce((a, b) => a + b, 0);
  const [name, n] = ranked[0];
  if (counts.size === 1) return { top: name, unique: true, several: false };
  return n > referenced / 2 ? { top: name, unique: false, several: false } : { top: null, unique: false, several: true };
}
