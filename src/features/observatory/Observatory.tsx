import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { ListTree, Maximize2, X } from 'lucide-react';
import { useHashParam } from '../../app/router';
import { Button, EmptyState, Modal, StatusBadge, Tabs, panelDomId, tabDomId, type TabItem } from '../../components';
import { routeHref } from '../../config/app.config';
import { DEFAULT_BASE_ID, MAP_LAYERS, OSM_LAYER, type MapLayerDef } from '../../config/mapLayers.config';
import { useI18n, type MessageKey } from '../../i18n';
import { useCells, useComparisons, usePlaces, useSnapshot } from '../../services/comparisons';
import { useScience } from '../../services/ScienceProvider';
import { describeError } from '../../shared/errors';
import { formatDate, formatNumber, formatSmart } from '../../shared/format';
import type { DerivedData, LayerKey, OverlayLayer, ResultsPair, Zone } from '../../shared/science.types';
import { sectorMetrics } from '../../shared/sectorMetrics';
import { layerCoverage } from './basemap';
import { installMapColorVars } from '../../config/mapColors';
import { PUBLISHED_THRESHOLD_DB, classifyDelta } from '../../shared/radarClasses';
import { checkZoneAreaSum } from './clusters';
import { BaseMapPicker, ClusterInfo, DerivedLegend, DerivedMethod, NasaMenu, ZoneInfo, ZoneSelect } from './ExplorePanels';
import { ObservatoryMap, type TileSelection, type ZoneView } from './ObservatoryMap';
import { PeriodPicker } from './PeriodPicker';
import { PlaceSearch, type PlaceFocus } from './PlaceSearch';
import { IndicatorCards, KeyMessage, LimitationsCard, LimitationsList, MapLegend, TechnicalDetails } from './panels';
import { defaultComparison, findComparison, type Picks } from './period';
import { buildSectorNames, gridName, sectorLabel } from './sectorNames';
import { zoneName, zoneOptionLabel, zoneShortLabel } from './zoneLabels';
import './observatory.css';

/** Without derived products: the original four radar layers. With them: signal change (default) and the two dates. */
const RADAR_LAYERS: readonly LayerKey[] = ['candidates', 'delta', 'before', 'after'];
const DERIVED_LAYERS: readonly LayerKey[] = ['delta', 'before', 'after'];
const LAYER_LABEL: Record<LayerKey, MessageKey> = {
  before: 'observatory.layerBefore',
  after: 'observatory.layerAfter',
  delta: 'observatory.layerDelta',
  candidates: 'observatory.layerCandidates',
  quality: 'observatory.layerQuality',
};

const BASE_DEFS = MAP_LAYERS.filter((layer) => layer.role === 'base');
const OVERLAY_DEFS = MAP_LAYERS.filter((layer) => layer.role === 'overlay');
const NO_HIGHLIGHT: ReadonlySet<string> = new Set();
const NO_ZONES: Zone[] = [];

/** Perceptual viz raster (same colour scale for both dates) when published; otherwise the engine's original PNG. */
function pickLayer(key: LayerKey, result: ResultsPair | null, derived: DerivedData | null, grayscale: boolean): OverlayLayer | null {
  if (!result) return null;
  if (derived && !grayscale && (key === 'before' || key === 'after' || key === 'delta')) {
    const viz = derived.viz[key];
    if (viz) return { url: viz.url, bounds: viz.bounds, crs: null, legend: null, legend_spec: viz.legend, unit: 'dB' };
  }
  return result.layers[key];
}

function StepHead({ n, title, lead }: { n: number; title: string; lead: string }) {
  const { t } = useI18n();
  return (
    <header className="observatory__step-head">
      <span className="observatory__step-num" aria-label={t('observatory.stepAria', { n })}>{n}</span>
      <div>
        <h2 id={`obs-step-${n}-title`}>{title}</h2>
        <p className="observatory__muted">{lead}</p>
      </div>
    </header>
  );
}

export function Observatory() {
  const { t, locale } = useI18n();
  const { state, reload } = useScience();
  const [picks, setPicks] = useState<Picks | null>(null);
  const compareParam = useHashParam('compare');
  const zoneParam = useHashParam('zone');
  const appliedZoneKey = useRef<string | null>(null);
  const [layerKey, setLayerKey] = useState<LayerKey | null>(null);
  const [opacity, setOpacity] = useState(75);
  const [sectorId, setSectorId] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [focus, setFocus] = useState<PlaceFocus | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [showFootprints, setShowFootprints] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showCells, setShowCells] = useState(false);
  const [showWindowToggle, setShowWindowToggle] = useState(false);
  const [grayscale, setGrayscale] = useState(false);
  const [baseId, setBaseId] = useState<string>(DEFAULT_BASE_ID);
  const [overlayId, setOverlayId] = useState('');
  const [nasaSide, setNasaSide] = useState<'initial' | 'final'>('initial');
  const [failedTileId, setFailedTileId] = useState<string | null>(null);
  const [clusterIds, setClusterIds] = useState<string[] | null>(null);
  const [zoomTo, setZoomTo] = useState<{ ids: string[]; nonce: number } | null>(null);
  const [zoneView, setZoneView] = useState<ZoneView | null>(null);

  useEffect(() => { installMapColorVars(); }, []);

  // ---- expanded ("large map") mode: the same map container gets a fixed, dialog-like presentation (no second map).
  const [expanded, setExpanded] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const expandBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);
  useEffect(() => {
    const resize = () => { requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); window.setTimeout(() => window.dispatchEvent(new Event('resize')), 260); };
    if (!expanded) {
      if (wasExpanded.current) { wasExpanded.current = false; expandBtnRef.current?.focus(); resize(); }
      return;
    }
    wasExpanded.current = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    resize();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) setExpanded(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [expanded]);
  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !boxRef.current) return;
    const items = [...boxRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select, input, a[href], [tabindex="0"]')].filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0]; const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };


  const { comparisons } = useComparisons();
  const places = usePlaces();
  const fallback = useMemo(() => defaultComparison(comparisons), [comparisons]);

  // A new set of comparisons (first load / reload) resets the choice; `?compare=<snapshot_id>` selects that comparison.
  useEffect(() => { setPicks(null); }, [comparisons]);
  useEffect(() => {
    const target = compareParam ? comparisons.find((c) => c.snapshot_id === compareParam) : null;
    if (target) setPicks({ initial: target.initial_date, final: target.final_date });
  }, [compareParam, comparisons]);

  const effectivePicks: Picks = picks ?? { initial: fallback?.initial_date ?? null, final: fallback?.final_date ?? null };
  const comparison = findComparison(comparisons, effectivePicks);
  const { snapshot, retry: retrySnapshot } = useSnapshot(comparison);
  const snapshotData = snapshot.status === 'ready' ? snapshot.data : null;
  const snapshotId = comparison?.snapshot_id ?? null;

  // Changing comparison clears the sector/zone selection (they belong to one snapshot).
  useEffect(() => { setSectorId(null); setZoneId(null); setClusterIds(null); setZoneView(null); }, [snapshotId]);

  const selectSector = useCallback((id: string | null) => { setSectorId(id); if (id) { setZoneId(null); setClusterIds(null); } }, []);
  const selectZone = useCallback((id: string | null) => { setZoneId(id); if (id) { setSectorId(null); setClusterIds(null); } }, []);
  const selectCluster = useCallback((ids: string[]) => { setClusterIds(ids); setZoneId(null); setSectorId(null); }, []);
  const zoomToCluster = useCallback((ids: string[]) => setZoomTo((prev) => ({ ids, nonce: (prev?.nonce ?? 0) + 1 })), []);

  const result = snapshotData?.pair ?? null;
  const derived = snapshotData?.derived ?? null;
  const hasDerived = derived !== null;
  const derivedZones = derived?.zones ?? NO_ZONES;
  const validGeometry = derived?.validArea?.geometry ?? null;
  const selectedZone = derivedZones.find((z) => z.zone_id === zoneId) ?? null;
  const cells = useCells(derived, showCells);

  // `?zone=<zone_id>` (from the Observations page): select that zone and fly to it once its snapshot is loaded.
  useEffect(() => {
    if (!zoneParam || !snapshotId || derivedZones.length === 0) return;
    const key = `${snapshotId}:${zoneParam}`;
    if (appliedZoneKey.current === key) return;
    if (!derivedZones.some((z) => z.zone_id === zoneParam)) return;
    appliedZoneKey.current = key;
    selectZone(zoneParam);
    zoomToCluster([zoneParam]);
  }, [zoneParam, snapshotId, derivedZones, selectZone, zoomToCluster]);
  const thresholdDb = snapshotData?.pair?.params.threshold_db != null ? Math.abs(snapshotData.pair.params.threshold_db) : PUBLISHED_THRESHOLD_DB;
  const clusterZones = useMemo(() => (clusterIds ? derivedZones.filter((z) => clusterIds.includes(z.zone_id)) : []), [clusterIds, derivedZones]);

  // Dev check: every candidate cell belongs to one zone, so the zone areas must add up to the published candidate area.
  const candidateAreaHa = snapshotData?.pair?.metrics?.candidate_area_ha;
  useEffect(() => {
    if (import.meta.env.DEV) checkZoneAreaSum(derivedZones, candidateAreaHa);
  }, [derivedZones, candidateAreaHa]);

  const sectors = useMemo(() => snapshotData?.sectors?.features ?? [], [snapshotData]);
  const names = useMemo(() => buildSectorNames(sectors, result?.pair_id ?? null), [sectors, result]);
  const sectorLabels = useMemo(() => new Map(sectors.map((s) => [s.sector_id, sectorLabel(names.get(s.sector_id), s.sector_id, t)])), [sectors, names, t]);
  const zones = useMemo(() => [...names.values()].filter((n) => n.zone !== null).sort((a, b) => (a.zone ?? 0) - (b.zone ?? 0)), [names]);
  // Picker order: candidate zones first, then grid cells north→south, west→east.
  const sortedSectorIds = useMemo(() => [...names.values()].sort((a, b) => {
    const za = a.zone ?? Infinity; const zb = b.zone ?? Infinity;
    if (za !== zb) return za - zb;
    return (a.row ?? Infinity) - (b.row ?? Infinity) || (a.col ?? Infinity) - (b.col ?? Infinity) || a.id.localeCompare(b.id);
  }).map((n) => n.id), [names]);
  // With grouped zones the 1 km candidate squares are not highlighted any more (only the optional grid layer shows them).
  const highlightIds = useMemo(() => (hasDerived ? NO_HIGHLIGHT : new Set(zones.map((z) => z.id))), [zones, hasDerived]);
  const selectedSector = sectors.find((s) => s.sector_id === sectorId) ?? null;
  const selectedName = sectorId ? names.get(sectorId) : undefined;

  const tabKeys = hasDerived ? DERIVED_LAYERS : RADAR_LAYERS;
  const layerOf = (key: LayerKey) => pickLayer(key, result, derived, grayscale);
  // The sliding before/after comparator is retired from the interface; the map component keeps its (unused) support.
  const compareOn = false;
  const advancedKeys = tabKeys.filter((key): key is 'before' | 'after' => key === 'before' || key === 'after');
  const mainKeys = tabKeys.filter((key) => key !== 'before' && key !== 'after');
  const wanted: LayerKey = layerKey && tabKeys.includes(layerKey) ? layerKey : tabKeys[0];
  const effectiveLayer: LayerKey = layerOf(wanted) ? wanted : tabKeys.find((key) => layerOf(key)) ?? wanted;
  const layerTabs: TabItem[] = mainKeys.map((key) => ({
    id: key,
    label: hasDerived && key === 'delta' ? t('explore.layerDeltaDb') : t(LAYER_LABEL[key]),
    disabled: !layerOf(key),
    title: layerOf(key) ? undefined : t('observatory.layerMissing'),
  }));

  // ---- base map / official NASA imagery selection
  const initialDate = comparison?.initial_date ?? null;
  const finalDate = comparison?.final_date ?? null;
  const sideDate = nasaSide === 'initial' ? initialDate : finalDate;
  const datesFor = (): { left: string | null; right: string | null } => (compareOn ? { left: initialDate, right: finalDate } : { left: sideDate, right: sideDate });
  const covered = (def: MapLayerDef) => {
    const d = datesFor();
    return layerCoverage(def, d.left) === 'ok' && layerCoverage(def, d.right) === 'ok';
  };
  const chosenBase = BASE_DEFS.find((d) => d.id === baseId) ?? OSM_LAYER;
  const baseCovered = covered(chosenBase);
  const baseDef = baseCovered ? chosenBase : OSM_LAYER;
  const chosenOverlay = OVERLAY_DEFS.find((d) => d.id === overlayId) ?? null;
  const overlayCovered = chosenOverlay ? covered(chosenOverlay) : false;
  const base: TileSelection = { def: baseDef, ...datesFor() };
  const officialOverlay: TileSelection | null = chosenOverlay && overlayCovered ? { def: chosenOverlay, ...datesFor() } : null;
  const showsNasa = baseDef.official || !!officialOverlay;
  const failedDef = failedTileId === baseDef.id ? baseDef : failedTileId && officialOverlay?.def.id === failedTileId ? officialOverlay.def : null;
  const lang = locale;

  if (state.status === 'loading') return <Shell><EmptyState title={t('observatory.loadingTitle')} /></Shell>;
  if (state.status === 'no_data') {
    return <Shell><EmptyState title={t('observatory.noDataTitle')} message={t('observatory.noDataBody')} action={<Button variant="secondary" onClick={reload}>{t('observatory.retryLoad')}</Button>} /></Shell>;
  }
  if (state.status === 'error') {
    return (
      <Shell>
        <EmptyState tone="error" title={t('observatory.errorTitle')} message={`${t('observatory.errorBody')} ${describeError(t, state.error)}`}
          action={<Button variant="secondary" onClick={reload}>{t('common.retry')}</Button>} />
      </Shell>
    );
  }

  const catalog = snapshotData?.catalog ?? state.catalog;
  const ready = state.status === 'ready' && snapshotData !== null;
  const metrics = selectedSector && result ? sectorMetrics(selectedSector, result.pair_id) : result?.metrics ?? null;
  const activeLayer = compareOn ? layerOf('before') : layerOf(effectiveLayer);
  const initialText = formatDate(initialDate, locale) ?? '—';
  const finalText = formatDate(finalDate, locale) ?? '—';

  const single = compareOn ? null : layerOf(effectiveLayer);
  // The raw 1 km candidate PNG is replaced by the grouped zones whenever those exist.
  const radar = single && !(hasDerived && effectiveLayer === 'candidates') ? { url: single.url, bounds: single.bounds } : null;
  const beforeLayer = layerOf('before');
  const afterLayer = layerOf('after');
  const compareLayers = compareOn && beforeLayer && afterLayer ? {
    before: { url: beforeLayer.url, bounds: beforeLayer.bounds },
    after: { url: afterLayer.url, bounds: afterLayer.bounds },
  } : null;
  const qualityLayer = showQuality && result?.layers.quality ? { url: result.layers.quality.url, bounds: result.layers.quality.bounds } : null;
  const showWindow = !validGeometry || showWindowToggle;

  const nasaBadge = showsNasa ? <StatusBadge tone="info">{t('observatory.badgeNasa')}</StatusBadge> : null;
  const noCoverageText = t('observatory.noNasaCoverage');
  const baseOptionDisabled = (def: MapLayerDef) => !covered(def);
  const officialNote = showsNasa ? (
    <p className="observatory__muted">{nasaBadge} {(baseDef.official ? baseDef : officialOverlay?.def)?.description[lang]}</p>
  ) : null;

  const zoneTip = (zone: Zone) => zoneShortLabel(zone, t, locale);
  const zonePopup = (zone: Zone) => ({
    title: zoneName(zone, t),
    lines: [
      `${t('explore.zoneArea')}: ${formatSmart(zone.area_ha, locale) ?? '?'} ${t('common.hectares')}`,
      `${t('explore.zoneMean')}: ${zone.mean_delta_db === null ? t('explore.zoneNotAvailable') : `${formatNumber(zone.mean_delta_db, locale, 2)} dB`}`,
      `${t('explore.intensityLabel')}: ${t(`explore.intensityShort_${classifyDelta(zone.mean_delta_db, thresholdDb) ?? 'noData'}` as MessageKey)}`,
    ],
  });

  const pickBase = (id: string) => { setBaseId(id); setFailedTileId(null); };
  const nasaDates = (chosenBase.time.mode === 'pairDate' || chosenOverlay?.time.mode === 'pairDate') ? (
    <div className="obs-pop__dates" role="group" aria-label={t('observatory.nasaDateLabel')}>
      <span className="obs-pop__lead">{t('observatory.nasaDateLabel')}</span>
      {compareOn ? <small className="observatory__muted">{t('observatory.nasaDateCompare', { initial: initialText, final: finalText })}</small> : (
        <div className="obs-seg obs-seg--wrap">
          <button type="button" className="obs-seg__btn" aria-pressed={nasaSide === 'initial'} onClick={() => { setNasaSide('initial'); setFailedTileId(null); }}>{t('observatory.swipeBefore', { date: initialText })}</button>
          <button type="button" className="obs-seg__btn" aria-pressed={nasaSide === 'final'} onClick={() => { setNasaSide('final'); setFailedTileId(null); }}>{t('observatory.swipeAfter', { date: finalText })}</button>
        </div>
      )}
    </div>
  ) : null;
  const legendEl = hasDerived ? (
    <DerivedLegend layerKey={compareOn ? 'before' : effectiveLayer} layer={activeLayer} compare={compareOn} grayscale={grayscale} hasValidArea={!!validGeometry}
      hasZones={derivedZones.length > 0} zoneView={zoneView} hasSelection={!!selectedZone} showWindow={showWindow} showCells={showCells} showGrid={showGrid}
      showFootprints={showFootprints} official={officialNote} />
  ) : (
    <MapLegend thresholdDb={result?.params.threshold_db ?? null} layerKey={effectiveLayer} layer={activeLayer} compare={compareOn} showQuality={showQuality}
      showGrid={showGrid} showFootprints={showFootprints} official={officialNote} />
  );

  const showWorkspace = comparisons.length === 0 || comparison !== null;

  return (
    <Shell onHelp={() => setHelpOpen(true)}>
      {snapshotData?.results.data_mode === 'demo' && <p className="observatory__demo" role="status"><StatusBadge tone="demo">{t('observatory.demoBadge')}</StatusBadge> {t('observatory.demoBanner')}</p>}

      {state.status === 'catalog_only' && (
        <EmptyState title={t('observatory.catalogOnlyTitle')} message={t('observatory.catalogOnlyBody')}
          action={<Button variant="secondary" disabled aria-describedby="compare-hint">{t('observatory.modeCompare')}</Button>}>
          <p id="compare-hint" className="observatory__muted">{t('observatory.compareDisabled')}</p>
        </EmptyState>
      )}

      {/* STEP 1 */}
      <section className="observatory__step" id="obs-step-1" aria-labelledby="obs-step-1-title">
        <StepHead n={1} title={t('observatory.step1Title')} lead={t('observatory.step1Lead')} />
        {comparisons.length > 0 ? (
          <PeriodPicker comparisons={comparisons} selected={comparison} scenes={state.catalog.scenes} picks={effectivePicks} onPicks={setPicks} />
        ) : <p className="observatory__muted">{t('observatory.periodNone')}</p>}
      </section>

      {showWorkspace && <div className="observatory__layout">
        {/* STEP 2 */}
        <section className="observatory__step observatory__main" id="obs-step-2" aria-labelledby="obs-step-2-title">
          <StepHead n={2} title={t('observatory.step2Title')} lead={t('observatory.step2Lead')} />
          <div className={expanded ? 'obs-mapbox-slot is-held' : 'obs-mapbox-slot'}>
          <div
            ref={boxRef}
            className={`obs-mapbox${expanded ? ' is-expanded' : ''}`}
            role={expanded ? 'dialog' : undefined}
            aria-modal={expanded ? true : undefined}
            aria-labelledby={expanded ? 'obs-map-dialog-title' : undefined}
            onKeyDown={expanded ? trapTab : undefined}
          >
            {expanded && (
              <div className="obs-mapbox__head">
                <h2 id="obs-map-dialog-title">{t('explore.mapExpandTitle')}</h2>
                {hasDerived && derivedZones.length > 0 && (
                  <label className="obs-mapbox__zone">
                    <span className="sr-only">{t('explore.zonePick')}</span>
                    <select value={selectedZone?.zone_id ?? ''} data-testid="map-expand-zone" onChange={(e) => { const id = e.target.value || null; selectZone(id); if (id) zoomToCluster([id]); }}>
                      <option value="">{t('explore.zoneAll')}</option>
                      {derivedZones.map((zone) => <option key={zone.zone_id} value={zone.zone_id}>{zoneOptionLabel(zone, t, locale)}</option>)}
                    </select>
                  </label>
                )}
                <button ref={closeBtnRef} type="button" className="obs-tool" data-testid="map-expand-close" aria-label={t('explore.mapExpandClose')} onClick={() => setExpanded(false)}>
                  <X size={16} aria-hidden="true" /><span>{t('common.close')}</span>
                </button>
              </div>
            )}
            <div className="obs-toolbar" role="group" aria-label={t('explore.mapToolbar')}>
              {ready && result && (
                <Tabs idPrefix="obs-layer" tabs={layerTabs} activeId={effectiveLayer} onChange={(id) => setLayerKey(id as LayerKey)} label={t('observatory.layerGroup')} />
              )}
              <BaseMapPicker defs={BASE_DEFS} selectedId={baseDef.id} locale={lang} isCovered={(def) => !baseOptionDisabled(def)} onPick={pickBase} />
              <NasaMenu defs={BASE_DEFS} selectedId={baseDef.id} locale={lang} isCovered={(def) => !baseOptionDisabled(def)} onPick={pickBase}>
                {nasaDates}
                {!baseCovered && <p className="obs-pop__note" role="status">{chosenBase.label[lang]}: {noCoverageText}</p>}
              </NasaMenu>
              {!expanded && (
                <button ref={expandBtnRef} type="button" className="obs-tool obs-toolbar__expand" data-testid="map-expand" aria-label={t('explore.mapExpand')} title={t('explore.mapExpand')} onClick={() => { setLegendOpen(false); setExpanded(true); }}>
                  <Maximize2 size={16} aria-hidden="true" /><span>{t('explore.mapExpand')}</span>
                </button>
              )}
            </div>
            {ready && result && !hasDerived && <p className="observatory__muted" data-testid="no-derived">{t('explore.noDerivedNotice')}</p>}
            <div className="obs-mapbox__body" id={panelDomId('obs-layer')} role={ready && result && !compareOn ? 'tabpanel' : undefined} aria-labelledby={ready && result && !compareOn ? tabDomId('obs-layer', effectiveLayer) : undefined}>
              <ObservatoryMap
                bbox={catalog.query.bbox}
                scenes={catalog.scenes}
                sectors={sectors}
                selectedSectorId={sectorId}
                highlightIds={highlightIds}
                sectorLabels={sectorLabels}
                onSelectSector={selectSector}
                zones={derivedZones}
                selectedZoneId={selectedZone?.zone_id ?? null}
                onSelectZone={selectZone}
                zoneTip={zoneTip}
                zonePopup={zonePopup}
                thresholdDb={thresholdDb}
                onSelectCluster={selectCluster}
                zoomTo={zoomTo}
                onZoneView={setZoneView}
                clusterAria={(count) => t('explore.clusterAria', { count })}
                validArea={validGeometry}
                showWindow={showWindow}
                cells={cells}
                focus={focus}
                radar={radar}
                compare={compareLayers}
                quality={qualityLayer}
                opacity={opacity / 100}
                showFootprints={showFootprints}
                showGrid={showGrid}
                base={base}
                officialOverlay={officialOverlay}
                onTileFailure={setFailedTileId}
                labels={{
                  window: t('observatory.studyWindow'), footprint: t('observatory.footprints'), map: t('observatory.mapLabel'),
                  unavailable: t('observatory.mapUnavailable'), overlayError: t('observatory.overlayError'),
                  before: t('observatory.swipeBefore', { date: initialText }), after: t('observatory.swipeAfter', { date: finalText }),
                  divider: t('observatory.swipeLabel'),
                }}
              >
                {places && <PlaceSearch gazetteer={places} validArea={validGeometry} zones={derivedZones} focus={focus} onFocus={setFocus} onSelectZone={selectZone} />}
                {result && (
                  <div className="obs-origin" aria-label={t('observatory.provenanceChips')}>
                    <StatusBadge tone="ok">{t('observatory.badgeCalculated')}</StatusBadge>
                    {nasaBadge}
                  </div>
                )}
                {expanded && (
                  <div className="obs-float obs-float--left">
                    {selectedZone ? (
                      <div className="obs-float__card" data-testid="map-zone-float">
                        <div className="obs-float__row">
                          <strong>{zoneName(selectedZone, t)}</strong>
                          <button type="button" className="obs-float__x" aria-label={t('observatory.backToWindow')} onClick={() => setZoneId(null)}><X size={14} aria-hidden="true" /></button>
                        </div>
                        <span>{formatSmart(selectedZone.area_ha, locale) ?? '?'} {t('common.hectares')} · {selectedZone.mean_delta_db === null ? t('explore.zoneNotAvailable') : `${formatNumber(selectedZone.mean_delta_db, locale, 2)} dB`}</span>
                        <span>{t('explore.intensityLabel')}: {t(`explore.intensityShort_${classifyDelta(selectedZone.mean_delta_db, thresholdDb) ?? 'noData'}` as MessageKey)}</span>
                      </div>
                    ) : clusterZones.length > 1 ? (
                      <div className="obs-float__card" data-testid="map-cluster-float">
                        <strong>{t('explore.clusterTitle', { count: clusterZones.length })}</strong>
                        <Button variant="secondary" className="btn--sm" onClick={() => zoomToCluster(clusterZones.map((z) => z.zone_id))}>{t('explore.clusterZoom')}</Button>
                      </div>
                    ) : null}
                    <div className="obs-float__legend">
                      <button type="button" className="obs-tool" aria-expanded={legendOpen} onClick={() => setLegendOpen((v) => !v)}>
                        <ListTree size={15} aria-hidden="true" /><span>{t('explore.legendToggle')}</span>
                      </button>
                      {legendOpen && legendEl}
                    </div>
                  </div>
                )}
              </ObservatoryMap>
            </div>
          </div>
          </div>
          {failedDef && (
            <p className="observatory__warning" role="alert">
              {failedDef.official ? t('observatory.tileFailure') : t('observatory.tileFailureOsm')}{' '}
              {failedDef.id !== OSM_LAYER.id && <Button variant="ghost" className="btn--sm" onClick={() => { setBaseId(OSM_LAYER.id); setOverlayId(''); setFailedTileId(null); }}>{t('observatory.tileBackToOsm')}</Button>}
            </p>
          )}
          {ready && result && (
            <div className="observatory__slider obs-opacity">
              <label>
                <span>{t('observatory.opacity')} <b>{opacity}%</b></span>
                <input type="range" min={0} max={100} step={5} value={opacity} data-testid="opacity-slider" onChange={(event) => setOpacity(Number(event.target.value))} />
              </label>
              {!compareOn && !layerOf(effectiveLayer) && <small className="observatory__muted">{t('observatory.layerNone')}</small>}
            </div>
          )}

          {!expanded && legendEl}

          <details className="observatory__details observatory__advanced" data-testid="map-advanced">
            <summary>{t('observatory.advancedControls')}</summary>
            <fieldset className="observatory__fieldset">
              <legend>{t('observatory.advancedLayers')}</legend>
              <label className="observatory__check"><input type="checkbox" checked={showFootprints} data-testid="toggle-footprints" onChange={(e) => setShowFootprints(e.target.checked)} />{t('observatory.toggleFootprints')}</label>
              <label className="observatory__check"><input type="checkbox" checked={showGrid} data-testid="toggle-grid" onChange={(e) => setShowGrid(e.target.checked)} />{t('observatory.toggleGrid')}</label>
              <label className="observatory__check"><input type="checkbox" checked={showQuality} disabled={!result?.layers.quality} data-testid="toggle-quality" onChange={(e) => setShowQuality(e.target.checked)} />{t('observatory.toggleQuality')}</label>
              {hasDerived && derived.cellsUrl && <label className="observatory__check"><input type="checkbox" checked={showCells} data-testid="toggle-cells" onChange={(e) => setShowCells(e.target.checked)} />{t('explore.advCells')}</label>}
              {validGeometry && <label className="observatory__check"><input type="checkbox" checked={showWindowToggle} data-testid="toggle-window" onChange={(e) => setShowWindowToggle(e.target.checked)} />{t('explore.advWindow')}</label>}
              {hasDerived && <label className="observatory__check"><input type="checkbox" checked={grayscale} data-testid="toggle-grayscale" onChange={(e) => setGrayscale(e.target.checked)} />{t('explore.advGrayscale')}</label>}
            </fieldset>
            {ready && result && advancedKeys.length > 0 && (
              <fieldset className="observatory__fieldset" data-testid="advanced-dates">
                <legend>{t('observatory.advancedDatesTitle')}</legend>
                <div className="observatory__filters" role="group" aria-label={t('observatory.advancedDatesTitle')}>
                  <button type="button" className="observatory__chip" aria-pressed={effectiveLayer !== 'before' && effectiveLayer !== 'after'} onClick={() => setLayerKey(null)}>{t('observatory.advancedBackToChange')}</button>
                  {advancedKeys.map((key) => (
                    <button key={key} type="button" className="observatory__chip" data-testid={`adv-layer-${key}`} disabled={!layerOf(key)} aria-pressed={effectiveLayer === key} onClick={() => setLayerKey(key)}>
                      {key === 'before' ? t('observatory.swipeBefore', { date: initialText }) : t('observatory.swipeAfter', { date: finalText })}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {OVERLAY_DEFS.length > 0 && (
              <fieldset className="observatory__fieldset">
                <legend>{t('observatory.overlayNasaLabel')}</legend>
                <label className="observatory__field">{t('observatory.overlayNasaLabel')}
                  <select value={overlayId} onChange={(e) => setOverlayId(e.target.value)}>
                    <option value="">{t('observatory.overlayNone')}</option>
                    {OVERLAY_DEFS.map((def) => <option key={def.id} value={def.id} disabled={baseOptionDisabled(def)}>{def.label[lang]}{baseOptionDisabled(def) ? ` — ${noCoverageText}` : ''}</option>)}
                  </select>
                </label>
                {chosenOverlay && !overlayCovered && <p className="observatory__warning" role="status">{chosenOverlay.label[lang]}: {noCoverageText}</p>}
              </fieldset>
            )}
            {sectors.length > 0 && (
              <label className="observatory__field">{t('observatory.sectorPick')}
                <select value={sectorId ?? ''} onChange={(event) => selectSector(event.target.value || null)}>
                  <option value="">{t('observatory.sectorPickPlaceholder')}</option>
                  {sortedSectorIds.map((id) => <option key={id} value={id}>{sectorLabels.get(id)}</option>)}
                </select>
              </label>
            )}
          </details>
        </section>

        {/* STEP 3 */}
        <section className="observatory__step observatory__side" id="obs-step-3" aria-labelledby="obs-step-3-title">
          <StepHead n={3} title={t('observatory.step3Title')} lead={t('observatory.step3Lead')} />
          {ready && result ? (
            <>
              <div className="observatory__scope" aria-live="polite">
                <span className="observatory__label">{t('explore.selectionTitle')}</span>
                {selectedSector ? (
                  <>
                    <div>
                      <strong>{sectorLabel(selectedName, selectedSector.sector_id, t)}</strong>
                      {selectedName && selectedName.zone !== null && <span className="observatory__muted"> · {gridName(selectedName, t)}</span>}
                      <small className="observatory__id">{t('observatory.sectorTechId', { id: selectedSector.sector_id })}</small>
                    </div>
                    <Button variant="ghost" className="btn--sm" onClick={() => setSectorId(null)} data-testid="back-to-window">{t('observatory.backToWindow')}</Button>
                  </>
                ) : selectedZone ? (
                  <>
                    <strong>{zoneName(selectedZone, t)}</strong>
                    <Button variant="ghost" className="btn--sm" onClick={() => setZoneId(null)} data-testid="back-to-window">{t('observatory.backToWindow')}</Button>
                  </>
                ) : <strong>{t('observatory.scopePair')}</strong>}
              </div>
              {selectedZone && <ZoneInfo zone={selectedZone} initialText={initialText} finalText={finalText} snapshotId={snapshotId} thresholdDb={thresholdDb} />}
              {!selectedZone && !selectedSector && clusterZones.length > 1 && (
                <ClusterInfo zones={clusterZones} initialText={initialText} finalText={finalText} snapshotId={snapshotId}
                  onZoom={() => zoomToCluster(clusterZones.map((z) => z.zone_id))} onClose={() => setClusterIds(null)} />
              )}
              <IndicatorCards metrics={selectedZone ? result.metrics : metrics} note={selectedZone ? t('explore.zoneAll') : undefined} />
              <KeyMessage />
              <LimitationsCard onSeeAll={() => setLimitsOpen(true)} />
              <div className="observatory__block">
                <h3>{t('observatory.zonesTitle')}</h3>
                {hasDerived ? (
                  derivedZones.length === 0 ? <p className="observatory__muted">{t('explore.zonesNone')}</p> : (
                    <>
                      <p className="observatory__muted">{t('explore.zonesHint', { count: derivedZones.length })}</p>
                      <ZoneSelect zones={derivedZones} value={selectedZone?.zone_id ?? null} onChange={selectZone} />
                    </>
                  )
                ) : sectors.length === 0 ? <p className="observatory__muted">{t('observatory.sectorsNone')}</p> : zones.length === 0 ? <p className="observatory__muted">{t('observatory.sectorsNoCandidates')}</p> : (
                  <>
                    <p className="observatory__muted">{t('observatory.zonesHint', { count: zones.length })}</p>
                    <label className="observatory__field explore-zone-pick">
                      <span>{t('explore.zonePick')}</span>
                      <select value={zones.some((z) => z.id === sectorId) ? sectorId ?? '' : ''} data-testid="zone-select" onChange={(event) => selectSector(event.target.value || null)}>
                        <option value="">{t('explore.zoneAll')}</option>
                        {zones.map((z) => {
                          const sector = sectors.find((s) => s.sector_id === z.id);
                          const area = sector ? formatSmart(sectorMetrics(sector, result.pair_id)?.candidate_area_ha ?? null, locale) : null;
                          return <option key={z.id} value={z.id}>{t('observatory.zoneName', { n: z.zone ?? 0 })}{area ? ` · ${area} ${t('common.hectares')}` : ''} · {gridName(z, t)}</option>;
                        })}
                      </select>
                    </label>
                  </>
                )}
                {derived && <DerivedMethod derived={derived} />}
              </div>
              <Button variant="secondary" href={routeHref('observations')}>{t('observatory.openObservations')}</Button>
            </>
          ) : snapshot.status === 'loading' ? <EmptyState title={t('observatory.snapshotLoading')} />
            : snapshot.status === 'error' ? (
              <EmptyState tone="error" title={t('observatory.snapshotErrorTitle')} message={`${t('observatory.snapshotErrorBody')} ${describeError(t, snapshot.error)}`}
                action={<Button variant="secondary" onClick={retrySnapshot}>{t('common.retry')}</Button>} />
            ) : <EmptyState title={t('observatory.step3Empty')} message={t('observatory.step3EmptyBody')} />}
        </section>
      </div>}

      {ready && result && (
        <section className="observatory__tech" aria-label={t('observatory.technical')}>
          <TechnicalDetails pair={result} comparison={comparison} algorithm={snapshotData.results.algorithm_version} processedAt={snapshotData.results.processed_at} snapshotId={snapshotId}>
            <p className="observatory__muted">{state.manifest.updated_at ? `${t('observatory.updated')}: ${formatDate(state.manifest.updated_at, locale, true)} · ` : ''}{snapshotData.results.data_mode ? `${t('observatory.mode')}: ${snapshotData.results.data_mode}` : ''}</p>
          </TechnicalDetails>
        </section>
      )}

      <Modal open={helpOpen} title={t('observatory.howToTitle')} closeLabel={t('common.close')} onClose={() => setHelpOpen(false)}>
        <p>{t('observatory.howToBody1')}</p>
        <p>{t('observatory.howToBody2')}</p>
        <p>{t('observatory.howToBody3')}</p>
      </Modal>
      <Modal open={limitsOpen} title={t('observatory.limitsModalTitle')} closeLabel={t('common.close')} onClose={() => setLimitsOpen(false)}>
        <LimitationsList items={result?.limitations ?? []} />
      </Modal>
    </Shell>
  );
}

function Shell({ children, onHelp }: { children: ReactNode; onHelp?: () => void }) {
  const { t } = useI18n();
  return (
    <section className="observatory page" aria-labelledby="observatory-title">
      <div className="page__head observatory__head">
        <div>
          <p className="eyebrow"><span className="eyebrow-line" /> {t('observatory.eyebrow')}</p>
          <h1 id="observatory-title">{t('observatory.title')} <em>{t('observatory.titleEm')}</em></h1>
          <p>{t('observatory.lede')}</p>
        </div>
        <div className="observatory__head-actions">
          {onHelp && <Button variant="ghost" className="btn--sm" onClick={onHelp}>{t('observatory.howTo')}</Button>}
          <Button variant="ghost" className="btn--sm" href={routeHref('data')} data-testid="technical-link">{t('observatory.technicalData')}</Button>
        </div>
      </div>
      {children}
    </section>
  );
}

export default Observatory;
