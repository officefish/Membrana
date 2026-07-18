import { describe, expect, it } from 'vitest';
import type { ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ScenarioVariableStore } from './variable-store.js';
import {
  DEFAULT_WINDOW_ELAPSED_MS,
  IS_WINDOW_ELAPSED_FALSE_HANDLE,
  IS_WINDOW_ELAPSED_TRUE_HANDLE,
} from '../graph/is-window-elapsed-node.js';

/**
 * PC-2: executor is-window-elapsed — периодический гейт окна по host-часам.
 * Ветвление true/false по host.isWindowElapsed; windowMs = поле узла > дефолт.
 */
async function runGate(options: {
  readonly elapsed: boolean;
  readonly windowElapsedMs?: number;
}): Promise<{ out: string | undefined; seenWindowMs: number | null }> {
  let seenWindowMs: number | null = null;
  const host = createStubScenarioRuntimeHost({
    isWindowElapsed: (_nodeId, windowMs) => {
      seenWindowMs = windowMs;
      return options.elapsed;
    },
  });
  const subgraph: ScenarioSubgraph = {
    nodes: [
      {
        id: 'iwe-1',
        nodeKind: 'is-window-elapsed',
        blockKind: 'custom',
        label: 'IsWindowElapsed',
        ...(options.windowElapsedMs !== undefined
          ? { windowElapsedMs: options.windowElapsedMs }
          : {}),
      },
    ],
    edges: [],
  };
  const node = subgraph.nodes[0];
  const result = await executeScenarioBlock({
    host,
    signal: new AbortController().signal,
    branch: 'main',
    subgraph,
    node,
    lastDetection: null,
    defaultChunkDurationMs: 5000,
    functions: [],
    variableStore: new ScenarioVariableStore(),
    resolveContext: {},
  });
  return { out: result.execOutHandle, seenWindowMs };
}

describe('executeScenarioBlock is-window-elapsed (PC-2)', () => {
  it('окно накопилось → true-ветка', async () => {
    const { out } = await runGate({ elapsed: true });
    expect(out).toBe(IS_WINDOW_ELAPSED_TRUE_HANDLE);
  });

  it('окно не накопилось → false-ветка', async () => {
    const { out } = await runGate({ elapsed: false });
    expect(out).toBe(IS_WINDOW_ELAPSED_FALSE_HANDLE);
  });

  it('windowMs берётся из поля узла', async () => {
    const { seenWindowMs } = await runGate({ elapsed: false, windowElapsedMs: 3000 });
    expect(seenWindowMs).toBe(3000);
  });

  it('windowMs — дефолт, если поле не задано и провода нет', async () => {
    const { seenWindowMs } = await runGate({ elapsed: false });
    expect(seenWindowMs).toBe(DEFAULT_WINDOW_ELAPSED_MS);
  });
});
