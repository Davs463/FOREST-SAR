import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { dateText } from './labels';

interface Props { sharedFinal: string | null; hasBasis: boolean }

/** Permanent warning: comparisons are not a consecutive series. Never predicts anything. Compact: 3 bullets + collapsible rest. */
export function TrendNotice({ sharedFinal, hasBasis }: Props) {
  const { t, locale } = useI18n();
  return (
    <aside className="an-trend" data-testid="trend-notice" aria-labelledby="trend-title">
      <h3 id="trend-title"><AlertTriangle size={17} aria-hidden="true" />{t('analytics.trendTitle')}</h3>
      <ul>
        {sharedFinal && <li>{t('analytics.trendSharedFinal', { date: dateText(sharedFinal, locale) })}</li>}
        <li>{t('analytics.trendNotConsecutive')}</li>
        <li>{t('analytics.trendNoSum')}</li>
      </ul>
      <details className="an-trend__more">
        <summary><span>{t('analytics.trendReadMore')}</span><ChevronDown size={15} aria-hidden="true" /></summary>
        <ul>
          <li>{t('analytics.trendRepeat')}</li>
          <li>{t('analytics.trendRequirement')}</li>
        </ul>
        <p className="an-trend__status"><strong>{t('analytics.trendStatus')}</strong> {hasBasis ? t('analytics.trendBasisPresent') : t('analytics.trendInsufficient')}</p>
      </details>
    </aside>
  );
}
