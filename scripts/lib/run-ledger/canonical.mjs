/**
 * Deterministic canonical form for procedure run records (run-ledger).
 * LF line endings, UTF-8 NFC, sorted object keys — no clocks or randomness inside.
 */

import { createHash } from 'node:crypto';

/**
 * Normalize string fields: NFC + CRLF/CR → LF.
 * @param {string} s
 * @returns {string}
 */
export function normalizeString(s) {
  return String(s).replace(/\r\n?/g, '\n').normalize('NFC');
}

/**
 * Recursively canonicalize a JSON-serializable value.
 * @param {unknown} value
 * @returns {unknown}
 */
export function canonicalizeValue(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') return normalizeString(value);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }
  const obj = /** @type {Record<string, unknown>} */ (value);
  const keys = Object.keys(obj).sort();
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of keys) {
    out[key] = canonicalizeValue(obj[key]);
  }
  return out;
}

/**
 * Canonical UTF-8 bytes for a run record object.
 * @param {Record<string, unknown>} run
 * @returns {Buffer}
 */
export function canonicalBytes(run) {
  const normalized = canonicalizeValue(run);
  const json = JSON.stringify(normalized);
  return Buffer.from(json, 'utf8');
}

/**
 * sha256 hex digest of canonical run form.
 * @param {Record<string, unknown>} run
 * @returns {string}
 */
export function leafHash(run) {
  return createHash('sha256').update(canonicalBytes(run)).digest('hex');
}
