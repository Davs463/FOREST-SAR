// Observations view: candidate zones grouped by nearest place, per period. Expectations come from the published JSON.
import { readFile } from 'node:fs/promises';
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

const readJson = async (request, path) => {
  const response = await request.get(path);
  if (!response.ok()) return null;
  try { return JSON.parse(await response.text()); } catch { return null; }
};

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

const groupByPlace = (zones) => {
  const map = new Map();
  for (const z of zones) {
    const name = z.nearest_place?.name ?? null;
    const g = map.get(name) ?? { name, count: 0, ha: 0, zones: [] };
    g.count += 1; g.ha += z.area_ha; g.zones.push(z);
    map.set(name, g);
  }
  return [...map.values()];
};

const defaultPeriod = (periods) => {
  const sorted = [...periods].sort((a, b) => b.comparison.final_date.localeCompare(a.comparison.final_date) || b.comparison.initial_date.localeCompare(a.comparison.initial_date));
  return sorted.find((p) => p.comparison.interval_days >= 80 && p.comparison.interval_days <= 100) ?? sorted[0];
};

const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');
const num = (text) => Number(String(text).replace(/,/g, ''));
const open = async (page, id, lang = 'en') => {
  await page.goto(`./?lang=${lang}#/observations${id ? `?compare=${encodeURIComponent(id)}` : ''}`);
  await expect(page.getByTestId('obs-place-combobox')).toBeVisible({ timeout: 20_000 });
};

test.describe('observations', () => {
  test('places list matches the grouping and exact area sums of zones.geojson', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(periods.length === 0, 'derived zones not published yet');
    const p = defaultPeriod(periods);
    await open(page, p.comparison.snapshot_id);
    await page.getByTestId('obs-place-combobox').click();
    const groups = groupByPlace(p.zones);
    await expect(page.getByTestId('obs-place-option')).toHaveCount(groups.length);
    const biggest = [...groups].filter((g) => g.name).sort((a, b) => b.count - a.count)[0];
    const option = page.getByTestId('obs-place-option').filter({ hasText: biggest.name }).first();
    const text = await option.textContent();
    const m = text.match(/(\d+) observations?\s*·\s*([\d.,]+)\s*ha/);
    expect(m, text).not.toBeNull();
    expect(Number(m[1])).toBe(biggest.count);
    expect(num(m[2])).toBeCloseTo(biggest.ha, 1);
    await option.click();
    // Long lists show 6 observations first; "Show more" reveals the rest.
    if (biggest.count > 6) {
      await expect(page.getByTestId('obs-item')).toHaveCount(6);
      await page.getByTestId('obs-items-more').click();
    }
    await expect(page.getByTestId('obs-item')).toHaveCount(biggest.count);
    const first = await page.getByTestId('obs-item').first().textContent();
    const largest = Math.max(...biggest.zones.map((z) => z.area_ha));
    expect(first).toMatch(/Observation 1/);
    expect(num(first.match(/—\s*([\d.,]+)\s*ha/)[1])).toBeCloseTo(largest, 1);
  });

  test('search ignores accents', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(periods.length === 0, 'derived zones not published yet');
    const p = defaultPeriod(periods);
    const accented = groupByPlace(p.zones).find((g) => g.name && g.name !== stripAccents(g.name));
    test.skip(!accented, 'no accented place name');
    await open(page, p.comparison.snapshot_id);
    await page.getByTestId('obs-place-combobox').fill(stripAccents(accented.name).toLowerCase());
    await expect(page.getByTestId('obs-place-option').filter({ hasText: accented.name }).first()).toBeVisible();
  });

  test('detail card, science block and "View on the map" select that zone in the observatory', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(periods.length === 0, 'derived zones not published yet');
    const p = defaultPeriod(periods);
    await open(page, p.comparison.snapshot_id);
    const g = groupByPlace(p.zones).filter((x) => x.name)[0];
    await page.getByTestId('obs-place-combobox').fill(g.name);
    await page.getByTestId('obs-place-option').first().click();
    await page.getByTestId('obs-item').first().click();
    const detail = page.getByTestId('obs-detail');
    await expect(detail).toContainText(/Near .* \(\d+(\.\d+)? km\)/);
    await expect(detail).toContainText(/does NOT confirm deforestation/i);
    const zone = [...g.zones].sort((a, b) => b.area_ha - a.area_ha || a.zone_id.localeCompare(b.zone_id, undefined, { numeric: true }))[0];
    await page.getByTestId('obs-science').locator('summary').click();
    await expect(page.getByTestId('obs-science')).toContainText(zone.zone_id);
    await expect(page.getByTestId('obs-science')).toContainText(/1 km grid sectors/i);
    await expect(page.getByTestId('obs-see-evolution')).toHaveAttribute('href', new RegExp(`#/analytics\\?compare=.*&zone=${zone.zone_id}$`));
    await expect(page.getByTestId('obs-see-map')).toHaveAttribute('href', new RegExp(`#/observatory\\?compare=.*&zone=${zone.zone_id}$`));
    await page.getByTestId('obs-see-map').click();
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('zone-select')).toHaveValue(zone.zone_id, { timeout: 15_000 });
    await expect(page.getByTestId('zone-card')).toBeVisible();
  });

  test('changing the period changes the observation count', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(periods.length < 2, 'needs two derived periods');
    const a = periods[0];
    const b = periods.find((p) => p.zones.length !== a.zones.length);
    test.skip(!b, 'periods have the same zone count');
    await open(page, a.comparison.snapshot_id);
    await expect(page.getByTestId('obs-summary')).toContainText(new RegExp(`^${a.zones.length} observations`));
    await page.evaluate((id) => { window.location.hash = `#/observations?compare=${encodeURIComponent(id)}`; }, b.comparison.snapshot_id);
    await expect(page.getByTestId('obs-summary')).toContainText(new RegExp(`^${b.zones.length} observations`));
    await expect(page.getByTestId('obs-period').getByRole('button', { pressed: true })).toHaveCount(1);
  });

  test('zones CSV of the period has one row per zone; sectors CSV is separate', async ({ page, request }) => {
    const periods = await loadPeriods(request);
    test.skip(periods.length === 0, 'derived zones not published yet');
    const p = defaultPeriod(periods);
    await open(page, p.comparison.snapshot_id);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('csv-zones').click()]);
    const body = (await readFile(await dl.path(), 'utf8')).replace(/^﻿/, '');
    const lines = body.split('\r\n');
    expect(lines[0]).toBe('zone_id,localidad,distancia_km,area_ha,cell_count,mean_delta_db,min_delta_db,clase,centroid_lat,centroid_lon,initial_date,final_date,snapshot_id');
    expect(lines.length - 1).toBe(p.zones.length);
    expect(lines[1]).toContain(p.comparison.snapshot_id);
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('csv-sectors').click()]);
    const sectors = (await readFile(await dl2.path(), 'utf8')).split('\r\n')[0];
    expect(sectors).toContain('sector_id');
    expect(sectors).not.toContain('zone_id');
  });

  for (const lang of ['en', 'es']) {
    test(`no untranslated keys in ${lang}`, async ({ page, request }) => {
      const periods = await loadPeriods(request);
      test.skip(periods.length === 0, 'derived zones not published yet');
      await open(page, defaultPeriod(periods).comparison.snapshot_id, lang);
      await page.getByTestId('obs-place-combobox').click();
      await page.getByTestId('obs-place-option').first().click();
      await page.getByTestId('obs-item').first().click();
      await page.getByTestId('obs-science').locator('summary').click();
      const text = await page.locator('body').innerText();
      expect(text).not.toMatch(/\b(observations|observatory|explore|common)\.[a-zA-Z_]+/);
      await expect(page.getByTestId('obs-see-map')).toContainText(lang === 'es' ? 'Ver en el mapa' : 'View on the map');
    });
  }

  test('mobile 390: no horizontal overflow', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'mobile-390', 'mobile only');
    const periods = await loadPeriods(request);
    test.skip(periods.length === 0, 'derived zones not published yet');
    await open(page, defaultPeriod(periods).comparison.snapshot_id);
    await page.getByTestId('obs-place-combobox').click();
    await page.getByTestId('obs-place-option').first().click();
    await page.getByTestId('obs-item').first().click();
    await page.getByTestId('obs-science').locator('summary').click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
