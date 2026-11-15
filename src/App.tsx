import { useEffect, useState } from 'react';
import { ArrowRight, Menu, Satellite, X } from 'lucide-react';
import { StoryHero } from './features/story/StoryHero';
import { Observatory } from './features/observatory/Observatory';
import { CommunityHub } from './features/community/CommunityHub';

const navigation = [
  ['Observatory', '#observatory'],
  ['How NISAR works', '#science'],
  ['Community', '#community'],
] as const;

function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="brand-mark">
      <path d="M20 2 36 11v18L20 38 4 29V11L20 2Z" fill="currentColor" />
      <path d="M19 31c-5-8-3-15 5-22 0 5 2 8 6 10-5 1-8 4-11 12Z" fill="#a3d977" />
      <path d="M15 28c1-5 4-9 10-12" fill="none" stroke="#102820" strokeWidth="1.5" />
    </svg>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((element) => {
      element.classList.add('reveal-pending');
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="BosqueVivo HN home">
          <BrandMark />
          <span>BosqueVivo <b>HN</b></span>
        </a>
        <nav className={`site-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          {navigation.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </nav>
        <a className="header-action" href="#observatory">Explore the observatory <ArrowRight size={15} /></a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <main id="main">
        <StoryHero />

        <section className="intro-section section-shell" id="science" aria-labelledby="science-title" data-reveal>
          <div className="section-kicker"><span>01 / THE SIGNAL</span><span>OBSERVE · UNDERSTAND · PARTICIPATE</span></div>
          <div className="intro-grid">
            <h2 id="science-title">A new way to<br /><em>read the land.</em></h2>
            <div className="intro-copy">
              <p>NISAR uses synthetic aperture radar to observe how the surface changes over time. Radar sends and receives signals, so observations can be made day or night and through most clouds.</p>
              <p>BosqueVivo HN is a learning prototype for exploring that idea in Honduras. Its current map layers and example indicators are simulated, not NISAR measurements.</p>
              <a className="text-link text-link-dark" href="#observatory">See how the observatory works <ArrowRight size={15} /></a>
            </div>
          </div>
          <div className="signal-steps" aria-label="How the signal becomes an observation">
            <article><span className="step-no mono">01</span><Satellite size={20} /><h3>Send a signal</h3><p>Radar illuminates the surface with microwave energy.</p></article>
            <article><span className="step-no mono">02</span><span className="signal-wave" aria-hidden="true">〰</span><h3>Read the return</h3><p>Returned energy varies with surface structure and moisture.</p></article>
            <article><span className="step-no mono">03</span><span className="signal-mark" aria-hidden="true">↗</span><h3>Compare through time</h3><p>Repeated observations help researchers study change.</p></article>
          </div>
        </section>

        <div data-reveal><Observatory /></div>

        <section className="participation-intro" data-reveal>
          <div className="participation-inner">
            <span className="eyebrow"><span className="eyebrow-line" />Science is stronger together</span>
            <h2>From a satellite signal<br />to <em>community insight.</em></h2>
            <p>Explore example conversations, share observations, and learn how environmental data can support people working to care for their communities.</p>
            <a className="button button-light" href="#community">Join the conversation <ArrowRight size={16} /></a>
          </div>
          <div className="participation-decoration" aria-hidden="true"><span>HONDURAS</span><div /><div /><div /></div>
        </section>

        <CommunityHub />
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home"><BrandMark /><span>BosqueVivo <b>HN</b></span></a>
        <p>Exploring Earth's changing landscapes together.</p>
        <div className="footer-meta"><span>NASA SPACE APPS CHALLENGE · PROTOTYPE</span><a href="#home">Back to top ↑</a></div>
        <small>Demo indicators and community content are simulated for illustration. This prototype does not provide live NISAR observations or emergency alerts. NISAR is a NASA–ISRO mission; mission information: <a href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">NASA/JPL</a>.</small>
      </footer>
    </>
  );
}

export default App;
