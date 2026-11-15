import { useI18n } from '../../i18n';
import { formatCount, formatSmart } from '../../shared/format';
import type { BarItem } from './BarChart';
import { BarChart } from './BarChart';
import { ChartCard, ChartNote } from './ChartCard';
import { byInterval, periodDays, periodText } from './labels';
import { zonesInScope, type PeriodData, type Scope } from './analyticsModel';

interface Props { periods: PeriodData[]; scope: Scope; selectedId: string | null }

type Metric = 'area' | 'zones';

function valueOf(period: PeriodData, scope: Scope, metric: Metric): number | null {
  // A zone id belongs to one comparison, so zone scope falls back to the whole territory here.
  const effective: Scope = scope.kind === 'place' ? scope : { kind: 'general' };
  if (metric === 'area' && effective.kind === 'general') return period.comparison.metrics.candidate_area_ha;
  const zones = zonesInScope(period, effective);
  if (!zones) return null;
  return metric === 'zones' ? zones.length : zones.reduce((sum, zone) => sum + zone.area_ha, 0);
}

function PeriodBars({ periods, scope, selectedId, metric }: Props & { metric: Metric }) {
  const { t, locale } = useI18n();
  const sorted = byInterval(periods.map((p) => p.comparison)).map((c) => periods.find((p) => p.comparison.snapshot_id === c.snapshot_id) as PeriodData);
  const isArea = metric === 'area';
  const unit = isArea ? t('analytics.unitHa') : t('analytics.unitZones');
  const explain = isArea ? t('analytics.areaExplain') : t('analytics.zonesExplain');
  const fmt = (v: number) => (isArea ? formatSmart(v, locale) ?? '' : formatCount(v, locale));
  const items: BarItem[] = sorted.map((p) => {
    const v = valueOf(p, scope, metric);
    const c = p.comparison;
    return {
      key: c.snapshot_id, label: periodDays(c, t), value: v, valueText: v === null ? '' : fmt(v),
      highlight: c.snapshot_id === selectedId,
      tip: [
        t('analytics.tipPeriod', { period: periodText(c, locale) }),
        t('analytics.tipValue', { value: v === null ? t('common.notComputable') : fmt(v), unit }),
        explain,
      ],
    };
  });
  const id = isArea ? 'chart-area' : 'chart-zones';
  const table = {
    head: [t('analytics.colPeriod'), t('analytics.colInterval'), unit],
    rows: sorted.map((p) => { const v = valueOf(p, scope, metric); return [periodText(p.comparison, locale), periodDays(p.comparison, t), v === null ? t('common.notComputable') : fmt(v)]; }),
  };
  return (
    <ChartCard testId={id} id={id} title={isArea ? t('analytics.areaTitle') : t('analytics.zonesTitle')} explain={explain} table={table}>
      {scope.kind === 'zone' && <ChartNote>{t('analytics.zoneScopeFallback')}</ChartNote>}
      {scope.kind === 'place' && <ChartNote>{t('analytics.placeScopeNote', { place: scope.place })}</ChartNote>}
      <BarChart items={items} ariaLabel={isArea ? t('analytics.areaTitle') : t('analytics.zonesTitle')} noDataText={t('analytics.noData')} />
    </ChartCard>
  );
}

export function AreaChart(props: Props) { return <PeriodBars {...props} metric="area" />; }
export function ZonesChart(props: Props) { return <PeriodBars {...props} metric="zones" />; }
