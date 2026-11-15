import { daysBetween } from '../../shared/format';
import type { Catalog, CatalogPair, Comparison } from '../../shared/science.types';

export interface PairRow {
  pair: CatalogPair;
  initialDate: string | null;
  finalDate: string | null;
  days: number | null;
  track: number | string | null;
  pass: string | null;
}

/** Catalogue pairs with dates derived from catalog.scenes by initial_id / final_id. */
export function buildPairRows(catalog: Catalog): PairRow[] {
  const scenes = new Map(catalog.scenes.map((scene) => [scene.id, scene]));
  return catalog.pairs.map((pair) => {
    const first = pair.initial_id ? scenes.get(pair.initial_id) : undefined;
    const last = pair.final_id ? scenes.get(pair.final_id) : undefined;
    const initialDate = first?.acquired_at ?? null;
    const finalDate = last?.acquired_at ?? null;
    return { pair, initialDate, finalDate, days: daysBetween(initialDate, finalDate), track: first?.track ?? null, pass: first?.pass ?? null };
  });
}

/** Compatible catalogue pairs that have no processed comparison in the index. */
export function splitPairs(rows: PairRow[], comparisons: Comparison[]): { pending: PairRow[]; incompatible: PairRow[] } {
  const ids = new Set(comparisons.map((c) => c.pair_id));
  const scenePairs = new Set(comparisons.filter((c) => c.initial_id && c.final_id).map((c) => `${c.initial_id}|${c.final_id}`));
  const pending: PairRow[] = [];
  const incompatible: PairRow[] = [];
  for (const row of rows) {
    if (row.pair.status !== 'compatible') incompatible.push(row);
    else if (!ids.has(row.pair.id) && !scenePairs.has(`${row.pair.initial_id}|${row.pair.final_id}`)) pending.push(row);
  }
  const byDate = (a: PairRow, b: PairRow) => (b.finalDate ?? '').localeCompare(a.finalDate ?? '') || (b.initialDate ?? '').localeCompare(a.initialDate ?? '');
  return { pending: pending.sort(byDate), incompatible: incompatible.sort(byDate) };
}
