// Single source for brand, routes, flags and storage namespace.
// Change the brand here only: navbar, footer, home, titles and translations derive from it.

export type Locale = 'en' | 'es';
export type RouteId = 'home' | 'observatory' | 'analytics' | 'observations' | 'community' | 'library' | 'methodology' | 'data';

export interface RouteDef {
  id: RouteId;
  path: string;
  labelKey: `nav.${RouteId}`;
  inNav: boolean;
  feature?: 'communityDemo';
}

export const APP_CONFIG = Object.freeze({
  brand: { name: 'FOREST-SAR', challenge: 'Dancing with the SARs', country: 'Honduras' },
  defaultLocale: 'en' as Locale,
  locales: ['en', 'es'] as readonly Locale[],
  // Relative to import.meta.env.BASE_URL; the snapshot paths inside are relative to this file's folder.
  dataManifest: 'data/manifest.json',
  // User manual shipped with the site (copied from docs/manual by the publish step); relative to BASE_URL.
  userManualPdf: 'manual/Manual_Usuario_FOREST_SAR_HN.pdf',
  features: { communityDemo: true, demoRoles: true },
  // Stable storage id: renaming the brand must not orphan saved data.
  storageNamespace: 'forestsarhn:v1',
  routes: [
    { id: 'home', path: '/', labelKey: 'nav.home', inNav: false },
    { id: 'observatory', path: '/observatory', labelKey: 'nav.observatory', inNav: true },
    { id: 'analytics', path: '/analytics', labelKey: 'nav.analytics', inNav: true },
    { id: 'observations', path: '/observations', labelKey: 'nav.observations', inNav: true },
    { id: 'community', path: '/community', labelKey: 'nav.community', inNav: true, feature: 'communityDemo' },
    { id: 'library', path: '/library', labelKey: 'nav.library', inNav: true },
    { id: 'methodology', path: '/methodology', labelKey: 'nav.methodology', inNav: true },
    // Technical view reached from the observatory (button) and the footer; not in the main navbar.
    { id: 'data', path: '/data', labelKey: 'nav.data', inNav: false },
  ] as readonly RouteDef[],
});

export const enabledRoutes: readonly RouteDef[] = APP_CONFIG.routes.filter(
  (route) => !route.feature || APP_CONFIG.features[route.feature],
);

export function routePath(id: RouteId): string {
  return APP_CONFIG.routes.find((route) => route.id === id)?.path ?? '/';
}

/** Hash href for a route, e.g. `#/observatory`. */
export function routeHref(id: RouteId): string {
  return `#${routePath(id)}`;
}
