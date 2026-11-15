// Observatory redesign checks against the real published snapshot.
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

// Several comparisons are published now (12 days up to ~3 months); these tests are about the 7 -> 19 Oct 2026 pair.
const openObservatory = async (page) => {
  await page.goto('./#/observatory');
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('pair-dates')).toBeVisible();
  const twelve = page.getByRole('button', { name: /12 days|12 días/i }).first();
  if (await twelve.count()) await twelve.click();
  await expect(page.getByTestId('pair-dates')).toContainText(/Oct 7, 2026|7 oct 2026/i);
};

test('footprints and sector grid are hidden by default and independent toggles', async ({ page }) => {
  await openObservatory(page);
  await page.getByTestId('map-advanced').locator('summary').click();
  await expect(page.getByTestId('toggle-footprints')).not.toBeChecked();
  await expect(page.getByTestId('toggle-grid')).not.toBeChecked();
  await expect(page.getByTestId('toggle-quality')).not.toBeChecked();
  await page.getByTestId('toggle-grid').check();
  await expect(page.getByTestId('toggle-footprints')).not.toBeChecked();
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
});

test('opacity slider changes only the radar overlay, never the base map', async ({ page }) => {
  await openObservatory(page);
  const overlay = page.locator('.leaflet-fsRadar-pane img.leaflet-image-layer');
  await expect(overlay).toHaveCount(1);
  const baseBefore = await page.locator('.leaflet-fsBase-pane .leaflet-layer').first().evaluate((el) => getComputedStyle(el).opacity);
  await page.getByTestId('opacity-slider').fill('30');
  await expect.poll(() => overlay.evaluate((el) => el.style.opacity)).toBe('0.3');
  const baseAfter = await page.locator('.leaflet-fsBase-pane .leaflet-layer').first().evaluate((el) => getComputedStyle(el).opacity);
  expect(baseAfter).toBe(baseBefore);
  await expect(page.locator('.leaflet-tile-pane')).not.toHaveAttribute('style', /opacity: 0\.3/);
});

test('the sliding comparator is gone from the main view; before/after only live in the advanced tools', async ({ page }) => {
  await openObservatory(page);
  await expect(page.getByTestId('compare-toggle')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /^(Before|Antes)/i })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: /^(After|Después)/i })).toHaveCount(0);
  await expect(page.getByTestId('swipe-divider')).toHaveCount(0);
  await page.getByTestId('map-advanced').locator('summary').click();
  await expect(page.getByTestId('adv-layer-before')).toBeVisible();
  await expect(page.getByTestId('adv-layer-after')).toBeVisible();
  await expect(page.getByTestId('adv-layer-before')).toContainText(/Oct 7, 2026|7 oct 2026/i);
  await page.getByTestId('adv-layer-after').click();
  await expect(page.getByTestId('adv-layer-after')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.leaflet-fsRadar-pane img.leaflet-image-layer')).toHaveCount(1);
  await expect(page.getByTestId('swipe-divider')).toHaveCount(0);
});

test('the four period buttons are the main selector; exact dates are folded', async ({ page }) => {
  await openObservatory(page);
  const group = page.getByTestId('period-shortcuts');
  await expect(group.getByRole('button')).toHaveCount(4);
  await expect(page.getByTestId('exact-dates')).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('initial-date')).toBeHidden();
});

test('"How to read this map" modal stays above the Leaflet map', async ({ page }) => {
  await openObservatory(page);
  await page.getByRole('button', { name: /How to read this map|Cómo leer este mapa/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const owner = await page.evaluate(() => {
    const rect = document.querySelector('.leaflet-container').getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = Math.min(rect.top + rect.height / 2, window.innerHeight - 4);
    const el = document.elementFromPoint(x, y);
    return !!el && !!el.closest('.modal, .modal-backdrop');
  });
  expect(owner).toBe(true);
});

test('indicators show real values without rounding small numbers to zero', async ({ page }) => {
  await openObservatory(page);
  await expect(page.getByTestId('ind-candidate')).toContainText(/23/);
  await expect(page.getByTestId('ind-pct')).not.toHaveText(/^\s*0\s*%/);
  await expect(page.getByText(/does NOT confirm deforestation|NO confirma deforestación/i).first()).toBeVisible();
});

test('observatory no longer embeds the pair explorer or the scenes table', async ({ page }) => {
  await openObservatory(page);
  await expect(page.getByTestId('pair-explorer')).toHaveCount(0);
  await expect(page.locator('table')).toHaveCount(0);
  await expect(page.getByTestId('technical-link')).toBeVisible();
});

test('period selector marks dates with results and never enables a result that does not exist', async ({ page }) => {
  await openObservatory(page);
  await expect(page.getByTestId('pair-dates')).toContainText(/Oct 7, 2026|7 oct 2026/i);
  await expect(page.getByTestId('pair-dates')).toContainText(/Oct 19, 2026|19 oct 2026/i);
  await expect(page.getByTestId('no-results')).toHaveCount(0);
  await page.getByTestId('exact-dates').locator('summary').click();
  const initial = page.getByTestId('initial-date');
  await expect(initial.locator('option:checked')).toContainText(/with results|con resultados/i);
  // Pick any observation date that has no processed comparison.
  const values = await initial.locator('option').evaluateAll((opts) => opts.map((o) => [o.value, o.textContent]));
  const other = values.find(([, text]) => !/with results|con resultados/i.test(text));
  test.skip(!other, 'orbit has no other observation dates');
  await initial.selectOption(other[0]);
  await expect(page.getByTestId('no-results')).toContainText(/No results have been processed|Todavía no hay resultados procesados/i);
  await expect(page.getByTestId('no-results').getByRole('button')).not.toHaveCount(0);
  // No stale results are shown under the dates that have none.
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.getByTestId('ind-candidate')).toHaveCount(0);
  // The nearest real alternative restores the results.
  await page.getByTestId('no-results').getByRole('button').first().click();
  await expect(page.getByTestId('ind-candidate')).toBeVisible();
  await expect(page.getByTestId('no-results')).toHaveCount(0);
});

test('technical data view lists catalogue, comparisons, pending and incompatible pairs', async ({ page }) => {
  await page.goto('./#/data');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Explore satellite data|Explorar datos satelitales/i);
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(4);
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('tab', { name: /Incompatible|Incompatibles/i }).click();
  await expect(page.locator('.data__row').first()).toBeVisible();
  expect(await page.locator('.data__row').count()).toBeLessThanOrEqual(20);
  await page.getByRole('tab', { name: /Processed comparisons|Comparaciones procesadas/i }).click();
  const link = page.getByRole('link', { name: /View in the observatory|Ver en el observatorio/i }).first();
  await expect(link).toHaveAttribute('href', /#\/observatory\?compare=/);
  await link.click();
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('pair-dates')).toBeVisible();
});

test('a comparison whose snapshot is missing shows an error for that comparison only', async ({ page }) => {
  // Real manifest + real first comparison; the second index entry points to a snapshot that answers 404.
  const manifest = await (await page.request.get('./data/manifest.json')).json();
  const results = await (await page.request.get(`./data/${manifest.results_path}`)).json();
  const catalog = await (await page.request.get(`./data/${manifest.catalog_path}`)).json();
  const real = results.pairs[0];
  const realCandidate = new RegExp(String(Math.round(real.metrics.candidate_area_ha)));
  const scene = catalog.scenes.find((item) => item.id === real.initial_id);
  const entry = (extra) => ({
    snapshot_id: manifest.snapshot_id, pair_id: real.pair_id, initial_id: real.initial_id, final_id: real.final_id,
    initial_date: real.initial_date, final_date: real.final_date, interval_days: 12,
    track: scene.track, frame: scene.frame, pass: scene.pass, collection: scene.collection, maturity: real.maturity, common_coverage_pct: null,
    catalog_path: manifest.catalog_path, results_path: manifest.results_path, sectors_path: manifest.sectors_path, processing_log_path: manifest.processing_log_path,
    metrics: real.metrics, ...extra,
  });
  const missing = entry({
    snapshot_id: 'fixture-missing', pair_id: 'pair-fixture-missing', initial_date: '2026-09-13', final_date: '2026-09-25',
    catalog_path: 'snapshots/fixture-missing/catalog.json', results_path: 'snapshots/fixture-missing/results.json', sectors_path: 'snapshots/fixture-missing/sectors.geojson',
  });
  await page.route('**/data/manifest.json', (route) => route.fulfill({ json: { ...manifest, index_path: 'snapshots/index.json' } }));
  await page.route('**/data/snapshots/index.json', (route) => route.fulfill({
    json: { schema_version: 1, updated_at: manifest.updated_at, method: {}, comparisons: [entry({}), missing], excluded: [] },
  }));
  await page.route('**/data/snapshots/fixture-missing/**', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.goto('./#/observatory');
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('ind-candidate')).toContainText(realCandidate);
  await page.getByTestId('exact-dates').locator('summary').click();
  await page.getByTestId('final-date').selectOption('2026-09-25');
  await page.getByTestId('initial-date').selectOption('2026-09-13');
  await expect(page.getByRole('alert').or(page.getByText(/could not be loaded|No se pudieron cargar/i)).first()).toBeVisible();
  await expect(page.getByText(/HTTP 404/)).toBeVisible();
  // The first comparison's numbers are not shown under the second one's dates.
  await expect(page.getByTestId('ind-candidate')).toHaveCount(0);
  await expect(page.getByTestId('pair-dates')).toContainText(/Sep 13, 2026|13 sept? 2026/i);
  // Going back to the first comparison works (per-comparison error, not global).
  await page.getByRole('button', { name: /12 days|12 días/i }).click();
  await expect(page.getByTestId('ind-candidate')).toContainText(realCandidate);
});

test('mobile: no horizontal overflow in the observatory', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-390', 'mobile only');
  await openObservatory(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('large map mode: same map fills the viewport, Escape closes, zoom and bubbles keep working', async ({ page }) => {
  await openObservatory(page);
  const mapBox = page.getByTestId('obs-map');
  const small = await mapBox.boundingBox();
  await page.getByTestId('map-expand').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('map-expand-close')).toBeFocused();
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  const vp = page.viewportSize();
  await expect.poll(async () => { const b = await dialog.boundingBox(); return b ? (b.width * b.height) / (vp.width * vp.height) : 0; }).toBeGreaterThan(0.85);
  await expect.poll(async () => (await mapBox.boundingBox()).height).toBeGreaterThan(small.height * 0.9);
  // The dialog sits above the sticky header.
  const top = await page.evaluate(() => { const r = document.querySelector('.obs-mapbox').getBoundingClientRect(); return document.elementFromPoint(r.left + 40, r.top + 20)?.closest('.obs-mapbox') !== null; });
  expect(top).toBe(true);
  await expect(page.getByTestId('basemap-picker')).toBeVisible();
  const z0 = Number(await mapBox.getAttribute('data-zoom'));
  await page.locator('.leaflet-control-zoom-in').click();
  await expect.poll(async () => Number(await mapBox.getAttribute('data-zoom'))).toBeGreaterThan(z0);
  await expect(page.locator('.leaflet-fsRadar-pane img.leaflet-image-layer')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('map-expand')).toBeFocused();
  await expect.poll(async () => Math.abs((await mapBox.boundingBox()).height - small.height)).toBeLessThan(4);
  // Close button works too.
  await page.getByTestId('map-expand').click();
  await page.getByTestId('map-expand-close').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
