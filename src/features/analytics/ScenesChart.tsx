import { useI18n } from '../../i18n';
import { formatCount } from '../../shared/format';
import { monthCounts, type DateMark, type OrbitKey } from './analyticsModel';
import { BarChart } from './BarChart';
import { ChartCard, ChartNote } from './ChartCard';

export function ScenesChart({ marks, orbit }: { marks: DateMark[]; orbit: OrbitKey | null }) {
  const { t, locale } = useI18n();
  const months = monthCounts(marks).filter((m) => m.scenes > 0 || m.used > 0);
  const explain = orbit
    ? t('analytics.scenesExplain', { track: orbit.track, frame: orbit.frame, pass: orbit.pass })
    : t('analytics.scenesExplainNoOrbit');
  const monthName = (m: string) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`));
  const items = months.map((m) => ({
    key: m.month, label: `${m.month.slice(5)}/${m.month.slice(2, 4)}`, value: m.scenes, valueText: formatCount(m.scenes, locale),
    color: m.used > 0 ? 'var(--forest)' : 'var(--moss)', highlight: m.used > 0,
    tip: [
      monthName(m.month),
      t('analytics.tipValue', { value: formatCount(m.scenes, locale), unit: t('analytics.unitScenes') }),
      m.used > 0 ? t('analytics.monthUsed', { count: m.used }) : t('analytics.monthNotUsed'),
      explain,
    ],
  }));
  const table = months.length > 0 ? {
    head: [t('analytics.colMonth'), t('analytics.unitScenes'), t('analytics.colUsedDates')],
    rows: months.map((m) => [monthName(m.month), formatCount(m.scenes, locale), m.used]),
  } : null;
  return (
    <ChartCard testId="chart-scenes" id="chart-scenes" title={t('analytics.scenesTitle')} explain={explain} table={table}>
      {months.length === 0 ? <ChartNote>{t('analytics.noScenes')}</ChartNote> : (
        <>
          <BarChart items={items} ariaLabel={t('analytics.scenesTitle')} noDataText={t('analytics.noData')} />
          <ul className="an-legend">
            <li><span className="an-swatch" style={{ background: 'var(--forest)' }} aria-hidden="true" />{t('analytics.legendUsed')}</li>
            <li><span className="an-swatch" style={{ background: 'var(--moss)' }} aria-hidden="true" />{t('analytics.legendCatalog')}</li>
          </ul>
        </>
      )}
    </ChartCard>
  );
}
