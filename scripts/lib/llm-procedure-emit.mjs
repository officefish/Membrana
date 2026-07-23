/**
 * Usage emit (T1 / U1): sync POST to office; best-effort; opt-out LLM_USAGE_EMIT=0.
 */
import { randomUUID } from 'node:crypto';

import { buildEvidenceFields } from './llm-procedure-evidence.mjs';
import { resolveOfficeToken } from './office-token.mjs';

const ERROR_CLASSES = new Set(['auth', 'rate_limit', 'timeout', 'protocol', 'unknown']);
const FORBIDDEN_KEYS = new Set(['prompt', 'apiKey', 'rawResponse', 'messages', 'content']);

/**
 * @param {unknown} env
 * @returns {boolean}
 */
export function isUsageEmitEnabled(env = process.env) {
  const raw = String(env?.LLM_USAGE_EMIT ?? '1').trim().toLowerCase();
  return !(raw === '0' || raw === 'false' || raw === 'no' || raw === 'off');
}

/**
 * @param {Record<string, unknown>} event
 * @returns {string[]}
 */
export function usageEventProblems(event) {
  const problems = [];
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return ['event — не объект'];
  }
  for (const k of FORBIDDEN_KEYS) {
    if (k in event) problems.push(`запрещённое поле «${k}»`);
  }
  for (const req of [
    'eventId',
    'ts',
    'procedureId',
    'provider',
    'model',
    'source',
    'latencyMs',
    'ok',
  ]) {
    if (event[req] === undefined || event[req] === null || event[req] === '') {
      problems.push(`нет ${req}`);
    }
  }
  if (event.source != null && event.source !== 'overlay' && event.source !== 'default') {
    problems.push(`source «${event.source}» не overlay|default`);
  }
  if (typeof event.ok !== 'boolean') problems.push('ok — не boolean');
  if (typeof event.latencyMs !== 'number' || !Number.isFinite(event.latencyMs) || event.latencyMs < 0) {
    problems.push('latencyMs — не неотрицательное число');
  }
  for (const t of ['tokensIn', 'tokensOut']) {
    if (event[t] !== undefined && event[t] !== null) {
      if (typeof event[t] !== 'number' || !Number.isFinite(event[t]) || event[t] < 0) {
        problems.push(`${t} — null или неотрицательное число`);
      }
    }
  }
  if (event.errorClass != null && !ERROR_CLASSES.has(String(event.errorClass))) {
    problems.push(`errorClass «${event.errorClass}» вне enum`);
  }
  return problems;
}

/**
 * @param {Partial<{
 *   eventId: string;
 *   ts: string;
 *   procedureId: string;
 *   provider: string;
 *   model: string;
 *   source: 'overlay' | 'default';
 *   tokensIn: number | null;
 *   tokensOut: number | null;
 *   latencyMs: number;
 *   ok: boolean;
 *   errorClass?: string;
 *   entryMjs?: string;
 *   gitSha?: string;
 *   promptText?: string | null;
 *   responseText?: string | null;
 *   params?: Record<string, unknown> | null;
 *   attemptIndex?: number;
 *   chainLen?: number;
 *   providerRequestId?: string | null;
 *   promptSha256?: string;
 *   responseSha256?: string;
 *   promptBytes?: number | null;
 *   responseBytes?: number | null;
 * }>} partial
 */
export function buildUsageEvent(partial) {
  const evidence = buildEvidenceFields({
    promptText: partial.promptText,
    responseText: partial.responseText,
    params: partial.params,
    attemptIndex: partial.attemptIndex,
    chainLen: partial.chainLen,
    providerRequestId: partial.providerRequestId,
  });
  return {
    eventId: partial.eventId ?? randomUUID(),
    ts: partial.ts ?? new Date().toISOString(),
    procedureId: partial.procedureId,
    provider: partial.provider,
    model: partial.model,
    source: partial.source,
    tokensIn: partial.tokensIn === undefined ? null : partial.tokensIn,
    tokensOut: partial.tokensOut === undefined ? null : partial.tokensOut,
    latencyMs: partial.latencyMs ?? 0,
    ok: Boolean(partial.ok),
    ...(partial.errorClass ? { errorClass: partial.errorClass } : {}),
    ...(partial.entryMjs ? { entryMjs: partial.entryMjs } : {}),
    ...(partial.gitSha ? { gitSha: partial.gitSha } : {}),
    ...evidence,
    ...(partial.promptSha256 ? { promptSha256: partial.promptSha256 } : {}),
    ...(partial.responseSha256 ? { responseSha256: partial.responseSha256 } : {}),
  };
}

/**
 * @param {Record<string, unknown>} event
 * @param {{
 *   env?: NodeJS.ProcessEnv;
 *   fetchImpl?: typeof fetch;
 *   baseUrl?: string;
 *   token?: string;
 *   enabled?: boolean;
 *   timeoutMs?: number;
 * }} [opts]
 * @returns {Promise<{ emitted: boolean; reason: string; eventId?: string; duplicate?: boolean }>}
 */
export async function emitUsage(event, opts = {}) {
  try {
    const env = opts.env ?? process.env;
    const enabled = opts.enabled ?? isUsageEmitEnabled(env);
    if (!enabled) {
      return { emitted: false, reason: 'opt-out' };
    }
    const problems = usageEventProblems(event);
    if (problems.length) {
      return { emitted: false, reason: `invalid: ${problems.join('; ')}` };
    }

    const token =
      opts.token ??
      resolveOfficeToken(env).token ??
      null;
    if (!token) {
      return {
        emitted: false,
        reason: 'no-token',
        eventId: typeof event.eventId === 'string' ? event.eventId : undefined,
      };
    }

    const base = (opts.baseUrl ?? env.OFFICE_BASE_URL ?? 'https://office.mmbrn.tech').replace(
      /\/$/,
      '',
    );
    const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      return { emitted: false, reason: 'no-fetch' };
    }

    const timeoutMs = opts.timeoutMs ?? 2_000;
    const res = await fetchImpl(`${base}/v1/llm-usage/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-membrana-token': token,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return {
        emitted: false,
        reason: `http-${res.status}`,
        eventId: typeof event.eventId === 'string' ? event.eventId : undefined,
      };
    }

    let duplicate = false;
    try {
      const body = await res.json();
      duplicate = Boolean(body?.duplicate);
    } catch {
      /* ignore body parse */
    }

    return {
      emitted: true,
      reason: duplicate ? 'duplicate' : 'ok',
      eventId: typeof event.eventId === 'string' ? event.eventId : undefined,
      duplicate,
    };
  } catch (err) {
    return {
      emitted: false,
      reason: `error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
