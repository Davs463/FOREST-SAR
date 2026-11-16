import { ExternalLink } from 'lucide-react';
import { IMAGES, SOURCES, type ImageId } from './conservation.data';
import { REFERENCES_ID, useConservation } from './shared';

export function ConservationReferences() {
  const { c } = useConservation();
  const r = c.references;
  return (
    <section className="cons-section cons-refs" aria-labelledby="cons-refs-title">
      <span className="mono cons-kicker">{r.kicker}</span>
      <h2 id="cons-refs-title" tabIndex={-1}>{r.title}</h2>
      <p className="cons-lede">{r.lede}</p>
      <details id={REFERENCES_ID} className="cons-refs__panel" data-testid="cons-references">
        <summary>{r.citedTitle} ({SOURCES.length})</summary>
        <ol className="cons-refs__list">
          {SOURCES.map((s) => (
            <li key={s.id} id={`cons-ref-${s.id}`} tabIndex={-1}>
              <span>{s.full}</span>{' '}
              {s.url
                ? <a href={s.url} target="_blank" rel="noreferrer">{new URL(s.url).hostname.replace(/^www\./, '')}<ExternalLink size={12} aria-hidden="true" /></a>
                : <span className="cons-refs__nolink">{r.noLink}</span>}
            </li>
          ))}
        </ol>
        <p className="cons-refs__official">
          {r.officialTitle}: <a href="https://science.nasa.gov/mission/nisar/" target="_blank" rel="noreferrer">science.nasa.gov/mission/nisar<ExternalLink size={12} aria-hidden="true" /></a>
          {' · '}<a href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">nisar.jpl.nasa.gov<ExternalLink size={12} aria-hidden="true" /></a>
        </p>
      </details>
      <details className="cons-refs__panel" data-testid="cons-image-credits">
        <summary>{r.imagesTitle} ({Object.keys(IMAGES).length})</summary>
        <p className="cons-muted">{r.imagesNote}</p>
        <ul className="cons-refs__list">
          {(Object.keys(IMAGES) as ImageId[]).map((id) => {
            const img = IMAGES[id];
            return (
              <li key={id}>
                <strong>{r.imageLabels[id]}</strong> — <a href={img.page} target="_blank" rel="noreferrer">{img.author}</a>,{' '}
                {img.licenseUrl ? <a href={img.licenseUrl} target="_blank" rel="noreferrer">{img.license}</a> : img.license}, Wikimedia Commons.
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
