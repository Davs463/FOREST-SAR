import type { Locale } from '../../config/app.config';
import type { TFunction } from '../../i18n';
import { formatNumber, formatSmart } from '../../shared/format';
import type { Zone } from '../../shared/science.types';

/** Zone naming. Place names come only from verified OpenStreetMap references in the data; none are invented. */

export function zoneNumber(zone: Zone): number {
  const digits = Number(zone.zone_id.replace(/\D/g, ''));
  return digits > 0 ? digits : zone.rank ?? 0;
}

export function zoneName(zone: Zone, t: TFunction): string {
  return t('observatory.zoneName', { n: zoneNumber(zone) });
}

function coordText(zone: Zone, t: TFunction, locale: Locale): string {
  const [lat, lon] = zone.centroid;
  const la = formatNumber(Math.abs(lat), locale, 2) ?? '';
  const lo = formatNumber(Math.abs(lon), locale, 2) ?? '';
  return t('explore.coords', { lat: la, ns: lat >= 0 ? t('explore.dirN') : t('explore.dirS'), lon: lo, ew: lon >= 0 ? t('explore.dirE') : t('explore.dirW') });
}

/** "Zona 1 · cerca de Santa Lucía (1,2 km) · 3 ha", or coordinates when no verified place exists. */
export function zoneOptionLabel(zone: Zone, t: TFunction, locale: Locale): string {
  const parts = [zoneName(zone, t)];
  const area = `${formatSmart(zone.area_ha, locale) ?? '?'} ${t('common.hectares')}`;
  if (zone.within_area) {
    parts.push(t('explore.zoneIn', { place: zone.within_area.name }), area);
  } else if (zone.nearest_place) {
    parts.push(t('explore.zoneNear', { place: zone.nearest_place.name, km: formatNumber(zone.nearest_place.distance_km, locale, 1) ?? '?' }), area);
  } else {
    parts.push(area, coordText(zone, t, locale));
  }
  return parts.join(' · ');
}

/** Short label for tooltips. */
export function zoneShortLabel(zone: Zone, t: TFunction, locale: Locale): string {
  return `${zoneName(zone, t)} · ${formatSmart(zone.area_ha, locale) ?? '?'} ${t('common.hectares')}`;
}
