import { useI18n } from '../../i18n';
import { formatCount, formatSmart } from '../../shared/format';
import { zonesInScope, type PeriodData, type Scope } from './analyticsModel';
import { byInterval, periodDays, periodText, scopeText } from './labels';

interface Props { periods: PeriodData[]; selected: PeriodData; scope: Scope; onOpen: (id: string) => void }

export function Summary({ periods, selected, scope, onOpen }: Props) {
  const { t, locale } = useI18n();
  const m = selected.comparison.metrics;
  const na = t('common.notComputable');
  const num = (v: number | null, suffix = '') => { const s = formatSmart(v, locale); return s === null ? na : `${s}${suffix}`; };
  const zoneCount = (p: PeriodData) => (p.zones ? formatCount(p.zones.length, locale) : na);
  const scoped = scope.kind === 'general' ? null : zonesInScope(selected, scope);
  const ordered = byInterval(periods.map((p) => p.comparison));
  const stats: [string, string][] = [
    [t('analytics.validArea'), num(m.valid_area_ha, ` ${t('common.hectares')}`)],
    [t('analytics.candidateArea'), num(m.candidate_area_ha, ` ${t('common.hectares')}`)],
    [t('analytics.candidatePct'), num(m.candidate_pct, ' %')],
    [t('analytics.zonesCount'), zoneCount(selected)],
    [t('analytics.coverage'), num(m.coverage_pct, ' %')],
    [t('analytics.period'), `${periodText(selected.comparison, locale)} (${periodDays(selected.comparison, t)})`],
  ];
  return (
    <section className="an-card an-summary" data-testid="analytics-summary" aria-labelledby="an-summary-title">
      <h3 id="an-summary-title" className="an-card__title">{t('analytics.summaryTitle')}</h3>
      <dl className="an-stats">
        {stats.map(([label, value]) => <div key={label} className="an-stat"><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {scope.kind !== 'general' && (
        <p className="an-card__lead">
          {scoped
            ? t('analytics.scopeSummary', { scope: scopeText(t, scope), zones: formatCount(scoped.length, locale), ha: formatSmart(scoped.reduce((s, z) => s + z.area_ha, 0), locale) ?? na })
            : t('analytics.noZones')}
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <caption className="data__caption">{t('analytics.otherPeriods')}</caption>
          <thead><tr>
            <th scope="col">{t('analytics.colPeriod')}</th><th scope="col">{t('analytics.colInterval')}</th>
            <th scope="col">{t('analytics.candidateArea')}</th><th scope="col">{t('analytics.colPct')}</th><th scope="col">{t('analytics.zonesCount')}</th><th scope="col"><span className="sr-only">{t('analytics.openPeriod')}</span></th>
          </tr></thead>
          <tbody>
            {ordered.map((c) => {
              const p = periods.find((x) => x.comparison.snapshot_id === c.snapshot_id) as PeriodData;
              const isSel = c.snapshot_id === selected.comparison.snapshot_id;
              return (
                <tr key={c.snapshot_id} className={isSel ? 'is-selected' : undefined} aria-current={isSel ? 'true' : undefined}>
                  <th scope="row">{periodText(c, locale)}</th>
                  <td>{periodDays(c, t)}</td>
                  <td>{num(c.metrics.candidate_area_ha, ` ${t('common.hectares')}`)}</td>
                  <td>{num(c.metrics.candidate_pct, ' %')}</td>
                  <td>{zoneCount(p)}</td>
                  <td>{isSel ? t('analytics.openedHere') : <button type="button" className="an-open" onClick={() => onOpen(c.snapshot_id)}>{t('analytics.openPeriod')}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
