// Parser de un subconjunto de Markdown -> AST de bloques e inline.
// Bloques: h(1..4), p, ul, ol, table, quote, img, code, hr, callout(nota|aviso|clave), cards, file, pagebreak.

export function parseInline(src) {
  const out = [];
  const patterns = [
    { re: /`([^`]+)`/, make: (m) => ({ t: 'code', s: m[1] }) },
    { re: /\*\*([^*]+?)\*\*/, make: (m) => ({ t: 'b', c: parseInline(m[1]) }) },
    { re: /(?<![*\w])\*([^*\s][^*]*?)\*(?![*\w])/, make: (m) => ({ t: 'i', c: parseInline(m[1]) }) },
    { re: /\[([^\]]+)\]\(([^)\s]+)\)/, make: (m) => ({ t: 'a', href: m[2], c: parseInline(m[1]) }) },
  ];
  let rest = src;
  while (rest.length) {
    let best = null;
    for (const p of patterns) {
      const m = p.re.exec(rest);
      if (m && (!best || m.index < best.m.index)) best = { p, m };
    }
    if (!best) { out.push({ t: 'text', s: rest }); break; }
    if (best.m.index > 0) out.push({ t: 'text', s: rest.slice(0, best.m.index) });
    out.push(best.p.make(best.m));
    rest = rest.slice(best.m.index + best.m[0].length);
  }
  return out;
}

const splitRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));

export function parseBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = /^(#{1,4})\s+(.+?)\s*$/.exec(line))) { blocks.push({ k: 'h', level: m[1].length, c: parseInline(m[2]), text: m[2] }); i++; continue; }
    if (/^---+\s*$/.test(line)) { blocks.push({ k: 'hr' }); i++; continue; }
    if (/^<!--\s*pagebreak\s*-->/.test(line)) { blocks.push({ k: 'pagebreak' }); i++; continue; }
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; blocks.push({ k: 'code', lines: buf }); continue;
    }
    if ((m = /^:::(\w+)\s*(.*)$/.exec(line))) {
      const kind = m[1]; const arg = m[2].trim();
      if (kind === 'archivo') { blocks.push({ k: 'file', path: arg }); i++; continue; }
      const buf = []; i++;
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      if (kind === 'tarjetas') {
        const items = buf.filter((l) => /^-\s+/.test(l)).map((l) => l.replace(/^-\s+/, '').split('|').map((s) => s.trim()));
        blocks.push({ k: 'cards', items: items.map(([v, label, detail, icon]) => ({ v, label, detail: detail || '', icon: icon || '' })) });
      } else {
        blocks.push({ k: 'callout', kind, title: arg, children: parseBlocks(buf) });
      }
      continue;
    }
    if ((m = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/.exec(line))) { blocks.push({ k: 'img', caption: m[1], src: m[2], alt: m[3] || '' }); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ k: 'quote', children: parseBlocks(buf) }); continue;
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const header = splitRow(line); i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push({ k: 'table', header: header.map(parseInline), rows: rows.map((r) => r.map(parseInline)) }); continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]) )) {
        let text = lines[i].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ''); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) text += ' ' + lines[i++].trim();
        items.push(parseInline(text));
      }
      blocks.push({ k: ordered ? 'ol' : 'ul', items }); continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|:::|```|>|\||!\[|---+\s*$)/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) { buf.push(lines[i++]); }
    blocks.push({ k: 'p', c: parseInline(buf.join(' ')) });
  }
  return blocks;
}

export const inlineText = (nodes) => nodes.map((n) => (n.t === 'text' || n.t === 'code' ? n.s : inlineText(n.c))).join('');
