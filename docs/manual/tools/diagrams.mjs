// Generadores de diagramas SVG propios (paleta del sitio).
const C = { forest: '#102820', moss: '#52796f', lime: '#a3d977', paper: '#f5f5f0', line: '#c9d3cb', ink: '#1b2b25', mag: '#d6007a' };
const FONT = "font-family=\"'Inter Tight','Inter','Segoe UI',Arial,sans-serif\"";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${FONT}>
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="${C.moss}"/></marker></defs>
<rect width="${w}" height="${h}" fill="#ffffff"/>${body}</svg>`;

function lines(text, x, y, size, fill, weight = 400, lh = 1.25, anchor = 'middle') {
  return String(text).split('\n').map((t, i) => `<text x="${x}" y="${y + i * size * lh}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`).join('');
}
function box(x, y, w, h, n, title, sub, style = 'light') {
  const dark = style === 'dark', accent = style === 'accent';
  const fill = dark ? C.forest : accent ? C.lime : C.paper;
  const tc = dark ? '#ffffff' : C.forest; const sc = dark ? '#cfe3d4' : C.moss;
  const nTxt = n ? `<circle cx="${x + 26}" cy="${y + 26}" r="15" fill="${dark ? C.lime : C.forest}"/><text x="${x + 26}" y="${y + 32}" font-size="16" font-weight="700" text-anchor="middle" fill="${dark ? C.forest : '#fff'}">${n}</text>` : '';
  const tl = title.split('\n').length;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${C.forest}" stroke-width="1.6"/>${nTxt}`
    + lines(title, x + w / 2, y + (n ? 68 : 40), 21, tc, 700) + lines(sub, x + w / 2, y + (n ? 68 : 40) + tl * 26 + 8, 15, sc, 400, 1.3);
}
const arrow = (d) => `<path d="${d}" fill="none" stroke="${C.moss}" stroke-width="2.4" marker-end="url(#ar)"/>`;

export function diagramFlujo() {
  const W = 1000, bw = 280, bh = 150, gx = 60, x0 = 20, y1 = 30, y2 = 250;
  const xs = [x0, x0 + bw + gx, x0 + 2 * (bw + gx)];
  const b = [
    ['1', 'NASA / NISAR', 'Radar de banda L, escenas GCOV\npublicadas por NASA y ASF DAAC', 'light'],
    ['2', 'Selección de\nobservaciones', 'Catálogo CMR: parejas de escenas\ncompatibles (misma órbita)', 'light'],
    ['3', 'Procesamiento\nFOREST-SAR', 'Motor Python: máscara, multilook\n10×10, diferencia en dB', 'accent'],
    ['4', 'Detección de\ncambios', 'Celdas de 1 ha con caída ≥ 3 dB\n→ zonas candidatas', 'accent'],
    ['5', 'Observatorio\ninteractivo', 'Mapas, indicadores, evolución\ny descargas CSV', 'dark'],
    ['6', 'Interpretación y\nparticipación comunitaria', 'Contrastar con otras fuentes\ny con conocimiento local', 'dark'],
  ];
  let s = '';
  b.forEach((it, i) => {
    const row = i < 3 ? 0 : 1; const col = i < 3 ? i : i - 3;
    s += box(xs[col], row ? y2 : y1, bw, bh + 20, it[0], it[1], it[2], it[3]);
  });
  s += arrow(`M${xs[0] + bw} ${y1 + 85} H${xs[1] - 4}`) + arrow(`M${xs[1] + bw} ${y1 + 85} H${xs[2] - 4}`);
  s += arrow(`M${xs[2] + bw / 2} ${y1 + bh + 20} V${y1 + bh + 55} H${xs[0] + bw / 2} V${y2 - 4}`);
  s += arrow(`M${xs[0] + bw} ${y2 + 85} H${xs[1] - 4}`) + arrow(`M${xs[1] + bw} ${y2 + 85} H${xs[2] - 4}`);
  return wrap(W, 450, s);
}

export function diagramArquitectura() {
  const W = 1000, bw = 280, bh = 170, gx = 60, x0 = 20, y1 = 60, y2 = 290;
  const xs = [x0, x0 + bw + gx, x0 + 2 * (bw + gx)];
  let s = `<text x="20" y="34" font-size="15" font-weight="700" fill="${C.moss}">EN EL COMPUTADOR DEL EQUIPO (con red y credenciales)  →  ARCHIVOS ESTÁTICOS</text>`;
  s += box(xs[0], y1, bw, bh, '', 'Fuentes NASA', 'Earthdata: CMR (catálogo),\nHarmony (recorte), ASF DAAC', 'light');
  s += box(xs[1], y1, bw, bh, '', 'Motor Python', 'scientific-engine/: earthaccess,\nrasterio, numpy, shapely', 'accent');
  s += box(xs[2], y1, bw, bh, '', 'Archivos científicos\nversionados', 'public/data/snapshots:\nJSON, GeoJSON, PNG', 'accent');
  s += `<text x="20" y="${y2 - 18}" font-size="15" font-weight="700" fill="${C.moss}">EN EL NAVEGADOR DEL USUARIO (sin cuenta, sin credenciales, sin backend)</text>`;
  s += box(xs[0], y2, bw, bh, '', 'Frontend React', 'React 19 + TypeScript + Vite;\nLeaflet para los mapas', 'light');
  s += box(xs[1], y2, bw, bh, '', 'Mapas y Analytics', 'Observatorio, Evolución,\nObservaciones, Datos técnicos', 'dark');
  s += box(xs[2], y2, bw, bh, '', 'Usuario', 'Persona de la comunidad,\ndocente, técnico o evaluador', 'dark');
  s += arrow(`M${xs[0] + bw} ${y1 + 85} H${xs[1] - 4}`) + arrow(`M${xs[1] + bw} ${y1 + 85} H${xs[2] - 4}`);
  s += arrow(`M${xs[2] + bw / 2} ${y1 + bh} V${y1 + bh + 20} H${xs[0] + bw / 2} V${y2 - 40}`.replace(`V${y2 - 40}`, `V${y2 - 32}`));
  s += arrow(`M${xs[0] + bw} ${y2 + 85} H${xs[1] - 4}`) + arrow(`M${xs[1] + bw} ${y2 + 85} H${xs[2] - 4}`);
  return wrap(W, 500, s);
}

export function diagramAgentes() {
  const W = 1000; let s = '';
  s += box(300, 20, 400, 110, '', 'Coordinador (Claude Opus 5.5)', 'Planifica por lotes, delega,\nintegra y decide', 'dark');
  const ag = [
    [20, 'Agentes Sonnet 5.5', 'Arquitecto · Constructor · Detective\nCrítico · Optimizador · Escudo\n(diseño, código, depuración, revisión, pruebas)'],
    [350, 'Haiku 5.5: documentación', 'Narrador: README, manuales,\nregistro de cambios'],
    [680, 'Relevo: OpenAI Codex', 'Continuidad autorizada cuando el\ncoordinador no estaba disponible'],
  ];
  ag.forEach(([x, t, sub]) => { s += box(x, 210, 300, 150, '', t, sub, 'light'); });
  s += box(120, 440, 760, 90, '', 'Documentación compartida: PROGRESS.md · HANDOFF.md · CODEX_RELEVO.md', 'Estado real, comandos ejecutados, bloqueos y pendientes', 'accent');
  s += box(300, 600, 400, 90, '', 'Revisión humana del equipo', 'Valida afirmaciones científicas y decide publicar', 'dark');
  [170, 500, 830].forEach((x) => { s += arrow(`M${x} 210 V200 H500 V134`.replace('V200', 'V176')); });
  [170, 500, 830].forEach((x) => { s += arrow(`M${x} 360 V${436}`); });
  s += arrow(`M500 530 V596`);
  return wrap(W, 720, s);
}

export function diagramBarras(data) {
  // data: [{label, ha, zones}]
  const W = 1000, H = 470; const pad = { l: 60, t: 70, b: 80 };
  const panel = (x0, pw, title, key, unit, color) => {
    const max = Math.max(...data.map((d) => d[key]));
    const top = Math.ceil(max / 20) * 20 || 10; const ph = H - pad.t - pad.b;
    let g = `<text x="${x0}" y="40" font-size="20" font-weight="700" fill="${C.forest}">${esc(title)}</text>`;
    for (let k = 0; k <= 4; k++) {
      const v = (top * k) / 4; const y = pad.t + ph - (v / top) * ph;
      g += `<line x1="${x0}" x2="${x0 + pw}" y1="${y}" y2="${y}" stroke="${C.line}" stroke-width="1"/><text x="${x0 - 8}" y="${y + 5}" font-size="14" text-anchor="end" fill="${C.moss}">${v}</text>`;
    }
    const bw = pw / data.length;
    data.forEach((d, i) => {
      const h = (d[key] / top) * ph; const x = x0 + i * bw + bw * 0.18; const w = bw * 0.64; const y = pad.t + ph - h;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${color}"/>`;
      g += `<text x="${x + w / 2}" y="${y - 8}" font-size="17" font-weight="700" text-anchor="middle" fill="${C.forest}">${d[key]}${unit}</text>`;
      g += `<text x="${x + w / 2}" y="${pad.t + ph + 26}" font-size="16" text-anchor="middle" fill="${C.ink}">${esc(d.label)}</text>`;
      g += `<text x="${x + w / 2}" y="${pad.t + ph + 46}" font-size="13" text-anchor="middle" fill="${C.moss}">${esc(d.initial)}</text>`;
    });
    return g;
  };
  let s = panel(70, 400, 'Hectáreas candidatas por período', 'ha', ' ha', C.moss);
  s += panel(550, 400, 'Zonas candidatas por período', 'zones', '', C.lime);
  s += `<text x="20" y="${H - 8}" font-size="13" fill="${C.moss}">Todas las comparaciones terminan el 2026-10-19; los períodos se solapan y no se pueden sumar. Fuente: public/data/snapshots.</text>`;
  return wrap(W, H, s);
}
