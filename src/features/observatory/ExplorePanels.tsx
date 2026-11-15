import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Satellite } from 'lucide-react';
import { Button } from '../../components';
import type { Locale } from '../../config/app.config';
import { MAP_COLORS, RADAR_CLASS_COLORS } from '../../config/mapColors';
import type { MapLayerDef } from '../../config/mapLayers.config';
import { useI18n, type MessageKey } from '../../i18n';
import { formatNumber, formatSmart } from '../../shared/format';

/** dB values with fixed 2 decimals so ranges read consistently (-4.00 … -3.11). */
const dbFixed = (value: number, locale: string) => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
import type { DerivedData, LayerKey, OverlayLayer, Zone } from '../../shared/science.types';
import { summarizeReferences, totalAreaHa, unionBBox } from './clusters';
import { zoneIntensity, type IntensityKey, type ZoneView } from './ObservatoryMap';
import { zoneName, zoneOptionLabel } from './zoneLabels';

const intensityColor = (key: IntensityKey) => (key === 'noData' ? MAP_COLORS.noData : RADAR_CLASS_COLORS[key]);
const analyticsHref = (query: string) => `#/analytics?${query}`;

// ---------------------------------------------------------------- base map picker

interface BasePickerProps {
  defs: MapLayerDef[];
  selectedId: string;
  locale: Locale;
  isCovered: (def: MapLayerDef) => boolean;
  onPick: (id: string) => void;
}

const BASE_ORDER = ['satellite', 'relief', 'osm'];

/** Compact segmented control: Satellite / Terrain / OSM (the non-official base maps). */
export function BaseMapPicker({ defs, selectedId, locale, isCovered, onPick }: BasePickerProps) {
  const { t } = useI18n();
  const plain = defs.filter((d) => !d.official).sort((a, b) => BASE_ORDER.indexOf(a.id) - BASE_ORDER.indexOf(b.id));
  return (
    <div className="obs-seg" role="group" aria-label={t('explore.baseGroup')} data-testid="basemap-picker">
      {plain.map((def) => {
        const covered = isCovered(def);
        return (
          <button
            key={def.id}
            type="button"
            className="obs-seg__btn"
            aria-pressed={selectedId === def.id}
            disabled={!covered}
            title={covered ? def.description[locale] : `${def.label[locale]}: ${t('explore.noNasaCoverageShort')}`}
            data-testid={`basemap-${def.id}`}
            onClick={() => onPick(def.id)}
          >
            {def.id === 'osm' ? t('explore.baseOsmShort') : def.label[locale]}
          </button>
        );
      })}
    </div>
  );
}

interface NasaMenuProps extends BasePickerProps {
  /** Date side chooser (before/after) and any coverage notes, rendered inside the popover. */
  children?: ReactNode;
}

/** "NASA layers" popover: the official GIBS imagery, each with its date-coverage state. */
export function NasaMenu({ defs, selectedId, locale, isCovered, onPick, children }: NasaMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const official = defs.filter((d) => d.official);
  const active = official.some((d) => d.id === selectedId);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  if (official.length === 0) return null;
  return (
    <div className="obs-pop" ref={rootRef} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); } }}>
      <button type="button" className="obs-tool obs-pop__btn" aria-expanded={open} aria-haspopup="true" aria-pressed={active} data-testid="nasa-menu" onClick={() => setOpen((v) => !v)}>
        <Satellite size={15} aria-hidden="true" />
        <span>{t('explore.nasaLayers')}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="obs-pop__panel" role="group" aria-label={t('explore.nasaLayers')}>
          <p className="obs-pop__lead">{t('explore.nasaLayersLead')}</p>
          <ul className="obs-pop__list">
            {official.map((def) => {
              const covered = isCovered(def);
              return (
                <li key={def.id}>
                  <button type="button" className="obs-pop__item" aria-pressed={selectedId === def.id} disabled={!covered} data-testid={`basemap-${def.id}`}
                    onClick={() => onPick(def.id)}>
                    <span>{def.label[locale]}</span>
                    {!covered && <small>{t('explore.noNasaCoverageShort')}</small>}
                  </button>
                </li>
              );
            })}
          </ul>
          {children}
          {active && <button type="button" className="obs-pop__off" onClick={() => onPick('satellite')}>{t('explore.nasaLayersOff')}</button>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- legend (derived products)

interface LegendProps {
  layerKey: LayerKey;
  layer: OverlayLayer | null;
  compare: boolean;
  grayscale: boolean;
  hasValidArea: boolean;
  hasZones: boolean;
  /** What the map draws right now (bubbles / polygons / classes); null before the first draw. */
  zoneView: ZoneView | null;
  hasSelection: boolean;
  showWindow: boolean;
  showCells: boolean;
  showGrid: boolean;
  showFootprints: boolean;
  official: ReactNode;
}

export function DerivedLegend({ layerKey, layer, compare, grayscale, hasValidArea, hasZones, zoneView, hasSelection, showWindow, showCells, showGrid, showFootprints, official }: LegendProps) {
  const { t, locale } = useI18n();
  const polygonsShown = hasZones && (zoneView ? zoneView.polygons > 0 : true);
  const clustersShown = hasZones && !!zoneView && zoneView.clusters > 0;
  const classes = hasZones && zoneView ? zoneView.classes : [];
  const spec = layer?.legend_spec ?? null;
  const gradient = !grayscale && spec?.type === 'gradient' ? spec : null;
  const delta = layerKey === 'delta' && !compare;
  const range = gradient ? `${gradient.min !== null ? formatSmart(gradient.min, locale) : '?'} … ${gradient.max !== null ? formatSmart(gradient.max, locale) : '?'} dB` : null;
  return (
    <div className="observatory__legend" data-testid="map-legend">
      <h3>{t('observatory.legendTitle')}</h3>
      <ul>
        {hasValidArea && <li><i className="observatory__sw observatory__sw--valid" aria-hidden="true" />
          <span>{t('explore.validOutline')}. <b>{t('explore.legendOutside')}</b></span></li>}
        {showWindow && <li><i className="observatory__sw observatory__sw--window" aria-hidden="true" />{t('observatory.legendWindowShort')}</li>}
        {polygonsShown && <li><i className="observatory__sw observatory__sw--zone" aria-hidden="true" />{t('explore.legendZoneOutline')}</li>}
        {classes.length > 0 && (
          <li data-testid="intensity-legend">
            <div>
              <b>{t('explore.intensityTitle')}</b>
              <ul className="observatory__intensity">
                {classes.map((key) => (
                  <li key={key} data-intensity={key}>
                    <i className={`observatory__sw ${key === 'noData' ? 'observatory__sw--nodatazone' : 'observatory__sw--class'}`} style={{ ['--sw-color' as string]: intensityColor(key) }} aria-hidden="true" />
                    <span>{t(`explore.intensity_${key}` as MessageKey)}</span>
                  </li>
                ))}
              </ul>
              <small className="observatory__muted">{t('explore.intensityNote')}</small>
            </div>
          </li>
        )}
        {clustersShown && <li data-testid="cluster-legend"><i className="observatory__sw observatory__sw--cluster" aria-hidden="true" />{t('explore.legendClusterBubble')}</li>}
        {hasSelection && <li><i className="observatory__sw observatory__sw--selected" aria-hidden="true" />{t('explore.legendSelected')}</li>}
        {gradient && (
          <li className="observatory__legend-gradient">
            <span className="observatory__gradient" style={{ background: `linear-gradient(90deg, ${gradient.colors.join(', ')})` }} aria-hidden="true" />
            <span>
              {delta ? t('explore.legendDeltaScale') : t('explore.legendSignal')}: {range}
              <small className="observatory__muted"> {delta ? `${t('explore.legendDeltaNote')} ${t('explore.legendTransparent')}` : compare ? t('explore.legendSameScale') : ''}</small>
            </span>
          </li>
        )}
        {grayscale && <li><i className="observatory__sw observatory__sw--layer" aria-hidden="true" />{t('explore.legendGrayNote')}</li>}
        {!gradient && !grayscale && <li><i className="observatory__sw observatory__sw--layer" aria-hidden="true" />{t('observatory.legendNoLayerInfo')}</li>}
        {showCells && <li><i className="observatory__sw observatory__sw--cell" aria-hidden="true" />{t('explore.legendCells')}</li>}
        {showGrid && <li><i className="observatory__sw observatory__sw--grid" aria-hidden="true" />{t('observatory.legendGrid')}</li>}
        {showFootprints && <li><i className="observatory__sw observatory__sw--scene" aria-hidden="true" />{t('observatory.legendFootprint')}</li>}
      </ul>
      <p className="observatory__warning" role="note">{t('observatory.noColorWarning')}</p>
      {official}
    </div>
  );
}

// ---------------------------------------------------------------- zone selector and zone card

export function ZoneSelect({ zones, value, onChange }: { zones: Zone[]; value: string | null; onChange: (id: string | null) => void }) {
  const { t, locale } = useI18n();
  return (
    <label className="observatory__field explore-zone-pick">
      <span>{t('explore.zonePick')}</span>
      <select value={value ?? ''} data-testid="zone-select" onChange={(event) => onChange(event.target.value || null)}>
        <option value="">{t('explore.zoneAll')}</option>
        {zones.map((zone) => <option key={zone.zone_id} value={zone.zone_id}>{zoneOptionLabel(zone, t, locale)}</option>)}
      </select>
    </label>
  );
}

export function ZoneCard({ zone }: { zone: Zone }) {
  const { t, locale } = useI18n();
  const na = t('explore.zoneNotAvailable');
  const db = (value: number | null) => (value === null ? na : `${dbFixed(value, locale)} dB`);
  const near = zone.nearest_place;
  return (
    <div className="explore-zone-card" data-testid="zone-card">
      <h3>{zoneName(zone, t)}</h3>
      <dl className="observatory__indicators">
        <div className="observatory__indicator" data-testid="zone-area">
          <dt>{t('explore.zoneArea')}</dt>
          <dd>{formatSmart(zone.area_ha, locale) ?? na}<small> {t('common.hectares')}</small></dd>
        </div>
        <div className="observatory__indicator" data-testid="zone-cells">
          <dt>{t('explore.zoneCells')}</dt>
          <dd>{zone.cell_count === null ? na : formatNumber(zone.cell_count, locale, 0)}</dd>
        </div>
        <div className="observatory__indicator" data-testid="zone-mean">
          <dt>{t('explore.zoneMean')}</dt>
          <dd>{db(zone.mean_delta_db)}</dd>
        </div>
        <div className="observatory__indicator" data-testid="zone-min">
          <dt>{t('explore.zoneMin')}</dt>
          <dd>{db(zone.min_delta_db)}</dd>
        </div>
      </dl>
      <p className="explore-zone-card__ref" data-testid="zone-ref">
        {zone.within_area
          ? t('explore.zoneRefIn', { place: zone.within_area.name })
          : near
            ? t('explore.zoneRefNear', { km: formatNumber(near.distance_km, locale, 1) ?? '?', place: near.name })
            : t('explore.zoneNoRef')}
      </p>
      <p className="observatory__muted">{t('explore.zoneRefNote')}</p>
      {zone.outline_note && <p className="observatory__muted" title={zone.outline_note}>{t('explore.zoneOutline')}</p>}
    </div>
  );
}

export function DerivedMethod({ derived }: { derived: DerivedData }) {
  const { t } = useI18n();
  if (!derived.method_note && !derived.cluster_rule) return null;
  return (
    <details className="observatory__details explore-method">
      <summary>{t('explore.zoneMethod')}</summary>
      {derived.cluster_rule && <p className="observatory__muted">{derived.cluster_rule}</p>}
      {derived.method_note && <p className="observatory__muted">{derived.method_note}</p>}
    </details>
  );
}

// ---------------------------------------------------------------- compact contextual info (zone / cluster)

interface InfoContext {
  initialText: string;
  finalText: string;
  snapshotId: string | null;
  thresholdDb?: number;
}

/** Zone card plus compact context: compared dates, intensity class, one-line explanation and the evolution link. */
export function ZoneInfo({ zone, initialText, finalText, snapshotId, thresholdDb }: InfoContext & { zone: Zone }) {
  const { t } = useI18n();
  const key = zoneIntensity(zone, thresholdDb);
  return (
    <div className="explore-zone-info" data-testid="zone-info" data-kind="zone">
      <ZoneCard zone={zone} />
      <div className="explore-zone-info__extra">
        <p className="explore-zone-info__chip" data-testid="zone-intensity" data-intensity={key}>
          <i style={{ ['--sw-color' as string]: intensityColor(key) }} aria-hidden="true" />
          <span>{t('explore.intensityLabel')}: {t(`explore.intensityShort_${key}` as MessageKey)}</span>
        </p>
        <p className="observatory__muted">{t(`explore.intensityExpl_${key}` as MessageKey)}</p>
        <p><b>{t('explore.infoPeriod')}:</b> {t('explore.infoPeriodValue', { initial: initialText, final: finalText })}</p>
        {snapshotId && (
          <div className="explore-zone-info__actions">
            <Button variant="secondary" className="btn--sm" href={analyticsHref(`compare=${encodeURIComponent(snapshotId)}&zone=${encodeURIComponent(zone.zone_id)}`)} data-testid="see-evolution">{t('explore.seeEvolution')}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Summary of the zones grouped by a clicked bubble. The area is the exact sum (a cell belongs to one zone only). */
export function ClusterInfo({ zones, initialText, finalText, snapshotId, onZoom, onClose }: InfoContext & { zones: Zone[]; onZoom: () => void; onClose: () => void }) {
  const { t, locale } = useI18n();
  const refs = summarizeReferences(zones);
  const means = zones.map((z) => z.mean_delta_db).filter((v): v is number => v !== null);
  const range = means.length === 0 ? t('explore.zoneNotAvailable') : `${dbFixed(Math.min(...means), locale)} … ${dbFixed(Math.max(...means), locale)} dB`;
  const refText = refs.top ?? (refs.several ? t('explore.clusterRefMany') : t('explore.clusterRefNone'));
  const box = unionBBox(zones);
  return (
    <div className="explore-zone-info" data-testid="zone-info" data-kind="cluster" data-bbox={box.join(',')}>
      <div className="explore-zone-card">
        <h3>{t('explore.clusterTitle', { count: zones.length })}</h3>
        <dl className="observatory__indicators">
          <div className="observatory__indicator" data-testid="cluster-area">
            <dt>{t('explore.clusterArea')}</dt>
            <dd>{formatSmart(totalAreaHa(zones), locale) ?? t('explore.zoneNotAvailable')}<small> {t('common.hectares')}</small></dd>
          </div>
          <div className="observatory__indicator" data-testid="cluster-range">
            <dt>{t('explore.clusterRange')}</dt>
            <dd>{range}</dd>
          </div>
        </dl>
        <p className="explore-zone-card__ref" data-testid="cluster-ref">{t('explore.clusterRef')}: {refText}</p>
        <p className="observatory__muted">{t('explore.infoRefNote')}</p>
        <p><b>{t('explore.clusterPeriod')}:</b> {t('explore.infoPeriodValue', { initial: initialText, final: finalText })}</p>
        <div className="explore-zone-info__actions">
          <Button variant="primary" className="btn--sm" onClick={onZoom} data-testid="cluster-zoom">{t('explore.clusterZoom')}</Button>
          {snapshotId && refs.unique && refs.top && (
            <Button variant="secondary" className="btn--sm" href={analyticsHref(`compare=${encodeURIComponent(snapshotId)}&place=${encodeURIComponent(refs.top)}`)} data-testid="see-evolution">{t('explore.seeEvolution')}</Button>
          )}
          <Button variant="ghost" className="btn--sm" onClick={onClose}>{t('explore.clusterClose')}</Button>
        </div>
      </div>
    </div>
  );
}
