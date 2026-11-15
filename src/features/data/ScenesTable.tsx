import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { formatCount, formatDate, safeHttpUrl } from '../../shared/format';
import type { Scene } from '../../shared/science.types';
import { Pager, slicePage } from './Pager';

export function ScenesTable({ scenes }: { scenes: Scene[] }) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...scenes].sort((a, b) => (b.acquired_at ?? '').localeCompare(a.acquired_at ?? ''));
    if (!q) return sorted;
    return sorted.filter((scene) => [scene.id, scene.acquired_at?.slice(0, 10), formatDate(scene.acquired_at, 'es'), formatDate(scene.acquired_at, 'en'), scene.track, scene.frame, scene.pass, scene.polarization]
      .some((value) => value !== null && value !== undefined && String(value).toLowerCase().includes(q)));
  }, [scenes, query]);
  const na = '—';
  return (
    <div>
      <label className="data__search">{t('data.search')}
        <input type="search" value={query} placeholder={t('data.searchScenesPlaceholder')} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
      </label>
      {rows.length === 0 ? <p className="data__muted" role="status">{t('data.none')}</p> : (
        <div className="table-wrap">
          <table className="table">
            <caption className="data__caption">{t('observatory.scenesTitle')} · {t('observatory.scenesCount', { count: formatCount(rows.length, locale) })}</caption>
            <thead><tr>
              <th scope="col">{t('observatory.colId')}</th><th scope="col">{t('observatory.colDate')}</th><th scope="col">{t('observatory.colTrack')}</th>
              <th scope="col">{t('data.colFrame')}</th><th scope="col">{t('observatory.colPass')}</th><th scope="col">{t('observatory.colPol')}</th>
              <th scope="col">{t('observatory.colQuality')}</th><th scope="col">{t('observatory.colLink')}</th>
            </tr></thead>
            <tbody>
              {slicePage(rows, page).map((scene) => {
                const href = safeHttpUrl(scene.source_url);
                return (
                  <tr key={scene.id}>
                    <td className="data__id">{scene.id}</td><td>{formatDate(scene.acquired_at, locale, true) ?? na}</td><td>{scene.track ?? na}</td>
                    <td>{scene.frame ?? na}</td><td>{scene.pass ?? na}</td><td>{scene.polarization ?? na}</td>
                    <td>{scene.quality_status ?? na}</td>
                    <td>{href ? <a href={href} target="_blank" rel="noreferrer">{t('common.sourceLink')}</a> : na}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} total={rows.length} onPage={setPage} />
    </div>
  );
}
