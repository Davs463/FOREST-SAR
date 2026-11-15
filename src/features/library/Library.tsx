import { useState, type ReactNode } from 'react';
import { ArrowUpRight, Code2, FileText, Layers, Map as MapIcon, SatelliteDish } from 'lucide-react';
import { useI18n, type MessageKey } from '../../i18n';
import './library.css';

type ResourceType = 'guide' | 'data' | 'catalog' | 'api' | 'viewer';

// Official resources. Titles/text come from i18n; URLs are data.
const RESOURCES: { href: string; type: ResourceType; title: MessageKey; text: MessageKey }[] = [
  { href: 'https://nisar-docs.asf.alaska.edu/gcov/', type: 'guide', title: 'library.gcovTitle', text: 'library.gcovText' },
  { href: 'https://www.earthdata.nasa.gov/data/projects/opera/data-access-tools', type: 'data', title: 'library.operaTitle', text: 'library.operaText' },
  { href: 'https://search.asf.alaska.edu/', type: 'catalog', title: 'library.asfTitle', text: 'library.asfText' },
  { href: 'https://nasa-gibs.github.io/gibs-api-docs/', type: 'api', title: 'library.gibsTitle', text: 'library.gibsText' },
  { href: 'https://worldview.earthdata.nasa.gov/', type: 'viewer', title: 'library.worldviewTitle', text: 'library.worldviewText' },
];

const TYPE_LABEL: Record<ResourceType, MessageKey> = {
  guide: 'library.typeGuide', data: 'library.typeData', catalog: 'library.typeCatalog', api: 'library.typeApi', viewer: 'library.typeViewer',
};
const TYPE_ICON: Record<ResourceType, ReactNode> = {
  guide: <FileText size={20} />, data: <SatelliteDish size={20} />, catalog: <Layers size={20} />, api: <Code2 size={20} />, viewer: <MapIcon size={20} />,
};
/** Filter chips only make sense with a real choice. */
const FILTER_MIN = 6;

const domainOf = (href: string): string => { try { return new URL(href).hostname.replace(/^www\./, ''); } catch { return href; } };

/** Decorative preview drawn with SVG shapes only (no third-party images or logos). */
function Thumb({ type }: { type: ResourceType }) {
  const shapes: Record<ResourceType, ReactNode> = {
    guide: (
      <>
        <rect x="78" y="22" width="76" height="98" rx="4" className="lib-s lib-s--dim" transform="rotate(-6 116 71)" />
        <rect x="92" y="18" width="76" height="98" rx="4" className="lib-s lib-s--fill" />
        <path d="M104 40h40M104 52h52M104 64h46M104 76h52M104 88h30" className="lib-s lib-s--line" />
        <rect x="104" y="28" width="22" height="6" rx="2" className="lib-s lib-s--accent" />
      </>
    ),
    data: (
      <>
        {[0, 1, 2].map((i) => <path key={i} d={`M130 ${92 - i * 18} l44 -16 l-44 -16 l-44 16 z`} className={`lib-s ${i === 2 ? 'lib-s--fill' : 'lib-s--dim'}`} />)}
        <path d="M130 44v-14M130 30l-5 6M130 30l5 6" className="lib-s lib-s--accent-line" />
      </>
    ),
    catalog: (
      <>
        <rect x="56" y="22" width="148" height="20" rx="10" className="lib-s lib-s--fill" />
        <circle cx="72" cy="32" r="4.5" className="lib-s lib-s--line" />
        <path d="M86 32h60" className="lib-s lib-s--line" />
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="56" y={52 + i * 24} width="148" height="18" rx="4" className="lib-s lib-s--dim" />
            <rect x="64" y={57 + i * 24} width="22" height="8" rx="2" className={i === 0 ? 'lib-s lib-s--accent' : 'lib-s lib-s--line'} />
            <path d={`M96 ${61 + i * 24}h70`} className="lib-s lib-s--line" />
          </g>
        ))}
      </>
    ),
    api: (
      <>
        <rect x="52" y="20" width="156" height="100" rx="6" className="lib-s lib-s--fill" />
        <path d="M52 36h156" className="lib-s lib-s--dim" />
        <circle cx="64" cy="28" r="2.5" className="lib-s lib-s--accent" /><circle cx="73" cy="28" r="2.5" className="lib-s lib-s--line" /><circle cx="82" cy="28" r="2.5" className="lib-s lib-s--line" />
        <path d="M68 52h34M76 66h58M76 80h40M68 94h26M104 94h46" className="lib-s lib-s--line" />
        <path d="M68 52h34" className="lib-s lib-s--accent-line" />
      </>
    ),
    viewer: (
      <>
        <rect x="46" y="18" width="168" height="104" rx="6" className="lib-s lib-s--fill" />
        <path d="M46 52h168M46 86h168M88 18v104M130 18v104M172 18v104" className="lib-s lib-s--grid" />
        <path d="M50 100c30-34 56 6 84-22s52-6 76-34" className="lib-s lib-s--accent-line" />
        <path d="M50 114c28-18 62 4 90-14s46 0 70-18" className="lib-s lib-s--line" />
        <circle cx="146" cy="62" r="6" className="lib-s lib-s--accent" />
        <circle cx="146" cy="62" r="12" className="lib-s lib-s--ring" />
      </>
    ),
  };
  return (
    <svg className="lib-thumb__svg" viewBox="0 0 260 140" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      {shapes[type]}
    </svg>
  );
}

export function Library() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<ResourceType | 'all'>('all');
  const types = [...new Set(RESOURCES.map((r) => r.type))];
  const showFilters = RESOURCES.length >= FILTER_MIN;
  const visible = filter === 'all' ? RESOURCES : RESOURCES.filter((r) => r.type === filter);
  return (
    <section className="page library">
      <div className="lib-head"><h1>{t('library.title')}</h1><p>{t('library.lede')}</p></div>
      {showFilters && (
        <div className="lib-filters" role="group" aria-label={t('library.filterLabel')}>
          <button type="button" className="lib-chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{t('library.filterAll')}</button>
          {types.map((type) => <button key={type} type="button" className="lib-chip" aria-pressed={filter === type} onClick={() => setFilter(type)}>{t(TYPE_LABEL[type])}</button>)}
        </div>
      )}
      <ul className="lib-grid" data-testid="library-grid">
        {visible.map((resource) => {
          const domain = domainOf(resource.href);
          return (
            <li key={resource.href} className="lib-card">
              <div className={`lib-thumb lib-thumb--${resource.type}`}>
                <Thumb type={resource.type} />
                <span className="lib-thumb__icon" aria-hidden="true">{TYPE_ICON[resource.type]}</span>
                <span className="lib-thumb__domain">{domain}</span>
              </div>
              <div className="lib-card__body">
                <span className="lib-type">{t(TYPE_LABEL[resource.type])}</span>
                <h2>{t(resource.title)}</h2>
                <p>{t(resource.text)}</p>
                <div className="lib-card__foot">
                  <a className="btn btn--ghost btn--sm lib-open" href={resource.href} target="_blank" rel="noopener noreferrer"
                    aria-label={`${t('library.open')}: ${t(resource.title)} (${t('library.external')})`}>{t('library.open')}<ArrowUpRight size={15} aria-hidden="true" /></a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="lib-muted">{t('library.placeholder')}</p>
    </section>
  );
}

export default Library;
