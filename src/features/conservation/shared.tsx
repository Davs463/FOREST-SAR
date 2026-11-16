import { useCallback } from 'react';
import { useI18n } from '../../i18n';
import { conservationEN, type ConservationText } from '../../i18n/sections/conservation.en';
import { conservationES } from '../../i18n/sections/conservation.es';
import { IMAGES, imageSrc, sourceById, type ImageId, type SourceId } from './conservation.data';

const CONTENT: Record<'en' | 'es', ConservationText> = { en: conservationEN, es: conservationES };

/** Localised content plus number formatting. Spanish uses es-HN (1,234.5) to match the source document. */
export function useConservation() {
  const { locale, t } = useI18n();
  const c = CONTENT[locale];
  const intlLocale = locale === 'es' ? 'es-HN' : 'en-US';
  const num = useCallback(
    (value: number, digits = 0) => new Intl.NumberFormat(intlLocale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value),
    [intlLocale],
  );
  return { c, locale, t, num };
}

export const REFERENCES_ID = 'cons-references';

function openReference(id: SourceId) {
  const panel = document.getElementById(REFERENCES_ID) as HTMLDetailsElement | null;
  if (panel) panel.open = true;
  const entry = document.getElementById(`cons-ref-${id}`);
  if (!entry) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  entry.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  entry.focus({ preventScroll: true });
}

/** Discreet citation next to a figure. Outside dialogs it jumps to the reference list at the end of the page. */
export function Cite({ ids, inert = false }: { ids: readonly SourceId[]; inert?: boolean }) {
  const { c } = useConservation();
  return (
    <span className="cons-cite">
      <span className="visually-hidden">{c.cite}: </span>
      {ids.map((id, i) => {
        const s = sourceById(id);
        return (
          <span key={id}>
            {i > 0 && '; '}
            {inert
              ? <span title={s.full}>{s.short}</span>
              : <button type="button" className="cons-cite__btn" title={s.full} onClick={() => openReference(id)}>{s.short}</button>}
          </span>
        );
      })}
    </span>
  );
}

/** Real photo with lazy loading, intrinsic size (no layout shift) and a visible credit line. */
export function Photo({ id, caption, representative = false, className, eager = false }: {
  id: ImageId; caption: string; representative?: boolean; className?: string; eager?: boolean;
}) {
  const { c } = useConservation();
  const img = IMAGES[id];
  return (
    <figure className={`cons-photo${className ? ` ${className}` : ''}`}>
      <img
        src={imageSrc(id)}
        width={img.width}
        height={img.height}
        alt={caption}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <figcaption>
        {representative && <span className="cons-photo__tag">{c.representative}</span>}
        <span>{caption}</span>
        <span className="cons-photo__credit">
          {c.photo}: <a href={img.page} target="_blank" rel="noreferrer">{img.author}</a>
          {' · '}{img.licenseUrl ? <a href={img.licenseUrl} target="_blank" rel="noreferrer">{img.license}</a> : img.license}
        </span>
      </figcaption>
    </figure>
  );
}

/** Section heading block shared by every section of the page. */
export function SectionHead({ id, kicker, title, lede }: { id: string; kicker: string; title: string; lede?: string }) {
  return (
    <header className="cons-head">
      <span className="mono cons-kicker">{kicker}</span>
      <h2 id={id} tabIndex={-1}>{title}</h2>
      {lede && <p className="cons-lede">{lede}</p>}
    </header>
  );
}
