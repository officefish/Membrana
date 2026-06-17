import {
  createEmptyDeviceScenarioDocument,
  createEmptyScenarioGraph,
  type DeviceKind,
  type DeviceScenarioDocument,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import {
  SCENARIO_ALARM_ENTRY,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './initial-board-state.js';
import { serializeScenarioFunction, type SerializeScenarioFunctionInput } from './serialize-scenario-function.js';
import { serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
import { serializeSignalGraph } from './serialize-signal-graph.js';

export interface BuildDeviceScenarioInput {
  readonly deviceKind: DeviceKind;
  readonly title?: string;
  readonly signalNodes: readonly Node[];
  readonly signalEdges: readonly Edge[];
  readonly scenarioInitialNodes: readonly Node[];
  readonly scenarioInitialEdges: readonly Edge[];
  readonly scenarioMainNodes: readonly Node[];
  readonly scenarioMainEdges: readonly Edge[];
  readonly scenarioAlarmNodes: readonly Node[];
  readonly scenarioAlarmEdges: readonly Edge[];
  readonly scenarioOnStopNodes: readonly Node[];
  readonly scenarioOnStopEdges: readonly Edge[];
  readonly scenarioOnDisconnectNodes: readonly Node[];
  readonly scenarioOnDisconnectEdges: readonly Edge[];
  readonly scenarioFunctions: readonly SerializeScenarioFunctionInput[];
  readonly scenarioInitialEntry?: string;
  readonly scenarioMainEntry?: string;
  readonly scenarioAlarmEntry?: string;
  readonly scenarioOnStopEntry?: string;
  readonly scenarioOnDisconnectEntry?: string;
}

/** Собирает `DeviceScenarioDocument` v1 из состояния канвасов. */
export function buildDeviceScenarioDocument(input: BuildDeviceScenarioInput): DeviceScenarioDocument {
  const base = createEmptyDeviceScenarioDocument(input.deviceKind);
  const scenario = createEmptyScenarioGraph();
  const initialEntry = input.scenarioInitialEntry ?? SCENARIO_INITIAL_ENTRY;
  const mainEntry = input.scenarioMainEntry ?? SCENARIO_MAIN_ENTRY;
  const alarmEntry = input.scenarioAlarmEntry ?? SCENARIO_ALARM_ENTRY;
  const onStopEntry = input.scenarioOnStopEntry ?? SCENARIO_ON_STOP_ENTRY;
  const onDisconnectEntry = input.scenarioOnDisconnectEntry ?? SCENARIO_ON_DISCONNECT_ENTRY;

  return {
    ...base,
    meta: input.title !== undefined ? { title: input.title } : base.meta,
    signalGraph: serializeSignalGraph(input.signalNodes, input.signalEdges),
    scenario: {
      ...scenario,
      initial: serializeScenarioSubgraph(
        initialEntry,
        input.scenarioInitialNodes,
        input.scenarioInitialEdges,
      ),
      loops: {
        main: serializeScenarioSubgraph(mainEntry, input.scenarioMainNodes, input.scenarioMainEdges),
        alarm: serializeScenarioSubgraph(alarmEntry, input.scenarioAlarmNodes, input.scenarioAlarmEdges),
      },
      triggers: {
        ...scenario.triggers,
        onStop: serializeScenarioSubgraph(
          onStopEntry,
          input.scenarioOnStopNodes,
          input.scenarioOnStopEdges,
        ),
        onDisconnect: serializeScenarioSubgraph(
          onDisconnectEntry,
          input.scenarioOnDisconnectNodes,
          input.scenarioOnDisconnectEdges,
        ),
      },
      functions: input.scenarioFunctions.map((fn) => serializeScenarioFunction(fn)),
    },
  };
}
