/**
 * Intern T1 (#195): outbound self-check — сетевая доступность каналов office.
 * Без ключей: только HTTPS-пинг. Переиспользуется T2 `/ready`.
 */
import { fetch as undiciFetch, ProxyAgent } from 'undici';

export type OutboundProbeId = 'anthropic' | 'github' | 'perplexity';

export interface OutboundProbeTarget {
  id: OutboundProbeId;
  /** Человекочитаемая метка */
  label: string;
  url: string;
  method: 'GET' | 'HEAD';
}

export interface OutboundProbeResult {
  id: OutboundProbeId;
  label: string;
  url: string;
  reachable: boolean;
  latencyMs: number;
  httpStatus: number | null;
  note: string;
}

export const OUTBOUND_PROBE_TARGETS: readonly OutboundProbeTarget[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    url: 'https://api.anthropic.com/',
    method: 'GET',
  },
  // Linear GraphQL intentionally omitted: office must not egress to api.linear.app
  // (K1). Live pull = media-NL → linear-snapshot@1. Probing Linear from office
  // would either 403 (RU) or falsely green-light a forbidden path.
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://api.github.com/',
    method: 'GET',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    url: 'https://api.perplexity.ai/',
    method: 'GET',
  },
] as const;

const DEFAULT_TIMEOUT_MS = 8_000;

export function resolveProxyUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() || null;
}

/**
 * Классификация исхода одного зонда (для тестов и CLI).
 */
export function classifyProbeOutcome(input: {
  error?: string | null;
  status?: number | null;
}): { reachable: boolean; note: string } {
  if (input.error) {
    const err = input.error;
    if (/timeout|aborted|TimeoutError|AbortError/i.test(err)) {
      return { reachable: false, note: 'timeout' };
    }
    if (/ENOTFOUND|EAI_AGAIN/i.test(err)) {
      return { reachable: false, note: 'dns' };
    }
    if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH/i.test(err)) {
      return { reachable: false, note: 'net' };
    }
    return { reachable: false, note: `error:${err.slice(0, 80)}` };
  }
  const status = input.status ?? 0;
  // Любой HTTP-ответ (в т.ч. 401/404) = хост достижим.
  if (status > 0) {
    return { reachable: true, note: status >= 200 && status < 500 ? 'http' : `http-${status}` };
  }
  return { reachable: false, note: 'no-status' };
}

export type ProbeFetch = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    signal: AbortSignal;
    dispatcher?: unknown;
  },
) => Promise<{ status: number }>;

/**
 * Один зонд. Не бросает наружу — всегда OutboundProbeResult.
 */
export async function probeTarget(
  target: OutboundProbeTarget,
  opts: {
    timeoutMs?: number;
    fetchImpl?: ProbeFetch;
    proxyUrl?: string | null;
  } = {},
): Promise<OutboundProbeResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const proxyUrl = opts.proxyUrl === undefined ? resolveProxyUrl() : opts.proxyUrl;
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  const fetchImpl: ProbeFetch =
    opts.fetchImpl ??
    (async (url, init) => {
      const res = await undiciFetch(url, {
        method: init.method,
        headers: init.headers,
        signal: init.signal,
        ...(dispatcher ? { dispatcher } : {}),
      });
      return { status: res.status };
    });

  const started = Date.now();
  try {
    const res = await fetchImpl(target.url, {
      method: target.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'membrana-office-self-check/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
      dispatcher,
    });
    const latencyMs = Date.now() - started;
    const { reachable, note } = classifyProbeOutcome({ status: res.status });
    return {
      id: target.id,
      label: target.label,
      url: target.url,
      reachable,
      latencyMs,
      httpStatus: res.status,
      note,
    };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const message = err instanceof Error ? err.message : String(err);
    const { reachable, note } = classifyProbeOutcome({ error: message });
    return {
      id: target.id,
      label: target.label,
      url: target.url,
      reachable,
      latencyMs,
      httpStatus: null,
      note,
    };
  }
}

/** Параллельный прогон всех канонических целей. */
export async function runOutboundSelfCheck(
  opts: {
    timeoutMs?: number;
    fetchImpl?: ProbeFetch;
    proxyUrl?: string | null;
    targets?: readonly OutboundProbeTarget[];
  } = {},
): Promise<OutboundProbeResult[]> {
  const targets = opts.targets ?? OUTBOUND_PROBE_TARGETS;
  return Promise.all(targets.map((t) => probeTarget(t, opts)));
}

/** Текстовая сводка для CLI / логов. */
export function formatOutboundSelfCheckTable(results: readonly OutboundProbeResult[]): string {
  const header = ['id', 'reachable', 'latencyMs', 'status', 'note'].join('\t');
  const rows = results.map((r) =>
    [
      r.id,
      r.reachable ? 'yes' : 'no',
      String(r.latencyMs),
      r.httpStatus == null ? '-' : String(r.httpStatus),
      r.note,
    ].join('\t'),
  );
  return [header, ...rows].join('\n');
}
