export type RiskLevel = 'gain' | 'stable' | 'watch' | 'caution' | 'high' | 'veryHigh';

// Experimental team cut-offs from docs/CONTRATO_CIENTIFICO.md section 4 (TP in percent).
// Applies only to a real TP; radar candidates are never fed into it.
export const RISK_CUTOFFS = [2, 5, 10, 18] as const;
export const RISK_ORDER: readonly RiskLevel[] = ['gain', 'stable', 'watch', 'caution', 'high', 'veryHigh'];

/** Returns null (grey "not evaluated") when TP is missing or not finite. */
export function classifyLoss(tp: number | null | undefined): RiskLevel | null {
  if (typeof tp !== 'number' || !Number.isFinite(tp)) return null;
  if (tp < 0) return 'gain';
  if (tp <= 2) return 'stable';
  if (tp <= 5) return 'watch';
  if (tp <= 10) return 'caution';
  if (tp <= 18) return 'high';
  return 'veryHigh';
}
