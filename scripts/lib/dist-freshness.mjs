/**
 * Свежесть `dist` относительно исходников — чистый предикат (#2525, спринт
 * stale-dist-turbo-cache-2525, блок b2).
 *
 * ПРЕДМЕТ. `.tsbuildinfo` пакета — манифест сборки: в `fileInfos[i].version` tsc хранит
 * sha256 текста каждого файла программы (замер E10 фазы 1: совпадает с `sha256(text)`
 * побайтно). `tsc -b` сверяет эти версии с исходниками ТОЛЬКО когда исходник новее
 * манифеста по mtime (E2) и на существование dist не смотрит (E7) — потому часы здесь не
 * судья. Судья — содержимое: версия в манифесте против хеша файла на диске.
 *
 * ГРАНИЦА. Предикат видит файлы, которые знает манифест: изменённый или удалённый исходник
 * — находка. Новый файл, которого нет в манифесте, он не видит: если такой файл кем-то
 * импортирован, изменился импортирующий — и это находка; неимпортированный файл в dist
 * и не должен был попасть. Исходы — закрытый список из четырёх; «манифеста нет» и
 * «dist нет» — свои слова, а не `fresh` (правило приборов контура: отсутствие данных ≠
 * данные об отсутствии).
 *
 * Здесь нет `fs` и часов: манифест, хеши и факт наличия dist приходят значениями из
 * `scripts/verify-dist-fresh.mjs`. `node:crypto` — единственный встроенный модуль
 * (детерминированный хеш, как в `sprint-cut/ratification.mjs`).
 */
import { createHash } from 'node:crypto';

/** Исходы. Список закрыт четырьмя. */
export const FRESHNESS = Object.freeze({
  FRESH: 'fresh',
  STALE: 'stale',
  DIST_MISSING: 'dist_missing',
  ABSENT: 'absent',
});

/**
 * Хеш текста так, как его считает tsc: BOM снимается (tsc читает файл без него),
 * переводы строк НЕ нормализуются (CRLF на диске — CRLF в хеше).
 * @param {string} text
 */
export function hashSourceText(text) {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return createHash('sha256').update(clean, 'utf8').digest('hex');
}

const normalizeSlashes = (p) => String(p).replaceAll('\\', '/');

/**
 * Исходники, которые знает манифест: имена (относительно каталога манифеста) и версии.
 * Берутся только файлы под `rootDir` (по умолчанию `./src`), без `node_modules`.
 * `fileInfos[i]` в TS 5.x — объект `{version, signature}`; в старых манифестах — строка версии.
 *
 * @param {{fileNames?: unknown, fileInfos?: unknown}} buildInfo разобранный .tsbuildinfo
 * @param {{rootDir?: string}} [opts]
 * @returns {Array<{name: string, version: string}>}
 */
export function manifestSources(buildInfo, { rootDir = './src' } = {}) {
  const names = Array.isArray(buildInfo?.fileNames) ? buildInfo.fileNames : [];
  const infos = Array.isArray(buildInfo?.fileInfos) ? buildInfo.fileInfos : [];
  const prefix = `${normalizeSlashes(rootDir).replace(/\/+$/u, '')}/`;
  const out = [];
  names.forEach((rawName, i) => {
    const name = normalizeSlashes(rawName);
    if (!name.startsWith(prefix) || name.includes('/node_modules/')) return;
    const info = infos[i];
    const version = typeof info === 'string' ? info : info?.version;
    if (typeof version !== 'string' || version === '') return;
    out.push({ name, version });
  });
  return out;
}

/**
 * Вердикт о свежести dist одного пакета.
 *
 * @param {{
 *   manifest: Array<{name: string, version: string}> | null,
 *   current: Map<string, string | null> | Record<string, string | null>,
 *   distPresent: boolean,
 * }} p
 *   `manifest` — `null`, когда .tsbuildinfo нет или не читается;
 *   `current` — хеш файла на диске по тому же имени, `null` — файла нет;
 *   `distPresent` — объявленная точка входа dist существует.
 * @returns {{state: string, files: Array<{name: string, reason: string}>}}
 */
export function judgeDistFreshness({ manifest, current, distPresent }) {
  if (!Array.isArray(manifest)) return { state: FRESHNESS.ABSENT, files: [] };
  if (!distPresent) return { state: FRESHNESS.DIST_MISSING, files: [] };
  const lookup = current instanceof Map ? (k) => current.get(k) : (k) => current?.[k];
  const files = [];
  for (const { name, version } of manifest) {
    const hash = lookup(name);
    if (hash === undefined) files.push({ name, reason: 'хеш исходника не подан — сравнивать нечем' });
    else if (hash === null) files.push({ name, reason: 'исходник удалён, манифест его ещё знает' });
    else if (hash !== version) files.push({ name, reason: 'содержимое исходника не совпадает с манифестом' });
  }
  return files.length > 0 ? { state: FRESHNESS.STALE, files } : { state: FRESHNESS.FRESH, files: [] };
}

/** Красный ли исход — общий знак для CLI и хуков. */
export const isRed = (state) => state === FRESHNESS.STALE || state === FRESHNESS.DIST_MISSING;
