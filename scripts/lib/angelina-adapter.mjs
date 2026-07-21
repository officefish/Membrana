/**
 * Адаптер Ангелины: строит снимок каскада из живого дерева и кормит им чистое ядро
 * (`angelina-cascade.mjs`). Версия документа = `git log -1` (последний коммит файла),
 * digest = упорядоченный sha256 содержимого. Провенанс читается из заголовка документа.
 *
 * Граница чистоты: git и fs вынесены в инъектируемый `io` (`version`, `content`), поэтому
 * `buildSnapshot` тестируется фейками — без сети и диска. Реальные `io` даёт раннер
 * (`scripts/angelina.mjs`).
 */

import { orderedDigest } from './angelina-cascade.mjs';

/** Digest содержимого документа — детерминированный, от содержимого, не `mtime`. */
export function contentDigest(content) {
  return orderedDigest([content]);
}

/**
 * Провенанс документа читается из строки-заголовка:
 *   `<!-- angelina {"author":"vesnin","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"<sha>","digest":"<hex>"}}} -->`
 * Возвращает `{author, guard, readAt}` или `null`, если заголовка нет / он битый.
 * (`digest` узла адаптер добавляет сам из содержимого — см. `buildSnapshot`.)
 * @param {string} content
 * @returns {{author: string, guard: string, readAt: Record<string,{version?: string, digest?: string}>}|null}
 */
export function parseProvenance(content) {
  const m = String(content ?? '').match(/<!--\s*angelina\s*(\{[\s\S]*?\})\s*-->/u);
  if (!m) return null;
  let obj;
  try {
    obj = JSON.parse(m[1]);
  } catch {
    return null;
  }
  if (typeof obj.author !== 'string' || typeof obj.guard !== 'string') return null;
  return { author: obj.author, guard: obj.guard, readAt: obj.readAt ?? {} };
}

/**
 * Собрать снимок каскада для чистого ядра. `io.version(relPath)` → строка версии или null
 * (файла нет / не в git); `io.content(relPath)` → содержимое или null (файла нет).
 * @param {{nodes: {id: string, path: string}[]}} cascade
 * @param {{version: (p: string) => string|null, content: (p: string) => string|null}} io
 * @returns {Record<string, {version: string|null, digest: string|null, provenance: object|null, readAt: object}>}
 */
export function buildSnapshot(cascade, io) {
  const snapshot = {};
  for (const node of cascade.nodes) {
    const content = io.content(node.path);
    if (content == null) {
      snapshot[node.id] = { version: null, digest: null, provenance: null, readAt: {} };
      continue;
    }
    const digest = contentDigest(content);
    const parsed = parseProvenance(content);
    // Провенанс узла обязан нести digest (M1). Адаптер добавляет digest содержимого к
    // прочитанному заголовку; без заголовка провенанс остаётся null → ядро пометит блок.
    const provenance = parsed ? { ...parsed, digest, readAt: parsed.readAt } : null;
    snapshot[node.id] = {
      version: io.version(node.path),
      digest,
      provenance,
      readAt: parsed?.readAt ?? {},
    };
  }
  return snapshot;
}

/**
 * Реальные io поверх git + fs. Импурная граница — не тестируется юнитом (тесты дают фейки).
 * @param {string} repoRoot
 * @param {{execFileSync: Function, readFileSync: Function, existsSync: Function, join: Function}} deps
 */
export function gitFsIo(repoRoot, deps) {
  const { execFileSync, readFileSync, existsSync, join } = deps;
  return {
    version(relPath) {
      try {
        const out = execFileSync('git', ['log', '-1', '--format=%H', '--', relPath], {
          cwd: repoRoot,
          encoding: 'utf8',
        }).trim();
        return out || null;
      } catch {
        return null;
      }
    },
    content(relPath) {
      const abs = join(repoRoot, relPath);
      if (!existsSync(abs)) return null;
      try {
        return readFileSync(abs, 'utf8');
      } catch {
        return null;
      }
    },
  };
}

/**
 * Сгенерировать строку-заголовок провенанса — обратная к `parseProvenance`. Генератор
 * документа зовёт её, чтобы подписать документ (автор + что прочитал у производителей).
 * `digest` узла НЕ здесь — его считает страж из содержимого (см. `buildSnapshot`).
 * @param {{author: string, guard?: string, readAt?: Record<string, {version?: string|null, digest?: string|null}>}} p
 * @returns {string}
 */
export function provenanceHeader(p) {
  const obj = { author: p.author, guard: p.guard ?? 'angelina', readAt: p.readAt ?? {} };
  return `<!-- angelina ${JSON.stringify(obj)} -->`;
}

/**
 * Что потребитель прочитал у производителя СЕЙЧАС: `{version, digest}`. Генератор кладёт
 * это в `readAt[producer]` в момент чтения — тогда страж свежести совпадёт, пока
 * производителя не тронут после.
 * @param {{version: (p: string) => string|null, content: (p: string) => string|null}} io
 * @param {string} relPath
 * @returns {{version: string|null, digest: string|null}}
 */
export function readEntry(io, relPath) {
  const content = io.content(relPath);
  return { version: io.version(relPath), digest: content == null ? null : contentDigest(content) };
}
