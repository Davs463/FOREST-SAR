// Generador DOCX (OOXML escrito a mano) y zip propio.
import zlib from 'node:zlib';
import fs from 'node:fs';
import { inlineText } from './md.mjs';

export function makeZip(files) {
  const parts = []; const central = []; let offset = 0;
  const dt = new Date(); const time = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1);
  const date = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
  for (const [name, data] of files) {
    const nameBuf = Buffer.from(name, 'utf8'); const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const comp = zlib.deflateRawSync(raw); const crc = zlib.crc32(raw);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(raw.length, 22);
    h.writeUInt16LE(nameBuf.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nameBuf, comp);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(raw.length, 24);
    c.writeUInt16LE(nameBuf.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, nameBuf);
    offset += h.length + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, e]);
}

export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('No es un zip');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); const out = new Map();
  for (let k = 0; k < n; k++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl);
    const lnl = buf.readUInt16LE(lo + 26), lel = buf.readUInt16LE(lo + 28); const start = lo + 30 + lnl + lel;
    const data = buf.subarray(start, start + csize);
    out.set(name, method === 8 ? zlib.inflateRawSync(data) : data);
    p += 46 + nl + el + cl;
  }
  return out;
}

export const pngSize = (file) => { const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const X = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GREEN = '102820', MOSS = '52796f';

export function buildDocx({ blocks, meta, resolveImage, logoPng, onMissing }) {
  const media = []; const rels = []; let relN = 10; let imgN = 0; let docPr = 1;
  const addRel = (type, target, ext) => { const id = `rId${relN++}`; rels.push(`<Relationship Id="${id}" Type="${type}" Target="${X(target)}"${ext ? ' TargetMode="External"' : ''}/>`); return id; };
  const nums = []; // numIds for ordered lists
  let nextNum = 3;

  const run = (text, f = {}) => {
    const rpr = `${f.style ? `<w:rStyle w:val="${f.style}"/>` : ''}${f.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : ''}${f.b ? '<w:b/>' : ''}${f.i ? '<w:i/>' : ''}${f.color ? `<w:color w:val="${f.color}"/>` : ''}${f.size ? `<w:sz w:val="${f.size}"/>` : ''}`;
    return `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}<w:t xml:space="preserve">${X(text)}</w:t></w:r>`;
  };
  const inl = (nodes, f = {}) => nodes.map((n) => {
    if (n.t === 'text') return run(n.s, f);
    if (n.t === 'code') return run(n.s, { ...f, code: true, size: f.size ? f.size - 2 : 19 });
    if (n.t === 'b') return inl(n.c, { ...f, b: true });
    if (n.t === 'i') return inl(n.c, { ...f, i: true });
    if (n.t === 'a') {
      if (/^https?:/.test(n.href)) { const id = addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', n.href, true); return `<w:hyperlink r:id="${id}">${inl(n.c, { ...f, style: 'Hyperlink' })}</w:hyperlink>`; }
      return inl(n.c, f);
    }
    return '';
  }).join('');
  const para = (inner, { style, jc, before, after, keep, shade, ind } = {}) =>
    `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${keep ? '<w:keepNext/>' : ''}${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ''}${before != null || after != null ? `<w:spacing${before != null ? ` w:before="${before}"` : ''}${after != null ? ` w:after="${after}"` : ''}/>` : ''}${ind ? `<w:ind w:left="${ind}"/>` : ''}${jc ? `<w:jc w:val="${jc}"/>` : ''}</w:pPr>${inner}</w:p>`;

  const drawing = (file, size, maxW, maxH) => {
    const ext = /.jpe?g$/i.test(file) ? 'jpg' : 'png';
    const id = addRel('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image', `media/image${++imgN}.${ext}`);
    media.push([`word/media/image${imgN}.${ext}`, fs.readFileSync(file)]);
    let w = size.w * 9525, h = size.h * 9525; const k = Math.min(maxW / w, maxH / h); w = Math.round(w * k); h = Math.round(h * k);
    const n = docPr++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${w}" cy="${h}"/><wp:docPr id="${n}" name="Imagen ${n}" descr="${X(file.split(/[\\/]/).pop())}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="image${imgN}.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  };

  const borders = (c, sz = 4) => ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="single" w:sz="${sz}" w:space="0" w:color="${c}"/>`).join('');
  const cell = (inner, w, { fill, borderL } = {}) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}${borderL ? `<w:tcBorders><w:left w:val="single" w:sz="36" w:space="0" w:color="${borderL}"/></w:tcBorders>` : ''}</w:tcPr>${inner}</w:tc>`;
  const TOTAL = 9638; // ancho útil en dxa (A4, márgenes 2 cm)

  let figN = 0; let bodyXml = '';
  const render = (bl, ctx = {}) => bl.map((b) => {
    switch (b.k) {
      case 'h': return b.level === 1 && b.cover ? '' : para(inl(b.c), { style: `Heading${Math.min(b.level, 3)}`, keep: true });
      case 'p': return para(inl(b.c, ctx.f), { style: ctx.pstyle });
      case 'ul': return b.items.map((it) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${inl(it)}</w:p>`).join('');
      case 'ol': { const id = nextNum++; nums.push(id); return b.items.map((it) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${id}"/></w:numPr></w:pPr>${inl(it)}</w:p>`).join(''); }
      case 'hr': return '';
      case 'pagebreak': return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      case 'code': return b.lines.map((l) => para(run(l || ' ', { code: true, size: 17 }), { style: 'CodeBlock' })).join('');
      case 'file': return b.lines ? b.lines.map((l) => para(run(l || ' ', { code: true, size: 16 }), { style: 'CodeBlock' })).join('') : '';
      case 'quote': return render(b.children, { pstyle: 'Quote' });
      case 'img': {
        figN++; const cap = b.caption.replace(/^Figura\s+\d+\.\s*/, '');
        const r = resolveImage(b.src);
        let inner;
        if (r) inner = para(drawing(r.file, r.size, 5760000, 4300000), { jc: 'center', keep: true, after: 60 });
        else { onMissing?.(b.src); inner = para(run(`Captura pendiente: ${b.src}`, { i: true, color: '8a5a00' }), { style: 'Pending' }); }
        return inner + para(run(`Figura ${figN}. `, { b: true }) + run(cap), { style: 'Caption' });
      }
      case 'callout': {
        const col = b.kind === 'aviso' ? 'D6007A' : b.kind === 'clave' ? GREEN : MOSS; const fill = b.kind === 'aviso' ? 'FCEAF3' : b.kind === 'clave' ? 'E3F1D5' : 'EEF3EE';
        const label = b.title || (b.kind === 'aviso' ? 'Importante' : b.kind === 'clave' ? 'Idea clave' : 'Nota');
        const inner = para(run(label, { b: true, color: col }), { after: 40, keep: true }) + render(b.children, {});
        return `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${TOTAL}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(inner, TOTAL, { fill, borderL: col })}</w:tr></w:tbl>${para('', { after: 60 })}`;
      }
      case 'cards': {
        let out = '';
        for (let i = 0; i < b.items.length; i += 4) {
          const row = b.items.slice(i, i + 4); const w = Math.floor(TOTAL / 4);
          const cells = row.map((c) => cell(para(run(c.v, { b: true, color: GREEN, size: 44 }), { after: 0 }) + para(run(c.label, { b: true }), { after: 20 }) + (c.detail ? para(run(c.detail, { color: MOSS, size: 17 }), { after: 0 }) : ''), w, { fill: 'F5F5F0' })).join('');
          out += `<w:tbl><w:tblPr><w:tblW w:w="${w * 4}" w:type="dxa"/><w:tblBorders>${borders('FFFFFF', 18)}</w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${row.map(() => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr></w:tbl>`;
        }
        return out + para('', { after: 60 });
      }
      case 'table': {
        const nc = b.header.length;
        const lens = b.header.map((h, c) => Math.max(10, Math.min(60, Math.max(inlineText(h).length, ...b.rows.map((r) => inlineText(r[c] || []).length * 0.7)))));
        const sum = lens.reduce((a, v) => a + v, 0); const ws = lens.map((l) => Math.max(900, Math.round((l / sum) * TOTAL)));
        const head = `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${b.header.map((h, c) => cell(para(inl(h, { b: true, color: 'FFFFFF', size: 19 }), { style: 'TableText' }), ws[c], { fill: GREEN })).join('')}</w:tr>`;
        const body = b.rows.map((r, ri) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${Array.from({ length: nc }, (_, c) => cell(para(inl(r[c] || [], { size: 19 }), { style: 'TableText' }), ws[c], { fill: ri % 2 ? 'F5F5F0' : undefined })).join('')}</w:tr>`).join('');
        return `<w:tbl><w:tblPr><w:tblW w:w="${TOTAL}" w:type="dxa"/><w:tblBorders>${borders('C9D3CB')}</w:tblBorders><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${ws.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${head}${body}</w:tbl>${para('', { after: 80 })}`;
      }
      default: return '';
    }
  }).join('');

  // Portada
  const cover = para(drawing(logoPng.file, logoPng.size, 1400000, 1400000), { jc: 'center', before: 1800, after: 400 })
    + para(run('FOREST_SAR_HN'), { style: 'Title' })
    + para(run(meta.subtitle), { style: 'Subtitle' })
    + para(run(meta.lede, { color: MOSS }), { jc: 'center', before: 300 })
    + para(run(`Versión ${meta.version} · ${meta.date}`, { b: true }), { jc: 'center', before: 1600 })
    + para(run(`Enlace público: ${meta.link}`), { jc: 'center' })
    + para(run(`Equipo: ${meta.team}`), { jc: 'center' })
    + '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  const tocBlock = para(run('Índice'), { style: 'TOCHeading' })
    + `<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run('Pulse F9 (o acepte la actualización al abrir) para generar el índice.', { i: true, color: MOSS })}<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>`;
  bodyXml = cover + tocBlock + render(blocks);

  const sect = `<w:sectPr><w:headerReference w:type="default" r:id="rId3"/><w:headerReference w:type="first" r:id="rId5"/><w:footerReference w:type="default" r:id="rId4"/><w:footerReference w:type="first" r:id="rId6"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1134" w:bottom="1304" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/><w:titlePg/></w:sectPr>`;
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const document = `${H}<w:document ${NS}><w:body>${bodyXml}${sect}</w:body></w:document>`;

  const hf = (tag, inner) => `${H}<w:${tag} ${NS}>${inner}</w:${tag}>`;
  const header1 = hf('hdr', para(run(`FOREST_SAR_HN · Manual de usuario`, { color: MOSS, size: 17 }) + '<w:r><w:tab/></w:r>' + run(`${meta.version} · ${meta.date}`, { color: MOSS, size: 17 }), { style: 'Header' }));
  const footer1 = hf('ftr', para(run('Página ', { color: MOSS, size: 17 }) + `<w:r><w:rPr><w:color w:val="${MOSS}"/><w:sz w:val="17"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="17"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${run('1', { size: 17, color: MOSS })}<w:r><w:fldChar w:fldCharType="end"/></w:r>`, { style: 'Footer', jc: 'center' }));
  const empty = (tag) => hf(tag, '<w:p/>');

  const lvl = (fmt, text, font) => `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="567" w:hanging="283"/></w:pPr>${font ? `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:hint="default"/></w:rPr>` : ''}</w:lvl>`;
  const numbering = `${H}<w:numbering ${NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${lvl('bullet', '•', 'Calibri')}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvl('decimal', '%1.')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>${nums.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;

  const pst = (id, name, { based = 'Normal', next, ppr = '', rpr = '', q = true } = {}) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="${based}"/>${next ? `<w:next w:val="${next}"/>` : ''}${q ? '<w:qFormat/>' : ''}<w:pPr>${ppr}</w:pPr><w:rPr>${rpr}</w:rPr></w:style>`;
  const styles = `${H}<w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="es-HN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:color w:val="1B2B25"/></w:rPr></w:style>
<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
${pst('Title', 'Title', { next: 'Subtitle', ppr: '<w:jc w:val="center"/><w:spacing w:after="120"/>', rpr: `<w:b/><w:color w:val="${GREEN}"/><w:sz w:val="68"/>` })}
${pst('Subtitle', 'Subtitle', { ppr: '<w:jc w:val="center"/>', rpr: `<w:color w:val="${MOSS}"/><w:sz w:val="32"/>` })}
${pst('Heading1', 'heading 1', { next: 'Normal', ppr: '<w:keepNext/><w:pageBreakBefore/><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="A3D977"/></w:pBdr><w:spacing w:before="0" w:after="240"/><w:outlineLvl w:val="0"/>', rpr: `<w:b/><w:color w:val="${GREEN}"/><w:sz w:val="40"/>` })}
${pst('Heading2', 'heading 2', { next: 'Normal', ppr: '<w:keepNext/><w:spacing w:before="320" w:after="100"/><w:outlineLvl w:val="1"/>', rpr: `<w:b/><w:color w:val="${GREEN}"/><w:sz w:val="30"/>` })}
${pst('Heading3', 'heading 3', { next: 'Normal', ppr: '<w:keepNext/><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="2"/>', rpr: `<w:b/><w:color w:val="${GREEN}"/><w:sz w:val="25"/>` })}
${pst('TOCHeading', 'TOC Heading', { ppr: '<w:spacing w:after="240"/>', rpr: `<w:b/><w:color w:val="${GREEN}"/><w:sz w:val="40"/>` })}
${pst('TOC1', 'toc 1', { q: false, ppr: '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9638"/></w:tabs><w:spacing w:before="100" w:after="20"/>', rpr: '<w:b/>' })}
${pst('TOC2', 'toc 2', { q: false, ppr: '<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9638"/></w:tabs><w:spacing w:after="0"/><w:ind w:left="284"/>', rpr: '<w:sz w:val="20"/>' })}
${pst('Caption', 'caption', { next: 'Normal', ppr: '<w:spacing w:after="200"/><w:jc w:val="center"/>', rpr: `<w:i/><w:color w:val="${MOSS}"/><w:sz w:val="18"/>` })}
${pst('Quote', 'Quote', { ppr: `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="A3D977"/></w:pBdr><w:ind w:left="284"/>`, rpr: '<w:i/>' })}
${pst('ListParagraph', 'List Paragraph', { ppr: '<w:spacing w:after="60"/><w:contextualSpacing w:val="0"/>' })}
${pst('TableText', 'Table Text', { ppr: '<w:spacing w:after="0" w:line="252" w:lineRule="auto"/>', rpr: '<w:sz w:val="19"/>' })}
${pst('CodeBlock', 'Code Block', { ppr: '<w:shd w:val="clear" w:color="auto" w:fill="EEF3EE"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/>', rpr: '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="17"/>' })}
${pst('Pending', 'Pending Figure', { ppr: '<w:pBdr><w:top w:val="dashed" w:sz="8" w:space="12" w:color="B9770E"/><w:left w:val="dashed" w:sz="8" w:space="8" w:color="B9770E"/><w:bottom w:val="dashed" w:sz="8" w:space="12" w:color="B9770E"/><w:right w:val="dashed" w:sz="8" w:space="8" w:color="B9770E"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="FFF6E5"/><w:jc w:val="center"/><w:spacing w:before="200" w:after="100"/>' })}
${pst('Header', 'header', { q: false, ppr: `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="4" w:color="C9D3CB"/></w:pBdr><w:tabs><w:tab w:val="right" w:pos="9638"/></w:tabs><w:spacing w:after="0"/>` })}
${pst('Footer', 'footer', { q: false, ppr: '<w:spacing w:after="0"/>' })}
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="1F6F5C"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="ForestTable"><w:name w:val="Forest Table"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders>${borders('C9D3CB')}</w:tblBorders></w:tblPr></w:style>
</w:styles>`;
  const settings = `${H}<w:settings ${NS}><w:updateFields w:val="true"/><w:defaultTabStop w:val="708"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  const ct = `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>${[1, 2].map((n) => `<Override PartName="/word/header${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rootRels = `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const docRels = `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="${R}/header" Target="header1.xml"/><Relationship Id="rId4" Type="${R}/footer" Target="footer1.xml"/><Relationship Id="rId5" Type="${R}/header" Target="header2.xml"/><Relationship Id="rId6" Type="${R}/footer" Target="footer2.xml"/><Relationship Id="rId7" Type="${R}/settings" Target="settings.xml"/>${rels.join('')}</Relationships>`;
  const core = `${H}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>FOREST_SAR_HN - Manual de usuario</dc:title><dc:creator>Equipo FOREST_SAR_HN</dc:creator><dc:language>es</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">2026-11-15T12:00:00Z</dcterms:created></cp:coreProperties>`;

  return makeZip([
    ['[Content_Types].xml', ct], ['_rels/.rels', rootRels], ['docProps/core.xml', core],
    ['word/document.xml', document], ['word/_rels/document.xml.rels', docRels], ['word/styles.xml', styles], ['word/numbering.xml', numbering], ['word/settings.xml', settings],
    ['word/header1.xml', header1], ['word/footer1.xml', footer1], ['word/header2.xml', empty('hdr')], ['word/footer2.xml', empty('ftr')],
    ...media,
  ]);
}
