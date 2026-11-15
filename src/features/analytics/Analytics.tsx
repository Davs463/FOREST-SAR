import { useMemo, useState } from 'react';
import { Button, EmptyState } from '../../components';
import { routeHref } from '../../config/app.config';
import { useI18n } from '../../i18n';
import { useComparisons } from '../../services/comparisons';
import { useScience } from '../../services/ScienceProvider';
import { defaultComparison } from '../observatory/period';
import { describeError } from '../../shared/errors';
import { dateMarks, hasTrendBasis, horizonRows, orbitOf, placeNames, sharedFinalDate, type PeriodData, type Scope } from './analyticsModel';
import { AreaChart, ZonesChart } from './PeriodCharts';
import { Horizons } from './Horizons';
import { IntensityChart } from './IntensityChart';
import { PlacesChart } from './PlacesChart';
import { ScenesChart } from './ScenesChart';
import { ScopePicker } from './ScopePicker';
import { Summary } from './Summary';
import { Timeline } from './Timeline';
import { TrendNotice } from './TrendNotice';
import { ZoneEvolution } from './ZoneEvolution';
import { useAnalyticsData } from './useAnalyticsData';
import { useAnalyticsParams } from './useAnalyticsParams';
import '../data/data.css';
import './analytics.css';

type Kind = 'general' | 'place' | 'zone';
const NO_SCENES: never[] = [];

export function Analytics() {
  const { t } = useI18n();
  const { state, reload } = useScience();
  const { comparisons } = useComparisons();
  const params = useAnalyticsParams();
  const [pendingKind, setPendingKind] = useState<Kind>('general');
  const baseScenes = useMemo(() => (state.status === 'ready' || state.status === 'catalog_only' ? state.catalog.scenes : NO_SCENES), [state]);
  const { data, retry } = useAnalyticsData(comparisons, baseScenes);

  const periods: PeriodData[] = data.status === 'ready' ? data.periods : [];
  const scenes = data.status === 'ready' ? data.scenes : baseScenes;
  // Same default as the observatory (~3 months, else most recent) so both views open on the same period.
  const fallbackId = defaultComparison(periods.map((p) => p.comparison))?.snapshot_id;
  const selected = periods.find((p) => p.comparison.snapshot_id === params.compare) ?? periods.find((p) => p.comparison.snapshot_id === fallbackId) ?? periods[0] ?? null;
  const kind: Kind = params.zone ? 'zone' : params.place ? 'place' : pendingKind;
  const places = useMemo(() => placeNames(periods), [periods]);
  const zoneExists = !!(selected && params.zone && selected.zones?.some((z) => z.zone_id === params.zone));
  const placeExists = !!(params.place && places.includes(params.place));
  const scope: Scope = kind === 'zone' && params.zone && zoneExists ? { kind: 'zone', zoneId: params.zone }
    : kind === 'place' && params.place && placeExists ? { kind: 'place', place: params.place } : { kind: 'general' };

  const orbit = useMemo(() => orbitOf(comparisons), [comparisons]);
  const marks = useMemo(() => dateMarks(scenes, comparisons, orbit), [scenes, comparisons, orbit]);
  const horizons = useMemo(() => horizonRows(comparisons, marks), [comparisons, marks]);
  const sharedFinal = useMemo(() => sharedFinalDate(comparisons), [comparisons]);
  const basis = useMemo(() => hasTrendBasis(comparisons), [comparisons]);

  const openPeriod = (id: string) => { setPendingKind(kind); params.update({ compare: id, zone: null }); };
  const setKind = (next: Kind) => { setPendingKind(next); params.update({ zone: null, place: null }); };

  const head = (
    <div className="page__head data__head">
      <div>
        <p className="eyebrow"><span className="eyebrow-line" /> {t('analytics.eyebrow')}</p>
        <h1 id="analytics-title">{t('analytics.title')}</h1>
        <p>{t('analytics.lede')}</p>
      </div>
      <Button variant="secondary" className="btn--sm" href={`${routeHref('observatory')}${selected ? `?compare=${encodeURIComponent(selected.comparison.snapshot_id)}` : ''}`}>{t('analytics.openObservatory')}</Button>
    </div>
  );

  let body;
  if (state.status === 'loading') body = <EmptyState title={t('common.loading')} />;
  else if (state.status === 'error') {
    body = <EmptyState tone="error" title={t('analytics.errorTitle')} message={describeError(t, state.error)} action={<Button variant="secondary" onClick={reload}>{t('common.retry')}</Button>} />;
  } else if (comparisons.length === 0) {
    body = <EmptyState title={t('analytics.noDataTitle')} message={t('analytics.noDataBody')} action={<Button variant="secondary" onClick={reload}>{t('common.retry')}</Button>} />;
  } else if (data.status === 'loading' || !selected) {
    body = <EmptyState title={t('common.loading')} message={t('analytics.loadingBody')} />;
  } else {
    const selectedId = selected.comparison.snapshot_id;
    body = (
      <>
        <TrendNotice sharedFinal={sharedFinal} hasBasis={basis} />
        {data.failed > 0 && (
          <EmptyState tone="error" title={t('analytics.partialTitle')} message={t('analytics.partialBody', { count: data.failed })} action={<Button variant="secondary" onClick={retry}>{t('common.retry')}</Button>} />
        )}
        <ScopePicker comparisons={comparisons} selectedId={selectedId} kind={kind} place={params.place} zoneId={params.zone}
          places={places} zones={selected.zones ?? []} onCompare={openPeriod} onScope={setKind}
          onPlace={(name) => params.update({ place: name, zone: null })} onZone={(id) => params.update({ zone: id, place: null })} />
        {params.compare && !periods.some((p) => p.comparison.snapshot_id === params.compare) && <p className="an-note an-note--warn" role="status">{t('analytics.unknownPeriod')}</p>}
        {params.zone && !zoneExists && <p className="an-note an-note--warn" role="status">{t('analytics.zoneMissing', { zone: params.zone })}</p>}
        {params.place && !placeExists && <p className="an-note an-note--warn" role="status">{t('analytics.placeMissing', { place: params.place })}</p>}
        <Summary periods={periods} selected={selected} scope={scope} onOpen={openPeriod} />
        <h2 className="an-h2">{t('analytics.chartsTitle')}</h2>
        <div className="an-grid">
          <AreaChart periods={periods} scope={scope} selectedId={selectedId} />
          <ZonesChart periods={periods} scope={scope} selectedId={selectedId} />
          <IntensityChart period={selected} scope={scope} />
          <PlacesChart period={selected} />
          <ScenesChart marks={marks} orbit={orbit} />
          <ZoneEvolution periods={periods} selectedId={selectedId} zoneId={scope.kind === 'zone' ? scope.zoneId : null} />
        </div>
        <Timeline marks={marks} selectedId={selectedId} onOpen={openPeriod} />
        <Horizons rows={horizons} onOpen={openPeriod} />
      </>
    );
  }

  return <section className="page data analytics" aria-labelledby="analytics-title">{head}{body}</section>;
}

export default Analytics;
