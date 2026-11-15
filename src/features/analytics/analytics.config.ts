// Parameters of the analytics view. No measured value lives here: only labels, ranges and class limits.

export const SOURCE_LABEL = 'NASA-ISRO NISAR L2 GCOV · FOREST-SAR';

export type HorizonId = '1m' | '3m' | '6m' | '1y' | '2y' | '3y';

/** Separation between two observation dates (days) that counts for each monitoring horizon. */
export const HORIZONS: readonly { id: HorizonId; minDays: number; maxDays: number }[] = [
  { id: '1m', minDays: 25, maxDays: 45 },
  { id: '3m', minDays: 75, maxDays: 105 },
  { id: '6m', minDays: 165, maxDays: 200 },
  { id: '1y', minDays: 340, maxDays: 390 },
  { id: '2y', minDays: 700, maxDays: 760 },
  { id: '3y', minDays: 1060, maxDays: 1130 },
];

export const PLACES_TOP_N = 10;
export const HISTOGRAM_BIN_DB = 0.5;
/** Grid key precision for matching 100 m cells across comparisons (decimal degrees, 5 = about 1 m). */
export const CELL_KEY_DECIMALS = 5;
/** Minimum same-baseline or consecutive processed comparisons before a trend could be considered. */
export const TREND_MIN_POINTS = 3;

import { RADAR_CLASS_COLORS } from '../../config/mapColors';
import { RADAR_CLASS_ORDER, classifyDelta, type RadarClass } from '../../shared/radarClasses';

export type IntensityId = RadarClass;

// Classes and colours come from the shared radar scale (shared/radarClasses.ts, config/mapColors.ts).
export const INTENSITY_CLASSES: readonly { id: IntensityId; color: string }[] = RADAR_CLASS_ORDER.map((id) => ({ id, color: RADAR_CLASS_COLORS[id] }));

export function intensityOf(db: number): IntensityId {
  return classifyDelta(db) ?? 'stable';
}
export function intensityColor(id: IntensityId): string {
  return RADAR_CLASS_COLORS[id];
}
