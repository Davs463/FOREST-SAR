/**
 * Radar intensity classes for the mean signal change (delta, dB) of a candidate zone.
 *
 * Only two published numbers back this: the detection threshold (3 dB, `params.threshold_db`) and the
 * diverging +/-6 dB scale of the delta visualisation. The -4.5 and -6 dB cuts are PRESENTATION cuts
 * (exploratory, half and full scale of that visualisation). They are not damage levels, not loss
 * percentages and say nothing about the cause: the radar only says the signal dropped.
 *
 * This is independent of the vegetation-cover semaphore (shared/semaphore.ts, fed by TP).
 */
export type RadarClass = 'increase' | 'stable' | 'moderate' | 'strong' | 'veryStrong';

/** Classes ordered from the strongest signal increase to the strongest decrease. */
export const RADAR_CLASS_ORDER: readonly RadarClass[] = ['increase', 'stable', 'moderate', 'strong', 'veryStrong'];

/** Published detection threshold (dB). */
export const PUBLISHED_THRESHOLD_DB = 3;
/** Presentation cuts (dB), see the note above. */
export const STRONG_CUT_DB = -4.5;
export const VERY_STRONG_CUT_DB = -6;

/** Returns null when there is no finite value (shown as "no data", never as "stable"). */
export function classifyDelta(db: number | null | undefined, thresholdDb: number = PUBLISHED_THRESHOLD_DB): RadarClass | null {
  if (typeof db !== 'number' || !Number.isFinite(db)) return null;
  if (db >= thresholdDb) return 'increase'; // stronger signal: NOT recovery
  if (db > -thresholdDb) return 'stable'; // inside the threshold: not a candidate
  if (db > STRONG_CUT_DB) return 'moderate';
  if (db > VERY_STRONG_CUT_DB) return 'strong';
  return 'veryStrong';
}
