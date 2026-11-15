import type { ReactNode } from 'react';
import { Button, StatusBadge } from '../../components';
import { routeHref } from '../../config/app.config';
import { useI18n, type MessageKey } from '../../i18n';
import { formatDate, formatNumber, formatSmart, safeHttpUrl } from '../../shared/format';
import { classifyLoss } from '../../shared/semaphore';
import { limitationText } from '../../shared/scienceText';
import type { Comparison, LayerKey, OverlayLayer, PairMetrics, ResultsPair } from '../../shared/science.types';

// ---------------------------------------------------------------- step 3

function IndicatorCard({ label, value, unit, help, testId }: { label: string; value: number | null; unit: string; help: string; testId: string }) {
  const { t, locale } = useI18n();
  const text = formatSmart(value, locale);
  return (
    <div className="observatory__indicator" data-testid={testId}>
      <dt>{label}</dt>
      <dd>{text === null ? <span className="observatory__na">{t('common.notComputable')}</span> : <>{text}<small> {unit}</small></>}</dd>
      <p className="observatory__muted">{help}</p>
    </div>
  );
}

export function KeyMessage() {
  const { t } = useI18n();
  return (
    <div className="observatory__key" role="note">
      <strong>{t('observatory.keyMessage')}</strong>
      <span>{t('observatory.keyMessageBody')}</span>
    </div>
  );
}

export function IndicatorCards({ metrics, note }: { metrics: PairMetrics | null; note?: string }) {
  const { t, locale } = useI18n();
  const level = classifyLoss(metrics?.tp_pct);
  const ha = t('common.hectares');
  return (
    <>
      <section className="obs-block" aria-label={t('explore.metricsTitle')}>
      <h3 className="obs-block__title">{t('explore.metricsTitle')}{note && <small>{note}</small>}</h3>
      <dl className="observatory__indicators">
        <IndicatorCard testId="ind-valid" label={t('observatory.validArea')} value={metrics?.valid_area_ha ?? null} unit={ha} help={t('observatory.validAreaHelp')} />
        <IndicatorCard testId="ind-candidate" label={t('observatory.candidateArea')} value={metrics?.candidate_area_ha ?? null} unit={ha} help={t('observatory.candidateAreaHelp')} />
        <IndicatorCard testId="ind-pct" label={t('observatory.candidatePct')} value={metrics?.candidate_pct ?? null} unit="%" help={t('observatory.candidatePctHelp')} />
        <IndicatorCard testId="ind-coverage" label={t('observatory.coverage')} value={metrics?.coverage_pct ?? null} unit="%" help={t('observatory.coverageHelp')} />
      </dl>
      </section>
      <section className="observatory__loss" aria-label={t('observatory.lossTitle')}>
        <span className="observatory__label">{t('observatory.lossTitle')}</span>
        {level === null
          ? <StatusBadge tone="none">{t('observatory.lossNotEvaluated')}</StatusBadge>
          : <StatusBadge colorVar={`--risk-${level === 'veryHigh' ? 'very-high' : level}`}>{t(`observatory.risk_${level}`)}</StatusBadge>}
        <p className="observatory__muted">{level === null ? t('observatory.lossNoData') : t('observatory.lossTp', { value: `${formatNumber(metrics?.tp_pct, locale, 2) ?? ''}%` })}</p>
      </section>
    </>
  );
}

const LIMIT_KEYS = ['limit1', 'limit2', 'limit3', 'limit4', 'limit5', 'limit6'] as const;

export function LimitationsCard({ onSeeAll }: { onSeeAll: () => void }) {
  const { t } = useI18n();
  return (
    <details className="observatory__details obs-limits" data-testid="limits-card">
      <summary>{t('observatory.limitsTitle')}</summary>
      <ul className="observatory__limits-list">
        {LIMIT_KEYS.map((key) => <li key={key}>{t(`observatory.${key}`)}</li>)}
      </ul>
      <Button variant="ghost" className="btn--sm" onClick={onSeeAll}>{t('observatory.limitsAll')}</Button>
    </details>
  );
}

export function LimitationsList({ items }: { items: string[] }) {
  const { t, locale } = useI18n();
  return (
    <>
      {items.length === 0 ? <p>{t('observatory.limitationsNone')}</p> : <ul className="observatory__limits-full">{items.map((item, index) => <li key={index}>{limitationText(item, locale)}</li>)}</ul>}
      <p><Button variant="secondary" href={routeHref('methodology')}>{t('observatory.limitsMethodology')}</Button></p>
    </>
  );
}

// ---------------------------------------------------------------- technical details

export function TechnicalDetails({ pair, comparison, algorithm, processedAt, snapshotId, children }: { pair: ResultsPair; comparison: Comparison | null; algorithm: string | null; processedAt: string | null; snapshotId: string | null; children?: ReactNode }) {
  const { t, locale } = useI18n();
  const na = t('common.notAvailable');
  const num = (value: number | null, suffix = '') => (formatNumber(value, locale, 3) === null ? na : `${formatNumber(value, locale, 3)}${suffix}`);
  return (
    <details id="observatory-technical" className="observatory__details">
      <summary>{t('observatory.technical')}</summary>
      <dl className="dl">
        <dt>{t('observatory.technicalPairId')}</dt><dd>{pair.pair_id}</dd>
        <dt>{t('observatory.technicalScenes')}</dt><dd>{pair.initial_id ?? na}<br />{pair.final_id ?? na}</dd>
        {snapshotId && <><dt>{t('observatory.snapshot')}</dt><dd>{snapshotId}</dd></>}
        {comparison?.common_coverage_pct != null && <><dt>{t('observatory.technicalCoverage')}</dt><dd>{formatSmart(comparison.common_coverage_pct, locale)} %</dd></>}
        <dt>{t('observatory.algorithm')}</dt><dd>{algorithm ?? na}</dd>
        <dt>{t('observatory.processedAt')}</dt><dd>{formatDate(processedAt, locale, true) ?? na}</dd>
        <dt>{t('observatory.evidence')}</dt><dd>{pair.evidence_level ?? na}</dd>
        <dt>{t('observatory.maturity')}</dt><dd>{pair.maturity ?? na}</dd>
        <dt>{t('observatory.source')}</dt><dd>{pair.source ?? na}</dd>
        <dt>{t('observatory.thresholdDb')}</dt><dd>{num(pair.params.threshold_db, ' dB')}</dd>
        <dt>{t('observatory.noiseFloor')}</dt><dd>{num(pair.params.noise_floor_db, ' dB')}</dd>
        <dt>{t('observatory.normOffset')}</dt><dd>{num(pair.params.normalization_offset_db, ' dB')}</dd>
        <dt>{t('observatory.maskRule')}</dt><dd>{pair.params.mask_rule ?? na}</dd>
        <dt>{t('observatory.minPatch')}</dt><dd>{num(pair.params.minimum_patch_ha, ` ${t('common.hectares')}`)}</dd>
      </dl>
      <h4>{t('observatory.technicalOriginalLimits')}</h4>
      {pair.limitations.length === 0
        ? <p className="observatory__muted">{t('observatory.limitationsNone')}</p>
        : <ul>{pair.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      <h4>{t('observatory.provenance')}</h4>
      {pair.provenance.source_urls.length === 0
        ? <p className="observatory__muted">{t('observatory.sourcesNone')}</p>
        : <ul>{pair.provenance.source_urls.map((url) => {
            const href = safeHttpUrl(url);
            return <li key={url}>{href ? <a href={href} target="_blank" rel="noreferrer">{url}</a> : url}</li>;
          })}</ul>}
      {children}
    </details>
  );
}

// ---------------------------------------------------------------- legend

function legendLabel(label: string, t: (key: MessageKey) => string): string {
  if (/decrease candidate/i.test(label)) return t('observatory.legendCandidateItem');
  if (/^Valid in both/i.test(label)) return t('observatory.legendQualityValid');
  if (/^Not valid/i.test(label)) return t('observatory.legendQualityInvalid');
  return label;
}

const LAYER_DESC: Record<LayerKey, MessageKey> = {
  candidates: 'observatory.layerDescCandidates',
  delta: 'observatory.layerDescDelta',
  before: 'observatory.layerDescBefore',
  after: 'observatory.layerDescAfter',
  quality: 'observatory.layerDescQuality',
};

export interface LegendProps {
  thresholdDb: number | null;
  layerKey: LayerKey;
  layer: OverlayLayer | null;
  compare: boolean;
  showQuality: boolean;
  showGrid: boolean;
  showFootprints: boolean;
  official: ReactNode;
}

export function MapLegend({ thresholdDb, layerKey, layer, compare, showQuality, showGrid, showFootprints, official }: LegendProps) {
  const { t, locale } = useI18n();
  const threshold = formatNumber(thresholdDb === null ? null : Math.abs(thresholdDb), locale, 2);
  const spec = layer?.legend_spec ?? null;
  const gradient = spec?.type === 'gradient' ? spec : null;
  const unit = layer?.unit ?? '';
  const layerLabel = layerKey === 'candidates' ? t('observatory.layerCandidates') : layerKey === 'delta' ? t('observatory.layerDelta') : layerKey === 'before' ? t('observatory.layerBefore') : t('observatory.layerAfter');
  return (
    <div className="observatory__legend" data-testid="map-legend">
      <h3>{t('observatory.legendTitle')}</h3>
      <ul>
        <li><i className="observatory__sw observatory__sw--window" aria-hidden="true" />{t('observatory.legendWindowShort')}</li>
        <li><i className="observatory__sw observatory__sw--candidate" aria-hidden="true" />
          {threshold === null ? t('observatory.legendCandidateNoThreshold') : t('observatory.legendCandidateShort', { threshold })}</li>
        <li><i className="observatory__sw observatory__sw--zone" aria-hidden="true" />{t('observatory.legendZone')}</li>
        {showGrid && <li><i className="observatory__sw observatory__sw--grid" aria-hidden="true" />{t('observatory.legendGrid')}</li>}
        {showFootprints && <li><i className="observatory__sw observatory__sw--scene" aria-hidden="true" />{t('observatory.legendFootprint')}</li>}
        {(compare ? (['before', 'after'] as LayerKey[]) : layerKey === 'candidates' ? [] : [layerKey]).length > 0 && (gradient ? (
          <li className="observatory__legend-gradient">
            <span className="observatory__gradient" style={{ background: `linear-gradient(90deg, ${gradient.colors.join(', ')})` }} aria-hidden="true" />
            <span>
              {compare ? t('observatory.layerBefore') + ' / ' + t('observatory.layerAfter') : layerLabel}
              {': '}{gradient.min !== null ? formatSmart(gradient.min, locale) : '?'} {unit} … {gradient.max !== null ? formatSmart(gradient.max, locale) : '?'} {unit}
              <small className="observatory__muted"> {t(LAYER_DESC[compare ? 'before' : layerKey])}</small>
            </span>
          </li>
        ) : <li><i className="observatory__sw observatory__sw--layer" aria-hidden="true" />{layerLabel}: {t('observatory.legendNoLayerInfo')}</li>)}
        {!compare && layerKey === 'candidates' && <li><small className="observatory__muted">{t(LAYER_DESC.candidates)}</small></li>}
        <li><i className="observatory__sw observatory__sw--nodata" aria-hidden="true" />{t('observatory.legendNoData')}{!showQuality && <small className="observatory__muted"> {t('observatory.legendNoDataHint')}</small>}</li>
      </ul>
      <p className="observatory__warning" role="note">{t('observatory.noColorWarning')}</p>
      {official}
    </div>
  );
}
