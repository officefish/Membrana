/**
 * Клиентский ledger доставок ласточки (swallow-delivery-idempotency).
 * Office /ally-message stateless — ключ идемпотентности живёт локально.
 *
 * Статусы: delivered | unknown | failed
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const SWALLOW_EXIT_UNKNOWN = 3;

/** @param {string} text */
export function computeDeliveryKey(text) {
  const normalized = String(text ?? '').trim().replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * @param {string} repoRoot
 * @returns {string}
 */
export function defaultLedgerPath(repoRoot) {
  return join(repoRoot, '.membrana', 'swallow-deliveries.jsonl');
}

/**
 * @param {string} ledgerPath
 * @returns {{key:string,status:string,at:string,messageId?:string|null,error?:string}[]}
 */
export function loadLedger(ledgerPath) {
  if (!existsSync(ledgerPath)) return [];
  const lines = readFileSync(ledgerPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch {
      // битая строка — пропускаем, не роняем отправку
    }
  }
  return rows;
}

/**
 * Последняя запись по ключу побеждает.
 * @param {string} ledgerPath
 * @param {string} key
 */
export function latestStatus(ledgerPath, key) {
  const rows = loadLedger(ledgerPath).filter((r) => r.key === key);
  return rows.length ? rows[rows.length - 1] : null;
}

/**
 * @param {string} ledgerPath
 * @param {{key:string,status:'delivered'|'unknown'|'failed',messageId?:string|null,error?:string}} entry
 */
export function recordDelivery(ledgerPath, entry) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  const row = {
    key: entry.key,
    status: entry.status,
    at: new Date().toISOString(),
    messageId: entry.messageId ?? null,
    error: entry.error ?? null,
  };
  appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, 'utf8');
  return row;
}
