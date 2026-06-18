import { describe, expect, it, vi } from 'vitest';

import { createEmptyDeviceScenarioDocument } from '@membrana/core';



import { buildDemoFunctionInput, serializeScenarioFunction } from '../graph/index.js';
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

        ...document.scenario.triggers,

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

      functions: [serializeScenarioFunction(buildDemoFunctionInput())],
    },

  };

}



describe('ScenarioRuntime H2b', () => {

  it('runs initial chain then one main loop iteration', async () => {

    const calls: string[] = [];

    let runtime!: ScenarioRuntime;

    const host = createStubScenarioRuntimeHost({

      selectMicrophone: async () => {

        calls.push('select-microphone');

      },

      startStream: async () => {

        calls.push('start-stream');

      },

      writeJournal: async (event) => {

        calls.push(`journal:${event.branch}`);

      },

      recordChunk: async () => {

        calls.push('record-chunk');

        runtime.stop();

        return { clipId: 'clip-1' };

      },

      trendsFftDetect: async () => {

        calls.push('trends-fft-detect');

        return { detected: false, confidence: 0.1, templateId: 't1' };

      },

      stopStream: async () => {

        calls.push('stop-stream');

      },

    });



    runtime = new ScenarioRuntime(host);

    runtime.load(buildHackathonDocument());

    await runtime.start();



    expect(calls).toEqual([

      'select-microphone',

      'start-stream',

      'journal:initial',

      'record-chunk',

      'journal:onStop',

      'stop-stream',

      'stop-stream',

    ]);

    expect(runtime.getState().phase).toBe('stopped');

    expect(runtime.getState().lastStopReason).toBe('user');

  });



  it('rejects load while running', async () => {

    const host = createStubScenarioRuntimeHost({

      startStream: vi.fn(async () => new Promise(() => undefined)),

    });

    const runtime = new ScenarioRuntime(host);

    const doc = createEmptyDeviceScenarioDocument('microphone');

    runtime.load(doc);

    void runtime.start();

    expect(() => runtime.load(doc)).toThrow(/running/);

    runtime.stop();

  });

});



describe('ScenarioRuntime H4 alarm', () => {

  it('enters alarm on detection front and exits when quiet enough', async () => {

    const calls: string[] = [];

    let runtime!: ScenarioRuntime;

    let mainIterations = 0;

    let soundLevelChecks = 0;



    const host = createStubScenarioRuntimeHost({

      selectMicrophone: async () => calls.push('select-microphone'),

      startStream: async () => calls.push('start-stream'),

      writeJournal: async (event) => calls.push(`journal:${event.branch}`),

      recordChunk: async () => {

        mainIterations += 1;

        calls.push(`record-chunk:${mainIterations}`);

        return { clipId: `clip-${mainIterations}` };

      },

      trendsFftDetect: async () => {

        calls.push(`trends:${mainIterations}`);

        if (mainIterations < 2) {

          return { detected: false, confidence: 0, templateId: 'CLEAR' };

        }

        return { detected: true, confidence: 0.92, templateId: 'DRONE_TIGHT' };

      },

      evaluateSoundLevel: async () => {

        soundLevelChecks += 1;

        calls.push(`sound-level:${soundLevelChecks}`);

        if (soundLevelChecks >= 2) {

          runtime.stop();

          return { rawLevel: 0.01, isQuietEnough: true };

        }

        return { rawLevel: 0.4, isQuietEnough: false };

      },

    });



    runtime = new ScenarioRuntime(host, { mainLoopChunkDurationMs: 10 });

    runtime.load(buildHackathonDocument());

    await runtime.start();



    expect(calls).toContain('journal:alarm');

    expect(calls.filter((call) => call.startsWith('sound-level:')).length).toBeGreaterThanOrEqual(2);

    expect(calls).toContain('journal:onStop');

    expect(runtime.getState().phase).toBe('stopped');

  });

});



describe('ScenarioRuntime RT3 mode override', () => {
  it('setMode(alarm) forces alarm loop without detection front', async () => {
    const calls: string[] = [];
    let runtime!: ScenarioRuntime;
    let alarmJournals = 0;

    const host = createStubScenarioRuntimeHost({
      writeJournal: async (event) => {
        calls.push(`journal:${event.branch}`);
        if (event.branch === 'alarm') {
          alarmJournals += 1;
          if (alarmJournals === 1) {
            runtime.stop();
          }
        }
      },
      // detection всегда false: авто-alarm не сработал бы
      trendsFftDetect: async () => ({ detected: false, confidence: 0, templateId: 'CLEAR' }),
    });

    runtime = new ScenarioRuntime(host, { mainLoopChunkDurationMs: 5 });
    runtime.load(buildHackathonDocument());
    runtime.setMode('alarm');
    await runtime.start();

    expect(calls).toContain('journal:alarm');
    expect(calls).not.toContain('journal:main');
    expect(runtime.getState().mode).toBe('alarm');
  });

  it('setMode(normal) returns from manual alarm to main loop', async () => {
    const calls: string[] = [];
    let runtime!: ScenarioRuntime;

    const host = createStubScenarioRuntimeHost({
      writeJournal: async (event) => {
        calls.push(`journal:${event.branch}`);
        if (event.branch === 'alarm') {
          // снимаем override после первой alarm-итерации
          runtime.setMode('normal');
        }
      },
      recordChunk: async () => {
        // выполнится только после возврата в main
        calls.push('main-record-chunk');
        runtime.stop();
        return { clipId: 'c1' };
      },
      trendsFftDetect: async () => ({ detected: false, confidence: 0, templateId: 'CLEAR' }),
    });

    runtime = new ScenarioRuntime(host, { mainLoopChunkDurationMs: 5 });
    runtime.load(buildHackathonDocument());
    runtime.setMode('alarm');
    await runtime.start();

    expect(calls).toContain('journal:alarm');
    expect(calls).toContain('main-record-chunk');
    expect(runtime.getState().mode).toBe('normal');
  });
});

describe('ScenarioRuntime H3a onStop', () => {
  it('records system stop reason', async () => {
    let runtime!: ScenarioRuntime;
    const host = createStubScenarioRuntimeHost({
      recordChunk: async () => {
        runtime.stop('system');
        return { clipId: 'clip-1' };
      },
    });

    runtime = new ScenarioRuntime(host);
    runtime.load(buildHackathonDocument());
    await runtime.start();

    expect(runtime.getState().lastStopReason).toBe('system');
  });
});

describe('ScenarioRuntime H3c subgraph', () => {
  it('invokes function body from subgraph block', async () => {
    const calls: string[] = [];
    let runtime!: ScenarioRuntime;
    const host = createStubScenarioRuntimeHost({
      recordChunk: async () => {
        calls.push('record-chunk');
        runtime.stop();
        return { clipId: 'clip-fn' };
      },
      trendsFftDetect: async () => {
        calls.push('trends-fft-detect');
        return { detected: false, confidence: 0, templateId: 'CLEAR' };
      },
    });

    runtime = new ScenarioRuntime(host);
    runtime.load(buildHackathonDocument());
    await runtime.start();

    expect(calls).toContain('record-chunk');
  });
});

describe('ScenarioRuntime H3b onDisconnect', () => {
  it('runs onDisconnect instead of onStop on connection loss', async () => {
    const calls: string[] = [];
    let runtime!: ScenarioRuntime;
    const host = createStubScenarioRuntimeHost({
      writeJournal: async (event) => calls.push(`journal:${event.branch}`),
      recordChunk: async () => {
        runtime.handleDisconnect();
        return { clipId: 'clip-1' };
      },
    });

    runtime = new ScenarioRuntime(host);
    runtime.load(buildHackathonDocument());
    await runtime.start();

    expect(calls).toContain('journal:onDisconnect');
    expect(calls).not.toContain('journal:onStop');
  });

  it('restarts from initial after reconnect', async () => {
    const calls: string[] = [];
    let runtime!: ScenarioRuntime;
    const host = createStubScenarioRuntimeHost({
      selectMicrophone: async () => calls.push('select-microphone'),
      recordChunk: async () => {
        runtime.handleDisconnect();
        return { clipId: 'clip-1' };
      },
    });

    runtime = new ScenarioRuntime(host);
    runtime.load(buildHackathonDocument());
    await runtime.start();

    const beforeReconnect = calls.filter((call) => call === 'select-microphone').length;
    await runtime.handleReconnect();
    expect(calls.filter((call) => call === 'select-microphone').length).toBe(beforeReconnect + 1);
  });
});


