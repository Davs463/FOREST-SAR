import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { formatCount } from '../../shared/format';
import { INTENSITY_CLASSES, intensityColor } from './analytics.config';
import { cellsInScope, histogram, type PeriodData, type Scope } from './analyticsModel';
import { BarChart } from './BarChart';
import { ChartCard, ChartNote } from './ChartCard';
import { classLabel, periodText } from './labels';

interface Props { period: PeriodData | null; scope: Scope }

export function IntensityChart({ period, scope }: Props) {
  const { t, locale } = useI18n();
  const cells = period ? cellsInScope(period, scope) : null;
  const hist = useMemo(() => (cells ? histogram(cells) : null), [cells]);
  const explain = t('analytics.intensityExplain');
  const range = (from: number, to: number) => t('analytics.binRange', { from: from.toFixed(1), to: to.toFixed(1) });

  const items = (hist?.bins ?? []).map((bin) => ({
    key: String(bin.from), label: bin.from.toFixed(1), value: bin.count, valueText: formatCount(bin.count, locale),
    color: intensityColor(bin.cls),
    tip: [
      period ? t('analytics.tipPeriod', { period: periodText(period.comparison, locale) }) : '',
      t('analytics.tipValue', { value: formatCount(bin.count, locale), unit: t('analytics.unitCells') }),
      `${range(bin.from, bin.to)} · ${classLabel(t, bin.cls)}`,
      explain,
    ].filter(Boolean),
  }));
  const table = hist && hist.total > 0 ? {
    head: [t('analytics.colRange'), t('analytics.colClass'), t('analytics.unitCells')],
    rows: hist.bins.map((b) => [range(b.from, b.to), classLabel(t, b.cls), formatCount(b.count, locale)]),
  } : null;

  return (
    <ChartCard testId="chart-intensity" id="chart-intensity" title={t('analytics.intensityTitle')} explain={explain} table={table}>
      {!period || !cells ? <ChartNote>{t('analytics.noCells')}</ChartNote>
        : !hist || hist.total === 0 ? <ChartNote>{t('analytics.noCellsScope')}</ChartNote> : (
          <>
            <BarChart items={items} ariaLabel={t('analytics.intensityTitle')} noDataText={t('analytics.noData')} />
            <p className="an-axis-note">{t('analytics.intensityAxis')}</p>
            <ul className="an-legend">
              {INTENSITY_CLASSES.map((c) => (
                <li key={c.id}><span className="an-swatch" style={{ background: c.color }} aria-hidden="true" />{classLabel(t, c.id)}: <strong>{formatCount(hist.classCounts[c.id], locale)}</strong></li>
              ))}
            </ul>
          </>
        )}
    </ChartCard>
  );
}
