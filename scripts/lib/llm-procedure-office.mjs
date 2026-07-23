/**
 * Office pull for procedure channels (C1): overlay / effective with timeout → git fallback.
 */
import { resolveOfficeToken } from './office-token.mjs';

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv;
 *   fetchImpl?: typeof fetch;
 *   baseUrl?: string;
 *   token?: string;
 *   timeoutMs?: number;
 * }} [opts]
 * @returns {Promise<Record<string, { chain: Array<{ provider: string; model: string }> }> | null>}
 */
export async function fetchOfficeOverlay(opts = {}) {
  const env = opts.env ?? process.env;
  const token = opts.token ?? resolveOfficeToken(env).token;
  if (!token) return null;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') return null;
  const base = (opts.baseUrl ?? env.OFFICE_BASE_URL ?? 'https://office.mmbrn.tech').replace(
    /\/$/,
    '',
  );
  const timeoutMs = opts.timeoutMs ?? 2_000;
  try {
    const res = await fetchImpl(`${base}/v1/llm-procedure/overlay/agent`, {
      headers: { 'x-membrana-token': token },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const procedures = body?.procedures;
    if (!procedures || typeof procedures !== 'object') return null;
    return procedures;
  } catch {
    return null;
  }
}
