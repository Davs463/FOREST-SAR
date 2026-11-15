import type { RadarClass } from '../shared/radarClasses';

/**
 * Single source of truth for map colours (Observatory map, legend and Analytics).
 * None of them depends on the base map: outlines carry a white + dark halo so they read on satellite and light maps.
 */
export const MAP_COLORS = {
  /** Candidate zone outline (same on every base map). */
  zoneOutline: '#d6007a',
  zoneHaloLight: '#ffffff',
  zoneHaloDark: '#0b0b0b',
  /** Selection: a thick cyan halo around the zone; fill and meaning are untouched. */
  selection: '#00c2ff',
  /** Outline of the area with valid data. */
  validOutline: '#ffffff',
  validHalo: '#0b0b0b',
  /** Cluster bubble (neutral: the number is a count of zones, not an intensity). */
  clusterFill: '#1f3b4d',
  clusterText: '#ffffff',
  clusterBorder: '#ffffff',
  /** Zone without a mean-change value: grey fill + dashed outline, never the colour of "stable". */
  noData: '#9a9a9a',
} as const;

/** Fill tone of a zone by radar intensity class (decrease = warm sequential, increase = blue, stable = neutral green-grey). */
export const RADAR_CLASS_COLORS: Record<RadarClass, string> = {
  increase: '#2c7fb8',
  stable: '#8fa89b',
  moderate: '#fdb863',
  strong: '#e66101',
  veryStrong: '#a50f15',
};

export const ZONE_FILL_OPACITY = 0.5;
export const ZONE_NODATA_DASH = '4 3';

/** Publishes the palette as CSS custom properties so stylesheets (legend swatches) share these exact values. */
export function installMapColorVars(root: HTMLElement = document.documentElement): void {
  const set = (name: string, value: string) => root.style.setProperty(name, value);
  set('--map-zone-outline', MAP_COLORS.zoneOutline);
  set('--map-zone-halo-light', MAP_COLORS.zoneHaloLight);
  set('--map-zone-halo-dark', MAP_COLORS.zoneHaloDark);
  set('--map-selection', MAP_COLORS.selection);
  set('--map-valid-outline', MAP_COLORS.validOutline);
  set('--map-valid-halo', MAP_COLORS.validHalo);
  set('--map-cluster-fill', MAP_COLORS.clusterFill);
  set('--map-cluster-text', MAP_COLORS.clusterText);
  set('--map-cluster-border', MAP_COLORS.clusterBorder);
  set('--map-nodata', MAP_COLORS.noData);
  for (const [key, value] of Object.entries(RADAR_CLASS_COLORS)) set(`--map-class-${key}`, value);
}
