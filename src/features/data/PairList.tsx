import { useMemo, useState } from 'react';
import { StatusBadge } from '../../components';
import { useI18n } from '../../i18n';
import { formatCount, formatDate } from '../../shared/format';
import { pairReasonClauses } from '../../shared/scienceText';
import { Pager, slicePage } from './Pager';
import type { PairRow } from './pairs';

/** Searchable, filterable, paginated (20 per page) list of catalogue pairs. */
export function PairList({ rows, kind }: { rows: PairRow[]; kind: 'pending' | 'incompatible' }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const withReasons = useMemo(() => rows.map((row) => ({ row, reasons: kind === 'incompatible' ? pairReasonClauses(row.pair.reason, locale) : [] })), [rows, kind, locale]);
  const reasonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of withReasons) for (const clause of new Set(item.reasons)) counts.set(clause, (counts.get(clause) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [withReasons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withReasons.filter(({ row, reasons }) => {
      if (reason && !reasons.includes(reason)) return false;
      if (!q) return true;
      return [row.pair.id, row.pair.initial_id, row.pair.final_id, row.initialDate?.slice(0, 10), row.finalDate?.slice(0, 10),
        formatDate(row.initialDate, 'es'), formatDate(row.initialDate, 'en'), formatDate(row.finalDate, 'es'), formatDate(row.finalDate, 'en'), ...reasons]
        .some((value) => value?.toLowerCase().includes(q));
    });
  }, [withReasons, query, reason]);

  if (rows.length === 0) return <p className="data__muted" role="status">{kind === 'pending' ? t('data.pendingNone') : t('data.incompatibleNone')}</p>;
  return (
    <div>
      <p className="data__muted">{kind === 'pending' ? t('data.pendingIntro') : t('data.incompatibleIntro')}</p>
      <label className="data__search">{t('data.search')}
        <input type="search" value={query} placeholder={t('data.searchPairsPlaceholder')} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
      </label>
      {reasonCounts.length > 1 && (
        <div className="data__filters" role="group" aria-label={t('data.filterReason')}>
          <button type="button" className="data__chip" aria-pressed={reason === null} onClick={() => { setReason(null); setPage(1); }}>{t('data.filterAll')} ({formatCount(rows.length, locale)})</button>
          {reasonCounts.map(([clause, count]) => (
            <button key={clause} type="button" className="data__chip" aria-pressed={reason === clause} onClick={() => { setReason(clause); setPage(1); }}>{clause} ({formatCount(count, locale)})</button>
          ))}
        </div>
      )}
      <p className="data__muted" role="status">{t('data.shown', { count: formatCount(filtered.length, locale) })}</p>
      {filtered.length === 0 ? <p className="data__muted">{t('data.none')}</p> : (
        <ul className="data__rows">
          {slicePage(filtered, page).map(({ row, reasons }) => (
            <li key={row.pair.id} className="data__row">
              <div className="data__row-main">
                <strong>{t('observatory.pairDates', { initial: formatDate(row.initialDate, locale) ?? '—', final: formatDate(row.finalDate, locale) ?? '—' })}</strong>
                {row.days !== null && <span className="data__muted">{t('observatory.pairDays', { days: row.days })}</span>}
                {kind === 'pending' ? <StatusBadge tone="info">{t('observatory.statusPending')}</StatusBadge> : <StatusBadge tone="warn">{t('observatory.statusIncompatible')}</StatusBadge>}
              </div>
              {kind === 'incompatible' && <p className="data__reason">{reasons.length > 0 ? reasons.join('; ') : t('observatory.pairReasonUnknown')}</p>}
              <small className="data__id">{t('data.id')}: {row.pair.id}</small>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} total={filtered.length} onPage={setPage} />
    </div>
  );
}
