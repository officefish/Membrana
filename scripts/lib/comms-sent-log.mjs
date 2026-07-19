/**
 * Append-only журнал партнёрских отправок (#585).
 * Путь: docs/comms/sent-log.jsonl (в репо — предикат «ушла ли ласточка»).
 * Не путать с .membrana/swallow-deliveries.jsonl (#664, gitignore, идемпотентность).
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * @param {string} repoRoot
 * @returns {string}
 */
export function defaultSentLogPath(repoRoot) {
  return join(repoRoot, 'docs', 'comms', 'sent-log.jsonl');
}

/**
 * SHA-256 нормализованного текста (trim, LF). Совместим по духу с delivery-key #664.
 * @param {string} text
 */
export function hashSentPayload(text) {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .trim();
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Урезанный office_response — без тела сообщения и токенов.
 * @param {unknown} body
 */
export function redactOfficeResponse(body) {
  if (!body || typeof body !== 'object') return { sent: false };
  const o = /** @type {Record<string, unknown>} */ (body);
  const messageId = o.messageId ?? o.message_id ?? null;
  return {
    sent: o.sent === true,
    ...(messageId != null ? { message_id: messageId } : {}),
  };
}

/**
 * @param {string} logPath
 * @param {{
 *   kind: 'swallow'|'digest',
 *   sha256: string,
 *   file?: string|null,
 *   sent: boolean,
 *   office_response?: Record<string, unknown>,
 *   ts?: string,
 * }} entry
 */
export function appendSentLog(logPath, entry) {
  const dir = dirname(logPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const row = {
    ts: entry.ts ?? new Date().toISOString(),
    kind: entry.kind,
    file: entry.file ?? null,
    sha256: entry.sha256,
    sent: entry.sent === true,
    office_response: entry.office_response ?? { sent: entry.sent === true },
  };
  appendFileSync(logPath, `${JSON.stringify(row)}\n`, 'utf8');
  return row;
}

/**
 * Предикат: есть ли запись с данным sha256 (и опционально kind) и sent=true.
 * @param {string} logPath
 * @param {{ sha256: string, kind?: 'swallow'|'digest' }} q
 */
export function hasSentRecord(logPath, q) {
  if (!existsSync(logPath)) return false;
  const lines = readFileSync(logPath, 'utf8').split(/\n/u).filter(Boolean);
  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row?.sha256 !== q.sha256) continue;
    if (q.kind && row.kind !== q.kind) continue;
    if (row.sent === true) return true;
  }
  return false;
}

/**
 * Относительный путь файла черновика от корня репо (для журнала).
 * @param {string} repoRoot
 * @param {string|null|undefined} absOrRel
 */
export function toRepoRelativeFile(repoRoot, absOrRel) {
  if (!absOrRel) return null;
  const abs = resolve(repoRoot, absOrRel);
  const rel = relative(repoRoot, abs).replaceAll('\\', '/');
  return rel.startsWith('..') ? null : rel;
}
