import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';
import { runOutboundSelfCheck } from './lib/outbound-self-check';

vi.mock('./lib/outbound-self-check', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/outbound-self-check')>();
  return {
    ...actual,
    runOutboundSelfCheck: vi.fn(),
  };
});

describe('HealthController.ready (#669)', () => {
  beforeEach(() => {
    vi.mocked(runOutboundSelfCheck).mockReset();
  });

  it('keeps success path: ready mirrors probe reachability', async () => {
    vi.mocked(runOutboundSelfCheck).mockResolvedValue([
      {
        id: 'anthropic',
        label: 'Anthropic',
        url: 'https://api.anthropic.com',
        reachable: true,
        latencyMs: 12,
        httpStatus: 200,
        note: 'ok',
      },
    ]);

    const body = await new HealthController().ready();
    expect(body.ready).toBe(true);
    expect(body.checks).toHaveLength(1);
    expect(body.checks[0]?.id).toBe('anthropic');
  });

  it('on throw: ready false + synthetic check (no rethrow → Nest stays 200)', async () => {
    vi.mocked(runOutboundSelfCheck).mockRejectedValue(new Error('probe aggregator boom'));

    const body = await new HealthController().ready();
    expect(body.ready).toBe(false);
    expect(body.checks).toHaveLength(1);
    expect(body.checks[0]).toMatchObject({
      id: 'self-check',
      reachable: false,
      httpStatus: null,
    });
    expect(body.checks[0]?.note).toContain('probe aggregator boom');
  });
});
