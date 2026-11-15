import { Button } from '../../components';
import { routeHref } from '../../config/app.config';
import { useI18n } from '../../i18n';
import { formatDate, formatSmart } from '../../shared/format';
import type { ComparisonSet } from '../../services/comparisons';

export function ComparisonsTable({ set }: { set: ComparisonSet }) {
  const { t, locale } = useI18n();
  if (set.comparisons.length === 0) return <p className="data__muted" role="status">{t('data.comparisonsNone')}</p>;
  const na = '—';
  const pct = (v: number | null) => { const s = formatSmart(v, locale); return s === null ? na : `${s} %`; };
  return (
    <div>
      <p className="data__muted">{set.source === 'index' ? t('data.comparisonsIntroIndex') : t('data.comparisonsIntroManifest')}</p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th scope="col">{t('data.colPeriod')}</th><th scope="col">{t('data.colDays')}</th><th scope="col">{t('data.colOrbit')}</th>
            <th scope="col">{t('observatory.candidateArea')}</th><th scope="col">{t('observatory.candidatePct')}</th><th scope="col">{t('observatory.coverage')}</th>
            <th scope="col"><span className="sr-only">{t('data.colAction')}</span></th>
          </tr></thead>
          <tbody>
            {set.comparisons.map((c) => {
              const area = formatSmart(c.metrics.candidate_area_ha, locale);
              return (
                <tr key={c.snapshot_id}>
                  <td>{t('observatory.pairDates', { initial: formatDate(c.initial_date, locale) ?? na, final: formatDate(c.final_date, locale) ?? na })}<small className="data__id">{c.snapshot_id}</small></td>
                  <td>{c.interval_days !== null ? Math.round(c.interval_days) : na}</td>
                  <td>{c.track ?? na} / {c.frame ?? na} / {c.pass ?? na}</td>
                  <td>{area === null ? na : `${area} ${t('common.hectares')}`}</td>
                  <td>{pct(c.metrics.candidate_pct)}</td>
                  <td>{pct(c.metrics.coverage_pct)}</td>
                  <td><Button variant="secondary" className="btn--sm" href={`${routeHref('observatory')}?compare=${encodeURIComponent(c.snapshot_id)}`}>{t('data.viewInObservatory')}</Button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {set.index && set.index.excluded.length > 0 && (
        <details className="data__excluded">
          <summary>{t('data.excluded', { count: set.index.excluded.length })}</summary>
          <ul>{set.index.excluded.map((item, i) => <li key={i}><span className="data__id">{item.snapshot_id ?? na}</span> — {item.reason ?? t('common.unknown')}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
