import type {
  DeviceKind,
  DeviceScenarioDocument,
  ScenarioFunctionSubgraph,
  ScenarioVariable,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import {
  buildDemoFunctionInput,
  DEMO_FUNCTION_CAPTURE_DETECT_EDGES,
  DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
  DEMO_FUNCTION_CAPTURE_DETECT_ID,
  DEMO_FUNCTION_CAPTURE_DETECT_NAME,
  DEMO_FUNCTION_CAPTURE_DETECT_NODES,
  INITIAL_SCENARIO_ALARM_EDGES,
  INITIAL_SCENARIO_ALARM_NODES,
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
  INITIAL_SCENARIO_ON_CONNECT_EDGES,
  INITIAL_SCENARIO_ON_CONNECT_NODES,
  INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
  INITIAL_SCENARIO_ON_DISCONNECT_NODES,
  INITIAL_SCENARIO_ON_STOP_EDGES,
  INITIAL_SCENARIO_ON_STOP_NODES,
  INITIAL_SIGNAL_EDGES,
  INITIAL_SIGNAL_NODES,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_ON_CONNECT_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './initial-board-state.js';
import { ensureEventEntry, syncEventNodePins } from './event-node.js';
import { deserializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
import { syncVariableNodePins } from './variable-node.js';
import { deserializeSignalGraph } from './serialize-signal-graph.js';
import type { SerializeScenarioFunctionInput } from './serialize-scenario-function.js';

export interface ScenarioFunctionCanvasMeta {
  readonly id: string;
  readonly name: string;
  readonly entry: string;
}

export interface HydratedBoardState {
  readonly deviceKind: DeviceKind;
  readonly signalNodes: Node[];
  readonly signalEdges: Edge[];
  readonly scenarioInitialNodes: Node[];
  readonly scenarioInitialEdges: Edge[];
  readonly scenarioOnConnectNodes: Node[];
  readonly scenarioOnConnectEdges: Edge[];
  readonly scenarioMainNodes: Node[];
  readonly scenarioMainEdges: Edge[];
  readonly scenarioAlarmNodes: Node[];
  readonly scenarioAlarmEdges: Edge[];
  readonly scenarioOnStopNodes: Node[];
  readonly scenarioOnStopEdges: Edge[];
  readonly scenarioOnDisconnectNodes: Node[];
  readonly scenarioOnDisconnectEdges: Edge[];
  readonly scenarioFunctionNodes: Node[];
  readonly scenarioFunctionEdges: Edge[];
  readonly scenarioFunctionMeta: ScenarioFunctionCanvasMeta;
  /** v0.4: переменные сценария (document-scope). */
  readonly variables: readonly ScenarioVariable[];
}

function resolveFunctionCanvas(
  functions: readonly ScenarioFunctionSubgraph[],
  variables: readonly ScenarioVariable[],
): {
  nodes: Node[];
  edges: Edge[];
  meta: ScenarioFunctionCanvasMeta;
} {
  const first = functions[0];
  if (first === undefined) {
    return {
      nodes: [...DEMO_FUNCTION_CAPTURE_DETECT_NODES],
      edges: [...DEMO_FUNCTION_CAPTURE_DETECT_EDGES],
      meta: {
        id: DEMO_FUNCTION_CAPTURE_DETECT_ID,
        name: DEMO_FUNCTION_CAPTURE_DETECT_NAME,
        entry: DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
      },
    };
  }

  const hydrated = deserializeScenarioSubgraph(
    {
      entry: first.entry,
      nodes: first.nodes,
      edges: first.edges,
    },
    variables,
  );

  return {
    nodes: hydrated.nodes,
    edges: hydrated.edges,
    meta: {
      id: first.id,
      name: first.name,
      entry: first.entry,
    },
  };
}

function fallbackSubgraph(
  subgraph: DeviceScenarioDocument['scenario']['initial'] | undefined,
  fallbackNodes: Node[],
  fallbackEdges: Edge[],
  variables: readonly ScenarioVariable[],
): { nodes: Node[]; edges: Edge[] } {
  if (subgraph === undefined || subgraph.nodes.length === 0) {
    return { nodes: [...fallbackNodes], edges: [...fallbackEdges] };
  }
  return deserializeScenarioSubgraph(subgraph, variables);
}

/** `DeviceScenarioDocument` → состояние всех канвасов XYFlow. */
export function hydrateBoardFromDocument(document: DeviceScenarioDocument): HydratedBoardState {
  const variables = document.scenario.variables;
  const signal = deserializeSignalGraph(document.signalGraph);
  const initial = fallbackSubgraph(document.scenario.initial, INITIAL_SCENARIO_INITIAL_NODES, INITIAL_SCENARIO_INITIAL_EDGES, variables);
  const onConnect = fallbackSubgraph(
    document.scenario.onConnect,
    INITIAL_SCENARIO_ON_CONNECT_NODES,
    INITIAL_SCENARIO_ON_CONNECT_EDGES,
    variables,
  );
  const main = fallbackSubgraph(document.scenario.loops.main, INITIAL_SCENARIO_MAIN_NODES, INITIAL_SCENARIO_MAIN_EDGES, variables);
  const alarm = fallbackSubgraph(document.scenario.loops.alarm, INITIAL_SCENARIO_ALARM_NODES, INITIAL_SCENARIO_ALARM_EDGES, variables);
  const onStop = fallbackSubgraph(
    document.scenario.triggers.onStop,
    INITIAL_SCENARIO_ON_STOP_NODES,
    INITIAL_SCENARIO_ON_STOP_EDGES,
    variables,
  );
  const onDisconnect = fallbackSubgraph(
    document.scenario.triggers.onDisconnect,
    INITIAL_SCENARIO_ON_DISCONNECT_NODES,
    INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
    variables,
  );
  const fn = resolveFunctionCanvas(document.scenario.functions, variables);

  // v0.4 (DBR3): системный Event-узел — обязательный entry каждого обработчика.
  // Авто-инжект для legacy/мигрированных документов без Event-узла.
  initial.nodes = ensureEventEntry(SCENARIO_INITIAL_ENTRY, initial.nodes, 'On start');
  onConnect.nodes = ensureEventEntry(SCENARIO_ON_CONNECT_ENTRY, onConnect.nodes, 'On connect', {
    includeServerOutput: true,
  });
  onStop.nodes = ensureEventEntry(SCENARIO_ON_STOP_ENTRY, onStop.nodes, 'On stop');
  onDisconnect.nodes = ensureEventEntry(
    SCENARIO_ON_DISCONNECT_ENTRY,
    onDisconnect.nodes,
    'On disconnect',
    { nullableDeviceOutput: true },
  );

  initial.nodes = syncEventNodePins(initial.nodes, 'initial');
  onConnect.nodes = syncEventNodePins(onConnect.nodes, 'onConnect');
  onStop.nodes = syncEventNodePins(onStop.nodes, 'onStop');
  onDisconnect.nodes = syncEventNodePins(onDisconnect.nodes, 'onDisconnect');

  initial.nodes = syncVariableNodePins(initial.nodes, variables);
  onConnect.nodes = syncVariableNodePins(onConnect.nodes, variables);
  main.nodes = syncVariableNodePins(main.nodes, variables);
  alarm.nodes = syncVariableNodePins(alarm.nodes, variables);
  onStop.nodes = syncVariableNodePins(onStop.nodes, variables);
  onDisconnect.nodes = syncVariableNodePins(onDisconnect.nodes, variables);
  fn.nodes = syncVariableNodePins(fn.nodes, variables);

  if (signal.nodes.length === 0) {
    signal.nodes.push(...INITIAL_SIGNAL_NODES);
    signal.edges.push(...INITIAL_SIGNAL_EDGES);
  }

  return {
    deviceKind: document.deviceKind,
    signalNodes: signal.nodes,
    signalEdges: signal.edges,
    scenarioInitialNodes: initial.nodes,
    scenarioInitialEdges: initial.edges,
    scenarioOnConnectNodes: onConnect.nodes,
    scenarioOnConnectEdges: onConnect.edges,
    scenarioMainNodes: main.nodes,
    scenarioMainEdges: main.edges,
    scenarioAlarmNodes: alarm.nodes,
    scenarioAlarmEdges: alarm.edges,
    scenarioOnStopNodes: onStop.nodes,
    scenarioOnStopEdges: onStop.edges,
    scenarioOnDisconnectNodes: onDisconnect.nodes,
    scenarioOnDisconnectEdges: onDisconnect.edges,
    scenarioFunctionNodes: fn.nodes,
    scenarioFunctionEdges: fn.edges,
    scenarioFunctionMeta: fn.meta,
    variables,
  };
}

/** Собирает вход для `buildDeviceScenarioDocument.scenarioFunctions` из гидратации. */
export function hydratedFunctionInput(state: HydratedBoardState): SerializeScenarioFunctionInput {
  return {
    id: state.scenarioFunctionMeta.id,
    name: state.scenarioFunctionMeta.name,
    entry: state.scenarioFunctionMeta.entry,
    nodes: state.scenarioFunctionNodes,
    edges: state.scenarioFunctionEdges,
  };
}

/** Демо-состояние доски (без JSON). */
export function createDefaultHydratedBoardState(deviceKind: DeviceKind = 'microphone'): HydratedBoardState {
  const demo = buildDemoFunctionInput();
  return {
    deviceKind,
    signalNodes: [...INITIAL_SIGNAL_NODES],
    signalEdges: [...INITIAL_SIGNAL_EDGES],
    scenarioInitialNodes: [...INITIAL_SCENARIO_INITIAL_NODES],
    scenarioInitialEdges: [...INITIAL_SCENARIO_INITIAL_EDGES],
    scenarioOnConnectNodes: [...INITIAL_SCENARIO_ON_CONNECT_NODES],
    scenarioOnConnectEdges: [...INITIAL_SCENARIO_ON_CONNECT_EDGES],
    scenarioMainNodes: [...INITIAL_SCENARIO_MAIN_NODES],
    scenarioMainEdges: [...INITIAL_SCENARIO_MAIN_EDGES],
    scenarioAlarmNodes: [...INITIAL_SCENARIO_ALARM_NODES],
    scenarioAlarmEdges: [...INITIAL_SCENARIO_ALARM_EDGES],
    scenarioOnStopNodes: [...INITIAL_SCENARIO_ON_STOP_NODES],
    scenarioOnStopEdges: [...INITIAL_SCENARIO_ON_STOP_EDGES],
    scenarioOnDisconnectNodes: [...INITIAL_SCENARIO_ON_DISCONNECT_NODES],
    scenarioOnDisconnectEdges: [...INITIAL_SCENARIO_ON_DISCONNECT_EDGES],
    scenarioFunctionNodes: [...demo.nodes],
    scenarioFunctionEdges: [...demo.edges],
    scenarioFunctionMeta: {
      id: demo.id,
      name: demo.name,
      entry: demo.entry,
    },
    variables: [],
  };
}
