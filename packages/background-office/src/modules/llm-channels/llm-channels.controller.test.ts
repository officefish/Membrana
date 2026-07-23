import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { LlmProcedureController, LlmUsageController } from './llm-channels.controller';
import type { LlmChannelsService } from './llm-channels.service';

function fakeService(partial: Partial<LlmChannelsService> = {}) {
  return {
    listEffective: vi.fn(() => []),
    resolveEffective: vi.fn(() => ({
      procedureId: 'code-review',
      chain: [{ provider: 'anthropic', model: 'm' }],
      source: 'default',
      meters: true,
    })),
    getOverlaySnapshot: vi.fn(() => ({ version: 1, procedures: {} })),
    putOverlay: vi.fn((_id, cfg) => cfg),
    deleteOverlay: vi.fn((id) => ({ ok: true, procedureId: id })),
    ingestUsage: vi.fn(() => ({ ok: true, duplicate: false })),
    dayUsage: vi.fn(() => ({ date: '2026-07-23', count: 0 })),
    ...partial,
  } as unknown as LlmChannelsService;
}

describe('LlmUsageController.ingest', () => {
  it('accepts valid event', () => {
    const svc = fakeService();
    const res = new LlmUsageController(svc).ingest({
      eventId: 'e1',
      ts: '2026-07-23T10:00:00.000Z',
      procedureId: 'code-review',
      provider: 'anthropic',
      model: 'm',
      source: 'default',
      tokensIn: null,
      tokensOut: 1,
      latencyMs: 12,
      ok: true,
    });
    expect(res).toEqual({ ok: true, duplicate: false });
    expect(svc.ingestUsage).toHaveBeenCalledOnce();
  });

  it('rejects prompt field', () => {
    const svc = fakeService();
    expect(() =>
      new LlmUsageController(svc).ingest({
        eventId: 'e1',
        ts: '2026-07-23T10:00:00.000Z',
        procedureId: 'code-review',
        provider: 'anthropic',
        model: 'm',
        source: 'default',
        latencyMs: 1,
        ok: true,
        prompt: 'SECRET',
      }),
    ).toThrow(BadRequestException);
    expect(svc.ingestUsage).not.toHaveBeenCalled();
  });
});

describe('LlmProcedureController.putOverlay', () => {
  it('validates chain', () => {
    const svc = fakeService();
    expect(() =>
      new LlmProcedureController(svc).putOverlay('code-review', { chain: [] }),
    ).toThrow(BadRequestException);
  });

  it('puts valid chain', () => {
    const svc = fakeService();
    const res = new LlmProcedureController(svc).putOverlay('code-review', {
      chain: [{ provider: 'openrouter', model: 'x' }],
    });
    expect(res.ok).toBe(true);
    expect(res.chain[0].provider).toBe('openrouter');
  });
});
