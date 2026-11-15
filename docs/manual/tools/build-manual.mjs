// Genera HTML, PDF y DOCX del manual de usuario de FOREST_SAR_HN.
// Uso: node docs/manual/tools/build-manual.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseBlocks, inlineText } from './md.mjs';
import { buildDocx, readZip, pngSize } from './docx.mjs';
import { diagramFlujo, diagramArquitectura, diagramAgentes, diagramBarras } from './diagrams.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAN = path.resolve(HERE, '..');
const ROOT = path.resolve(MAN, '..', '..');
// Playwright lives in the local tools folder (not a project dependency); resolved from the repo root.
const PW = pathToFileURL(path.resolve(HERE, '..', '..', '..', '.bosquevivo-tools', 'node_modules', 'playwright', 'index.mjs')).href;
const { chromium } = await import(PW);

const BASE = 'Manual_Usuario_FOREST_SAR_HN';
const META = {
  subtitle: 'Manual de usuario y documentación del proyecto',
  lede: 'Observatorio web de cambios de retrodispersión radar con datos reales de NISAR en una ventana de estudio de Honduras',
  version: '1.0', date: '15 de noviembre de 2026',
  link: '[enlace público pendiente]', team: '[integrantes: completar]',
};
const warnings = []; const errors = [];
const warn = (m) => { warnings.push(m); console.warn('ADVERTENCIA:', m); };

// ---------- datos reales ----------
const snapDir = path.join(ROOT, 'public', 'data');
const idx = JSON.parse(fs.readFileSync(path.join(snapDir, 'snapshots', 'index.json'), 'utf8'));
const comps = [...idx.comparisons].sort((a, b) => a.interval_days - b.interval_days);
const chartData = comps.map((c) => {
  const zf = path.join(snapDir, c.derived_path.replace('derived.json', 'zones.geojson'));
  const zones = JSON.parse(fs.readFileSync(zf, 'utf8')).features.length;
  return { label: `${c.interval_days} d`, initial: `desde ${c.initial_date}`, ha: c.metrics.candidate_area_ha, zones };
});
const expect = { 12: [23, 20], 36: [17, 11], 60: [28, 25], 84: [165, 98] };
comps.forEach((c, i) => { const e = expect[c.interval_days]; if (!e || e[0] !== chartData[i].ha || e[1] !== chartData[i].zones) warn(`Las cifras del manual para ${c.interval_days} d no coinciden con los datos (${chartData[i].ha} ha, ${chartData[i].zones} zonas)`); });

// ---------- diagramas ----------
fs.mkdirSync(path.join(MAN, 'diagramas'), { recursive: true });
const svgs = { 'flujo-general': diagramFlujo(), 'arquitectura': diagramArquitectura(), 'agentes': diagramAgentes(), 'resultados-barras': diagramBarras(chartData) };
for (const [n, s] of Object.entries(svgs)) fs.writeFileSync(path.join(MAN, 'diagramas', `${n}.svg`), s);

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const pg = await ctx.newPage();
for (const [n, s] of Object.entries(svgs)) {
  await pg.setContent(`<body style="margin:0;background:#fff">${s}</body>`);
  await (await pg.$('svg')).screenshot({ path: path.join(MAN, 'diagramas', `${n}.png`) });
}
const logoSvg = fs.readFileSync(path.join(MAN, 'assets', 'logo.svg'), 'utf8');
await pg.setContent(`<body style="margin:0;background:transparent"><div style="width:240px;height:240px">${logoSvg.replace(/width="160" height="160"/, 'width="240" height="240"')}</div></body>`);
await (await pg.$('svg')).screenshot({ path: path.join(MAN, 'assets', 'logo.png'), omitBackground: true, scale: 'device' });

// ---------- markdown ----------
const mdFile = path.join(MAN, `${BASE}.md`);
const mdSrc = fs.readFileSync(mdFile, 'utf8').replace(/\r\n/g, '\n');
const blocks = parseBlocks(mdSrc.split('\n'));

const missing = new Set();
// Capturas: los PNG originales (2x) se conservan como evidencia; para HTML/PDF/DOCX se usan copias JPEG
// reducidas (máx. OPT_MAX_W px, calidad OPT_Q) en capturas/optimizadas/, para que el PDF pueda verse en la web.
const OPT_MAX_W = 1600, OPT_Q = 78;
const optDir = path.join(MAN, 'capturas', 'optimizadas');
fs.mkdirSync(optDir, { recursive: true });
const optCache = new Map();
const optPage = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
async function optimize(src) {
  if (!/^capturas\/[^/]+\.png$/.test(src)) return null;
  const f = path.join(MAN, src); const { w, h } = pngSize(f);
  const k = Math.min(1, OPT_MAX_W / w); const W = Math.round(w * k), Hh = Math.round(h * k);
  const name = path.basename(src, '.png') + '.jpg'; const out = path.join(optDir, name);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(f).mtimeMs) {
    await optPage.setViewportSize({ width: W, height: Hh });
    await optPage.setContent(`<body style="margin:0"><img style="display:block;width:${W}px;height:${Hh}px" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></body>`);
    await optPage.waitForFunction(() => document.images[0].complete);
    await optPage.screenshot({ path: out, type: 'jpeg', quality: OPT_Q, clip: { x: 0, y: 0, width: W, height: Hh } });
  }
  return { file: out, rel: 'capturas/optimizadas/' + name, size: { w: W, h: Hh } };
}
for (const m of fs.readFileSync(path.join(MAN, `${BASE}.md`), 'utf8').matchAll(/\]\((capturas\/[^)\s]+\.png)/g)) {
  if (fs.existsSync(path.join(MAN, m[1])) && !optCache.has(m[1])) optCache.set(m[1], await optimize(m[1]));
}
const resolveImg = (src) => {
  if (optCache.get(src)) return optCache.get(src);
  const f = path.join(MAN, src);
  if (!fs.existsSync(f)) return null;
  return { file: f, rel: src, size: pngSize(f) };
};
// Contenido de archivos de muestra (:::archivo)
const csvFallback = (p) => {
  if (/zonas/.test(p)) {
    const c = comps.find((x) => x.interval_days === 84) || comps[comps.length - 1];
    const z = JSON.parse(fs.readFileSync(path.join(snapDir, c.derived_path.replace('derived.json', 'zones.geojson')), 'utf8')).features.slice(0, 3).map((f) => f.properties);
    const cls = (d) => (d >= 3 ? 'increase' : d > -3 ? 'stable' : d > -4.5 ? 'moderate' : d > -6 ? 'strong' : 'veryStrong');
    return ['zone_id,localidad,distancia_km,area_ha,cell_count,mean_delta_db,min_delta_db,clase,centroid_lat,centroid_lon,initial_date,final_date,snapshot_id',
      ...z.map((p2) => [p2.zone_id, p2.nearest_place?.name ?? '', p2.nearest_place?.distance_km ?? '', p2.area_ha, p2.cell_count, p2.mean_delta_db.toFixed(3), p2.min_delta_db.toFixed(3), cls(p2.mean_delta_db), p2.centroid[0], p2.centroid[1], c.initial_date, c.final_date, c.snapshot_id].join(','))];
  }
  return ['observation_id,type,sector_id,region_id,pair_id,initial_date,final_date,source,candidate_area_ha,candidate_pct,valid_area_ha,coverage_pct,center_lat,center_lon,evidence_level,limitations'];
};
const attachFiles = (bl) => bl.forEach((b) => {
  if (b.k === 'file') {
    const f = path.join(MAN, b.path);
    if (fs.existsSync(f)) b.lines = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).slice(0, 5).map((l) => (l.length > 150 ? l.slice(0, 147) + '…' : l));
    else { b.lines = csvFallback(b.path).map((l) => (l.length > 150 ? l.slice(0, 147) + '…' : l)); warn(`Muestra ${b.path} no existe; se usa una muestra generada de los datos reales`); }
  }
  if (b.children) attachFiles(b.children);
});
attachFiles(blocks);

// ---------- HTML ----------
const ICONS = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  warn: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v5M12 17.5v.01"/>',
  key: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3Z"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z"/><path d="M9 4v14M15 6v14"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M2 13l10 5 10-5M2 17.5l10 5 10-5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14c2.5 0 4.3 2 4.3 5"/>',
  book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V4ZM20 4h-7v16a2 2 0 0 1 2-2h5V4Z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  sat: '<rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><path d="M4 4l4 4M16 16l4 4M20 4l-4 4M8 16l-4 4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.info}</svg>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inlH = (nodes) => nodes.map((n) => {
  if (n.t === 'text') return esc(n.s);
  if (n.t === 'code') return `<code>${esc(n.s)}</code>`;
  if (n.t === 'b') return `<strong>${inlH(n.c)}</strong>`;
  if (n.t === 'i') return `<em>${inlH(n.c)}</em>`;
  if (n.t === 'a') return `<a href="${esc(n.href)}">${inlH(n.c)}</a>`;
  return '';
}).join('');

const slugs = new Map(); const toc = [];
const slug = (t) => { let s = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'sec'; const n = (slugs.get(s) || 0) + 1; slugs.set(s, n); return n > 1 ? `${s}-${n}` : s; };
let figH = 0;
const renderH = (bl) => bl.map((b) => {
  switch (b.k) {
    case 'h': { const id = slug(inlineText(b.c)); if (b.level <= 2) toc.push({ level: b.level, id, text: inlineText(b.c) }); return `<h${b.level} id="${id}">${inlH(b.c)}</h${b.level}>`; }
    case 'p': return `<p>${inlH(b.c)}</p>`;
    case 'ul': return `<ul>${b.items.map((i) => `<li>${inlH(i)}</li>`).join('')}</ul>`;
    case 'ol': return `<ol>${b.items.map((i) => `<li>${inlH(i)}</li>`).join('')}</ol>`;
    case 'hr': return '';
    case 'pagebreak': return '<div class="pb"></div>';
    case 'code': return `<pre><code>${esc(b.lines.join('\n'))}</code></pre>`;
    case 'file': return `<pre class="sample"><code>${esc((b.lines || []).join('\n'))}</code></pre>`;
    case 'quote': return `<blockquote>${renderH(b.children)}</blockquote>`;
    case 'img': {
      figH++; const cap = b.caption.replace(/^Figura\s+\d+\.\s*/, ''); const r = resolveImg(b.src);
      if (!r) { missing.add(b.src); return `<figure class="fig pending"><div class="pend-box">${icon('info')}<strong>Captura pendiente</strong><span>${esc(b.src)}</span></div><figcaption><b>Figura ${figH}.</b> ${esc(cap)}</figcaption></figure>`; }
      const tall = r.size.h / r.size.w > 1.2;
      return `<figure class="fig${tall ? ' tall' : ''}"><img src="${esc(r.rel)}" alt="${esc(b.alt || cap)}" width="${r.size.w}" height="${r.size.h}"><figcaption><b>Figura ${figH}.</b> ${esc(cap)}</figcaption></figure>`;
    }
    case 'callout': {
      const ic = b.kind === 'aviso' ? 'warn' : b.kind === 'clave' ? 'key' : 'info';
      const label = b.title || (b.kind === 'aviso' ? 'Importante' : b.kind === 'clave' ? 'Idea clave' : 'Nota');
      return `<aside class="callout ${b.kind}">${icon(ic)}<div><div class="ct">${esc(label)}</div>${renderH(b.children)}</div></aside>`;
    }
    case 'cards': return `<div class="cards">${b.items.map((c) => `<div class="card">${c.icon ? icon(c.icon) : ''}<div class="cv">${esc(c.v)}</div><div class="cl">${esc(c.label)}</div>${c.detail ? `<div class="cd">${esc(c.detail)}</div>` : ''}</div>`).join('')}</div>`;
    case 'table': return `<div class="tw"><table><thead><tr>${b.header.map((h) => `<th>${inlH(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${b.header.map((_, i) => `<td>${inlH(r[i] || [])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    default: return '';
  }
}).join('\n');
const bodyHtml = renderH(blocks);
const tocHtml = (() => {
  let out = '<ol class="toc">'; let open = false;
  toc.forEach((t) => {
    if (t.level === 1) { if (open) out += '</ul></li>'; out += `<li class="t1"><a href="#${t.id}">${esc(t.text)}</a><ul>`; open = true; }
    else out += `<li class="t2"><a href="#${t.id}">${esc(t.text)}</a></li>`;
  });
  return out + (open ? '</ul></li>' : '') + '</ol>';
})();
const logoTile = `<span class="logo-tile">${logoSvg.replace(/ width="160" height="160"/, '')}</span>`;

const CSS = `
:root{--forest:#102820;--moss:#52796f;--lime:#a3d977;--paper:#f5f5f0;--ink:#1b2b25;--line:#c9d3cb;--mag:#d6007a;--mono:'JetBrains Mono',Consolas,'Courier New',monospace;--sans:'Inter Tight','Inter','Segoe UI',Arial,sans-serif}
@page{size:A4;margin:22mm 18mm 20mm}
@page :first{margin:0}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:var(--ink);font:10pt/1.5 var(--sans)}
.topbar{display:none}
.cover{background:var(--forest);color:#fff;min-height:297mm;width:100%;padding:26mm 22mm;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page;position:relative;overflow:hidden}
.cover::before{content:"";position:absolute;right:-60mm;top:-40mm;width:170mm;height:170mm;border-radius:50%;background:radial-gradient(circle,rgba(163,217,119,.28),rgba(163,217,119,0) 68%)}
.cover::after{content:"";position:absolute;left:-30mm;bottom:-50mm;width:150mm;height:150mm;border-radius:50%;border:1px solid rgba(163,217,119,.35);box-shadow:0 0 0 14mm rgba(82,121,111,.12)}
.cover>*{position:relative;z-index:1}
.logo-tile{display:inline-flex;width:34mm;height:34mm;background:var(--paper);border-radius:7mm;align-items:center;justify-content:center}
.logo-tile svg{width:24mm;height:24mm}
.kicker{font:500 9pt var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--lime)}
.cover h1{break-before:auto;font:700 40pt/1.05 var(--sans);margin:6mm 0 4mm;border:0;padding:0;color:#fff;page-break-before:auto}
.cover .sub{font-size:17pt;color:#d9e8dc;margin:0 0 8mm}
.cover .lede{max-width:130mm;color:#b9cfc3;font-size:11.5pt}
.cover .meta{display:grid;grid-template-columns:auto 1fr;gap:2mm 8mm;font-size:10.5pt;border-top:1px solid rgba(163,217,119,.4);padding-top:6mm}
.cover .meta b{font:500 8.5pt var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--lime);align-self:center}
.page{max-width:840px;margin:0 auto;padding:0 20px}
h1,h2,h3,h4{font-family:var(--sans);color:var(--forest);line-height:1.2;break-after:avoid}
h1{font-size:23pt;margin:12mm 0 5mm;padding-bottom:3mm;border-bottom:3px solid var(--lime)}
.toc-wrap h1{margin-top:0}
h2{font-size:15pt;margin:8mm 0 3mm}
h3{font-size:12pt;margin:6mm 0 2mm;color:var(--moss)}
h4{font-size:10.5pt;margin:4mm 0 1mm}
p{margin:0 0 3mm;orphans:3;widows:3}
a{color:#1f6f5c;text-decoration:underline;text-underline-offset:2px}
code{font:9pt var(--mono);background:#e9efe9;padding:.5px 4px;border-radius:3px}
pre{background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--moss);padding:3mm;overflow:auto;white-space:pre-wrap;word-break:break-all;margin:0 0 4mm;break-inside:avoid}
pre code{background:none;padding:0;font-size:7.8pt}
ul,ol{margin:0 0 3mm;padding-left:6mm}li{margin-bottom:1mm}
blockquote{margin:0 0 4mm;padding:1mm 4mm;border-left:4px solid var(--lime);color:#33463e;font-style:italic}
.tw{margin:0 0 4mm;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:9pt}
th{background:var(--forest);color:#fff;text-align:left;padding:2mm 2.5mm;font-weight:600}
td{padding:1.8mm 2.5mm;border-bottom:1px solid var(--line);vertical-align:top}
tr:nth-child(even) td{background:var(--paper)}tr{break-inside:avoid}
thead{display:table-header-group}
.callout{display:flex;gap:3mm;padding:3.5mm 4mm;margin:0 0 4mm;border-radius:4px;border-left:5px solid var(--moss);background:#eef3ee;break-inside:avoid}
.callout .ic{flex:none;width:6mm;height:6mm;margin-top:.5mm;stroke:var(--moss)}
.callout.aviso{border-color:var(--mag);background:#fcebf3}.callout.aviso .ic{stroke:var(--mag)}
.callout.clave{border-color:var(--forest);background:#e6f2d9}.callout.clave .ic{stroke:var(--forest)}
.callout .ct{font-weight:700;color:var(--forest);margin-bottom:1mm}.callout p:last-child,.callout ul:last-child{margin-bottom:0}
.ic{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:0 0 5mm;break-inside:avoid}
.card{background:var(--paper);border:1px solid var(--line);border-top:4px solid var(--lime);border-radius:4px;padding:3mm}
.card .ic{width:5.5mm;height:5.5mm;color:var(--moss);margin-bottom:1mm}
.cv{font:700 21pt/1.1 var(--sans);color:var(--forest)}.cl{font-weight:600;font-size:9.5pt;margin-top:1mm}.cd{font-size:8pt;color:var(--moss);margin-top:1mm}
figure.fig{margin:0 0 5mm;text-align:center;break-inside:avoid}
figure.fig img{max-width:100%;height:auto;max-height:70mm;border:1px solid var(--line);border-radius:4px;object-fit:contain}
figure.fig.tall img{max-height:88mm}
figcaption{font-size:8.8pt;color:var(--moss);margin-top:1.5mm}
.pend-box{display:flex;flex-direction:column;align-items:center;gap:1mm;padding:9mm 4mm;border:2px dashed #b9770e;background:#fff6e5;color:#7a4b00;border-radius:4px}
.pend-box .ic{width:7mm;height:7mm}.pend-box span{font:8.5pt var(--mono)}
.pb{break-after:page}
.toc-wrap{break-after:page;page-break-after:always}
ol.toc{list-style:none;padding:0;margin:0;column-count:2;column-gap:10mm;font-size:9.5pt}
ol.toc li.t1{break-inside:avoid;margin:0 0 3mm}ol.toc li.t1>a{font-weight:700;color:var(--forest);text-decoration:none;display:block;border-bottom:1px solid var(--lime);padding-bottom:.5mm;margin-bottom:1mm}
ol.toc ul{list-style:none;padding-left:3mm;margin:0}ol.toc li.t2{margin:0;font-size:8.8pt}ol.toc li.t2 a{text-decoration:none;color:#33463e}
.endmark{margin-top:10mm;font:8.5pt var(--mono);color:var(--moss);border-top:1px solid var(--line);padding-top:3mm}
@media screen{
 body{background:#eef1ec}.cover{min-height:100vh;padding:14vh 10vw}
 .topbar{display:flex;justify-content:space-between;position:sticky;top:0;z-index:5;background:rgba(245,245,240,.95);border-bottom:1px solid var(--line);padding:10px 24px;font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--moss);backdrop-filter:blur(8px)}
 .page{background:#fff;padding:36px 48px;margin:24px auto;box-shadow:0 2px 20px rgba(16,40,32,.08)}
 h1{margin-top:60px}.toc-wrap h1{margin-top:0}
}
@media (max-width:700px){.cards{grid-template-columns:repeat(2,1fr)}ol.toc{column-count:1}.page{padding:20px 16px}}
`;
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FOREST_SAR_HN — Manual de usuario</title><style>${CSS}</style></head><body>
<div class="topbar"><span>FOREST_SAR_HN · Manual de usuario</span><span>v${META.version} · ${META.date}</span></div>
<section class="cover" aria-label="Portada"><div>${logoTile}</div>
<div><div class="kicker">Prototipo exploratorio · NISAR L-band · Honduras</div><h1>FOREST_SAR_HN</h1><p class="sub">${esc(META.subtitle)}</p><p class="lede">${esc(META.lede)}</p></div>
<div class="meta"><b>Versión</b><span>${META.version}</span><b>Fecha</b><span>${META.date}</span><b>Enlace público</b><span>${esc(META.link)}</span><b>Equipo</b><span>${esc(META.team)}</span></div></section>
<main class="page"><section class="toc-wrap"><h1 id="indice">Índice</h1>${tocHtml}</section>
${bodyHtml}
<p class="endmark">FOREST_SAR_HN · Manual de usuario v${META.version} · ${META.date} · Prototipo exploratorio, no es un servicio oficial de alertas.</p></main></body></html>`;
const htmlFile = path.join(MAN, `${BASE}.html`);
fs.writeFileSync(htmlFile, html);

// ---------- PDF ----------
const pdfFile = path.join(MAN, `${BASE}.pdf`);
const pg2 = await ctx.newPage();
await pg2.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
await pg2.evaluate(() => document.fonts.ready);
await pg2.emulateMedia({ media: 'print' });
await pg2.pdf({
  path: pdfFile, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
  headerTemplate: `<div style="font-size:8px;width:100%;padding:0 18mm;color:#52796f;display:flex;justify-content:space-between;font-family:Arial,sans-serif"><span>FOREST_SAR_HN · Manual de usuario</span><span>v${META.version} · ${META.date}</span></div>`,
  footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#52796f;font-family:Arial,sans-serif">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`,
});

// ---------- DOCX ----------
const docxFile = path.join(MAN, `${BASE}.docx`);
const prepared = parseBlocks(mdSrc.split('\n')); attachFiles(prepared);
const missingDocx = new Set();
const logoPng = path.join(MAN, 'assets', 'logo.png');
fs.writeFileSync(docxFile, buildDocx({ blocks: prepared, meta: META, resolveImage: resolveImg, logoPng: { file: logoPng, size: pngSize(logoPng) }, onMissing: (s) => missingDocx.add(s) }));

// ---------- validación ----------
const pdfBuf = fs.readFileSync(pdfFile);
if (pdfBuf.subarray(0, 4).toString() !== '%PDF') errors.push('El PDF no empieza por %PDF');
const pages = (pdfBuf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
let zip;
try { zip = readZip(fs.readFileSync(docxFile)); if (!zip.has('word/document.xml')) errors.push('DOCX sin word/document.xml'); } catch (e) { errors.push(`DOCX inválido: ${e.message}`); }
if (zip) {
  const xmls = [...zip.entries()].filter(([n]) => /\.(xml|rels)$/.test(n)).map(([n, b]) => [n, b.toString('utf8')]);
  const bad = await pg2.evaluate((list) => list.filter(([, t]) => new DOMParser().parseFromString(t, 'application/xml').querySelector('parsererror')).map(([n]) => n), xmls);
  if (bad.length) errors.push(`XML mal formado en el DOCX: ${bad.join(', ')}`);
  const rel = zip.get('word/_rels/document.xml.rels').toString('utf8');
  for (const m of rel.matchAll(/Target="(media\/[^"]+)"/g)) if (!zip.has(`word/${m[1]}`)) errors.push(`DOCX: falta ${m[1]}`);
}
for (const m of mdSrc.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) if (!fs.existsSync(path.join(MAN, m[1])) && !missing.has(m[1])) missing.add(m[1]);
const imgRefs = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
for (const r of imgRefs) if (!fs.existsSync(path.join(MAN, r))) errors.push(`Imagen referenciada inexistente: ${r}`);
if (missing.size) warn(`Capturas pendientes (${missing.size}): ${[...missing].join(', ')}`);
const SECRETS = [/EARTHDATA_TOKEN\s*=/, /Bearer\s+[A-Za-z0-9._-]{8,}/, /C:\\Users/i, /C:\/Users/i];
const texts = [['html', html], ['md', mdSrc]];
if (zip) for (const [n, b] of zip) if (/\.xml$/.test(n)) texts.push([`docx:${n}`, b.toString('utf8')]);
texts.push(['pdf(bytes)', pdfBuf.toString('latin1')]);
for (const [n, t] of texts) for (const re of SECRETS) if (re.test(t)) errors.push(`Posible secreto/ruta local (${re}) en ${n}`);

await browser.close();
console.log(`HTML: ${htmlFile}\nPDF:  ${pdfFile} (${pages} páginas, ${(pdfBuf.length / 1024).toFixed(0)} KB)\nDOCX: ${docxFile} (${(fs.statSync(docxFile).size / 1024).toFixed(0)} KB)`);
console.log(`Advertencias: ${warnings.length}; errores: ${errors.length}`);
errors.forEach((e) => console.error('ERROR:', e));
if (!errors.length) {
  // The site serves the manual from Metodología (modal + download): keep public/manual in sync.
  const pub = path.join(ROOT, 'public', 'manual');
  fs.mkdirSync(pub, { recursive: true });
  fs.copyFileSync(pdfFile, path.join(pub, path.basename(pdfFile)));
  console.log(`Copiado al sitio: public/manual/${path.basename(pdfFile)}`);
}
process.exit(errors.length ? 1 : 0);
