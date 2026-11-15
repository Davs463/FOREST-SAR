import { Fragment, useEffect, type ReactNode } from 'react';
import { ArrowRight, ChartColumn, Cpu, Lightbulb, Map as MapIcon, Radar, Satellite, ScanSearch } from 'lucide-react';
import { Card, EmptyState, StatusBadge } from '../../components';
import { routeHref } from '../../config/app.config';

import { RADAR_CLASS_COLORS } from '../../config/mapColors';
import { useI18n, type MessageKey } from '../../i18n';
import { useScience } from '../../services/ScienceProvider';
import { formatDate, formatNumber } from '../../shared/format';
import { PUBLISHED_THRESHOLD_DB, RADAR_CLASS_ORDER, STRONG_CUT_DB, VERY_STRONG_CUT_DB, type RadarClass } from '../../shared/radarClasses';
import { limitationText } from '../../shared/scienceText';
import { RISK_CUTOFFS, RISK_ORDER } from '../../shared/semaphore';
import type { PairParams } from '../../shared/science.types';
import { ManualViewer } from './ManualViewer';
import { MissionIllustration } from './MissionIllustration';
import './methodology.css';

const PLAIN_KEYS: MessageKey[] = ['methodology.plain1', 'methodology.plain2', 'methodology.plain3', 'methodology.plain4', 'methodology.plain5', 'methodology.plain6'];
const FLOW = [
  { icon: Satellite, title: 'methodology.flow1Title', text: 'methodology.flow1Text' },
  { icon: Cpu, title: 'methodology.flow2Title', text: 'methodology.flow2Text' },
  { icon: ScanSearch, title: 'methodology.flow3Title', text: 'methodology.flow3Text' },
  { icon: Lightbulb, title: 'methodology.flow4Title', text: 'methodology.flow4Text' },
] as const;

function Topic({ title, children }: { title: string; children: ReactNode }) {
  return <details className="meth-topic"><summary>{title}</summary><div className="meth-topic__body">{children}</div></details>;
}

export function Methodology() {
  const { t, locale } = useI18n();
  const { state } = useScience();
  const na = t('common.notAvailable');
  const catalog = state.status === 'ready' || state.status === 'catalog_only' ? state.catalog : null;
  const results = state.status === 'ready' ? state.results : null;
  const manifest = state.status === 'ready' || state.status === 'catalog_only' ? state.manifest : null;
  const limitations = results ? Array.from(new Set(results.pairs.flatMap((pair) => pair.limitations))) : [];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll<HTMLElement>('.methodology [data-reveal]').forEach((element) => { element.classList.add('reveal-pending'); observer.observe(element); });
    return () => observer.disconnect();
  }, []);

  const num = (value: number | null, suffix: string) => {
    const text = formatNumber(value, locale, 3);
    return text === null ? na : `${text}${suffix}`;
  };
  const paramRows = (p: PairParams): [string, string][] => [
    [t('observatory.thresholdDb'), num(p.threshold_db, ' dB')],
    [t('observatory.noiseFloor'), num(p.noise_floor_db, ' dB')],
    [t('observatory.normOffset'), num(p.normalization_offset_db, ' dB')],
    [t('observatory.maskRule'), p.mask_rule ?? na],
    [t('observatory.minPatch'), num(p.minimum_patch_ha, ` ${t('common.hectares')}`)],
  ];
  const bbox = catalog?.query.bbox;
  const riskLabel = (index: number) => t(`observatory.risk_${RISK_ORDER[index]}`);
  const rangeLabel = (index: number): string => {
    if (index === 0) return t('methodology.tpBelow0');
    if (index === 1) return `0 – ${RISK_CUTOFFS[0]}`;
    if (index < RISK_CUTOFFS.length + 1) return `> ${RISK_CUTOFFS[index - 2]} – ${RISK_CUTOFFS[index - 1]}`;
    return t('methodology.tpAbove', { value: RISK_CUTOFFS[RISK_CUTOFFS.length - 1] });
  };

  // Threshold: published value from the loaded snapshot, falling back to the published constant.
  const loadedThreshold = results?.pairs.map((pair) => pair.params.threshold_db).find((v): v is number => typeof v === 'number') ?? null;
  const thr = loadedThreshold ?? PUBLISHED_THRESHOLD_DB;
  const d = (v: number) => formatNumber(v, locale, 2) ?? String(v);
  const classRange: Record<RadarClass, string> = {
    increase: `≥ +${d(thr)} dB`,
    stable: `−${d(thr)} … +${d(thr)} dB`,
    moderate: `−${d(thr)} … ${d(STRONG_CUT_DB)} dB`,
    strong: `${d(STRONG_CUT_DB)} … ${d(VERY_STRONG_CUT_DB)} dB`,
    veryStrong: `≤ ${d(VERY_STRONG_CUT_DB)} dB`,
  };

  const techCards = [
    { icon: Radar, title: 'methodology.techNisarTitle', text: 'methodology.techNisarText', href: null },
    { icon: Cpu, title: 'methodology.techEngineTitle', text: 'methodology.techEngineText', href: null },
    { icon: MapIcon, title: 'methodology.techMapsTitle', text: 'methodology.techMapsText', href: routeHref('observatory') },
    { icon: ChartColumn, title: 'methodology.techAnalyticsTitle', text: 'methodology.techAnalyticsText', href: routeHref('analytics') },
  ] as const;

  return (
    <section className="page methodology">
      <header className="meth-hero" data-testid="method-hero">
        <div className="meth-hero__copy">
          <span className="mono meth-eyebrow">{t('nav.methodology')}</span>
          <h1>{t('methodology.heroTitle')}</h1>
          <p>{t('methodology.heroLede')}</p>
        </div>
        <figure className="meth-hero__art">
          <MissionIllustration />
          <figcaption>{t('methodology.heroCaption')}</figcaption>
        </figure>
      </header>

      <section className="meth-section" data-testid="method-steps" aria-labelledby="meth-flow-title" data-reveal>
        <h2 id="meth-flow-title">{t('methodology.flowTitle')}</h2>
        <ol className="meth-flow">
          {FLOW.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="meth-flow__item">
              <span className="meth-flow__icon"><Icon size={22} aria-hidden="true" /></span>
              <span className="mono meth-flow__num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <ManualViewer />

      <section className="meth-section" data-testid="method-tech" aria-labelledby="meth-tech-title" data-reveal>
        <h2 id="meth-tech-title">{t('methodology.techTitle')}</h2>
        <div className="meth-tech">
          {techCards.map(({ icon: Icon, title, text, href }) => (
            <article key={title} className="meth-tech__card">
              <span className="meth-tech__icon"><Icon size={22} aria-hidden="true" /></span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
              {href && <a className="text-link text-link-dark" href={href}>{t('methodology.techOpen')} <ArrowRight size={14} aria-hidden="true" /></a>}
            </article>
          ))}
        </div>
      </section>

      <section className="meth-section" data-testid="method-legend" aria-labelledby="meth-legend-title" data-reveal>
        <h2 id="meth-legend-title">{t('methodology.legendTitle')}</h2>
        <p className="meth-lead">{t('methodology.legendLead')}</p>
        <ul className="meth-legend">
          {RADAR_CLASS_ORDER.map((cls) => (
            <li key={cls} className="meth-legend__item">
              <span className="meth-legend__swatch" style={{ background: RADAR_CLASS_COLORS[cls] }} aria-hidden="true" />
              <strong>{t(`explore.intensityShort_${cls}`)}</strong>
              <span className="mono meth-legend__range">{classRange[cls]}</span>
              <span className="meth-legend__expl">{t(`explore.intensityExpl_${cls}`)}</span>
            </li>
          ))}
        </ul>
        <div className="meth-notes">
          <p className="meth-notes__key">{t(loadedThreshold === null ? 'methodology.legendThresholdFallback' : 'methodology.legendThreshold', { value: d(thr) })}</p>
          <p>{t('methodology.legendDecrease')}</p>
          <p>{t('methodology.legendIncrease')}</p>
          <p>{t('methodology.legendPresentation', { value: d(thr), strong: d(STRONG_CUT_DB), veryStrong: d(VERY_STRONG_CUT_DB) })}</p>
        </div>
      </section>

      <section className="meth-section" data-testid="method-transparency" aria-labelledby="meth-trans-title" data-reveal>
        <h2 id="meth-trans-title">{t('methodology.transTitle')}</h2>
        <p className="meth-lead">{t('methodology.transLead')}</p>
        <div className="meth-topics">
          <Topic title={t('methodology.tSource')}>
            <Card title={t('methodology.snapshotTitle')} headingLevel={3}>
              {state.status === 'loading' ? <p>{t('common.loading')}</p> : !results ? (
                <EmptyState title={t('methodology.snapshotTitle')} message={t('methodology.snapshotNone')} />
              ) : (
                <dl className="dl">
                  <dt>{t('observatory.snapshot')}</dt><dd>{results.snapshot_id ?? na}</dd>
                  <dt>{t('observatory.mode')}</dt><dd>{results.data_mode ?? na}</dd>
                </dl>
              )}
            </Card>
            <Card title={t('methodology.queryTitle')} headingLevel={3}>
              {!catalog ? <p>{t('methodology.snapshotNone')}</p> : (
                <dl className="dl">
                  <dt>{t('methodology.catalogSource')}</dt><dd>{catalog.source ?? na}</dd>
                  <dt>{t('methodology.bbox')}</dt><dd>{bbox ? bbox.join(', ') : na}</dd>
                  <dt>{t('methodology.period')}</dt><dd>{catalog.query.start ?? na} → {catalog.query.end ?? na}</dd>
                </dl>
              )}
            </Card>
          </Topic>

          <Topic title={t('methodology.tVersion')}>
            {!results ? <p>{t('methodology.snapshotNone')}</p> : (
              <dl className="dl">
                <dt>{t('observatory.algorithm')}</dt><dd>{results.algorithm_version ?? na}</dd>
                <dt>{t('observatory.processedAt')}</dt><dd>{formatDate(results.processed_at, locale, true) ?? na}</dd>
                <dt>{t('observatory.updated')}</dt><dd>{formatDate(manifest?.updated_at, locale, true) ?? na}</dd>
              </dl>
            )}
          </Topic>

          <Topic title={t('methodology.tParams')}>
            {!results || results.pairs.length === 0 ? <p>{t('methodology.snapshotNone')}</p> : (
              <div className="grid-cards">
                {results.pairs.map((pair) => (
                  <Card key={pair.pair_id} title={t('methodology.pairDates', { start: formatDate(pair.initial_date, locale) ?? na, end: formatDate(pair.final_date, locale) ?? na })} headingLevel={3}>
                    <p className="methodology__pairId">{t('methodology.paramsPair', { id: pair.pair_id })}</p>
                    <dl className="dl">{paramRows(pair.params).map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>)}</dl>
                  </Card>
                ))}
              </div>
            )}
          </Topic>

          <Topic title={t('methodology.tThreshold')}>
            <p>{t('methodology.thresholdText')}</p>
            <p className="mono">{t('observatory.thresholdDb')}: {num(loadedThreshold, ' dB')}</p>
          </Topic>

          <Topic title={t('methodology.tResolution')}>
            <p>{t('methodology.step3')}</p>
            <p>{t('methodology.step4')}</p>
          </Topic>

          <Topic title={t('methodology.tCoverage')}>
            {!results || results.pairs.length === 0 ? <p>{t('methodology.snapshotNone')}</p> : (
              <div className="grid-cards">
                {results.pairs.map((pair) => (
                  <Card key={pair.pair_id} title={t('methodology.pairDates', { start: formatDate(pair.initial_date, locale) ?? na, end: formatDate(pair.final_date, locale) ?? na })} headingLevel={3}>
                    <dl className="dl">
                      <dt>{t('methodology.coverageValid')}</dt><dd>{num(pair.metrics.valid_area_ha, ` ${t('common.hectares')}`)}</dd>
                      <dt>{t('methodology.coverageShare')}</dt><dd>{num(pair.metrics.coverage_pct, ' %')}</dd>
                    </dl>
                  </Card>
                ))}
              </div>
            )}
          </Topic>

          <Topic title={t('methodology.tLimits')}>
            <h3 className="meth-sub">{t('methodology.plainTitle')}</h3>
            <ul className="methodology__plain">{PLAIN_KEYS.map((key) => <li key={key}>{t(key)}</li>)}</ul>
            <h3 className="meth-sub">{t('methodology.limitationsTitle')}</h3>
            {limitations.length === 0 ? <p className="observatory__muted">{t('methodology.limitationsNone')}</p> : <ul>{limitations.map((item) => {
              const translated = limitationText(item, locale);
              return <li key={item}>
                {translated}
                {locale === 'es' && translated !== item && <details className="methodology__original"><summary>{t('methodology.originalSummary')}</summary><p>{item}</p></details>}
              </li>;
            })}</ul>}
          </Topic>

          <Topic title={t('methodology.tMethod')}>
            <h3 className="meth-sub">{t('methodology.stepsTitle')}</h3>
            <ol>
              <li>{t('methodology.step1')}</li><li>{t('methodology.step2')}</li><li>{t('methodology.step3')}</li><li>{t('methodology.step4')}</li>
            </ol>
            <h3 className="meth-sub">{t('methodology.notTitle')}</h3>
            <ul><li>{t('methodology.not1')}</li><li>{t('methodology.not2')}</li><li>{t('methodology.not3')}</li></ul>
            <h3 className="meth-sub">{t('methodology.semaphoreTitle')}</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th scope="col">{t('methodology.semaphoreRange')}</th><th scope="col">{t('methodology.semaphoreLevel')}</th></tr></thead>
                <tbody>
                  {RISK_ORDER.map((level, index) => (
                    <tr key={level}>
                      <td>{rangeLabel(index)}</td>
                      <td><StatusBadge colorVar={`--risk-${level === 'veryHigh' ? 'very-high' : level}`}>{riskLabel(index)}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Topic>

          <Topic title={t('methodology.tDocs')}>
            <p>{t('methodology.docsText')}</p>
            <p className="meth-links">
              <a className="text-link text-link-dark" href={routeHref('library')}>{t('methodology.docsLibrary')} <ArrowRight size={14} aria-hidden="true" /></a>
              <a className="text-link text-link-dark" href={routeHref('data')}>{t('methodology.docsData')} <ArrowRight size={14} aria-hidden="true" /></a>
            </p>
          </Topic>
        </div>
      </section>
    </section>
  );
}

export default Methodology;
