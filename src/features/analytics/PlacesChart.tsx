import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { formatCount, formatSmart } from '../../shared/format';
import { placeRows, type PeriodData } from './analyticsModel';
import { BarChart } from './BarChart';
import { ChartCard, ChartNote } from './ChartCard';
import { periodText } from './labels';

export function PlacesChart({ period }: { period: PeriodData | null }) {
  const { t, locale } = useI18n();
  const rows = useMemo(() => (period?.zones ? placeRows(period.zones) : null), [period]);
  const explain = t('analytics.placesExplain');
  const name = (n: string | null) => n ?? t('analytics.others');
  const items = (rows ?? []).map((row, i) => ({
    key: `${i}-${row.name ?? 'other'}`, label: name(row.name), value: row.ha, valueText: `${formatSmart(row.ha, locale) ?? ''} ${t('common.hectares')}`,
    color: row.name === null ? 'var(--muted-soft)' : 'var(--moss)',
    tip: [
      period ? t('analytics.tipPeriod', { period: periodText(period.comparison, locale) }) : '',
      t('analytics.tipValue', { value: formatSmart(row.ha, locale) ?? '', unit: t('analytics.unitHa') }),
      t('analytics.tipZonesCount', { count: formatCount(row.zones, locale) }),
      explain,
    ].filter(Boolean),
  }));
  const table = rows && rows.length > 0 ? {
    head: [t('analytics.colPlace'), t('analytics.unitZones'), t('analytics.unitHa')],
    rows: rows.map((r) => [name(r.name), formatCount(r.zones, locale), formatSmart(r.ha, locale) ?? '']),
  } : null;
  return (
    <ChartCard testId="chart-places" id="chart-places" title={t('analytics.placesTitle')} explain={explain} table={table}>
      <ChartNote tone="warn">{t('analytics.placesCaveat')}</ChartNote>
      {!rows ? <ChartNote>{t('analytics.noZones')}</ChartNote>
        : rows.length === 0 ? <ChartNote>{t('analytics.noZonesScope')}</ChartNote>
          : <BarChart items={items} orientation="h" ariaLabel={t('analytics.placesTitle')} noDataText={t('analytics.noData')} />}
    </ChartCard>
  );
}
