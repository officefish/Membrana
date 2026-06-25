import { describe, expect, it, vi } from 'vitest';
import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import { ScenarioRuntime } from './scenario-runtime.js';
import { createStubScenarioRuntimeHost } from './host.js';
import * as execSubgraph from './exec-subgraph.js';

/** AP v1 R11: chain-log markers expected in operator smoke / yarn logs:parse. */
export const ASYNC_PIPELINE_CHAIN_LOG_MARKERS = [
  'async-job-start',
  'async-job-cancelled',
  'sequence-latent-then-start',
  'sequence-latent-dispatch-done',
  'event-dispatch-detached-start',
  'event-dispatch-detached-done',
  'async-resolved-dispatch',
  'main-tick-blocked-ms',
] as const;

describe('async pipeline observability smoke matrix (R11)', () => {
  it('exports canonical chain-log marker ids', () => {
    expect(ASYNC_PIPELINE_CHAIN_LOG_MARKERS).toContain('async-job-start');
    expect(ASYNC_PIPELINE_CHAIN_LOG_MARKERS).toContain('main-tick-blocked-ms');
    expect(ASYNC_PIPELINE_CHAIN_LOG_MARKERS.length).toBeGreaterThanOrEqual(8);
  });

  it('ScenarioRuntime logs main-tick-blocked-ms with elapsedMs', async () => {
    const log = vi.fn();
    const host = createStubScenarioRuntimeHost({ log });
    const runSubgraphSpy = vi.spyOn(execSubgraph, 'runSubgraphOnce').mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 12));
      return { lastDetection: null, stopRequested: false, loopRepeatRequested: true };
    });

    const document = createEmptyDeviceScenarioDocument('microphone');
    const runtime = new ScenarioRuntime(host);
    runtime.load(document);

    const startPromise = runtime.start();
    await vi.waitFor(() => {
      expect(log).toHaveBeenCalledWith(
        'main-tick-blocked-ms',
        expect.objectContaining({ elapsedMs: expect.any(Number) }),
      );
    });
    runtime.stop('user');
    await startPromise.catch(() => undefined);
    runSubgraphSpy.mockRestore();

    const blockedCall = log.mock.calls.find((call) => call[0] === 'main-tick-blocked-ms');
    expect(blockedCall).toBeDefined();
    const elapsedMs = (blockedCall?.[1] as { elapsedMs?: number } | undefined)?.elapsedMs;
    expect(elapsedMs).toBeGreaterThanOrEqual(10);
  });
});
