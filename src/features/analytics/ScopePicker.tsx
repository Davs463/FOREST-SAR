import { useI18n } from '../../i18n';
import { formatSmart } from '../../shared/format';
import type { Comparison, Zone } from '../../shared/science.types';
import { byInterval, periodDays, periodText } from './labels';

interface Props {
  comparisons: Comparison[];
  selectedId: string;
  kind: 'general' | 'place' | 'zone';
  place: string | null;
  zoneId: string | null;
  places: string[];
  zones: Zone[];
  onCompare: (id: string) => void;
  onScope: (kind: 'general' | 'place' | 'zone') => void;
  onPlace: (name: string) => void;
  onZone: (id: string) => void;
}

export function ScopePicker(p: Props) {
  const { t, locale } = useI18n();
  const zones = [...p.zones].sort((a, b) => b.area_ha - a.area_ha);
  return (
    <div className="an-picker">
      <label className="an-field">{t('analytics.periodLabel')}
        <select value={p.selectedId} onChange={(e) => p.onCompare(e.target.value)}>
          {byInterval(p.comparisons).map((c) => <option key={c.snapshot_id} value={c.snapshot_id}>{periodText(c, locale)} · {periodDays(c, t)}</option>)}
        </select>
      </label>
      <label className="an-field">{t('analytics.scopeLabel')}
        <select value={p.kind} onChange={(e) => p.onScope(e.target.value as Props['kind'])}>
          <option value="general">{t('analytics.scopeGeneral')}</option>
          <option value="place" disabled={p.places.length === 0}>{t('analytics.scopePlace')}</option>
          <option value="zone" disabled={zones.length === 0}>{t('analytics.scopeZone')}</option>
        </select>
      </label>
      {p.kind === 'place' && (
        <label className="an-field">{t('analytics.placeLabel')}
          <select value={p.place ?? ''} onChange={(e) => p.onPlace(e.target.value)}>
            {!p.place && <option value="">{t('analytics.choose')}</option>}
            {p.place && !p.places.includes(p.place) && <option value={p.place}>{p.place}</option>}
            {p.places.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      )}
      {p.kind === 'zone' && (
        <label className="an-field">{t('analytics.zoneLabel')}
          <select value={p.zoneId ?? ''} onChange={(e) => p.onZone(e.target.value)}>
            {!p.zoneId && <option value="">{t('analytics.choose')}</option>}
            {p.zoneId && !zones.some((z) => z.zone_id === p.zoneId) && <option value={p.zoneId}>{p.zoneId}</option>}
            {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_id} · {formatSmart(z.area_ha, locale)} {t('common.hectares')}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
