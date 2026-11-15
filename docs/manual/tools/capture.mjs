// Genera las capturas del manual desde el build local (vite preview en 127.0.0.1:4173).
// Uso (desde la raiz del repo): node docs/manual/tools/capture.mjs
// Playwright lives in the local tools folder (not a project dependency); resolved from the repo root.
const { chromium } = await import(new URL('../../../.bosquevivo-tools/node_modules/playwright/index.mjs', import.meta.url).href);
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('docs/manual/capturas');
const BASE = 'http://127.0.0.1:4173/';
const DSF = Number(process.env.DSF ?? 2);
await mkdir(OUT, { recursive: true });
const notes = [];
const done = [];
const wait = (p, ms = 3500) => p.waitForTimeout(ms);

const browser = await chromium.launch({ channel: 'chrome' });
const mk = async (w, h) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DSF, reducedMotion: 'reduce', locale: 'es-HN' });
  return { ctx, page: await ctx.newPage() };
};
const go = async (page, route, lang = 'es') => { await page.goto(`${BASE}?lang=${lang}#${route}`); await wait(page, 3500); };
const step = async (name, fn) => { try { await fn(); done.push(name); } catch (e) { notes.push(`${name}: ${String(e.message).split('\n')[0]}`); console.log('FALLO', name, e.message.split('\n')[0]); } };
const shot = (page, f, opts = {}) => page.screenshot({ path: path.join(OUT, f), ...opts });
const lshot = (loc, f) => loc.screenshot({ path: path.join(OUT, f) });
const mapEl = (page) => page.getByTestId('obs-map');
const toStep2 = (page) => page.evaluate(() => window.scrollTo(0, document.querySelector('#obs-step-2').getBoundingClientRect().top + window.scrollY - 10));
const bigZone = (page) => page.evaluate(async () => {
  const idx = await (await fetch('./data/snapshots/index.json')).json();
  const n = [...idx.comparisons].sort((a, b) => b.final_date.localeCompare(a.final_date));
  const c = n.find((x) => x.interval_days >= 80 && x.interval_days <= 100) ?? n[0];
  const h = await (await fetch(`./data/${c.derived_path}`)).json();
  const g = await (await fetch(`./data/${h.files.zones}`)).json();
  return g.features.map((f) => ({ id: f.properties.zone_id, a: f.properties.area_ha })).sort((a, b) => b.a - a.a)[0];
});

const { ctx, page } = await mk(1440, 900);

await step('01', async () => { await go(page, '/'); await shot(page, '01-inicio.png'); });
await step('02', async () => { await go(page, '/observatory'); await shot(page, '02-observatorio.png', { fullPage: true }); });

await go(page, '/observatory');
await step('03', async () => { await lshot(page.locator('#obs-step-1'), '03-periodos.png'); });
await step('04', async () => {
  await page.getByTestId('period-shortcuts').getByRole('button').nth(3).click(); await wait(page);
  console.log('pair:', await page.getByTestId('pair-dates').innerText());
  await toStep2(page); await wait(page, 2500);
  await shot(page, '04-comparacion-84d.png');
});
await step('05', async () => { await lshot(mapEl(page), '05-agrupaciones.png'); });

await step('06', async () => {
  const z = await bigZone(page);
  console.log('mayor zona', z);
  await page.getByTestId('zone-select').selectOption(z.id); await wait(page, 4000);
  await toStep2(page); await wait(page, 800);
  await shot(page, '06-zona-seleccionada.png');
  await page.getByTestId('back-to-window').first().click(); await wait(page, 3000);
});

await step('06c', async () => {
  // "Ver mapa en grande": same Leaflet map in a near full-screen dialog.
  await go(page, '/observatory');
  await page.getByTestId('map-expand').click(); await wait(page, 3000);
  await shot(page, '06c-mapa-ampliado.png');
  await page.keyboard.press('Escape'); await wait(page, 800);
});

await step('07', async () => {
  await toStep2(page);
  const input = page.getByTestId('place-input'); await input.fill('Tegu'); await wait(page, 1000);
  await shot(page, '07-busqueda-localidad.png');
  await input.press('ArrowDown'); await input.press('Enter'); await wait(page, 4000);
  await shot(page, '07b-busqueda-resultado.png');
  await input.press('Escape'); await wait(page, 1500);
});

await step('08', async () => {
  await page.getByTestId('basemap-relief').click(); await wait(page, 4000); await shot(page, '08-mapa-relieve.png');
  await page.getByTestId('basemap-osm').click(); await wait(page, 4000); await shot(page, '08b-mapa-osm.png');
  await page.getByTestId('basemap-satellite').click(); await wait(page, 2000);
});
await step('08c', async () => {
  await go(page, '/observatory');
  const btns = page.getByTestId('period-shortcuts').getByRole('button');
  const btn = page.getByTestId('basemap-gibs-nisar-gcov');
  let ok = false;
  // NASA layers live in the "Capas NASA" popover: open it before checking each period's coverage.
  const openNasa = async () => { if (!(await btn.isVisible())) { await page.getByTestId('nasa-menu').click(); await wait(page, 400); } };
  for (let i = 0; i < await btns.count(); i++) {
    await btns.nth(i).click(); await wait(page, 1500);
    await openNasa();
    if (await btn.isEnabled()) { ok = true; break; }
  }
  if (!ok) throw new Error('NISAR GIBS sin cobertura en ningun periodo');
  console.log('periodo NASA', await page.getByTestId('pair-dates').innerText());
  await btn.click(); await wait(page, 6000);
  await toStep2(page); await wait(page, 500);
  await shot(page, '08c-capa-nasa.png');
});

await step('09', async () => {
  await go(page, '/observatory'); await page.getByTestId('period-shortcuts').getByRole('button').nth(3).click(); await wait(page, 3000);
  await lshot(page.locator('#obs-step-3'), '09-indicadores.png');
});

await step('10', async () => {
  await toStep2(page);
  const z = await bigZone(page);
  await page.getByTestId('zone-select').selectOption(z.id); await wait(page, 4000);
  for (let i = 0; i < 6; i++) {
    const zoom = Number(await mapEl(page).getAttribute('data-zoom'));
    if (zoom >= 14) break;
    await page.locator('.leaflet-control-zoom-in').click(); await wait(page, 1200);
  }
  await wait(page, 3500);
  await page.getByTestId('basemap-satellite').click(); await wait(page, 3500);
  await page.getByTestId('intensity-legend').evaluate((e) => e.scrollIntoView({ block: 'end' })); await wait(page, 800);
  console.log('zoom', await mapEl(page).getAttribute('data-zoom'), 'leyenda', await page.getByTestId('intensity-legend').count());
  await shot(page, '10-semaforo-radar.png');
});

await step('11', async () => {
  await go(page, '/analytics'); await shot(page, '11-analytics.png');
  const g = page.locator('[data-testid^="chart-"]').first();
  await g.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -20)); await wait(page, 1000);
  await shot(page, '11b-analytics-graficos.png');
});
await step('12', async () => {
  const tl = page.getByTestId('timeline'); await tl.scrollIntoViewIfNeeded();
  await tl.locator('.an-mark.is-used').first().click(); await wait(page, 800);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-testid=timeline]').getBoundingClientRect().top + window.scrollY - 20)); await wait(page, 500);
  await shot(page, '12-linea-tiempo.png');
});

await step('13', async () => {
  await go(page, '/observations');
  const groups = await page.evaluate(async () => {
    const idx = await (await fetch('./data/snapshots/index.json')).json();
    const n = [...idx.comparisons].sort((a, b) => b.final_date.localeCompare(a.final_date));
    const c = n.find((x) => x.interval_days >= 80 && x.interval_days <= 100) ?? n[0];
    const h = await (await fetch(`./data/${c.derived_path}`)).json();
    const g = await (await fetch(`./data/${h.files.zones}`)).json();
    const m = new Map(); for (const f of g.features) { const k = f.properties.nearest_place?.name; if (!k) continue; m.set(k, (m.get(k) ?? 0) + f.properties.area_ha); }
    return [...m].sort((a, b) => b[1] - a[1]);
  });
  console.log('mayor localidad', groups[0]);
  const cb = page.getByTestId('obs-place-combobox'); await cb.fill(groups[0][0]); await page.getByTestId('obs-place-option').first().click(); await wait(page, 1500);
  await page.getByTestId('obs-item').first().click(); await wait(page, 2500);
  await shot(page, '13-observaciones.png', { fullPage: true });
});
await step('14', async () => {
  await go(page, '/observations');
  await page.getByTestId('obs-period').getByRole('button').last().click(); await wait(page, 1500);
  console.log('periodo', await page.getByTestId('obs-period').getByRole('button', { pressed: true }).innerText());
  const [d1] = await Promise.all([page.waitForEvent('download'), page.getByTestId('csv-zones').click()]);
  const [d2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('csv-sectors').click()]);
  for (const [d, f] of [[d1, '14-csv-zonas-muestra.txt'], [d2, '14-csv-sectores-muestra.txt']]) {
    const body = (await readFile(await d.path(), 'utf8')).replace(/^\uFEFF/, '');
    await writeFile(path.join(OUT, f), body.split(/\r?\n/).slice(0, 6).join('\n') + '\n');
  }
  console.log(d1.suggestedFilename(), d2.suggestedFilename());
  await page.locator('.obs-downloads').scrollIntoViewIfNeeded(); await wait(page, 500);
  await shot(page, '14-descarga-csv.png');
});

await step('15', async () => { await go(page, '/community'); await shot(page, '15-comunidad.png'); });
await step('16', async () => { await go(page, '/library'); await shot(page, '16-biblioteca.png'); });
await step('17', async () => {
  await go(page, '/methodology'); await shot(page, '17-metodologia.png');
  const lg = page.getByTestId('method-legend'); await lg.scrollIntoViewIfNeeded(); await wait(page, 1500); await lshot(lg, '17b-metodologia-leyenda.png');
  const tr = page.getByTestId('method-transparency'); await tr.scrollIntoViewIfNeeded(); await tr.locator('summary').first().click(); await wait(page, 1500);
  await lshot(tr, '17c-metodologia-transparencia.png');
});
await step('19', async () => { await go(page, '/data'); await shot(page, '19-datos-tecnicos.png'); });
await step('20', async () => { await go(page, '/observatory', 'en'); await shot(page, '20-idioma-en.png'); });
await ctx.close();

const m = await mk(390, 844);
await step('18', async () => {
  await go(m.page, '/observatory');
  await m.page.evaluate(() => window.scrollTo(0, document.querySelector('.leaflet-container').getBoundingClientRect().top + window.scrollY - 60)); await wait(m.page, 3000);
  await shot(m.page, '18-movil-observatorio.png');
  await go(m.page, '/analytics'); await shot(m.page, '18b-movil-analytics.png');
});
await m.ctx.close();
await browser.close();
console.log('OK:', done.join(' '), '\nNOTAS:', notes);
