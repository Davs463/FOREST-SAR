// Forest & Conservation (#/conservation). Checks structure, honesty labels and the demo-only participation flow.
// Historical figures are asserted as published in the source document (ICF 2018), never as FOREST-SAR results.
import { test, expect } from '../../.bosquevivo-tools/node_modules/@playwright/test/index.mjs';

const consoleErrors = (page) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/tile.openstreetmap|arcgisonline|opentopomap|ERR_INTERNET|net::/i.test(msg.text())) errors.push(msg.text());
  });
  return errors;
};

test('conservation page renders hero, section nav, historical figures and no overflow (EN)', async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto('./?lang=en#/conservation');
  await expect(page.getByTestId('cons-hero')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Protecting our forests starts with understanding them.');
  await expect(page).toHaveTitle(/Forest & Conservation · FOREST-SAR/);
  await expect(page.getByTestId('cons-section-nav').getByRole('button')).toHaveCount(6);
  const total = page.getByTestId('cons-stat-total');
  await expect(total).toContainText('5,384,424.88');
  await expect(total).toContainText(/Historical figure · 2018 · Not a FOREST-SAR result/i);
  await expect(page.getByTestId('cons-cause-disclaimer')).toContainText(/does not identify their cause/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('main navigation links to the conservation view in both languages', async ({ page }) => {
  await page.goto('./?lang=es#/');
  const menu = page.getByRole('button', { name: /Abrir navegación|Open navigation/i });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('link', { name: 'Bosques y Conservación' }).click();
  await expect(page).toHaveURL(/#\/conservation/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proteger nuestros bosques comienza por comprenderlos.');
});

test('hero CTA scrolls to the participation section without changing the route', async ({ page }) => {
  await page.goto('./?lang=en#/conservation');
  await page.getByTestId('cons-cta-involved').click();
  await expect(page.getByRole('heading', { name: /satellite expert/ })).toBeInViewport();
  await expect(page).toHaveURL(/#\/conservation$/);
});

test('forest type chart exposes values and a table view', async ({ page }) => {
  await page.goto('./?lang=en#/conservation');
  await page.getByTestId('forest-bar-coniferous').click();
  await expect(page.getByTestId('forest-readout')).toContainText('1,972,675.12 ha');
  await page.getByRole('button', { name: 'Show as table' }).click();
  const table = page.getByTestId('forest-table');
  await expect(table.getByRole('row')).toHaveCount(5);
  await expect(table).toContainText('51,970.84');
});

test('La Tigra modal shows both reported figures and the discrepancy note; Escape closes it', async ({ page }) => {
  await page.goto('./?lang=en#/conservation');
  await page.getByTestId('area-more-tigra').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('17,657 ha');
  await expect(dialog).toContainText('~24,000 ha');
  await expect(dialog).toContainText('~30 %');
  await expect(dialog).toContainText('40 %');
  await expect(dialog.getByTestId('tigra-discrepancy')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('space technology block uses the published snapshot and links to existing routes', async ({ page }) => {
  await page.goto('./?lang=en#/conservation');
  const system = page.getByTestId('cons-system');
  await expect(system).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('cons-period-row').first()).toBeVisible();
  await expect(page.getByTestId('sar-anim-note')).toContainText(/Illustrative animation/);
  await expect(page.getByTestId('cons-to-observatory')).toHaveAttribute('href', '#/observatory');
  await expect(page.getByTestId('cons-to-methodology')).toHaveAttribute('href', '#/methodology');
});

test('participation is demo-only: roles toggle, preview states nothing was sent, no network or storage writes', async ({ page }) => {
  await page.goto('./?lang=en#/conservation');
  await expect(page.getByTestId('cons-demo-banner')).toContainText('Participation prototype — registration and contact services are not yet active.');
  // No personal-data inputs exist.
  const form = page.getByTestId('cons-form');
  await expect(form.locator('input[type=email], input[type=tel], input[type=text], textarea')).toHaveCount(0);

  await page.getByTestId('cons-preview').click();
  await expect(form.getByRole('alert')).toBeVisible();

  const role = page.getByTestId('role-observer');
  await role.click();
  await expect(role).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('role-volunteer').click();
  await page.getByTestId('cons-municipality').selectOption('Santa Lucía');

  const before = await page.evaluate(() => Object.keys(localStorage).length);
  const requests = [];
  page.on('request', (req) => { if (req.method() !== 'GET') requests.push(req.url()); });
  await page.getByTestId('cons-preview').click();
  const summary = page.getByTestId('cons-summary');
  await expect(summary).toContainText('Field Observer, Volunteer');
  await expect(summary).toContainText('Santa Lucía');
  await expect(summary).toContainText(/nothing was sent, saved or shared/);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(before);
  await expect(page.getByTestId('cons-to-community')).toHaveAttribute('href', '#/community');
});

test('references panel lists sources and photo credits', async ({ page }) => {
  await page.goto('./?lang=en#/conservation');
  const refs = page.getByTestId('cons-references');
  await refs.locator('summary').click();
  await expect(refs).toContainText('ICF');
  await expect(refs).toContainText('Chazdon');
  await expect(refs.getByRole('link', { name: /earthdata\.nasa\.gov/ }).first()).toBeVisible();
  const credits = page.getByTestId('cons-image-credits');
  await credits.locator('summary').click();
  await expect(credits).toContainText('CC BY-SA 3.0');
});
