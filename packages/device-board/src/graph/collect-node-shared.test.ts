import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENARIO_COLLECTOR_CONFIG } from '@membrana/core';

import {
  createCollectTickState,
  recordCollectAppend,
  shouldFlushCollect,
} from './collect-node-shared.js';

describe('collect-node-shared flush trigger (DBC3)', () => {
  it('flushes when pending count reaches queueCapacity', () => {
    const config = { ...DEFAULT_SCENARIO_COLLECTOR_CONFIG, queueCapacity: 2, windowSec: 60 };
    let state = createCollectTickState();
    state = recordCollectAppend(state, 1000);
    expect(shouldFlushCollect(state, config, 1001)).toBe(false);
    state = recordCollectAppend(state, 1002);
    expect(shouldFlushCollect(state, config, 1003)).toBe(true);
  });

  it('flushes when windowSec elapsed', () => {
    const config = { ...DEFAULT_SCENARIO_COLLECTOR_CONFIG, queueCapacity: 100, windowSec: 3 };
    const state = recordCollectAppend(createCollectTickState(), 1000);
    expect(shouldFlushCollect(state, config, 1000 + 2999)).toBe(false);
    expect(shouldFlushCollect(state, config, 1000 + 3000)).toBe(true);
  });
});
