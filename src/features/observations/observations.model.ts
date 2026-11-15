import { sectorCenter, sectorMetrics } from '../../shared/sectorMetrics';
import { classifyDelta } from '../../shared/radarClasses';
import { normalizeText } from '../observatory/geo';
import type { Comparison, PairMetrics, Results, SectorCollection, Zone } from '../../shared/science.types';

export interface Observation {
  id: string;
  type: 'satellite_candidate';
  sectorId: string;
  regionId: string | null;
  pairId: string;
  initialDate: string | null;
  finalDate: string | null;
  source: string | null;
  metrics: PairMetrics;
  evidenceLevel: string | number | null;
  limitations: string[];
  center: [number, number] | null;
}

/** One observation per (pair, sector) whose candidate area is a real positive number. */
export function deriveObservations(results: Results, sectors: SectorCollection | null): Observation[] {
  if (!sectors) return [];
  const out: Observation[] = [];
  for (const pair of results.pairs) {
    for (const sector of sectors.features) {
      const metrics = sectorMetrics(sector, pair.pair_id);
      if (!metrics || metrics.candidate_area_ha === null || metrics.candidate_area_ha <= 0) continue;
      out.push({
        id: `${pair.pair_id}:${sector.sector_id}`,
        type: 'satellite_candidate',
        sectorId: sector.sector_id,
        regionId: sector.region_id ?? pair.region_id,
        pairId: pair.pair_id,
        initialDate: pair.initial_date,
        finalDate: pair.final_date,
        source: pair.source,
        metrics,
        evidenceLevel: pair.evidence_level,
        limitations: pair.limitations,
        center: sectorCenter(sector),
      });
    }
  }
  return out;
}

// Neutralise spreadsheet formula injection and quote per RFC 4180.
function cell(value: string | number | null): string {
  if (value === null) return '';
  let text = String(value);
  // Numbers are written as-is (a negative dB value or longitude must stay numeric for analysis);
  // only free text that starts like a formula is neutralised.
  if (typeof value !== 'number' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildCsv(rows: Observation[]): string {
  const header = ['observation_id', 'type', 'sector_id', 'region_id', 'pair_id', 'initial_date', 'final_date', 'source',
    'candidate_area_ha', 'candidate_pct', 'valid_area_ha', 'coverage_pct', 'center_lat', 'center_lon', 'evidence_level', 'limitations'];
  const lines = rows.map((row) => [
    row.id, row.type, row.sectorId, row.regionId, row.pairId, row.initialDate, row.finalDate, row.source,
    row.metrics.candidate_area_ha, row.metrics.candidate_pct, row.metrics.valid_area_ha, row.metrics.coverage_pct,
    row.center?.[0] ?? null, row.center?.[1] ?? null, row.evidenceLevel, row.limitations.join(' | '),
  ].map((value) => cell(value as string | number | null)).join(','));
  return [header.join(','), ...lines].join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- candidate zones grouped by nearest place

export interface PlaceGroup {
  /** Normalised key; '' = no nearby place. */
  key: string;
  /** Verified OSM place name; null for "no nearby place" (translated by the view). */
  name: string | null;
  /** Observations ordered by area, largest first (position + 1 is the number shown inside the place). */
  zones: Zone[];
  /** Exact sum of the zones' area_ha. */
  totalHa: number;
}

/** Groups zones by `nearest_place.name`; zones without a reference go to the last group. */
export function groupZonesByPlace(zones: Zone[]): PlaceGroup[] {
  const map = new Map<string, PlaceGroup>();
  for (const zone of zones) {
    const name = zone.nearest_place?.name?.trim() || null;
    const key = name ? normalizeText(name) : '';
    const group = map.get(key) ?? { key, name, zones: [], totalHa: 0 };
    group.zones.push(zone);
    group.totalHa += zone.area_ha;
    map.set(key, group);
  }
  const groups = [...map.values()];
  for (const group of groups) {
    group.zones.sort((a, b) => b.area_ha - a.area_ha || a.zone_id.localeCompare(b.zone_id, undefined, { numeric: true }));
    group.totalHa = Math.round(group.totalHa * 1e6) / 1e6;
  }
  // Largest candidate area first (most relevant to inspect); "no nearby locality" always last.
  return groups.sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : b.totalHa - a.totalHa || (a.name ?? '').localeCompare(b.name ?? '')));
}

const ZONE_CSV_HEADER = ['zone_id', 'localidad', 'distancia_km', 'area_ha', 'cell_count', 'mean_delta_db', 'min_delta_db', 'clase',
  'centroid_lat', 'centroid_lon', 'initial_date', 'final_date', 'snapshot_id'];

export function buildZonesCsv(zones: Zone[], comparison: Comparison, thresholdDb: number): string {
  const lines = zones.map((zone) => [
    zone.zone_id, zone.nearest_place?.name ?? null, zone.nearest_place?.distance_km ?? null, zone.area_ha, zone.cell_count,
    zone.mean_delta_db, zone.min_delta_db, classifyDelta(zone.mean_delta_db, thresholdDb), zone.centroid[0], zone.centroid[1],
    comparison.initial_date, comparison.final_date, comparison.snapshot_id,
  ].map((value) => cell(value as string | number | null)).join(','));
  return [ZONE_CSV_HEADER.join(','), ...lines].join('\r\n');
}
