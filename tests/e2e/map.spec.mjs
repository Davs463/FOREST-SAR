// Map experience: base map selector, local place search, zone explorer, advanced layers off by default.
// Tests that need derived products (zones, valid area) or the gazetteer skip themselves when the data are not published.
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

const openObservatory = async (page) => {
  await page.goto('./#/observatory');
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('pair-dates')).toBeVisible();
};

const readJson = async (request, path) => {
  const response = await request.get(path);
  if (!response.ok()) return null;
  try { return JSON.parse(await response.text()); } catch { return null; }
};

/** What the engine published for the default (latest) comparison; null parts mean "not available". */
const published = async (request) => {
  const index = await readJson(request, './data/snapshots/index.json');
  if (!index) return { derived: null, places: null };
  // Mirrors the app default: the ~3 month comparison when processed, otherwise the newest one.
  const newest = [...(index.comparisons ?? [])].sort((a, b) => b.final_date.localeCompare(a.final_date) || b.initial_date.localeCompare(a.initial_date));
  const latest = newest.find((c) => c.interval_days >= 80 && c.interval_days <= 100) ?? newest[0];
  let derived = null;
  if (latest?.derived_path) {
    const head = await readJson(request, `./data/${latest.derived_path}`);
    if (head?.verification?.ok === true) {
      const zones = await readJson(request, `./data/${head.files.zones}`);
      derived = { head, zones: zones?.features ?? [], hasCells: !!head.files.cells, hasValid: !!head.files.valid_area };
    }
  }
  let places = null;
  if (index.places_path) {
    const data = await readJson(request, `./data/${index.places_path}`);
    if (data?.places?.length) places = data;
  }
  return { derived, places };
};

const center = async (page) => {
  const value = await page.getByTestId('obs-map').getAttribute('data-center');
  return value ?? '';
};

test('base map selector is visible and switches the tile layer attribution', async ({ page }) => {
  await openObservatory(page);
  const attribution = page.locator('.leaflet-control-attribution');
  await expect(page.getByTestId('basemap-picker')).toBeVisible();
  // Default: satellite imagery.
  await expect(page.getByTestId('basemap-satellite')).toHaveAttribute('aria-pressed', 'true');
  await expect(attribution).toContainText(/Esri/);
  await page.getByTestId('basemap-relief').click();
  await expect(page.getByTestId('basemap-relief')).toHaveAttribute('aria-pressed', 'true');
  await expect(attribution).toContainText(/OpenTopoMap/);
  await page.getByTestId('basemap-osm').click();
  await expect(attribution).toContainText(/OpenStreetMap/);
  await expect(attribution).not.toContainText(/Esri|OpenTopoMap/);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  // The scientific layer stays on top and keeps its pane whatever the base map is.
  await expect(page.locator('.leaflet-fsRadar-pane img.leaflet-image-layer')).toHaveCount(1);
});

test('place search suggests local results and moves the map', async ({ page, request }) => {
  const { derived, places } = await published(request);
  test.skip(!places, 'gazetteer not published yet');
  await openObservatory(page);
  const input = page.getByTestId('place-input');
  await expect(input).toBeVisible();
  await expect(page.getByTestId('place-search')).toContainText(/ODbL/);
  const name = places.places[0].name;
  const accentFree = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const query = accentFree.slice(0, Math.min(4, accentFree.length)).toUpperCase();
  await input.fill(query);
  await expect(input).toHaveAttribute('role', 'combobox');
  const options = page.getByTestId('place-option');
  await expect(options.first()).toBeVisible();
  expect(await options.count()).toBeLessThanOrEqual(8);
  expect(await options.count()).toBeGreaterThan(0);
  await expect(page.getByRole('listbox')).toBeVisible();
  const before = await center(page);
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect.poll(() => center(page), { timeout: 10_000 }).not.toBe(before);
  if (derived?.hasValid) await expect(page.getByTestId('place-summary')).toBeVisible();
  // Escape clears the search and its marker.
  await input.press('Escape');
  await expect(input).toHaveValue('');
});

test('zone selector lists zones and shows the exact area of the chosen zone', async ({ page, request }) => {
  const { derived } = await published(request);
  test.skip(!derived || derived.zones.length === 0, 'derived zones not published yet');
  await openObservatory(page);
  const select = page.getByTestId('zone-select');
  await expect(select).toBeVisible();
  await expect(select.locator('option')).toHaveCount(derived.zones.length + 1);
  await expect(select.locator('option').nth(1)).toContainText(/Zone 1|Zona 1/);
  await expect(page.getByTestId('zone-card')).toHaveCount(0);
  const zoomBefore = Number(await page.getByTestId('obs-map').getAttribute('data-zoom'));
  await select.selectOption({ index: 1 });
  await expect(page.getByTestId('zone-card')).toBeVisible();
  await expect(page.getByTestId('zone-area')).toContainText(/\d/);
  await expect(page.getByTestId('zone-area')).toContainText(/ha/);
  await expect(page.getByTestId('zone-ref')).toBeVisible();
  await expect.poll(async () => Number(await page.getByTestId('obs-map').getAttribute('data-zoom')), { timeout: 10_000 }).toBeGreaterThan(zoomBefore);
  await page.getByTestId('back-to-window').click();
  await expect(page.getByTestId('zone-card')).toHaveCount(0);
});

test('with derived products the candidate cells, sector grid and study window are advanced layers, off by default', async ({ page, request }) => {
  const { derived } = await published(request);
  test.skip(!derived, 'derived products not published yet');
  await openObservatory(page);
  await expect(page.getByTestId('no-derived')).toHaveCount(0);
  await expect(page.locator('.leaflet-fsCells-pane canvas')).toHaveCount(0);
  await page.getByTestId('map-advanced').locator('summary').click();
  await expect(page.getByTestId('toggle-grid')).not.toBeChecked();
  if (derived.hasValid) await expect(page.getByTestId('toggle-window')).not.toBeChecked();
  if (derived.hasCells) {
    await expect(page.getByTestId('toggle-cells')).not.toBeChecked();
    await page.getByTestId('toggle-cells').check();
    await expect(page.locator('.leaflet-fsCells-pane canvas')).toHaveCount(1, { timeout: 10_000 });
    await page.getByTestId('toggle-cells').uncheck();
    await expect(page.getByTestId('toggle-cells')).not.toBeChecked();
  }
  await expect(page.getByTestId('map-legend')).toContainText(/no valid data|no hay datos válidos/i);
});

test('mobile: the map, base selector and search fit the viewport', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'mobile-390', 'mobile only');
  const { places } = await published(request);
  await openObservatory(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('basemap-picker')).toBeVisible();
  if (places) {
    const box = await page.getByTestId('place-input').boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(391);
    expect(box.height).toBeGreaterThanOrEqual(36);
  }
});
