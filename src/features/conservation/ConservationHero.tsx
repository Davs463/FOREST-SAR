import { ArrowDown, HeartHandshake } from 'lucide-react';
import { IMAGES, imageSrc } from './conservation.data';
import { scrollToSection } from './sectionNav';
import { useConservation } from './shared';

export function ConservationHero() {
  const { c } = useConservation();
  const img = IMAGES.hero;
  return (
    <header className="cons-hero" data-testid="cons-hero">
      <img className="cons-hero__img" src={imageSrc('hero')} width={img.width} height={img.height} alt={c.hero.caption} fetchPriority="high" />
      <div className="cons-hero__shade" aria-hidden="true" />
      <div className="cons-hero__copy">
        <span className="mono cons-hero__kicker">{c.hero.kicker}</span>
        <h1>{c.hero.title}</h1>
        <p>{c.hero.lede}</p>
        <div className="cons-hero__actions">
          <button type="button" className="btn btn--secondary" data-testid="cons-cta-explore" onClick={() => scrollToSection('forests')}>
            {c.hero.ctaExplore}<ArrowDown size={16} aria-hidden="true" />
          </button>
          <button type="button" className="btn cons-btn--light" data-testid="cons-cta-involved" onClick={() => scrollToSection('involved')}>
            {c.hero.ctaInvolved}<HeartHandshake size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className="cons-hero__credit">
        {c.hero.caption} {c.photo}: <a href={img.page} target="_blank" rel="noreferrer">{img.author}</a> · <a href={img.licenseUrl} target="_blank" rel="noreferrer">{img.license}</a>
      </p>
    </header>
  );
}
