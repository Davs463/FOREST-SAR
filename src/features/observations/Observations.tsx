import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Activity, CalendarRange, ChevronDown, Download, FileSpreadsheet, Map as MapIcon, MapPin, MousePointerClick, Ruler, Search, TrendingUp } from 'lucide-react';
import { useHashParam } from '../../app/router';
import { Button, EmptyState, StatusBadge } from '../../components';
import { routeHref } from '../../config/app.config';
import { MAP_COLORS, RADAR_CLASS_COLORS } from '../../config/mapColors';
import { useI18n, type MessageKey } from '../../i18n';
import { useComparisons, useSnapshot } from '../../services/comparisons';
import { useScience } from '../../services/ScienceProvider';
import { describeError } from '../../shared/errors';
import { formatDate, formatNumber, formatSmart } from '../../shared/format';
import { PUBLISHED_THRESHOLD_DB, classifyDelta, type RadarClass } from '../../shared/radarClasses';
import { limitationText } from '../../shared/scienceText';
import { normalizeText } from '../observatory/geo';
import { SHORTCUTS, defaultComparison, shortcutTarget, type ShortcutId } from '../observatory/period';
import { buildCsv, buildZonesCsv, deriveObservations, downloadCsv, groupZonesByPlace, type PlaceGroup } from './observations.model';
import type { Comparison, Zone } from '../../shared/science.types';
import './observations.css';

const SHORTCUT_LABEL: Record<ShortcutId, MessageKey> = {
  d12: 'observatory.shortcut12d', m1: 'observatory.shortcut1m', m2: 'observatory.shortcut2m', m3: 'observatory.shortcut3m',
};

/** Writes `?compare=` without adding history entries and notifies useHashParam listeners. */
function setCompareParam(id: string): void {
  const [path, query = ''] = window.location.hash.split('?');
  const params = new URLSearchParams(query);
  params.set('compare', id);
  window.history.replaceState(null, '', `${path || '#/observations'}?${params.toString()}`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

const PLACES_LIMIT = 8;
const ZONES_LIMIT = 6;
const DESKTOP_QUERY = '(min-width: 900px)';

type IntensityKey = RadarClass | 'noData';
const colorOf = (key: IntensityKey): string => (key === 'noData' ? MAP_COLORS.noData : RADAR_CLASS_COLORS[key]);
const isDesktop = (): boolean => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;

export function Observations() {
  const { t, locale } = useI18n();
  const { state, reload } = useScience();
  const { comparisons } = useComparisons();
  const compareParam = useHashParam('compare');
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [placesAll, setPlacesAll] = useState(false);
  const [zonesAll, setZonesAll] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const comparison: Comparison | null = useMemo(
    () => comparisons.find((c) => c.snapshot_id === compareParam) ?? defaultComparison(comparisons),
    [comparisons, compareParam],
  );
  const { snapshot, retry } = useSnapshot(comparison);
  const snapshotId = comparison?.snapshot_id ?? null;
  const data = snapshot.status === 'ready' ? snapshot.data : null;
  const zones = useMemo(() => data?.derived?.zones ?? [], [data]);
  const groups = useMemo(() => groupZonesByPlace(zones), [zones]);

  // Place and observation belong to one snapshot.
  useEffect(() => { setPlaceKey(null); setZoneId(null); setCollapsed(false); setPlacesAll(false); setZonesAll(false); }, [snapshotId]);
  // On desktop preselect the locality with the largest candidate area so the detail is never empty.
  useEffect(() => {
    if (placeKey !== null || groups.length === 0 || !isDesktop()) return;
    setPlaceKey(groups[0].key); setZoneId(groups[0].zones[0]?.zone_id ?? null);
  }, [groups, placeKey]);

  const group = groups.find((g) => g.key === placeKey) ?? null;
  const selectedZone = group?.zones.find((z) => z.zone_id === zoneId) ?? null;
  const thresholdDb = data?.pair.params.threshold_db != null ? Math.abs(data.pair.params.threshold_db) : PUBLISHED_THRESHOLD_DB;
  const na = t('common.notComputable');
  const fmtHa = useCallback((value: number | null) => {
    const text = formatSmart(value, locale);
    return text === null ? na : `${text} ${t('common.hectares')}`;
  }, [locale, na, t]);
  const placeName = useCallback((g: PlaceGroup) => g.name ?? t('observations.noPlace'), [t]);
  /** Intensity class holding most of the candidate area of each locality. */
  const dominant = useMemo(() => {
    const out = new Map<string, IntensityKey>();
    for (const g of groups) {
      const sums = new Map<IntensityKey, number>();
      for (const z of g.zones) {
        const k: IntensityKey = classifyDelta(z.mean_delta_db, thresholdDb) ?? 'noData';
        sums.set(k, (sums.get(k) ?? 0) + z.area_ha);
      }
      out.set(g.key, [...sums.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'noData');
    }
    return out;
  }, [groups, thresholdDb]);

  const pickPlace = (g: PlaceGroup) => {
    const index = groups.indexOf(g);
    if (index >= PLACES_LIMIT) setPlacesAll(true);
    setPlaceKey(g.key); setCollapsed(false); setZonesAll(false);
    setZoneId(isDesktop() ? g.zones[0]?.zone_id ?? null : null);
  };
  const togglePlace = (g: PlaceGroup) => {
    if (g.key === placeKey) { setCollapsed((c) => !c); return; }
    pickPlace(g);
  };
  const pickZone = (id: string) => {
    setZoneId(id);
    if (!isDesktop()) window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const head = (
    <div className="obs-head">
      <h1>{t('observations.title')}</h1>
      <p>{t('observations.lede')}</p>
      <StatusBadge tone="warn">{t('observations.notice')}</StatusBadge>
    </div>
  );

  if (state.status === 'loading') return <section className="page observations">{head}<EmptyState title={t('common.loading')} /></section>;
  if (state.status === 'error') {
    return (
      <section className="page observations">{head}
        <EmptyState tone="error" title={t('observations.errorTitle')} message={describeError(t, state.error)} action={<Button variant="secondary" onClick={reload}>{t('common.retry')}</Button>} />
      </section>
    );
  }
  if (state.status !== 'ready' || !comparison) {
    return (
      <section className="page observations">{head}
        <EmptyState title={t('observations.noDataTitle')} message={t('observations.noDataBody')} action={<Button variant="secondary" href={routeHref('observatory')}>{t('nav.observatory')}</Button>} />
      </section>
    );
  }

  const totalHa = zones.reduce((sum, z) => sum + z.area_ha, 0);
  const maxHa = groups.reduce((m, g) => Math.max(m, g.totalHa), 0) || 1;
  const fmtDate = (iso: string) => formatDate(iso, locale) ?? iso;
  const visibleGroups = placesAll ? groups : groups.slice(0, PLACES_LIMIT);
  const count = (g: PlaceGroup) => t(g.zones.length === 1 ? 'observations.placeCountOne' : 'observations.placeCount', { count: g.zones.length, area: fmtHa(g.totalHa) });

  return (
    <section className="page observations">
      {head}
      <PeriodButtons comparisons={comparisons} selected={comparison} onPick={(c) => setCompareParam(c.snapshot_id)} />
      {data && (
        <>
          <p className="obs-sr" data-testid="obs-summary">{t('observations.summary', { count: zones.length, places: groups.length, area: formatSmart(totalHa, locale) ?? '0' })}</p>
          <div className="obs-kpis" aria-hidden="true">
            <Kpi label={t('observations.kpiObservations')} value={formatNumber(zones.length, locale, 0) ?? '0'} />
            <Kpi label={t('observations.kpiPlaces')} value={formatNumber(groups.length, locale, 0) ?? '0'} />
            <Kpi label={t('observations.kpiArea')} value={formatSmart(totalHa, locale) ?? '0'} unit={t('common.hectares')} />
            <Kpi label={t('observations.kpiPeriod')} value={`${fmtDate(comparison.initial_date)} → ${fmtDate(comparison.final_date)}`} small />
          </div>
        </>
      )}
      {snapshot.status === 'loading' || snapshot.status === 'idle' ? <EmptyState title={t('observatory.snapshotLoading')} />
        : snapshot.status === 'error' ? (
          <EmptyState tone="error" title={t('observatory.snapshotErrorTitle')} message={`${t('observatory.snapshotErrorBody')} ${describeError(t, snapshot.error)}`}
            action={<Button variant="secondary" onClick={retry}>{t('common.retry')}</Button>} />
        ) : !data?.derived ? <EmptyState title={t('observations.noDerivedTitle')} message={t('observations.noDerivedBody')} />
          : zones.length === 0 ? <EmptyState title={t('observations.none')} message={t('explore.zonesNone')} />
            : (
              <div className="observations__layout">
                <div className="observations__side">
                  <PlaceCombobox groups={groups} value={group} onPick={pickPlace} placeName={placeName} count={count} />
                  <h2 className="obs-subtitle">{t('observations.placesTitle')}</h2>
                  <ul className="obs-places" data-testid="obs-places">
                    {visibleGroups.map((g) => {
                      const active = g.key === placeKey;
                      const open = active && !collapsed;
                      const key = dominant.get(g.key) ?? 'noData';
                      const shown = zonesAll ? g.zones : g.zones.slice(0, ZONES_LIMIT);
                      return (
                        <li key={g.key || 'none'} className={`obs-place${active ? ' is-active' : ''}`}>
                          <button type="button" className="obs-place__head" data-testid="obs-place-card" aria-expanded={open} onClick={() => togglePlace(g)}
                            title={t('observations.predominant', { name: t(`explore.intensityShort_${key}` as MessageKey) })}>
                            <span className="obs-place__top">
                              <i className="obs-dot" style={{ background: colorOf(key) }} aria-hidden="true" />
                              <strong>{placeName(g)}</strong>
                              <ChevronDown size={16} aria-hidden="true" className="obs-place__chev" />
                            </span>
                            <span className="obs-place__meta">{count(g)}</span>
                            <span className="obs-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, (g.totalHa / maxHa) * 100)}%` }} /></span>
                          </button>
                          {open && (
                            <div className="obs-place__body">
                              <ul className="observations__list" aria-label={t('observations.listTitle')} data-testid="obs-list">
                                {shown.map((zone, i) => {
                                  const zk: IntensityKey = classifyDelta(zone.mean_delta_db, thresholdDb) ?? 'noData';
                                  return (
                                    <li key={zone.zone_id}>
                                      <button type="button" data-testid="obs-item" aria-pressed={zone.zone_id === zoneId} onClick={() => pickZone(zone.zone_id)}>
                                        <i className="obs-dot" style={{ background: colorOf(zk) }} aria-hidden="true" />
                                        <span>{t('observations.itemLabel', { n: i + 1, area: fmtHa(zone.area_ha) })}</span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                              {g.zones.length > ZONES_LIMIT && (
                                <button type="button" className="obs-more obs-more--inner" data-testid="obs-items-more" onClick={() => setZonesAll((v) => !v)}>
                                  {zonesAll ? t('observations.showLess') : t('observations.showMore', { n: g.zones.length - ZONES_LIMIT })}
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {groups.length > PLACES_LIMIT && (
                    <button type="button" className="obs-more" data-testid="obs-more" onClick={() => setPlacesAll((v) => !v)}>
                      {placesAll ? t('observations.showLess') : t('observations.showMore', { n: groups.length - PLACES_LIMIT })}
                    </button>
                  )}
                </div>
                <div className="obs-detail-wrap" ref={detailRef} aria-live="polite">
                  {!group || !selectedZone
                    ? (
                      <div className="obs-empty">
                        <MousePointerClick size={34} aria-hidden="true" />
                        <h2>{group ? t('observations.detailTitle') : t('observations.emptyTitle')}</h2>
                        <p>{group ? t('observations.selectPrompt') : t('observations.emptyBody')}</p>
                      </div>
                    )
                    : <Detail zone={selectedZone} number={group.zones.indexOf(selectedZone) + 1} placeLabel={placeName(group)} comparison={comparison} thresholdDb={thresholdDb} fmtHa={fmtHa} limitations={data.pair.limitations} />}
                </div>
              </div>
            )}
      <div className="obs-downloads" role="group" aria-label={t('observations.csvGroup')}>
        <span className="obs-label">{t('observations.downloadsTitle')}</span>
        <Button variant="ghost" className="btn--sm" disabled={!data || zones.length === 0} data-testid="csv-zones" icon={<Download size={15} />}
          onClick={() => data && downloadCsv(`forest_sar_hn_zones_${comparison.initial_date}_${comparison.final_date}.csv`, buildZonesCsv(zones, comparison, thresholdDb))}>{t('observations.csvZones')}</Button>
        <Button variant="ghost" className="btn--sm" disabled={!data || !data.sectors} data-testid="csv-sectors" icon={<FileSpreadsheet size={15} />}
          onClick={() => {
            if (!data) return;
            const rows = deriveObservations(data.results, data.sectors).filter((o) => o.pairId === comparison.pair_id);
            downloadCsv(`forest_sar_hn_sectors_1km_${comparison.initial_date}_${comparison.final_date}.csv`, buildCsv(rows));
          }}>{t('observations.csvSectors')}</Button>
      </div>
    </section>
  );
}

function Kpi({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <div className={`obs-kpi${small ? ' obs-kpi--small' : ''}`}>
      <span className="obs-kpi__label">{label}</span>
      <strong className="obs-kpi__value">{value}{unit && <small>{unit}</small>}</strong>
    </div>
  );
}

function PeriodButtons({ comparisons, selected, onPick }: { comparisons: Comparison[]; selected: Comparison; onPick: (c: Comparison) => void }) {
  const { t, locale } = useI18n();
  const items = SHORTCUTS.map((s) => ({ id: s.id, target: shortcutTarget(comparisons, s.id) }));
  const isShortcut = items.some((i) => i.target?.snapshot_id === selected.snapshot_id);
  const fmt = (iso: string) => formatDate(iso, locale) ?? iso;
  return (
    <div className="observations__period" role="group" aria-label={t('observatory.shortcutsLabel')} data-testid="obs-period">
      <span className="obs-label">{t('observatory.shortcutsLabel')}</span>
      <div className="obs-chips">
        {items.map((item) => (
          <button key={item.id} type="button" className="obs-chip" aria-pressed={item.target?.snapshot_id === selected.snapshot_id}
            disabled={!item.target} title={item.target ? undefined : t('observatory.shortcutUnavailable')} onClick={() => item.target && onPick(item.target)}>{t(SHORTCUT_LABEL[item.id])}</button>
        ))}
        {!isShortcut && <button type="button" className="obs-chip" aria-pressed="true">{fmt(selected.initial_date)} → {fmt(selected.final_date)}</button>}
      </div>
      <p className="obs-muted">{t('observatory.pairDates', { initial: fmt(selected.initial_date), final: fmt(selected.final_date) })}</p>
    </div>
  );
}

interface ComboProps {
  groups: PlaceGroup[];
  value: PlaceGroup | null;
  onPick: (group: PlaceGroup) => void;
  placeName: (group: PlaceGroup) => string;
  count: (group: PlaceGroup) => string;
}

/** Accessible searchable combobox (accent-insensitive) of places with their observation count and total area. */
function PlaceCombobox({ groups, value, onPick, placeName, count }: ComboProps) {
  const { t } = useI18n();
  const uid = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = normalizeText(query);
    return q ? groups.filter((g) => normalizeText(placeName(g)).includes(q)) : groups;
  }, [groups, query, placeName]);

  const pick = (g: PlaceGroup) => { setQuery(''); setOpen(false); onPick(g); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => (results.length === 0 ? 0 : (i + 1) % results.length)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length)); }
    else if (event.key === 'Enter') { if (open && results[active]) { event.preventDefault(); pick(results[active]); } }
    else if (event.key === 'Escape') { if (open) { event.preventDefault(); setOpen(false); } else if (query) { event.preventDefault(); setQuery(''); } }
  };

  return (
    <div className="obs-combo">
      <label htmlFor={`${uid}-input`} className="obs-label">{t('observations.placeLabel')}</label>
      <div className="obs-combo__field">
        <Search size={16} aria-hidden="true" />
        <input
          id={`${uid}-input`} type="text" role="combobox" aria-expanded={open} aria-controls={`${uid}-list`} aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${uid}-opt-${active}` : undefined}
          autoComplete="off" spellCheck={false} data-testid="obs-place-combobox"
          placeholder={t('observations.placePlaceholder')}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKeyDown}
        />
      </div>
      {value && <p className="obs-combo__current" data-testid="obs-place-current"><strong>{placeName(value)}</strong> — {count(value)}</p>}
      <ul id={`${uid}-list`} role="listbox" aria-label={t('observations.placeLabel')} className="obs-combo__list" hidden={!open} data-testid="obs-place-list">
        {open && results.map((g, i) => (
          <li key={g.key || 'none'} id={`${uid}-opt-${i}`} role="option" aria-selected={value?.key === g.key} className={i === active ? 'is-active' : undefined}
            data-testid="obs-place-option" onMouseDown={(event) => { event.preventDefault(); pick(g); }} onMouseEnter={() => setActive(i)}>
            <span>{placeName(g)}</span><small>{count(g)}</small>
          </li>
        ))}
        {open && results.length === 0 && <li role="presentation" className="obs-combo__none">{t('explore.searchNone')}</li>}
      </ul>
    </div>
  );
}

interface DetailProps {
  zone: Zone;
  number: number;
  placeLabel: string;
  comparison: Comparison;
  thresholdDb: number;
  fmtHa: (v: number | null) => string;
  limitations: string[];
}

function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="obs-fact">
      <span className="obs-fact__icon" aria-hidden="true">{icon}</span>
      <div><span className="obs-fact__label">{label}</span><div className="obs-fact__value">{children}</div></div>
    </div>
  );
}

function Detail({ zone, number, placeLabel, comparison, thresholdDb, fmtHa, limitations }: DetailProps) {
  const { t, locale } = useI18n();
  const { state } = useScience();
  const key = classifyDelta(zone.mean_delta_db, thresholdDb) ?? 'noData';
  const na = t('explore.zoneNotAvailable');
  const db = (v: number | null) => (v === null ? na : `${formatNumber(v, locale, 2)} dB`);
  const near = zone.nearest_place;
  const q = `compare=${encodeURIComponent(comparison.snapshot_id)}&zone=${encodeURIComponent(zone.zone_id)}`;
  const method = state.status === 'ready' ? state.index?.method ?? null : null;
  const color = colorOf(key);
  const fmt = (iso: string) => formatDate(iso, locale) ?? iso;
  return (
    <article className="obs-panel">
      <header className="obs-panel__head">
        <span className="obs-label">{placeLabel}</span>
        <h2>{t('observations.itemLabel', { n: number, area: fmtHa(zone.area_ha) })}</h2>
      </header>
      <div className="obs-detail" data-testid="obs-detail">
        <div className="obs-facts">
          <Fact icon={<MapPin size={18} />} label={t('observations.location')}>
            {near ? t('observations.nearPlace', { place: near.name, km: formatNumber(near.distance_km, locale, 1) ?? '?' }) : t('observations.noPlaceNear')}
            {zone.within_area && <small>{t('explore.zoneRefIn', { place: zone.within_area.name })}</small>}
          </Fact>
          <Fact icon={<CalendarRange size={18} />} label={t('observations.dates')}>{fmt(comparison.initial_date)} → {fmt(comparison.final_date)}</Fact>
          <Fact icon={<Ruler size={18} />} label={t('observations.area')}>{fmtHa(zone.area_ha)}</Fact>
          <Fact icon={<Activity size={18} />} label={t('explore.intensityLabel')}>
            <span className="obs-intensity" style={{ '--c': color } as CSSProperties}><i aria-hidden="true" />{t(`explore.intensityShort_${key}` as MessageKey)}</span>
          </Fact>
        </div>
        <div className="obs-explain">
          <p>{t('observations.explain')}</p>
          <p className="obs-muted">{t(`explore.intensityExpl_${key}` as MessageKey)}</p>
        </div>
        <div className="observations__actions">
          <Button variant="primary" href={`#/observatory?${q}`} data-testid="obs-see-map" icon={<MapIcon size={16} />}>{t('observations.viewOnMap')}</Button>
          <Button variant="secondary" href={`#/analytics?${q}`} data-testid="obs-see-evolution" icon={<TrendingUp size={16} />}>{t('explore.seeEvolution')}</Button>
        </div>
        <details className="obs-science" data-testid="obs-science">
          <summary>{t('observations.scienceTitle')}</summary>
          <dl className="dl">
            <dt>{t('observations.zoneId')}</dt><dd>{zone.zone_id}</dd>
            <dt>{t('explore.zoneCells')}</dt><dd>{zone.cell_count === null ? na : formatNumber(zone.cell_count, locale, 0)}</dd>
            <dt>{t('explore.zoneMean')}</dt><dd>{db(zone.mean_delta_db)}</dd>
            <dt>{t('explore.zoneMin')}</dt><dd>{db(zone.min_delta_db)}</dd>
            <dt>{t('observations.centroid')}</dt><dd>{zone.centroid[0].toFixed(5)}, {zone.centroid[1].toFixed(5)}</dd>
            <dt>{t('observations.bbox')}</dt><dd>{zone.bbox.map((v) => v.toFixed(5)).join(', ')}</dd>
            <dt>{t('observations.gridSectors')}</dt><dd>{zone.sector_ids.length > 0 ? zone.sector_ids.join(', ') : na}<br /><small className="obs-muted">{t('observations.gridSectorsNote')}</small></dd>
            <dt>{t('observations.osmRef')}</dt><dd>{near?.osm_ref ?? na}</dd>
            <dt>{t('observations.params')}</dt>
            <dd>{t('observations.paramsValue', { threshold: formatNumber(thresholdDb, locale, 1) ?? '?', multilook: method?.multilook_px != null ? String(method.multilook_px) : na })}</dd>
            <dt>{t('observations.snapshot')}</dt><dd>{comparison.snapshot_id}</dd>
          </dl>
          <h3 className="obs-science__sub">{t('observations.limitations')}</h3>
          {limitations.length === 0 ? <p>{t('observatory.limitationsNone')}</p> : <ul>{limitations.map((l, i) => <li key={i}>{limitationText(l, locale)}</li>)}</ul>}
        </details>
      </div>
    </article>
  );
}

export default Observations;
