import { sectorMetrics } from '../../shared/sectorMetrics';
import type { Sector } from '../../shared/science.types';

/** Friendly sector naming. No place names are invented: "Zone n" ranks candidates, grid cells are row/column. */

export interface SectorName {
  /** 1-based rank among sectors with candidate area (largest first); null for other sectors. */
  zone: number | null;
  /** 1-based row counted from the north / column counted from the west; null when the id is not E<km>_N<km>. */
  row: number | null;
  col: number | null;
  /** Original technical id. */
  id: string;
}

const ID_RE = /^E(\d+)_N(\d+)$/;

export function parseSectorId(id: string): { e: number; n: number } | null {
  const m = ID_RE.exec(id);
  return m ? { e: Number(m[1]), n: Number(m[2]) } : null;
}

/** Builds names for every sector. `pairId` is the pair whose candidate areas rank the zones. */
export function buildSectorNames(sectors: Sector[], pairId: string | null): Map<string, SectorName> {
  const parsed = sectors.map((s) => ({ id: s.sector_id, p: parseSectorId(s.sector_id) }));
  const valid = parsed.filter((x) => x.p !== null) as { id: string; p: { e: number; n: number } }[];
  const minE = valid.length ? Math.min(...valid.map((x) => x.p.e)) : 0;
  const maxN = valid.length ? Math.max(...valid.map((x) => x.p.n)) : 0;
  const ranked = pairId
    ? sectors
        .map((s) => ({ id: s.sector_id, area: sectorMetrics(s, pairId)?.candidate_area_ha ?? 0 }))
        .filter((s) => s.area > 0)
        .sort((a, b) => b.area - a.area || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    : [];
  const zoneOf = new Map(ranked.map((s, i) => [s.id, i + 1]));
  const out = new Map<string, SectorName>();
  for (const { id, p } of parsed) {
    out.set(id, { zone: zoneOf.get(id) ?? null, row: p ? maxN - p.n + 1 : null, col: p ? p.e - minE + 1 : null, id });
  }
  return out;
}

type Translate = (key: 'observatory.sectorGridName' | 'observatory.zoneName', params?: Record<string, string | number>) => string;

/** "Cuadro de 1 km · fila F, columna C" (or the raw id when it cannot be parsed). */
export function gridName(name: SectorName, t: Translate): string {
  return name.row === null || name.col === null ? name.id : t('observatory.sectorGridName', { row: name.row, col: name.col });
}

/** Short label: "Zona 3" for candidate sectors, the grid description otherwise. */
export function sectorLabel(name: SectorName | undefined, id: string, t: Translate): string {
  if (!name) return id;
  return name.zone !== null ? t('observatory.zoneName', { n: name.zone }) : gridName(name, t);
}
