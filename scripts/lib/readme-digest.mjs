import { existsSync, readFileSync } from 'node:fs';

/** H1 и первый прозаический абзац README; физические переносы абзац не обрывают. */
export function readReadmeDigest(path) {
  if (!path || !existsSync(path)) return { title: null, summary: null };
  const lines = readFileSync(path, 'utf8').split(/\r?\n/u);
  let title = null;
  const paragraph = [];
  let collecting = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }
    if (collecting && line === '') break;
    if (collecting) {
      paragraph.push(line);
      continue;
    }
    if (!line || line.startsWith('#') || line.startsWith('>') || line.startsWith('<!--') || line.startsWith('```') || line.startsWith('|') || line.startsWith('- ')) continue;
    paragraph.push(line);
    collecting = true;
  }
  const summary = paragraph.length > 0
    ? paragraph.join(' ').replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1').replace(/\s+/gu, ' ').trim()
    : null;
  return { title, summary };
}
