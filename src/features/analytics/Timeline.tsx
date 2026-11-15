import { useMemo, useState } from 'react';
import { Button } from '../../components';
import { routeHref } from '../../config/app.config';
import { useI18n } from '../../i18n';
import { formatCount } from '../../shared/format';
import { isUsed, daysApart, type DateMark } from './analyticsModel';
import { dateText, periodDays, periodText } from './labels';

interface Props { marks: DateMark[]; selectedId: string | null; onOpen: (snapshotId: string) => void }

const dayMs = (d: string) => new Date(`${d}T00:00:00Z`).getTime();

/** Interactive observation timeline: catalog dates (same orbit) and the dates used by processed comparisons. */
export function Timeline({ marks, selectedId, onOpen }: Props) {
  const { t, locale } = useI18n();
  const [picked, setPicked] = useState<string | null>(null);
  const bounds = useMemo(() => {
    if (marks.length === 0) return null;
    const start = dayMs(marks[0].date);
    const end = dayMs(marks[marks.length - 1].date);
    return { start, span: Math.max(end - start, 86_400_000) };
  }, [marks]);
  const months = useMemo(() => {
    if (!bounds) return [];
    const out: { label: string; pct: number }[] = [];
    const cursor = new Date(bounds.start);
    cursor.setUTCDate(1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    while (cursor.getTime() < bounds.start + bounds.span) {
      out.push({ label: new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(cursor), pct: ((cursor.getTime() - bounds.start) / bounds.span) * 100 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return out.length > 14 ? out.filter((_, i) => i % Math.ceil(out.length / 14) === 0) : out;
  }, [bounds, locale]);

  const current = marks.find((m) => m.date === picked) ?? null;
  const used = marks.filter(isUsed);
  const spanDays = marks.length > 1 ? daysApart(marks[0].date, marks[marks.length - 1].date) : 0;

  return (
    <section className="an-card an-timeline" data-testid="timeline" aria-labelledby="timeline-title">
      <h3 id="timeline-title" className="an-card__title">{t('analytics.timelineTitle')}</h3>
      <p className="an-card__explain">{t('analytics.timelineLede')}</p>
      {!bounds ? <p className="an-note" role="status">{t('analytics.noScenes')}</p> : (
        <>
          <p className="an-card__lead">{t('analytics.timelineSummary', { count: formatCount(marks.length, locale), used: formatCount(used.length, locale), days: formatCount(spanDays, locale) })}</p>
          <div className="an-timeline__scroll" tabIndex={0} role="region" aria-label={t('analytics.timelineTitle')}>
            <div className="an-timeline__track">
              <div className="an-timeline__line" />
              {months.map((m) => <span key={m.label + m.pct} className="an-timeline__tick" style={{ left: `${m.pct}%` }}>{m.label}</span>)}
              {marks.map((m) => {
                const pct = ((dayMs(m.date) - bounds.start) / bounds.span) * 100;
                const isUsedMark = isUsed(m);
                const label = `${dateText(m.date, locale)} · ${t('analytics.markScenes', { count: m.scenes })}${isUsedMark ? ` · ${t('analytics.markUsed')}` : ''}`;
                return (
                  <button key={m.date} type="button" className={`an-mark${isUsedMark ? ' is-used' : ''}${picked === m.date ? ' is-picked' : ''}`}
                    style={{ left: `${pct}%` }} aria-label={label} aria-pressed={picked === m.date} title={label} onClick={() => setPicked(picked === m.date ? null : m.date)} />
                );
              })}
            </div>
          </div>
          <ul className="an-legend">
            <li><span className="an-dot an-dot--used" aria-hidden="true" />{t('analytics.legendUsedDate')}</li>
            <li><span className="an-dot" aria-hidden="true" />{t('analytics.legendCatalogDate')}</li>
          </ul>
          <div className="an-timeline__detail" aria-live="polite">
            {!current ? <p className="data__muted">{t('analytics.timelineHint')}</p> : (
              <>
                <h4>{dateText(current.date, locale)}</h4>
                <p className="data__muted">{t('analytics.markScenes', { count: current.scenes })}</p>
                {!isUsed(current) ? <p className="data__muted">{t('analytics.dateNotUsed')}</p> : (
                  <ul className="an-timeline__uses">
                    {[...current.initialOf.map((c) => ({ c, role: 'initial' as const })), ...current.finalOf.map((c) => ({ c, role: 'final' as const }))].map(({ c, role }) => (
                      <li key={`${role}-${c.snapshot_id}`}>
                        <span>{role === 'initial' ? t('analytics.roleInitial') : t('analytics.roleFinal')}: {periodText(c, locale)} ({periodDays(c, t)})</span>
                        <span className="an-timeline__actions">
                          <Button variant="secondary" className="btn--sm" onClick={() => onOpen(c.snapshot_id)} aria-pressed={c.snapshot_id === selectedId}>{c.snapshot_id === selectedId ? t('analytics.openedHere') : t('analytics.openPeriod')}</Button>
                          <Button variant="ghost" className="btn--sm" href={`${routeHref('observatory')}?compare=${encodeURIComponent(c.snapshot_id)}`}>{t('analytics.openObservatory')}</Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
