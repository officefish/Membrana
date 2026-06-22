import { describe, expect, it } from 'vitest';

import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import { serializeScenarioSubgraph } from '../graph/serialize-scenario-subgraph.js';
import {
  INITIAL_SCENARIO_ALARM_EDGES,
  INITIAL_SCENARIO_ALARM_NODES,
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
  INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
  INITIAL_SCENARIO_ON_DISCONNECT_NODES,
  INITIAL_SCENARIO_ON_STOP_EDGES,
  INITIAL_SCENARIO_ON_STOP_NODES,
  SCENARIO_ALARM_ENTRY,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from '../graph/initial-board-state.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ScenarioRuntime } from './scenario-runtime.js';

function buildHackathonDocument() {
  const document = createEmptyDeviceScenarioDocument('microphone');
  return {
    ...document,
    scenario: {
      ...document.scenario,
      initial: serializeScenarioSubgraph(
        SCENARIO_INITIAL_ENTRY,
        INITIAL_SCENARIO_INITIAL_NODES,
        INITIAL_SCENARIO_INITIAL_EDGES,
      ),
      loops: {
        main: serializeScenarioSubgraph(
          SCENARIO_MAIN_ENTRY,
          INITIAL_SCENARIO_MAIN_NODES,
          INITIAL_SCENARIO_MAIN_EDGES,
        ),
        alarm: serializeScenarioSubgraph(
          SCENARIO_ALARM_ENTRY,
          INITIAL_SCENARIO_ALARM_NODES,
          INITIAL_SCENARIO_ALARM_EDGES,
        ),
      },
      triggers: {
        onStop: serializeScenarioSubgraph(
          SCENARIO_ON_STOP_ENTRY,
          INITIAL_SCENARIO_ON_STOP_NODES,
          INITIAL_SCENARIO_ON_STOP_EDGES,
        ),
        onDisconnect: serializeScenarioSubgraph(
          SCENARIO_ON_DISCONNECT_ENTRY,
          INITIAL_SCENARIO_ON_DISCONNECT_NODES,
          INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
        ),
      },
    },
  };
}

/** DBP4 acceptance: programmatic smoke for Run → Pause → Resume → Stop. */
describe('ScenarioRuntime pause smoke (DBP4)', () => {
  it('Run → Pause → Resume → Stop: no onStop while paused; onStop after Stop', async () => {
    const journal: string[] = [];
    const runtime = new ScenarioRuntime(
      createStubScenarioRuntimeHost({
        writeJournal: async (event) => journal.push(event.branch),
      }),
      { loopTickPauseMs: 0 },
    );

    runtime.load(buildHackathonDocument());
    const runPromise = runtime.start();

    const runningDeadline = Date.now() + 2000;
    while (!runtime.getState().isRunning && Date.now() < runningDeadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(runtime.getState().isRunning).toBe(true);

    runtime.pause();
    expect(runtime.getState().isPaused).toBe(true);
    expect(journal).not.toContain('onStop');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(journal).not.toContain('onStop');

    runtime.resume();
    expect(runtime.getState().isPaused).toBe(false);

    runtime.stop('user');
    await runPromise;

    expect(runtime.getState().isRunning).toBe(false);
    expect(runtime.getState().isPaused).toBe(false);
    expect(journal).toContain('onStop');
  });
});
