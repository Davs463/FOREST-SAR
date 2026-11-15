import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { formatSmart } from '../../shared/format';
import { HORIZONS } from './analytics.config';
import type { HorizonRow } from './analyticsModel';
import { horizonLabel, periodText } from './labels';

export function Horizons({ rows, onOpen }: { rows: HorizonRow[]; onOpen: (snapshotId: string) => void }) {
  const { t, locale } = useI18n();
  return (
    <section className="an-card" data-testid="horizons" aria-labelledby="horizons-title">
      <h3 id="horizons-title" className="an-card__title">{t('analytics.horizonsTitle')}</h3>
      <p className="an-card__explain">{t('analytics.horizonsLede')}</p>
      <ul className="an-horizons">
        {rows.map((row) => {
          const range = HORIZONS.find((h) => h.id === row.id);
          return (
            <li key={row.id} className={`an-horizon an-horizon--${row.status}`}>
              <div className="an-horizon__head">
                <strong>{horizonLabel(t, row.id)}</strong>
                <span className="an-horizon__range">{range ? t('analytics.rangeDays', { min: range.minDays, max: range.maxDays }) : ''}</span>
              </div>
              <span className="an-badge">{t(`analytics.status.${row.status}` as MessageKey)}</span>
              <p className="data__muted">{t(`analytics.statusHint.${row.status}` as MessageKey)}</p>
              {row.comparisons.map((c) => (
                <button key={c.snapshot_id} type="button" className="data__chip" onClick={() => onOpen(c.snapshot_id)}>
                  {periodText(c, locale)} · {formatSmart(c.metrics.candidate_area_ha, locale) ?? t('common.notComputable')} {t('common.hectares')}
                </button>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
