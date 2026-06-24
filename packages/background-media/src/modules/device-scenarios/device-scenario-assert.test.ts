import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { assertDeviceScenarioDocument } from './device-scenario-assert';

const baseV1 = {
  kind: 'device-scenario',
  version: 1,
  deviceKind: 'microphone',
  signalGraph: { nodes: [], edges: [] },
  scenario: {
    initial: { entry: 'initial-entry', nodes: [], edges: [] },
    loops: {
      main: { entry: 'main-entry', nodes: [], edges: [] },
      alarm: { entry: 'alarm-entry', nodes: [], edges: [] },
    },
    triggers: {
      onStop: { entry: 'on-stop-entry', nodes: [], edges: [] },
      onDisconnect: { entry: 'on-disconnect-entry', nodes: [], edges: [] },
    },
  },
} as const;

describe('assertDeviceScenarioDocument', () => {
  it('accepts device-scenario v1', () => {
    expect(() => assertDeviceScenarioDocument({ ...baseV1 })).not.toThrow();
  });

  it('accepts device-scenario v2 (client createEmptyDeviceScenarioDocument)', () => {
    expect(() =>
      assertDeviceScenarioDocument({
        ...baseV1,
        version: 2,
        scenario: {
          ...baseV1.scenario,
          onConnect: { entry: 'on-connect-entry', nodes: [], edges: [] },
          variables: [],
        },
      }),
    ).not.toThrow();
  });

  it('rejects version 3', () => {
    expect(() => assertDeviceScenarioDocument({ ...baseV1, version: 3 })).toThrow(BadRequestException);
  });
});
