import type { Locale } from '../../config/app.config';
import type { MessageKey, TFunction } from '../../i18n';
import { formatDate } from '../../shared/format';
import type { Comparison } from '../../shared/science.types';
import type { HorizonId, IntensityId } from './analytics.config';
import type { Scope } from './analyticsModel';

export const dateText = (iso: string, locale: Locale) => formatDate(iso, locale) ?? iso;

/** "12 Oct 2026 → 19 Oct 2026" (dates, never snapshot ids). */
export function periodText(c: Comparison, locale: Locale): string {
  return `${dateText(c.initial_date, locale)} → ${dateText(c.final_date, locale)}`;
}

export function periodDays(c: Comparison, t: TFunction): string {
  return c.interval_days === null ? t('common.notComputable') : t('analytics.daysValue', { days: c.interval_days });
}

export const classLabel = (t: TFunction, id: IntensityId) => t(`analytics.class.${id}` as MessageKey);
export const horizonLabel = (t: TFunction, id: HorizonId) => t(`analytics.horizon.${id}` as MessageKey);

export function scopeText(t: TFunction, scope: Scope): string {
  if (scope.kind === 'place') return t('analytics.scopePlaceValue', { place: scope.place });
  if (scope.kind === 'zone') return t('analytics.scopeZoneValue', { zone: scope.zoneId });
  return t('analytics.scopeGeneral');
}

/** Comparisons ordered by interval (all share the final date today), shortest first. */
export const byInterval = (list: Comparison[]) => [...list].sort((a, b) => (a.interval_days ?? 0) - (b.interval_days ?? 0) || a.initial_date.localeCompare(b.initial_date));
