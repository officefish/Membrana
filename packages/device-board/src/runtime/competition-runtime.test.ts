import { describe, expect, it } from 'vitest';
import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import { stampCompetitionDocumentMeta } from '../graph/execution-policy.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ScenarioRuntime } from './scenario-runtime.js';
import type { CompetitionRunLogPayload } from './competition-run-log.js';

describe('ScenarioRuntime competition policy', () => {
  it('posts competition run log stub when run completes', async () => {
    const payloads: CompetitionRunLogPayload[] = [];
    const host = createStubScenarioRuntimeHost({
      postCompetitionRunLog: (payload) => {
        payloads.push(payload);
      },
      startStream: async () => undefined,
      stopStream: async () => undefined,
    });

    const runtime = new ScenarioRuntime(host, { loopTickPauseMs: 0 });
    const document = stampCompetitionDocumentMeta(createEmptyDeviceScenarioDocument('microphone'));
    runtime.load(document);
    const runPromise = runtime.start();
    runtime.stop('user');
    await runPromise;

    expect(payloads.length).toBe(1);
    expect(payloads[0]?.stopReason).toBe('user');
  });
});
