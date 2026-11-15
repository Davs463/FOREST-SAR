// Judge walkthrough smoke tests against the real published snapshot (public/data/manifest.json).
// Assertions use values present in the snapshot (pair dates), never invented numbers.
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

const consoleErrors = (page) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/tile.openstreetmap|arcgisonline|opentopomap|ERR_INTERNET|net::/i.test(msg.text())) errors.push(msg.text());
  });
  return errors;
};

const noHorizontalOverflow = async (page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(1);
};

test('home loads with brand title and no critical console errors', async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto('./');
  await expect(page).toHaveTitle(/FOREST-SAR/);
  await expect(page.locator('html')).toHaveAttribute('lang', /en|es/);
  await noHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('observatory renders Leaflet map, real pair dates and base-map attribution', async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto('./#/observatory');
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  const twelve = page.getByRole('button', { name: /12 days|12 días/i }).first();
  if (await twelve.count()) await twelve.click();
  // Default base map is satellite imagery (Esri); OpenStreetMap is one click away and carries its own attribution.
  await expect(page.locator('.leaflet-control-attribution')).toContainText(/Esri/);
  await page.getByTestId('basemap-osm').click();
  await expect(page.locator('.leaflet-control-attribution')).toContainText(/OpenStreetMap/);
  await expect(page.getByTestId('pair-dates')).toContainText(/2026-10-07|Oct(ober)? 7, 2026|7 Oct 2026/);
  await expect(page.getByTestId('pair-dates')).toContainText(/2026-10-19|Oct(ober)? 19, 2026|19 Oct 2026/);
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await noHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('navigating between routes repeatedly does not duplicate the map; back works', async ({ page }) => {
  await page.goto('./#/observatory');
  await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 3; i += 1) {
    await page.goto('./#/library');
    await page.goto('./#/observatory');
  }
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await page.goto('./#/methodology');
  await page.goBack();
  await expect(page).toHaveURL(/#\/observatory/);
});

test('observations offers both CSV downloads (zones and 1 km sectors) for the selected period', async ({ page }) => {
  await page.goto('./?lang=en#/observations');
  for (const id of ['csv-zones', 'csv-sectors']) {
    const button = page.getByTestId(id);
    await expect(button).toBeEnabled({ timeout: 15_000 });
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  }
});

test('methodology keeps snapshot parameters (HVHV, threshold) in the transparency section', async ({ page }) => {
  await page.goto('./#/methodology');
  const transparency = page.getByTestId('method-transparency');
  await expect(transparency).toBeVisible({ timeout: 15_000 });
  // Scientific details live in collapsed topics: open them all, then the values must be visible.
  for (const summary of await transparency.locator('details.meth-topic > summary').all()) await summary.click();
  await expect(transparency.getByText(/HVHV/).first()).toBeVisible({ timeout: 15_000 });
  await expect(transparency.getByText(/3(\.0)?\s*dB/).first()).toBeVisible();
  await expect(page.getByTestId('method-legend')).toBeVisible();
});

test('methodology opens the user manual PDF in a modal and offers a download', async ({ page, request }) => {
  await page.goto('./#/methodology');
  const card = page.getByTestId('method-manual');
  await expect(card).toBeVisible({ timeout: 15_000 });
  const href = await card.getByTestId('manual-download').getAttribute('href');
  expect(href).toMatch(/manual\/Manual_Usuario_FOREST_SAR_HN\.pdf$/);
  // The file is really shipped with the site and is a PDF.
  const pdf = await request.get(href.replace(/^\.?\//, './'));
  expect(pdf.ok()).toBeTruthy();
  expect((await pdf.body()).subarray(0, 4).toString('latin1')).toBe('%PDF');

  await card.getByTestId('manual-open').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Inline viewer when the browser supports it, otherwise the explained fallback; download is always offered.
  await expect(dialog.getByTestId('manual-frame').or(dialog.getByTestId('manual-fallback'))).toBeVisible();
  await expect(dialog.getByTestId('manual-download')).toHaveAttribute('download', /\.pdf$/);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('community is labelled demo and stored only in this browser', async ({ page }) => {
  await page.goto('./#/community');
  await expect(page.getByText(/stored only in this browser/i).first()).toBeVisible();
});

test('language switch to Spanish updates lang attribute', async ({ page }) => {
  await page.goto('./#/observatory');
  const toggle = page.getByRole('button', { name: /Switch language to/i }).first();
  if (!(await toggle.isVisible())) {
    const menu = page.getByRole('button', { name: /Open navigation/i });
    if (await menu.isVisible()) await menu.click();
  }
  await page.getByRole('button', { name: /Switch language to/i }).first().click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});

test('mobile menu opens and closes with Escape', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-390', 'mobile only');
  await page.goto('./');
  const menu = page.getByRole('button', { name: /Open navigation/i });
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.getByRole('button', { name: /Close navigation/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Open navigation/i })).toBeVisible();
});
