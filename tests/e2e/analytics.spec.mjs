// Analytics view (#/analytics) checked against the real published snapshot index and derived zones.
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

const readJson = async (request, path) => {
  const response = await request.get(path);
  if (!response.ok()) return null;
  try { return JSON.parse(await response.text()); } catch { return null; }
};

const loadIndex = async (request) => {
  const index = await readJson(request, './data/snapshots/index.json');
  const comparisons = index?.comparisons ?? [];
  return comparisons;
};

const loadZones = async (request, comparison) => {
  if (!comparison.derived_path) return null;
  const head = await readJson(request, `./data/${comparison.derived_path}`);
  if (head?.verification?.ok !== true || !head.files?.zones) return null;
  const zones = await readJson(request, `./data/${head.files.zones}`);
  return zones?.features?.map((f) => f.properties) ?? null;
};

/** Same rule as src/shared/format.ts formatSmart (the UI formats areas this way). */
const smart = (value, locale) => {
  const abs = Math.abs(value);
  const options = abs === 0 ? {} : abs < 1 ? { maximumSignificantDigits: 3 } : { maximumFractionDigits: abs >= 100 ? 1 : 2 };
  return new Intl.NumberFormat(locale, { useGrouping: 'always', ...options }).format(value);
};

/** Horizon day ranges, mirrors src/features/analytics/analytics.config.ts (display order). */
const HORIZONS = [['1m', 25, 45], ['3m', 75, 105], ['6m', 165, 200], ['1y', 340, 390], ['2y', 700, 760], ['3y', 1060, 1130]];

/** The default selection of the view: first of the interval-ordered periods; we only rely on the explicit ?compare= below. */
const openAnalytics = async (page, { lang = 'en', query = '' } = {}) => {
  await page.goto(`./?lang=${lang}#/analytics${query}`);
  await expect(page.getByTestId('analytics-summary')).toBeVisible({ timeout: 20_000 });
};

const trackErrors = (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
};

test.describe('analytics summary and charts', () => {
  test('summary shows the candidate area of the selected period in the UI number format', async ({ page, request }) => {
    const comparisons = await loadIndex(request);
    test.skip(comparisons.length === 0, 'no comparisons published');
    const target = comparisons[0];
    for (const lang of ['en', 'es']) {
      await openAnalytics(page, { lang, query: `?compare=${encodeURIComponent(target.snapshot_id)}` });
      const expected = smart(target.metrics.candidate_area_ha, lang);
      const stat = page.getByTestId('analytics-summary').locator('.an-stat', { hasText: /candidate|candidata/i }).first();
      await expect(stat).toContainText(expected);
      await expect(page.getByTestId('analytics-summary')).toContainText(smart(target.metrics.valid_area_ha, lang));
    }
  });

  test('area and zone charts have one bar per comparison and the trend notice is visible', async ({ page, request }) => {
    const comparisons = await loadIndex(request);
    test.skip(comparisons.length === 0, 'no comparisons published');
    await openAnalytics(page);
    await expect(page.getByTestId('trend-notice')).toBeVisible();
    for (const id of ['chart-area', 'chart-zones']) {
      const chart = page.getByTestId(id);
      await expect(chart).toBeVisible();
      await expect(chart.locator('g.an-bar')).toHaveCount(comparisons.length);
    }
  });

  test('horizons without a processed comparison show no hectares', async ({ page, request }) => {
    const comparisons = await loadIndex(request);
    test.skip(comparisons.length === 0, 'no comparisons published');
    await openAnalytics(page);
    const items = page.getByTestId('horizons').locator('li.an-horizon');
    await expect(items).toHaveCount(HORIZONS.length);
    for (let i = 0; i < HORIZONS.length; i += 1) {
      const [id, min, max] = HORIZONS[i];
      const matching = comparisons.filter((c) => c.interval_days >= min && c.interval_days <= max);
      const item = items.nth(i);
      if (matching.length === 0) {
        await expect(item.locator('button'), `horizon ${id} has no comparison`).toHaveCount(0);
        await expect(item).not.toContainText(/\bha\b|hectares|hectáreas/i);
      } else {
        await expect(item.locator('button')).toHaveCount(matching.length);
        for (const c of matching) await expect(item).toContainText(smart(c.metrics.candidate_area_ha, 'en'));
      }
    }
  });

  test('opening another period updates the summary', async ({ page, request }) => {
    const comparisons = await loadIndex(request);
    test.skip(new Set(comparisons.map((c) => c.metrics.candidate_area_ha)).size < 2, 'need two periods with different areas');
    const [a, b] = [comparisons[0], comparisons.find((c) => c.metrics.candidate_area_ha !== comparisons[0].metrics.candidate_area_ha)];
    await openAnalytics(page, { query: `?compare=${encodeURIComponent(a.snapshot_id)}` });
    const summary = page.getByTestId('analytics-summary');
    const stat = summary.locator('.an-stat', { hasText: /candidate/i }).first();
    await expect(stat).toContainText(smart(a.metrics.candidate_area_ha, 'en'));
    // The row of the other period has an "open" button; the row of the open period says "opened here".
    const row = summary.locator('tbody tr', { has: page.locator('button') }).filter({ hasText: smart(b.metrics.candidate_area_ha, 'en') }).first();
    await row.locator('button').click();
    await expect(stat).toContainText(smart(b.metrics.candidate_area_ha, 'en'));
    await expect(stat).not.toContainText(new RegExp(`^\\D*${smart(a.metrics.candidate_area_ha, 'en')}\\D`));
  });

  test('timeline has a mark per distinct date used by the comparisons', async ({ page, request }) => {
    const comparisons = await loadIndex(request);
    test.skip(comparisons.length === 0, 'no comparisons published');
    const used = new Set(comparisons.flatMap((c) => [c.initial_date, c.final_date]));
    await openAnalytics(page);
    const timeline = page.getByTestId('timeline');
    await expect(timeline).toBeVisible();
    expect(await timeline.locator('.an-mark').count()).toBeGreaterThanOrEqual(used.size);
    await expect(timeline.locator('.an-mark.is-used')).toHaveCount(used.size);
  });

  test('a zone link opens the zone evolution for that zone', async ({ page, request }) => {
    const comparisons = await loadIndex(request);
    let target = null;
    let zones = null;
    for (const c of comparisons) {
      zones = await loadZones(request, c);
      if (zones?.length) { target = c; break; }
    }
    test.skip(!target, 'derived zones not published yet');
    const zoneId = zones[0].zone_id;
    await openAnalytics(page, { query: `?compare=${encodeURIComponent(target.snapshot_id)}&zone=${encodeURIComponent(zoneId)}` });
    const evolution = page.getByTestId('zone-evolution');
    await expect(evolution).toBeVisible();
    await expect(evolution).toContainText(zoneId);
    await expect(evolution.locator('g.an-bar').first()).toBeVisible();
  });
});

test.describe('analytics and observatory robustness', () => {
  test('no horizontal overflow at 390 px in analytics and observatory', async ({ page, request }) => {
    test.skip((await loadIndex(request)).length === 0, 'no comparisons published');
    await page.setViewportSize({ width: 390, height: 844 });
    await openAnalytics(page);
    await expect(page.getByTestId('timeline')).toBeVisible();
    const overflow = () => page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    let [scroll, client] = await overflow();
    expect(scroll, 'analytics scrollWidth').toBeLessThanOrEqual(client + 1);
    await page.goto('./?lang=en#/observatory');
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pair-dates')).toBeVisible();
    [scroll, client] = await overflow();
    expect(scroll, 'observatory scrollWidth').toBeLessThanOrEqual(client + 1);
  });

  test('no page errors in analytics or the observatory', async ({ page, request }) => {
    test.skip((await loadIndex(request)).length === 0, 'no comparisons published');
    const errors = trackErrors(page);
    await openAnalytics(page);
    await expect(page.getByTestId('horizons')).toBeVisible();
    await page.goto('./?lang=en#/observatory');
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('pair-dates')).toBeVisible();
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('switching ES/EN leaves no untranslated keys', async ({ page, request }) => {
    test.skip((await loadIndex(request)).length === 0, 'no comparisons published');
    const keyLike = /\b(analytics|explore|observatory|common)\.[a-zA-Z][\w.]*/;
    await openAnalytics(page, { lang: 'en' });
    const toggle = page.getByRole('button', { name: /español|spanish|switch to|cambiar/i }).first();
    for (const lang of ['en', 'es']) {
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      const text = await page.locator('main').innerText();
      expect(text.match(keyLike)?.[0] ?? null, `untranslated key in ${lang}`).toBeNull();
      if (lang === 'en') await toggle.click();
    }
    // Same for the explore panels in the observatory in Spanish.
    await page.goto('./?lang=es#/observatory');
    await expect(page.getByTestId('pair-dates')).toBeVisible({ timeout: 15_000 });
    const obs = await page.locator('main').innerText();
    expect(obs.match(keyLike)?.[0] ?? null, 'untranslated key in observatory es').toBeNull();
  });
});
