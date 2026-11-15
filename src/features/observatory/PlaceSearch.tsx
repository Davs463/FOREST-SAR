import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useI18n, type MessageKey } from '../../i18n';
import { formatNumber } from '../../shared/format';
import type { Gazetteer, LatLngBounds, PolyGeometry, Zone } from '../../shared/science.types';
import { boundsCenter, geometryBounds, normalizeText, summarizePlace } from './geo';
import { zoneName } from './zoneLabels';

/** A searched place shown on the map: a point (fly to zoom 15) or an area (fit its bounds). */
export interface PlaceFocus {
  key: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  geometry?: PolyGeometry;
  bounds?: LatLngBounds;
  /** Increments on every pick so choosing the same place twice flies again. */
  nonce: number;
}

interface Entry {
  key: string;
  name: string;
  norm: string;
  kind: string;
  lat: number;
  lon: number;
  geometry?: PolyGeometry;
  bounds?: LatLngBounds;
}

const KIND_ORDER: Record<string, number> = { city: 0, town: 1, village: 2, suburb: 3, neighbourhood: 4, quarter: 5, hamlet: 6, locality: 7, peak: 8 };
const MAX_RESULTS = 8;

function buildEntries(gazetteer: Gazetteer): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<string>();
  // Areas first: when a point and an area share name and kind, the area (with its outline) wins.
  gazetteer.areas.forEach((area, i) => {
    const bounds = geometryBounds(area.geometry);
    const [lat, lon] = boundsCenter(bounds);
    const norm = normalizeText(area.name);
    const kind = area.kind in KIND_ORDER ? area.kind : 'locality';
    seen.add(`${norm}|${kind}`);
    out.push({ key: `a${i}|${area.osm_ref ?? area.name}`, name: area.name, norm, kind, lat, lon, geometry: area.geometry, bounds });
  });
  for (const place of gazetteer.places) {
    const norm = normalizeText(place.name);
    if (seen.has(`${norm}|${place.kind}`)) continue;
    out.push({ key: `p${place.id}`, name: place.name, norm, kind: place.kind, lat: place.lat, lon: place.lon });
  }
  return out;
}

function searchEntries(entries: Entry[], query: string): Entry[] {
  const q = normalizeText(query);
  if (!q) return [];
  const scored: { entry: Entry; score: number }[] = [];
  for (const entry of entries) {
    const at = entry.norm.indexOf(q);
    if (at < 0) continue;
    const score = at === 0 ? 0 : entry.norm[at - 1] === ' ' ? 1 : 2;
    scored.push({ entry, score });
  }
  scored.sort((a, b) => a.score - b.score
    || (KIND_ORDER[a.entry.kind] ?? 9) - (KIND_ORDER[b.entry.kind] ?? 9)
    || a.entry.name.length - b.entry.name.length
    || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, MAX_RESULTS).map((s) => s.entry);
}

interface Props {
  gazetteer: Gazetteer;
  validArea: PolyGeometry | null;
  zones: Zone[];
  focus: PlaceFocus | null;
  onFocus: (focus: PlaceFocus | null) => void;
  onSelectZone: (zoneId: string) => void;
}

export function PlaceSearch({ gazetteer, validArea, zones, focus, onFocus, onSelectZone }: Props) {
  const { t, locale } = useI18n();
  const uid = useId();
  const listId = `${uid}-list`;
  const entries = useMemo(() => buildEntries(gazetteer), [gazetteer]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [nonce, setNonce] = useState(0);
  const results = useMemo(() => searchEntries(entries, query), [entries, query]);
  const showList = open && query.trim() !== '';
  const kindLabel = (kind: string) => t((`explore.kind_${kind}`) as MessageKey);

  const summary = useMemo(() => (focus ? summarizePlace(focus, validArea, zones) : null), [focus, validArea, zones]);

  const pick = (entry: Entry) => {
    const next = nonce + 1;
    setNonce(next);
    setQuery(entry.name);
    setOpen(false);
    onFocus({ key: entry.key, name: entry.name, kind: entry.kind, lat: entry.lat, lon: entry.lon, geometry: entry.geometry, bounds: entry.bounds, nonce: next });
  };
  const clear = () => { setQuery(''); setOpen(false); setActive(0); onFocus(null); };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      if (showList && results[active]) { event.preventDefault(); pick(results[active]); }
    } else if (event.key === 'Escape') {
      if (showList) { event.preventDefault(); setOpen(false); } else if (query || focus) { event.preventDefault(); clear(); }
    }
  };

  return (
    <div className="explore-search" role="search" data-testid="place-search">
      <label className="sr-only" htmlFor={`${uid}-input`}>{t('explore.searchLabel')}</label>
      <div className="explore-search__box">
        <input
          id={`${uid}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${uid}-opt-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={t('explore.searchPlaceholder')}
          value={query}
          data-testid="place-input"
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {(query || focus) && <button type="button" className="explore-search__clear" aria-label={t('explore.searchClear')} onClick={clear}>×</button>}
      </div>
      <ul id={listId} role="listbox" aria-label={t('explore.searchLabel')} className="explore-search__list" hidden={!showList} data-testid="place-results">
        {showList && results.map((entry, i) => (
          <li
            key={entry.key}
            id={`${uid}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? 'is-active' : undefined}
            data-testid="place-option"
            onMouseDown={(event) => { event.preventDefault(); pick(entry); }}
            onMouseEnter={() => setActive(i)}
          >
            <span>{entry.name}</span><small>{kindLabel(entry.kind)}</small>
          </li>
        ))}
        {showList && results.length === 0 && <li role="presentation" className="explore-search__none">{t('explore.searchNone')}</li>}
      </ul>
      <p className="sr-only" role="status">{showList ? t('explore.searchResults', { count: results.length }) : ''}</p>

      {focus && summary && (
        <div className="explore-search__summary" data-testid="place-summary" aria-live="polite">
          <strong>{focus.name}</strong>
          {summary.status === 'outside' ? <p>{t('explore.searchOutside')}</p> : summary.near.length === 0 ? <p>{t('explore.searchNoNear')}</p> : (
            <>
              <p>{t('explore.searchNear')}</p>
              <ul>
                {summary.near.map(({ zone, km }) => (
                  <li key={zone.zone_id}>
                    <button type="button" onClick={() => onSelectZone(zone.zone_id)}>
                      {zoneName(zone, t)} · {km === 0 ? t('explore.searchTouching') : t('explore.searchDistance', { km: formatNumber(km, locale, 1) ?? '?' })}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <p className="explore-search__attr">
        {t('explore.searchAttribution')}{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">{t('explore.searchLicenseLink')}</a>
      </p>
    </div>
  );
}
