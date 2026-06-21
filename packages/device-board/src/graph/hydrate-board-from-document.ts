import type {
  DeviceKind,
  DeviceScenarioDocument,
  ScenarioFunctionPin,
  ScenarioFunctionSubgraph,
  ScenarioVariable,
} from '@membrana/core';
import {
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
  normalizeScenarioFunctionPins,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import {
  buildDemoFunctionInput,
  DEMO_FUNCTION_CAPTURE_DETECT_EDGES,
  DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
  DEMO_FUNCTION_CAPTURE_DETECT_ID,
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
  SCENARIO_MAIN_BODY_ENTRY,
  SCENARIO_ALARM_BODY_ENTRY,
  SCENARIO_MAIN_INFINITY,
  SCENARIO_ALARM_INFINITY,
} from './initial-board-state.js';
import { ensureEventEntry, ensureLoopTickEntry, syncEventNodePins } from './event-node.js';
import { syncDeviceGlobalNodePins } from './device-global-node.js';
import { ensureLoopInfinity, syncLoopRepeatNodePins } from './loop-repeat-node.js';
import { deserializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
import { applyPureGraphHygiene } from './pure-node-graph.js';
import { deserializeSignalGraph } from './serialize-signal-graph.js';
import type { SerializeScenarioFunctionInput } from './serialize-scenario-function.js';
import { createDefaultMvpMicrophoneHydratedState } from './default-usercase-mvp-microphone.js';
import { syncFunctionIoNodePins } from './function-io-node.js';
import { syncAllSubgraphBlocksFromFunctionDrafts } from './function-pin-ops.js';
import { applyCommentGroupsToBranchNodes } from './comment-group.js';
import type { ScenarioFunctionDraft } from './collapse-to-function.js';

export interface ScenarioFunctionCanvasMeta {
  readonly id: string;
  readonly name: string;
  readonly entry: string;
  readonly description?: string;
  readonly inputPins: readonly ScenarioFunctionPin[];
  readonly outputPins: readonly ScenarioFunctionPin[];
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
  /** Все пользовательские функции (F1 multi-function). */
  readonly scenarioFunctionDrafts: readonly ScenarioFunctionDraft[];
  readonly activeFunctionId: string;
  /** v0.4: переменные сценария (document-scope). */
  readonly variables: readonly ScenarioVariable[];
}

function functionSubgraphToDraft(
  fn: ScenarioFunctionSubgraph,
  variables: readonly ScenarioVariable[],
): ScenarioFunctionDraft {
  const defaultInput = [createDefaultFunctionExecInputPin()];
  const defaultOutput = [createDefaultFunctionExecOutputPin()];
  const inputPins = normalizeScenarioFunctionPins(fn.inputPins, defaultInput);
  const outputPins = normalizeScenarioFunctionPins(fn.outputPins, defaultOutput);
  const hydrated = deserializeScenarioSubgraph(
    {
      entry: fn.entry,
      nodes: fn.nodes,
      edges: fn.edges,
    },
    variables,
  );
  const nodes = syncFunctionIoNodePins(hydrated.nodes, inputPins, outputPins);
  return {
    id: fn.id,
    name: fn.name,
    entry: fn.entry,
    description: fn.description,
    inputPins,
    outputPins,
    nodes,
    edges: hydrated.edges,
  };
}

function draftToCanvasState(draft: ScenarioFunctionDraft): {
  nodes: Node[];
  edges: Edge[];
  meta: ScenarioFunctionCanvasMeta;
} {
  return {
    nodes: [...draft.nodes],
    edges: [...draft.edges],
    meta: {
      id: draft.id,
      name: draft.name,
      entry: draft.entry,
      description: draft.description,
      inputPins: draft.inputPins,
      outputPins: draft.outputPins,
    },
  };
}

function resolveFunctionDrafts(
  functions: readonly ScenarioFunctionSubgraph[],
  variables: readonly ScenarioVariable[],
): {
  drafts: ScenarioFunctionDraft[];
  active: ScenarioFunctionDraft;
} {
  const demoFallback = (): ScenarioFunctionDraft => {
    const demo = buildDemoFunctionInput();
    return {
      id: demo.id,
      name: demo.name,
      entry: demo.entry,
      inputPins: [createDefaultFunctionExecInputPin()],
      outputPins: [createDefaultFunctionExecOutputPin()],
      nodes: [...DEMO_FUNCTION_CAPTURE_DETECT_NODES],
      edges: [...DEMO_FUNCTION_CAPTURE_DETECT_EDGES],
    };
  };

  if (functions.length === 0) {
    const draft = demoFallback();
    return { drafts: [draft], active: draft };
  }

  const drafts = functions.map((fn) => {
    const entryMissing = fn.nodes.length === 0 || !fn.nodes.some((node) => node.id === fn.entry);
    if (entryMissing && fn.id === DEMO_FUNCTION_CAPTURE_DETECT_ID) {
      return demoFallback();
    }
    return functionSubgraphToDraft(fn, variables);
  });

  return { drafts, active: drafts[0]! };
}

function resolveFunctionCanvas(
  functions: readonly ScenarioFunctionSubgraph[],
  variables: readonly ScenarioVariable[],
): {
  nodes: Node[];
  edges: Edge[];
  meta: ScenarioFunctionCanvasMeta;
  drafts: ScenarioFunctionDraft[];
  activeFunctionId: string;
} {
  const { drafts, active } = resolveFunctionDrafts(functions, variables);
  const canvas = draftToCanvasState(active);
  return {
    ...canvas,
    drafts,
    activeFunctionId: active.id,
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

function applyBranchPureHygiene(
  nodes: Node[],
  edges: Edge[],
  variables: readonly ScenarioVariable[],
): { nodes: Node[]; edges: Edge[] } {
  return applyPureGraphHygiene(nodes, edges, variables);
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

  const mainTick = ensureLoopTickEntry('main-on-tick', SCENARIO_MAIN_BODY_ENTRY, main.nodes, main.edges);
  const mainInfinity = ensureLoopInfinity(SCENARIO_MAIN_INFINITY, 'main-on-tick', mainTick.nodes, mainTick.edges);
  main.nodes = syncLoopRepeatNodePins(mainInfinity.nodes);
  main.edges = mainInfinity.edges;

  const alarmTick = ensureLoopTickEntry('alarm-on-tick', SCENARIO_ALARM_BODY_ENTRY, alarm.nodes, alarm.edges);
  const alarmInfinity = ensureLoopInfinity(SCENARIO_ALARM_INFINITY, 'alarm-on-tick', alarmTick.nodes, alarmTick.edges);
  alarm.nodes = syncLoopRepeatNodePins(alarmInfinity.nodes);
  alarm.edges = alarmInfinity.edges;

  const initialHygiene = applyBranchPureHygiene(initial.nodes, initial.edges, variables);
  initial.nodes = initialHygiene.nodes;
  initial.edges = initialHygiene.edges;
  const onConnectHygiene = applyBranchPureHygiene(onConnect.nodes, onConnect.edges, variables);
  onConnect.nodes = onConnectHygiene.nodes;
  onConnect.edges = onConnectHygiene.edges;
  const mainHygiene = applyBranchPureHygiene(main.nodes, main.edges, variables);
  main.nodes = mainHygiene.nodes;
  main.edges = mainHygiene.edges;
  const alarmHygiene = applyBranchPureHygiene(alarm.nodes, alarm.edges, variables);
  alarm.nodes = alarmHygiene.nodes;
  alarm.edges = alarmHygiene.edges;
  const onStopHygiene = applyBranchPureHygiene(onStop.nodes, onStop.edges, variables);
  onStop.nodes = onStopHygiene.nodes;
  onStop.edges = onStopHygiene.edges;
  const onDisconnectHygiene = applyBranchPureHygiene(onDisconnect.nodes, onDisconnect.edges, variables);
  onDisconnect.nodes = onDisconnectHygiene.nodes;
  onDisconnect.edges = onDisconnectHygiene.edges;
  const fnHygiene = applyBranchPureHygiene(fn.nodes, fn.edges, variables);
  fn.nodes = fnHygiene.nodes;
  fn.edges = fnHygiene.edges;

  initial.nodes = syncDeviceGlobalNodePins(initial.nodes);
  onConnect.nodes = syncDeviceGlobalNodePins(onConnect.nodes);
  main.nodes = syncDeviceGlobalNodePins(main.nodes);
  alarm.nodes = syncDeviceGlobalNodePins(alarm.nodes);
  onStop.nodes = syncDeviceGlobalNodePins(onStop.nodes);
  onDisconnect.nodes = syncDeviceGlobalNodePins(onDisconnect.nodes);
  fn.nodes = syncDeviceGlobalNodePins(fn.nodes);

  syncAllSubgraphBlocksFromFunctionDrafts(
    [
      { nodes: initial.nodes, edges: initial.edges },
      { nodes: onConnect.nodes, edges: onConnect.edges },
      { nodes: main.nodes, edges: main.edges },
      { nodes: alarm.nodes, edges: alarm.edges },
      { nodes: onStop.nodes, edges: onStop.edges },
      { nodes: onDisconnect.nodes, edges: onDisconnect.edges },
    ],
    fn.drafts,
  );

  const commentGroups = document.scenario.commentGroups ?? [];
  signal.nodes = applyCommentGroupsToBranchNodes(signal.nodes, commentGroups, 'signal');
  initial.nodes = applyCommentGroupsToBranchNodes(initial.nodes, commentGroups, 'initial');
  onConnect.nodes = applyCommentGroupsToBranchNodes(onConnect.nodes, commentGroups, 'onConnect');
  main.nodes = applyCommentGroupsToBranchNodes(main.nodes, commentGroups, 'main');
  alarm.nodes = applyCommentGroupsToBranchNodes(alarm.nodes, commentGroups, 'alarm');
  onStop.nodes = applyCommentGroupsToBranchNodes(onStop.nodes, commentGroups, 'onStop');
  onDisconnect.nodes = applyCommentGroupsToBranchNodes(
    onDisconnect.nodes,
    commentGroups,
    'onDisconnect',
  );
  fn.nodes = applyCommentGroupsToBranchNodes(fn.nodes, commentGroups, 'function');

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
    scenarioFunctionDrafts: fn.drafts,
    activeFunctionId: fn.activeFunctionId,
    variables,
  };
}

function draftToSerializeInput(draft: ScenarioFunctionDraft): SerializeScenarioFunctionInput {
  return {
    id: draft.id,
    name: draft.name,
    entry: draft.entry,
    description: draft.description,
    inputPins: draft.inputPins,
    outputPins: draft.outputPins,
    nodes: draft.nodes,
    edges: draft.edges,
  };
}

/** Активная функция → serialize input (legacy helper). */
export function hydratedFunctionInput(state: HydratedBoardState): SerializeScenarioFunctionInput {
  const activeDraft =
    state.scenarioFunctionDrafts.find((draft) => draft.id === state.activeFunctionId) ??
    state.scenarioFunctionDrafts[0];
  if (activeDraft !== undefined) {
    return draftToSerializeInput(activeDraft);
  }

  const entryMissing =
    state.scenarioFunctionNodes.length === 0 ||
    !state.scenarioFunctionNodes.some((node) => node.id === state.scenarioFunctionMeta.entry);

  if (entryMissing) {
    const demo = buildDemoFunctionInput();
    return {
      id: state.scenarioFunctionMeta.id || demo.id,
      name: state.scenarioFunctionMeta.name || demo.name,
      entry: DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
      inputPins: state.scenarioFunctionMeta.inputPins,
      outputPins: state.scenarioFunctionMeta.outputPins,
      nodes: [...DEMO_FUNCTION_CAPTURE_DETECT_NODES],
      edges: [...DEMO_FUNCTION_CAPTURE_DETECT_EDGES],
    };
  }

  return {
    id: state.scenarioFunctionMeta.id,
    name: state.scenarioFunctionMeta.name,
    entry: state.scenarioFunctionMeta.entry,
    description: state.scenarioFunctionMeta.description,
    inputPins: state.scenarioFunctionMeta.inputPins,
    outputPins: state.scenarioFunctionMeta.outputPins,
    nodes: state.scenarioFunctionNodes,
    edges: state.scenarioFunctionEdges,
  };
}

/** Все функции для `buildDeviceScenarioDocument.scenarioFunctions`. */
export function hydratedFunctionInputs(state: HydratedBoardState): readonly SerializeScenarioFunctionInput[] {
  if (state.scenarioFunctionDrafts.length > 0) {
    return state.scenarioFunctionDrafts.map((draft) => {
      if (draft.id === state.activeFunctionId) {
        return {
          ...draftToSerializeInput(draft),
          nodes: state.scenarioFunctionNodes,
          edges: state.scenarioFunctionEdges,
          description: state.scenarioFunctionMeta.description,
          inputPins: state.scenarioFunctionMeta.inputPins,
          outputPins: state.scenarioFunctionMeta.outputPins,
          name: state.scenarioFunctionMeta.name,
          entry: state.scenarioFunctionMeta.entry,
        };
      }
      return draftToSerializeInput(draft);
    });
  }
  return [hydratedFunctionInput(state)];
}

/** Демо-состояние доски (без JSON). Microphone → bundled UserCase MVP. */
export function createDefaultHydratedBoardState(deviceKind: DeviceKind = 'microphone'): HydratedBoardState {
  if (deviceKind === 'microphone') {
    return createDefaultMvpMicrophoneHydratedState();
  }

  const demo = buildDemoFunctionInput();
  const demoDraft: ScenarioFunctionDraft = {
    id: demo.id,
    name: demo.name,
    entry: demo.entry,
    inputPins: [createDefaultFunctionExecInputPin()],
    outputPins: [createDefaultFunctionExecOutputPin()],
    nodes: [...demo.nodes],
    edges: [...demo.edges],
  };
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
      inputPins: demoDraft.inputPins,
      outputPins: demoDraft.outputPins,
    },
    scenarioFunctionDrafts: [demoDraft],
    activeFunctionId: demo.id,
    variables: [],
  };
}
