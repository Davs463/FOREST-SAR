import { useCallback, useEffect, useState } from 'react';
import { loadCells, loadSnapshot } from '../../services/science.repository';
import type { Comparison, Scene } from '../../shared/science.types';
import { mergeScenes, type PeriodData } from './analyticsModel';

export type AnalyticsData =
  | { status: 'loading' }
  | { status: 'ready'; periods: PeriodData[]; scenes: Scene[]; failed: number };

/** Loads zones, cells and catalog scenes of every processed comparison (cached by the repository). */
export function useAnalyticsData(comparisons: Comparison[], baseScenes: Scene[]): { data: AnalyticsData; retry: () => void } {
  const [data, setData] = useState<AnalyticsData>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setData({ status: 'loading' });
    (async () => {
      let failed = 0;
      const scenes: Scene[][] = [baseScenes];
      const periods = await Promise.all(comparisons.map(async (comparison): Promise<PeriodData> => {
        try {
          const snap = await loadSnapshot(comparison);
          scenes.push(snap.catalog.scenes);
          const derived = snap.derived;
          let cells = null;
          if (derived?.cellsUrl) {
            try { cells = await loadCells(derived.cellsUrl); } catch { failed += 1; }
          }
          return { comparison, zones: derived ? derived.zones : null, cells };
        } catch {
          failed += 1;
          return { comparison, zones: null, cells: null };
        }
      }));
      if (current) setData({ status: 'ready', periods, scenes: mergeScenes(scenes), failed });
    })();
    return () => { current = false; };
  }, [comparisons, baseScenes, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, retry };
}
