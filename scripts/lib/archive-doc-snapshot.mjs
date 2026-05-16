/**
 * Общие утилиты снимка markdown-артефактов в docs/archive/.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {Date} [date] */
export function isoStampForFilename(date = new Date()) {
  return date.toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

/**
 * @param {string} dir
 * @param {string} prefix e.g. "DAILY_CODE_REVIEW-"
 * @param {string} [ext]
 */
export function newestFileInDir(dir, prefix, ext = '.md') {
  if (!existsSync(dir)) {
    return null;
  }
  const names = readdirSync(dir).filter((n) => n.startsWith(prefix) && n.endsWith(ext));
  if (names.length === 0) {
    return null;
  }
  let bestPath = null;
  let bestMtime = -Infinity;
  for (const n of names) {
    const p = join(dir, n);
    const m = statSync(p).mtimeMs;
    if (m >= bestMtime) {
      bestMtime = m;
      bestPath = p;
    }
  }
  return bestPath;
}

/**
 * @param {string} dir
 * @param {string} baseName e.g. "DAILY_CODE_REVIEW-2026-05-16T12-00-00-000Z.md"
 */
export function allocateUniquePath(dir, baseName) {
  let candidate = join(dir, baseName);
  if (!existsSync(candidate)) {
    return candidate;
  }
  const dot = baseName.lastIndexOf('.');
  const stem = dot >= 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot >= 0 ? baseName.slice(dot) : '';
  for (let n = 2; n < 10_000; n++) {
    candidate = join(dir, `${stem}_${n}${ext}`);
    if (!existsSync(candidate)) {
      return candidate;
    }
  }
  return join(dir, `${stem}-${process.hrtime.bigint()}${ext}`);
}

/**
 * @param {string} sourcePath
 * @param {string} destPath
 * @param {boolean} force
 * @returns {'copied' | 'skipped-identical' | 'missing'}
 */
export function copyIfChanged(sourcePath, destPath, force) {
  if (!existsSync(sourcePath)) {
    return 'missing';
  }
  mkdirSync(join(destPath, '..'), { recursive: true });
  if (!force && existsSync(destPath)) {
    const srcBuf = readFileSync(sourcePath);
    const prevBuf = readFileSync(destPath);
    if (srcBuf.length === prevBuf.length && Buffer.compare(srcBuf, prevBuf) === 0) {
      return 'skipped-identical';
    }
  }
  copyFileSync(sourcePath, destPath);
  return 'copied';
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractIsoDates(text) {
  const found = new Set();
  const patterns = [
    /<!--\s*Сгенерировано:\s*(\d{4}-\d{2}-\d{2})T/i,
    />\s*\*\*Дата:\*\*\s*(\d{4}-\d{2}-\d{2})/i,
    /\*\*(\d{4}-\d{2}-\d{2})\*\*\s*·/,
    /Membrana\s*\((\d{4}-\d{2}-\d{2})\)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      found.add(m[1]);
    }
  }
  return [...found];
}

/**
 * Выбирает ключ папки YYYY-MM-DD по содержимому утренних артефактов.
 * @param {{ label: string, content: string }[]} parts
 * @param {() => string} fallbackDayKey
 */
export function resolveDayKey(parts, fallbackDayKey) {
  const counts = new Map();
  for (const { content } of parts) {
    for (const d of extractIsoDates(content)) {
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
  }
  if (counts.size === 0) {
    return fallbackDayKey();
  }
  let best = null;
  let bestCount = -1;
  for (const [d, c] of counts) {
    if (c > bestCount || (c === bestCount && d > best)) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/**
 * @param {string} archiveRoot e.g. docs/archive/daily-day
 * @param {string} dayKey YYYY-MM-DD
 */
export function allocateBundleDir(archiveRoot, dayKey) {
  const primary = join(archiveRoot, dayKey);
  if (!existsSync(primary)) {
    return primary;
  }
  const stamp = isoStampForFilename().replace(/T.*/, '').length
    ? isoStampForFilename().split('T')[1]?.slice(0, 8)
    : '';
  const fine = `${dayKey}T${isoStampForFilename().replace(`${dayKey}T`, '')}`;
  const alt = join(archiveRoot, fine.replace(/[^\d-]/g, (ch) => (ch === 'T' ? 'T' : '-')));
  if (!existsSync(alt)) {
    return join(archiveRoot, `${dayKey}_${isoStampForFilename().slice(11, 19)}`);
  }
  for (let n = 2; n < 10_000; n++) {
    const candidate = join(archiveRoot, `${dayKey}_${n}`);
    if (!existsSync(candidate)) {
      return candidate;
    }
  }
  return join(archiveRoot, `${dayKey}_${process.hrtime.bigint()}`);
}

/** @param {string} bundleDir */
export function bundleFileIdentical(bundleDir, archiveName, sourcePath) {
  const dest = join(bundleDir, archiveName);
  if (!existsSync(sourcePath) || !existsSync(dest)) {
    return false;
  }
  const a = readFileSync(sourcePath);
  const b = readFileSync(dest);
  return a.length === b.length && Buffer.compare(a, b) === 0;
}

/**
 * @param {string} bundleDir
 * @param {{ archivedAt: string, dayKey: string, command: string, files: object[] }} manifest
 */
export function writeManifest(bundleDir, manifest) {
  writeFileSync(join(bundleDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
