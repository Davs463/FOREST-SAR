import type { LatLngBounds, PolyGeometry, Zone } from '../../shared/science.types';

/** Small geometry helpers (no dependencies). Coordinates in GeoJSON order [lon, lat]; results in km. */

type Ring = [number, number][];

/** Lower-case, accent-free text for search matching. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function polygonsOf(geometry: PolyGeometry): Ring[][] {
  const raw = geometry.coordinates as unknown;
  return (geometry.type === 'Polygon' ? [raw] : raw) as Ring[][];
}

function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(lat: number, lon: number, geometry: PolyGeometry): boolean {
  return polygonsOf(geometry).some((rings) => {
    if (!inRing(lon, lat, rings[0])) return false;
    return !rings.slice(1).some((hole) => inRing(lon, lat, hole));
  });
}

function segmentKm(lat: number, lon: number, a: [number, number], b: [number, number]): number {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const ky = 110.57;
  const ax = (a[0] - lon) * kx; const ay = (a[1] - lat) * ky;
  const bx = (b[0] - lon) * kx; const by = (b[1] - lat) * ky;
  const dx = bx - ax; const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** 0 when the point lies inside; otherwise the distance to the nearest outline segment. */
export function distanceToGeometryKm(lat: number, lon: number, geometry: PolyGeometry): number {
  if (pointInGeometry(lat, lon, geometry)) return 0;
  let best = Infinity;
  for (const rings of polygonsOf(geometry)) {
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i += 1) best = Math.min(best, segmentKm(lat, lon, ring[i - 1], ring[i]));
    }
  }
  return best;
}

export function geometryBounds(geometry: PolyGeometry): LatLngBounds {
  let s = Infinity; let w = Infinity; let n = -Infinity; let e = -Infinity;
  for (const rings of polygonsOf(geometry)) {
    for (const [lon, lat] of rings[0]) {
      s = Math.min(s, lat); n = Math.max(n, lat); w = Math.min(w, lon); e = Math.max(e, lon);
    }
  }
  return [[s, w], [n, e]];
}

/** Evenly sampled outer-ring vertices (at most `cap`). */
export function sampleVertices(geometry: PolyGeometry, cap = 300): [number, number][] {
  const all: [number, number][] = [];
  for (const rings of polygonsOf(geometry)) all.push(...rings[0]);
  if (all.length <= cap) return all;
  const step = all.length / cap;
  return Array.from({ length: cap }, (_, i) => all[Math.floor(i * step)]);
}

export function boundsCenter(bounds: LatLngBounds): [number, number] {
  return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
}

export interface NearZone {
  zone: Zone;
  km: number;
}

export type PlaceSummary =
  | { status: 'outside' }
  | { status: 'inside'; near: NearZone[] };

export const NEAR_ZONE_KM = 2;

/** Zones within 2 km of a place, only when the place lies inside the valid-data area. Null when the area is unknown. */
export function summarizePlace(
  target: { lat: number; lon: number; geometry?: PolyGeometry },
  validArea: PolyGeometry | null,
  zones: Zone[],
): PlaceSummary | null {
  if (!validArea) return null;
  const points: [number, number][] = target.geometry ? [boundsCenter(geometryBounds(target.geometry)).reverse() as [number, number], ...sampleVertices(target.geometry, 200)] : [[target.lon, target.lat]];
  const inside = points.some(([lon, lat]) => pointInGeometry(lat, lon, validArea));
  if (!inside) return { status: 'outside' };
  const near: NearZone[] = [];
  for (const zone of zones) {
    let km: number;
    if (target.geometry) {
      const geometry = target.geometry;
      const covers = pointInGeometry(zone.centroid[0], zone.centroid[1], geometry);
      km = covers ? 0 : Math.min(...sampleVertices(geometry, 200).map(([lon, lat]) => distanceToGeometryKm(lat, lon, zone.geometry)));
    } else {
      km = distanceToGeometryKm(target.lat, target.lon, zone.geometry);
    }
    if (km <= NEAR_ZONE_KM) near.push({ zone, km });
  }
  near.sort((a, b) => a.km - b.km);
  return { status: 'inside', near };
}
