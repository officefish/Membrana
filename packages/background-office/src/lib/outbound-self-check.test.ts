import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  classifyProbeOutcome,
  formatOutboundSelfCheckTable,
  probeTarget,
  runOutboundSelfCheck,
  type OutboundProbeTarget,
} from './outbound-self-check';

const sample: OutboundProbeTarget = {
  id: 'github',
  label: 'GitHub',
  url: 'https://api.github.com/',
  method: 'GET',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('classifyProbeOutcome', () => {
  it('HTTP-статус → reachable', () => {
    expect(classifyProbeOutcome({ status: 200 })).toEqual({ reachable: true, note: 'http' });
    expect(classifyProbeOutcome({ status: 401 })).toEqual({ reachable: true, note: 'http' });
  });

  it('timeout / dns → unreachable', () => {
    expect(classifyProbeOutcome({ error: 'The operation was aborted due to timeout' }).note).toBe(
      'timeout',
    );
    expect(classifyProbeOutcome({ error: 'getaddrinfo ENOTFOUND' }).note).toBe('dns');
  });
});

describe('probeTarget', () => {
  it('успешный ответ → reachable + latency', async () => {
    const result = await probeTarget(sample, {
      proxyUrl: null,
      fetchImpl: async () => ({ status: 200 }),
    });
    expect(result.reachable).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('таймаут не throw — reachable false', async () => {
    const result = await probeTarget(sample, {
      proxyUrl: null,
      fetchImpl: async () => {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'TimeoutError';
        throw err;
      },
    });
    expect(result.reachable).toBe(false);
    expect(result.httpStatus).toBeNull();
    expect(result.note).toBe('timeout');
  });
});

describe('runOutboundSelfCheck + format', () => {
  it('все цели в сводке; unreachable не роняет', async () => {
    let n = 0;
    const results = await runOutboundSelfCheck({
      proxyUrl: null,
      fetchImpl: async () => {
        n += 1;
        if (n === 2) {
          throw new Error('connect ECONNREFUSED');
        }
        return { status: 404 };
      },
    });
    expect(results).toHaveLength(3);
    expect(results.some((r) => !r.reachable)).toBe(true);
    const table = formatOutboundSelfCheckTable(results);
    expect(table).toContain('anthropic');
    expect(table).toContain('perplexity');
    expect(table).not.toContain('linear');
  });
});
