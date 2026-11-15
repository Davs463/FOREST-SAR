import type { Comparison, Scene } from '../../shared/science.types';

/** Pure helpers for the period selector. Only comparisons that really exist are ever returned. */

export interface Picks {
  initial: string | null;
  final: string | null;
}

export type ShortcutId = 'd12' | 'm1' | 'm2' | 'm3';
export const SHORTCUTS: readonly { id: ShortcutId; min: number; max: number }[] = [
  { id: 'd12', min: 10, max: 14 },
  { id: 'm1', min: 24, max: 40 },
  { id: 'm2', min: 50, max: 70 },
  { id: 'm3', min: 80, max: 100 },
];

const DAY = 86_400_000;
const dayMs = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
export const daysBetweenDates = (a: string, b: string) => Math.round((dayMs(b) - dayMs(a)) / DAY);

export function intervalDays(c: Comparison): number {
  return c.interval_days !== null ? Math.round(c.interval_days) : daysBetweenDates(c.initial_date, c.final_date);
}

const newestFirst = (a: Comparison, b: Comparison) => b.final_date.localeCompare(a.final_date) || b.initial_date.localeCompare(a.initial_date);

/** Newest-ending comparison whose interval falls in the shortcut range; null when none was processed. */
export function shortcutTarget(comparisons: Comparison[], id: ShortcutId): Comparison | null {
  const range = SHORTCUTS.find((item) => item.id === id);
  if (!range) return null;
  return comparisons.filter((c) => { const d = intervalDays(c); return d >= range.min && d <= range.max; }).sort(newestFirst)[0] ?? null;
}

/** ~3 months when processed, otherwise the comparison with the most recent final date. */
export function defaultComparison(comparisons: Comparison[]): Comparison | null {
  return shortcutTarget(comparisons, 'm3') ?? [...comparisons].sort(newestFirst)[0] ?? null;
}

export function findComparison(comparisons: Comparison[], picks: Picks): Comparison | null {
  if (!picks.initial || !picks.final) return null;
  return comparisons.find((c) => c.initial_date === picks.initial && c.final_date === picks.final) ?? null;
}

/** Up to `max` real comparisons closest to the requested dates (total day difference over both dates). */
export function nearestComparisons(comparisons: Comparison[], picks: Picks, max = 3): Comparison[] {
  if (!picks.initial || !picks.final) return [];
  const { initial, final } = picks;
  const distance = (c: Comparison) => Math.abs(daysBetweenDates(initial, c.initial_date)) + Math.abs(daysBetweenDates(final, c.final_date));
  return [...comparisons].sort((a, b) => distance(a) - distance(b) || newestFirst(a, b)).slice(0, max);
}

/** All observation dates of the selected comparison's orbit (track + frame + pass) plus the dates of every processed comparison. */
export function observationDates(comparisons: Comparison[], reference: Comparison | null, scenes: Scene[]): string[] {
  const dates = new Set<string>();
  for (const c of comparisons) { dates.add(c.initial_date); dates.add(c.final_date); }
  if (reference) {
    const same = (a: unknown, b: unknown) => (a === null || a === undefined ? b === null || b === undefined : String(a) === String(b));
    for (const scene of scenes) {
      if (!scene.acquired_at || !same(scene.track, reference.track) || !same(scene.frame, reference.frame) || !same(scene.pass, reference.pass)) continue;
      dates.add(scene.acquired_at.slice(0, 10));
    }
  }
  return [...dates].sort();
}

/** Does any processed comparison pair `date` (as initial or final, per `role`) with `other`? */
export function hasResults(comparisons: Comparison[], role: 'initial' | 'final', date: string, other: string | null): boolean {
  return comparisons.some((c) => (role === 'initial' ? c.initial_date === date && (other === null || c.final_date === other) : c.final_date === date && (other === null || c.initial_date === other)));
}
