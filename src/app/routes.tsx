import { lazy, type ComponentType } from 'react';
import type { RouteId } from '../config/app.config';
import { CommunityPage } from '../features/community/CommunityPage';
import { Home } from '../features/home/Home';
import { Library } from '../features/library/Library';
import { Methodology } from '../features/methodology/Methodology';
// Explicit extension: a legacy `observations.ts` stub differs only in casing (Windows is case-insensitive).
import { Observations } from '../features/observations/Observations.tsx';

// Observatory is lazy so Leaflet stays out of the initial chunk (Shell wraps views in Suspense).
const Observatory = lazy(() => import('../features/observatory/Observatory'));
const DataExplorer = lazy(() => import('../features/data/DataExplorer'));
const Analytics = lazy(() => import('../features/analytics/Analytics'));

// Route id -> view. Paths, labels and flags live in config/app.config.ts.
export const VIEWS: Record<RouteId, ComponentType> = {
  home: Home,
  observatory: Observatory,
  analytics: Analytics,
  observations: Observations,
  community: CommunityPage,
  library: Library,
  methodology: Methodology,
  data: DataExplorer,
};
