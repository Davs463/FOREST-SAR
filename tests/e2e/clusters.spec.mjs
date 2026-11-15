// Zone clusters, intensity legend, stable zone styles across base maps and the evolution link.
// Expectations come from the published JSON (snapshots/index.json + derived/zones.geojson), never from hardcoded numbers.
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

const readJson = async (request, path) => {
  const response = await request.get(path);
  if (!response.ok()) return null;
  try { return JSON.parse(await response.text()); } catch { return null; }
};

/** Every processed comparison that has verified derived zones. */
const loadPeriods = async (request) => {
  const index = await readJson(request, './data/snapshots/index.json');
  const out = [];
  for (const c of index?.comparisons ?? []) {
    if (!c.derived_path) continue;
    const head = await readJson(request, `./data/${c.derived_path}`);
    if (head?.verification?.ok !== true || !head.files?.zones) continue;
    const zones = await readJson(request, `./data/${head.files.zones}`);
    if (!zones?.features) continue;
    out.push({ comparison: c, zones: zones.features.map((f) => f.properties) });
  }
  return out;
};

/** The app default: ~3 month comparison when processed, else the newest one (same rule as map.spec.mjs). */
const defaultPeriod = (periods) => {
  const sorted = [...periods].sort((a, b) => b.comparison.final_date.localeCompare(a.comparison.final_date) || b.comparison.initial_date.localeCompare(a.comparison.initial_date));
  return sorted.find((p) => p.comparison.interval_days >= 80 && p.comparison.interval_days <= 100) ?? sorted[0];
};

const open = async (page, id) => {
  await page.goto(`./?lang=en#/observatory${id ? `?compare=${encodeURIComponent(id)}` : ''}`);
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('pair-dates')).toBeVisible();
  await expect(page.getByTestId('zone-select')).toBeVisible({ timeout: 15_000 });
};
const zoom = async (page) => Number(await page.getByTestId('obs-map').getAttribute('data-zoom'));
const polygonCount = (page) => page.locator('.leaflet-fsZones-pane path.leaflet-interactive').count();
const bubbleSum = async (page) => {
  const texts = await page.getByTestId('zone-cluster').locator('.zone-cluster__num').allTextContents();
  return { bubbles: texts.length, sum: texts.reduce((s, t) => s + Number(t), 0) };
};
const settle = (page) => page.waitForTimeout(400);
/** Waits until bubbles + polygons account for all zones (re-clustering is debounced). */
const expectAccounted = async (page, total) => {
  await expect.poll(async () => (await bubbleSum(page)).sum + (await polygonCount(page)), { timeout: 10_000 }).toBe(total);
};
/** Zooms through the public Leaflet control. */
const zoomTo = async (page, z) => {
  while ((await zoom(page)) < z) {
    const before = await zoom(page);
    await page.locator('.leaflet-control-zoom-in').click();
    await expect.poll(() => zoom(page)).toBeGreaterThan(before);
  }
};
/** Parses a UI number in either locale ("1,234.5" or "1.234,5"). */
const parseUi = (text) => {
  const raw = text.replace(/[^\d.,]/g, '');
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  if (lastComma > lastDot) return Number(raw.replace(/\./g, '').replace(',', '.'));
  return Number(raw.replace(/,/g, ''));
};

test.describe('zone clusters', () => {
  test('bubbles are visible at the initial zoom and bubbles + polygons account for every zone', async ({ page, request }) => {
    const period = defaultPeriod(await loadPeriods(request));
    test.skip(!period || period.zones.length < 2, 'derived zones not published yet');
    await open(page);
    await settle(page);
    await expectAccounted(page, period.zones.length);
    expect((await bubbleSum(page)).bubbles, 'expected at least one cluster bubble at the initial zoom').toBeGreaterThan(0);
    await expect(page.getByTestId('zone-cluster').first()).toBeVisible();
    await expect(page.getByTestId('cluster-legend')).toBeVisible();
  });

  test('clicking a bubble zooms in and shows the exact summed area of its zones', async ({ page, request }) => {
    const period = defaultPeriod(await loadPeriods(request));
    test.skip(!period || period.zones.length < 2, 'derived zones not published yet');
    await open(page);
    await settle(page);
    const bubble = page.getByTestId('zone-cluster').first();
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    const zoomBefore = await zoom(page);
    const count = Number((await bubble.locator('.zone-cluster__num').textContent()).trim());
    await bubble.click();
    const info = page.getByTestId('zone-info');
    await expect(info).toBeVisible();
    await expect(info).toHaveAttribute('data-kind', 'cluster');
    await expect.poll(() => zoom(page), { timeout: 10_000 }).toBeGreaterThan(zoomBefore);
    const bbox = (await info.getAttribute('data-bbox')).split(',').map(Number);
    const eps = 1e-6;
    const inside = period.zones.filter((z) => z.bbox[0] >= bbox[0] - eps && z.bbox[1] >= bbox[1] - eps && z.bbox[2] <= bbox[2] + eps && z.bbox[3] <= bbox[3] + eps);
    const shown = parseUi(await page.getByTestId('cluster-area').textContent());
    const total = period.comparison.metrics.candidate_area_ha;
    expect(inside.length).toBeGreaterThanOrEqual(count);
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThanOrEqual(total + 0.01);
    if (inside.length === count) {
      // The union bbox holds exactly the bubble members: the card must show the exact sum of their area_ha.
      expect(shown).toBeCloseTo(inside.reduce((s, z) => s + z.area_ha, 0), 1);
    } else {
      // A foreign zone sits inside the union bbox: the shown area must be a sum of exactly `count` of the zones inside.
      const areas = inside.map((z) => z.area_ha);
      const reach = [{ n: 0, s: 0 }];
      for (const a of areas) for (const r of [...reach]) if (r.n < count) reach.push({ n: r.n + 1, s: r.s + a });
      const ok = reach.some((r) => r.n === count && Math.abs(r.s - shown) < 0.06);
      expect(ok, `area ${shown} ha is not a sum of ${count} zone areas`).toBe(true);
    }
    await expect(page.getByTestId('cluster-range')).toBeVisible();
  });

  test('at zoom >= 14 real polygons appear with the intensity legend', async ({ page, request }) => {
    const period = defaultPeriod(await loadPeriods(request));
    test.skip(!period || period.zones.length === 0, 'derived zones not published yet');
    await open(page);
    await zoomTo(page, 14);
    await expect.poll(() => polygonCount(page), { timeout: 10_000 }).toBe(period.zones.length);
    await expect(page.getByTestId('zone-cluster')).toHaveCount(0);
    await expect(page.getByTestId('intensity-legend')).toBeVisible();
  });

  test('zone styles are identical for satellite, relief and OSM base maps', async ({ page, request }) => {
    const period = defaultPeriod(await loadPeriods(request));
    test.skip(!period || period.zones.length === 0, 'derived zones not published yet');
    await open(page);
    await zoomTo(page, 14);
    await expect.poll(() => polygonCount(page), { timeout: 10_000 }).toBe(period.zones.length);
    const styles = () => page.locator('.leaflet-fsZones-pane path').evaluateAll((paths) => paths.map((p) => ['stroke', 'stroke-width', 'stroke-opacity', 'fill', 'fill-opacity', 'stroke-dasharray'].map((a) => p.getAttribute(a)).join('|')));
    await page.getByTestId('basemap-satellite').click();
    const satellite = await styles();
    expect(satellite.length).toBeGreaterThan(0);
    for (const id of ['relief', 'osm']) {
      await page.getByTestId(`basemap-${id}`).click();
      await expect(page.getByTestId(`basemap-${id}`)).toHaveAttribute('aria-pressed', 'true');
      await settle(page);
      expect(await styles()).toEqual(satellite);
    }
  });

  test('selecting a zone offers the evolution link with compare and zone parameters', async ({ page, request }) => {
    const period = defaultPeriod(await loadPeriods(request));
    test.skip(!period || period.zones.length === 0, 'derived zones not published yet');
    await open(page);
    await page.getByTestId('zone-select').selectOption({ index: 1 });
    const link = page.getByTestId('see-evolution');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toContain('#/analytics');
    expect(href).toContain(`compare=${encodeURIComponent(period.comparison.snapshot_id)}`);
    expect(href).toMatch(/zone=Z\d+/);
  });

  test('changing the period changes the number of zones in the selector', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(new Set(periods.map((p) => p.zones.length)).size < 2, 'need two periods with different zone counts');
    const a = periods[0];
    const b = periods.find((p) => p.zones.length !== a.zones.length);
    await open(page, a.comparison.snapshot_id);
    await expect(page.getByTestId('zone-select').locator('option')).toHaveCount(a.zones.length + 1);
    await page.evaluate((id) => { window.location.hash = `#/observatory?compare=${encodeURIComponent(id)}`; }, b.comparison.snapshot_id);
    await expect(page.getByTestId('zone-select').locator('option')).toHaveCount(b.zones.length + 1);
  });

  test('the comparator button is gone; Before/After remain in the advanced tools', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(periods.length === 0, 'derived zones not published yet');
    await open(page, defaultPeriod(periods).comparison.snapshot_id);
    await expect(page.getByTestId('compare-toggle')).toHaveCount(0);
    await expect(page.getByTestId('swipe-divider')).toHaveCount(0);
    await page.getByTestId('map-advanced').locator('summary').click();
    await page.getByTestId('adv-layer-before').click();
    await expect(page.getByTestId('adv-layer-before')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.leaflet-fsRadar-pane img.leaflet-image-layer')).toHaveCount(1);
  });
});
