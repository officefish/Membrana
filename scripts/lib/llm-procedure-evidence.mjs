/**
 * Evidence helpers for LPC usage events (llm-calls-house W3).
 * Hashes bodies in memory — never put raw prompt/response on the event.
 */
import { createHash } from 'node:crypto';

/**
 * @param {string | undefined | null} text
 * @returns {{ sha256: string | null; bytes: number | null }}
 */
export function hashUtf8Body(text) {
  if (text == null) return { sha256: null, bytes: null };
  const buf = Buffer.from(String(text), 'utf8');
  return {
    sha256: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  };
}

/**
 * @param {{
 *   promptText?: string | null;
 *   responseText?: string | null;
 *   params?: Record<string, unknown> | null;
 *   attemptIndex?: number;
 *   chainLen?: number;
 *   providerRequestId?: string | null;
 * }} args
 */
export function buildEvidenceFields(args = {}) {
  const prompt = hashUtf8Body(args.promptText);
  const response = hashUtf8Body(args.responseText);
  /** @type {Record<string, unknown>} */
  const out = {};
  if (prompt.sha256) {
    out.promptSha256 = prompt.sha256;
    out.promptBytes = prompt.bytes;
  }
  if (response.sha256) {
    out.responseSha256 = response.sha256;
    out.responseBytes = response.bytes;
  }
  if (args.params && typeof args.params === 'object' && !Array.isArray(args.params)) {
    out.params = { ...args.params };
  }
  if (typeof args.attemptIndex === 'number' && Number.isFinite(args.attemptIndex)) {
    out.attemptIndex = args.attemptIndex;
  }
  if (typeof args.chainLen === 'number' && Number.isFinite(args.chainLen)) {
    out.chainLen = args.chainLen;
  }
  if (typeof args.providerRequestId === 'string' && args.providerRequestId.trim()) {
    out.providerRequestId = args.providerRequestId.trim();
  }
  return out;
}
