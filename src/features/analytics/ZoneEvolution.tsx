import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { formatCount, formatSmart } from '../../shared/format';
import { zoneOverlap, type PeriodData } from './analyticsModel';
import { BarChart } from './BarChart';
import { ChartCard, ChartNote } from './ChartCard';
import { byInterval, periodDays, periodText } from './labels';

interface Props { periods: PeriodData[]; selectedId: string | null; zoneId: string | null }

/** Same extent, different initial date: NOT a time series of the zone. */
export function ZoneEvolution({ periods, selectedId, zoneId }: Props) {
  const { t, locale } = useI18n();
  const overlap = useMemo(() => (selectedId && zoneId ? zoneOverlap(periods, selectedId, zoneId) : null), [periods, selectedId, zoneId]);
  const explain = t('analytics.zoneExplain');
  const rows = overlap ? byInterval(overlap.rows.map((r) => r.comparison)).map((c) => overlap.rows.find((r) => r.comparison.snapshot_id === c.snapshot_id)!) : [];
  const meanText = (v: number | null) => (v === null ? t('common.notComputable') : `${formatSmart(v, locale)} dB`);

  const items = rows.map((r) => ({
    key: r.comparison.snapshot_id, label: periodDays(r.comparison, t), value: r.available ? r.matched : null,
    valueText: formatCount(r.matched, locale), highlight: r.self,
    tip: [
      t('analytics.tipPeriod', { period: periodText(r.comparison, locale) }),
      t('analytics.zoneMatched', { matched: formatCount(r.matched, locale), total: formatCount(overlap?.total ?? 0, locale) }),
      t('analytics.zoneMean', { value: meanText(r.meanDelta) }),
      explain,
    ],
  }));
  const table = overlap ? {
    head: [t('analytics.colPeriod'), t('analytics.colMatched'), t('analytics.colMeanDelta')],
    rows: rows.map((r) => [periodText(r.comparison, locale) + (r.self ? ` (${t('analytics.thisPeriod')})` : ''), r.available ? formatCount(r.matched, locale) : t('analytics.noData'), meanText(r.meanDelta)]),
  } : null;

  let body;
  if (!zoneId) body = <ChartNote>{t('analytics.zonePick')}</ChartNote>;
  else if (!overlap) body = <ChartNote>{t('analytics.zoneNoData')}</ChartNote>;
  else if (overlap.total === 0) body = <ChartNote>{t('analytics.zoneNoCells', { zone: zoneId })}</ChartNote>;
  else {
    const others = rows.filter((r) => !r.self && r.available);
    body = (
      <>
        <p className="an-card__lead">{t('analytics.zoneCells', { zone: zoneId, count: formatCount(overlap.total, locale) })}</p>
        <BarChart items={items} ariaLabel={t('analytics.zoneTitle')} noDataText={t('analytics.noData')} />
        {others.length > 0 && others.every((r) => r.matched === 0) && <ChartNote>{t('analytics.zoneNoMatch')}</ChartNote>}
      </>
    );
  }
  return (
    <ChartCard testId="zone-evolution" id="zone-evolution" title={t('analytics.zoneTitle')} explain={explain} table={table}>
      <ChartNote tone="warn">{t('analytics.zoneCaveat')}</ChartNote>
      {body}
    </ChartCard>
  );
}
