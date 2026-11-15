import { useMemo } from 'react';
import { Button } from '../../components';
import { useI18n, type MessageKey } from '../../i18n';
import { formatDate } from '../../shared/format';
import type { Comparison, Scene } from '../../shared/science.types';
import { SHORTCUTS, daysBetweenDates, defaultComparison, hasResults, intervalDays, nearestComparisons, observationDates, shortcutTarget, type Picks, type ShortcutId } from './period';

const SHORTCUT_LABEL: Record<ShortcutId, MessageKey> = {
  d12: 'observatory.shortcut12d',
  m1: 'observatory.shortcut1m',
  m2: 'observatory.shortcut2m',
  m3: 'observatory.shortcut3m',
};

interface Props {
  comparisons: Comparison[];
  selected: Comparison | null;
  scenes: Scene[];
  picks: Picks;
  onPicks: (picks: Picks) => void;
}

/** "Initial date" / "Final date" selectors, quick-period shortcuts and the period summary. Controlled by the observatory. */
export function PeriodPicker({ comparisons, selected, scenes, picks, onPicks }: Props) {
  const { t, locale } = useI18n();
  const reference = selected ?? defaultComparison(comparisons);
  const dates = useMemo(() => observationDates(comparisons, reference, scenes), [comparisons, reference, scenes]);
  const shortcuts = SHORTCUTS.map((item) => ({ ...item, target: shortcutTarget(comparisons, item.id) }));
  const fmt = (iso: string) => formatDate(iso, locale) ?? iso;
  const choose = (c: Comparison) => onPicks({ initial: c.initial_date, final: c.final_date });

  const orderOk = !!picks.initial && !!picks.final && picks.initial < picks.final;
  const days = picks.initial && picks.final && orderOk ? daysBetweenDates(picks.initial, picks.final) : null;
  const alternatives = !selected && picks.initial && picks.final ? nearestComparisons(comparisons, picks, 3) : [];

  const option = (role: 'initial' | 'final', date: string) => {
    const other = role === 'initial' ? picks.final : picks.initial;
    const withResults = hasResults(comparisons, role, date, other);
    return <option key={date} value={date}>{fmt(date)}{withResults ? ` ${t('observatory.withResults')}` : ''}</option>;
  };

  return (
    <div className="observatory__period">
      <div className="observatory__shortcuts observatory__shortcuts--main" role="group" aria-label={t('observatory.shortcutsLabel')} data-testid="period-shortcuts">
        <span className="observatory__label">{t('observatory.shortcutsLabel')}</span>
        <div className="observatory__filters">
          {shortcuts.map((item) => (
            <button key={item.id} type="button" className="observatory__chip observatory__chip--period" aria-pressed={!!item.target && selected?.snapshot_id === item.target.snapshot_id}
              disabled={!item.target} title={item.target ? undefined : t('observatory.shortcutUnavailable')}
              onClick={() => item.target && choose(item.target)}>{t(SHORTCUT_LABEL[item.id])}</button>
          ))}
        </div>
      </div>
      <details className="observatory__details observatory__exact" data-testid="exact-dates">
        <summary>{t('observatory.exactDates')}</summary>
        <div className="observatory__period-row">
          <label className="observatory__field">{t('observatory.initialDate')}
            <select value={picks.initial ?? ''} data-testid="initial-date" onChange={(event) => onPicks({ ...picks, initial: event.target.value || null })}>
              {dates.map((date) => option('initial', date))}
            </select>
          </label>
          <label className="observatory__field">{t('observatory.finalDate')}
            <select value={picks.final ?? ''} data-testid="final-date" onChange={(event) => onPicks({ ...picks, final: event.target.value || null })}>
              {dates.map((date) => option('final', date))}
            </select>
          </label>
        </div>
      </details>
      {picks.initial && picks.final && (
        <p className="observatory__period-summary" data-testid="pair-dates">
          <strong>{fmt(picks.initial)}</strong><span aria-hidden="true"> → </span><span className="sr-only"> {t('observatory.to')} </span><strong>{fmt(picks.final)}</strong>
          {days !== null && <span> · {t('observatory.periodDays', { days })}</span>}
          {selected && <span className="observatory__muted"> · {t('observatory.pairSatellite', { track: selected.track ?? '—', pass: passText(selected.pass, t) })}</span>}
        </p>
      )}
      {!selected && (
        <div className="observatory__nores" role="status" data-testid="no-results">
          <strong>{t('observatory.noResultsTitle')}</strong>
          {!orderOk && <p className="observatory__muted">{t('observatory.orderInvalid')}</p>}
          {alternatives.length > 0 && (
            <>
              <p className="observatory__muted">{t('observatory.nearestIntro')}</p>
              <div className="observatory__filters">
                {alternatives.map((c) => (
                  <Button key={c.snapshot_id} variant="secondary" className="btn--sm" onClick={() => choose(c)}>
                    {t('observatory.pairDates', { initial: fmt(c.initial_date), final: fmt(c.final_date) })} · {t('observatory.periodDays', { days: intervalDays(c) })}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function passText(pass: string | null, t: (key: MessageKey) => string): string {
  return pass === 'DESCENDING' ? t('observatory.passDescending') : pass === 'ASCENDING' ? t('observatory.passAscending') : pass ?? t('common.unknown');
}
