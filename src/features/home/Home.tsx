import { useEffect } from 'react';
import { ArrowRight, Satellite } from 'lucide-react';
import { Button } from '../../components';
import { routeHref } from '../../config/app.config';
import { useI18n } from '../../i18n';
import { StoryHero } from '../story/StoryHero';

export function Home() {
  const { t } = useI18n();

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
      <StoryHero />
      <section className="intro-section section-shell" id="science" aria-labelledby="science-title" data-reveal>
        <div className="section-kicker"><span>{t('home.scienceKicker')}</span><span>{t('home.scienceKickerRight')}</span></div>
        <div className="intro-grid">
          <h2 id="science-title">{t('home.scienceTitle')}<br /><em>{t('home.scienceTitleEm')}</em></h2>
          <div className="intro-copy">
            <p>{t('home.sciencePara1')}</p>
            <p>{t('home.sciencePara2')}</p>
            <a className="text-link text-link-dark" href={routeHref('methodology')}>{t('home.scienceLink')} <ArrowRight size={15} /></a>
          </div>
        </div>
        <div className="signal-steps" aria-label={t('home.stepsLabel')}>
          <article><span className="step-no mono">01</span><Satellite size={20} /><h3>{t('home.s1Title')}</h3><p>{t('home.s1Text')}</p></article>
          <article><span className="step-no mono">02</span><span className="signal-wave" aria-hidden="true">〰</span><h3>{t('home.s2Title')}</h3><p>{t('home.s2Text')}</p></article>
          <article><span className="step-no mono">03</span><span className="signal-mark" aria-hidden="true">↗</span><h3>{t('home.s3Title')}</h3><p>{t('home.s3Text')}</p></article>
        </div>
      </section>

      <section className="participation-intro" data-reveal>
        <div className="participation-inner">
          <span className="eyebrow"><span className="eyebrow-line" />{t('home.partEyebrow')}</span>
          <h2>{t('home.partTitle')}<br /><em>{t('home.partTitleEm')}</em></h2>
          <p>{t('home.partText')}</p>
          <Button variant="secondary" href={routeHref('community')} icon={<ArrowRight size={16} />}>{t('home.partCta')}</Button>
        </div>
        <div className="participation-decoration" aria-hidden="true"><span>HONDURAS</span><div /><div /><div /></div>
      </section>
    </>
  );
}

export default Home;
