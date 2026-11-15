import { Suspense, useEffect, useRef } from 'react';
import { BrandMark, Button, EmptyState, ErrorBoundary, Navbar, type NavItem } from '../components';
import { APP_CONFIG, enabledRoutes, routeHref } from '../config/app.config';
import { localeNames, useI18n } from '../i18n';
import { useRoute } from './router';
import { VIEWS } from './routes';

/** Navbar and footer live outside the routed view, so a failing view never removes navigation. */
export function Shell() {
  const { t, locale, setLocale } = useI18n();
  const { path, route } = useRoute();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const brand = APP_CONFIG.brand.name;

  const items: NavItem[] = enabledRoutes.filter((r) => r.inNav).map((r) => ({ id: r.id, href: `#${r.path}`, label: t(r.labelKey) }));
  const nextLocale = APP_CONFIG.locales.find((l) => l !== locale) ?? locale;

  useEffect(() => {
    const page = route && route.id !== 'home' ? `${t(route.labelKey)} · ${brand}` : `${brand} — ${t('meta.tagline')}`;
    document.title = page;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
    // Scroll to top and move focus to the new view (skipped on first load).
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    if (firstRender.current) firstRender.current = false;
    else mainRef.current?.focus({ preventScroll: true });
  }, [path, route, t, brand]);

  const View = route ? VIEWS[route.id] : null;

  return (
    <>
      <a className="skip-link" href={`#${path}`} onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>{t('common.skipToContent')}</a>
      <Navbar
        brandName={brand}
        homeHref={routeHref('home')}
        homeLabel={t('common.home')}
        items={items}
        activeId={route?.id ?? null}
        navLabel={t('common.mainNavigation')}
        openLabel={t('common.openMenu')}
        closeLabel={t('common.closeMenu')}
        actions={
          <Button variant="ghost" className="btn--sm" lang={nextLocale} aria-label={t('common.switchTo', { language: localeNames[nextLocale] })} onClick={() => setLocale(nextLocale)}>
            {nextLocale.toUpperCase()}
          </Button>
        }
      />
      <main id="main" ref={mainRef} tabIndex={-1}>
        <ErrorBoundary resetKey={path}>
          {View ? <Suspense fallback={<p className="page" role="status">{t('common.loading')}</p>}><View /></Suspense> : (
            <section className="page">
              <EmptyState title={t('errors.notFoundTitle')} message={t('errors.notFoundBody')} action={<Button variant="secondary" href={routeHref('home')}>{t('common.home')}</Button>} />
            </section>
          )}
        </ErrorBoundary>
      </main>
      <footer className="site-footer">
        <a className="brand footer-brand" href={routeHref('home')}><BrandMark /><span>{brand}</span></a>
        <p>{t('footer.tagline')}</p>
        <div className="footer-meta"><span>{t('footer.meta')}</span><a href="#/" onClick={() => window.scrollTo({ top: 0 })}>{t('common.backToTop')} ↑</a></div>
        <small>{t('footer.disclaimer')} <a href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer">{t('footer.missionLink')}</a>.</small>
      </footer>
    </>
  );
}
