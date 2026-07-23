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
  const m = String(content ?? '').match(/<!--\s*angelina\s+(\{[\s\S]*?\})\s*-->/u);
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
 * Честная ручная чеканка (#999 / DRU-363) — структурированный заголовок:
 *   `<!-- angelina-manual {"author":"human","mintedAt":"2026-07-23","reason":"…"} -->`
 * Опционально `session`. Fallback: свободные HTML-комментарии утра 23.07
 * («Отчеканено РУКАМИ …» + «Причина ручной чеканки: …»), чтобы уже отчеканенные
 * документы не оставались красными «нет провенанса».
 *
 * @param {string} content
 * @returns {{author: string, mintedAt: string, reason: string, session?: string}|null}
 */
export function parseHonestManual(content) {
  const text = String(content ?? '');
  const structured = text.match(/<!--\s*angelina-manual\s+(\{[\s\S]*?\})\s*-->/u);
  if (structured) {
    let obj;
    try {
      obj = JSON.parse(structured[1]);
    } catch {
      return null;
    }
    if (typeof obj.author !== 'string' || typeof obj.mintedAt !== 'string' || typeof obj.reason !== 'string') {
      return null;
    }
    if (!obj.author.trim() || !obj.mintedAt.trim() || !obj.reason.trim()) return null;
    /** @type {{author: string, mintedAt: string, reason: string, session?: string}} */
    const out = {
      author: obj.author.trim(),
      mintedAt: obj.mintedAt.trim(),
      reason: obj.reason.trim(),
    };
    if (typeof obj.session === 'string' && obj.session.trim()) out.session = obj.session.trim();
    return out;
  }

  // Fallback: свободная шапка ручной чеканки (прецедент 2026-07-23).
  const dayHit = text.match(/Отчеканено\s+РУКАМИ\s+(\d{4}-\d{2}-\d{2})/u);
  const reasonHit = text.match(/Причина(?:\s+ручной\s+чеканки)?:\s*([^\n*<]+)/u);
  if (!dayHit || !reasonHit) return null;
  const sessionHit = text.match(/сессия\s+([0-9a-f-]{8,})/iu);
  /** @type {{author: string, mintedAt: string, reason: string, session?: string}} */
  const fallback = {
    author: 'human',
    mintedAt: dayHit[1],
    reason: reasonHit[1].trim(),
  };
  if (sessionHit?.[1]) fallback.session = sessionHit[1];
  return fallback;
}

/**
 * Заголовок честной ручной чеканки — обратная к `parseHonestManual` (structured).
 * @param {{author: string, mintedAt: string, reason: string, session?: string}} p
 * @returns {string}
 */
export function honestManualHeader(p) {
  /** @type {Record<string, string>} */
  const obj = {
    author: p.author,
    mintedAt: p.mintedAt,
    reason: p.reason,
  };
  if (p.session) obj.session = p.session;
  return `<!-- angelina-manual ${JSON.stringify(obj)} -->`;
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
    const manual = parsed ? null : parseHonestManual(content);
    // Машинный заголовок предпочтительнее. Нет его — честная ручная чеканка (#999).
    // Оба отсутствуют → provenance null → ядро блокирует «нет провенанса».
    let provenance = null;
    let readAt = {};
    if (parsed) {
      provenance = { ...parsed, kind: 'machine', digest, readAt: parsed.readAt };
      readAt = parsed.readAt ?? {};
    } else if (manual) {
      provenance = {
        kind: 'honest-manual',
        author: manual.author,
        guard: 'honest-manual',
        mintedAt: manual.mintedAt,
        reason: manual.reason,
        digest,
        readAt: {},
        ...(manual.session ? { session: manual.session } : {}),
      };
    }
    snapshot[node.id] = {
      version: io.version(node.path),
      digest,
      provenance,
      readAt,
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
