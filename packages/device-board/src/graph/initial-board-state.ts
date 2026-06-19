import type { Edge, Node } from '@xyflow/react';

import { D0_SCENARIO_NODE_CATALOG, D0_SIGNAL_NODE_CATALOG } from './d0-node-catalog.js';
import { createEventBoardNode, createLoopTickEventBoardNode } from './event-node.js';
import { createLoopRepeatBoardNode } from './loop-repeat-node.js';

/** Системный Event-узел (entry ветви-обработчика). */
function eventNode(
  id: string,
  x: number,
  y: number,
  label?: string,
  pinOptions: { nullableDeviceOutput?: boolean; includeServerOutput?: boolean } = {},
): Node {
  return createEventBoardNode({
    id,
    label,
    position: { x, y },
    nullableDeviceOutput: pinOptions.nullableDeviceOutput === true,
    includeServerOutput: pinOptions.includeServerOutput === true,
  });
}

function execEdge(id: string, source: string, target: string): Edge {
  return {
    id,
    source,
    sourceHandle: 'exec-out',
    target,
    targetHandle: 'exec-in',
  };
}

function signalNode(
  id: string,
  pluginId: keyof typeof D0_SIGNAL_NODE_CATALOG,
  x: number,
  y: number,
  status: 'active' | 'inactive' = 'active',
): Node {
  const template = D0_SIGNAL_NODE_CATALOG[pluginId]!;
  return {
    id,
    type: 'board',
    position: { x, y },
    data: {
      label: template.label,
      layer: 'signal',
      status,
      pluginId: template.pluginId,
      inputs: template.inputs,
      outputs: template.outputs,
    },
  };
}

function scenarioNode(
  id: string,
  blockKind: keyof typeof D0_SCENARIO_NODE_CATALOG,
  x: number,
  y: number,
  label?: string,
  functionId?: string,
): Node {
  const template = D0_SCENARIO_NODE_CATALOG[blockKind]!;
  return {
    id,
    type: 'board',
    position: { x, y },
    data: {
      label: label ?? template.label,
      layer: 'scenario',
      status: 'active',
      blockKind: template.blockKind,
      inputs: template.inputs,
      outputs: template.outputs,
      ...(functionId !== undefined ? { functionId } : {}),
    },
  };
}

export const INITIAL_SIGNAL_NODES: Node[] = [
  signalNode('signal-capture', 'microphone', 80, 140),
  signalNode('signal-analyzer', 'fft-analyzer', 340, 140, 'inactive'),
];

export const INITIAL_SIGNAL_EDGES: Edge[] = [
  {
    id: 'signal-e1',
    source: 'signal-capture',
    sourceHandle: 'audio-out',
    target: 'signal-analyzer',
    targetHandle: 'audio-in',
  },
];

/** onStart branch (сериализуется как `initial`): Event → mic → stream → journal */
export const INITIAL_SCENARIO_INITIAL_NODES: Node[] = [
  eventNode('initial-event', 40, 140, 'On start'),
  scenarioNode('initial-select', 'select-microphone', 280, 140),
  scenarioNode('initial-stream', 'start-stream', 500, 140),
  scenarioNode('initial-journal', 'write-journal', 720, 140),
];

export const INITIAL_SCENARIO_INITIAL_EDGES: Edge[] = [
  execEdge('initial-e0', 'initial-event', 'initial-select'),
  execEdge('initial-e1', 'initial-select', 'initial-stream'),
  execEdge('initial-e2', 'initial-stream', 'initial-journal'),
];

/** onConnect branch: системный Event (даёт постоянную DeviceRef после set Device). */
export const INITIAL_SCENARIO_ON_CONNECT_NODES: Node[] = [
  eventNode('on-connect-event', 40, 140, 'On connect', { includeServerOutput: true }),
];

export const INITIAL_SCENARIO_ON_CONNECT_EDGES: Edge[] = [];

/** Function: record → detect (reused in main loop via subgraph block). */
export const DEMO_FUNCTION_CAPTURE_DETECT_ID = 'fn-capture-detect' as const;
export const DEMO_FUNCTION_CAPTURE_DETECT_NAME = 'Capture+Detect' as const;
export const DEMO_FUNCTION_CAPTURE_DETECT_ENTRY = 'fn-record' as const;

export const DEMO_FUNCTION_CAPTURE_DETECT_NODES: Node[] = [
  scenarioNode('fn-record', 'record-chunk', 80, 140),
  scenarioNode('fn-detect', 'trends-fft-detect', 300, 140),
];

export const DEMO_FUNCTION_CAPTURE_DETECT_EDGES: Edge[] = [
  {
    id: 'fn-e1',
    source: 'fn-record',
    sourceHandle: 'exec-out',
    target: 'fn-detect',
    targetHandle: 'exec-in',
  },
];

/** Вход для `buildDeviceScenarioDocument.scenarioFunctions`. */
export function buildDemoFunctionInput(
  nodes: readonly Node[] = DEMO_FUNCTION_CAPTURE_DETECT_NODES,
  edges: readonly Edge[] = DEMO_FUNCTION_CAPTURE_DETECT_EDGES,
) {
  return {
    id: DEMO_FUNCTION_CAPTURE_DETECT_ID,
    name: DEMO_FUNCTION_CAPTURE_DETECT_NAME,
    entry: DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
    nodes,
    edges,
  };
}

/** Main loop: onTick → subgraph(fn) → journal → ∞ */
export const INITIAL_SCENARIO_MAIN_NODES: Node[] = [
  createLoopTickEventBoardNode({ id: 'main-on-tick', label: 'onTick', position: { x: 40, y: 160 } }),
  scenarioNode('main-fn', 'subgraph', 240, 160, DEMO_FUNCTION_CAPTURE_DETECT_NAME, DEMO_FUNCTION_CAPTURE_DETECT_ID),
  scenarioNode('main-journal', 'write-journal', 520, 160),
  createLoopRepeatBoardNode({ id: 'main-infinity', position: { x: 760, y: 160 } }),
];

export const INITIAL_SCENARIO_MAIN_EDGES: Edge[] = [
  execEdge('main-e0', 'main-on-tick', 'main-fn'),
  {
    id: 'main-e1',
    source: 'main-fn',
    sourceHandle: 'exec-out',
    target: 'main-journal',
    targetHandle: 'exec-in',
  },
  execEdge('main-e2', 'main-journal', 'main-infinity'),
];

/**
 * v0.4: entry-точки обработчиков событий — системные Event-узлы.
 * `SCENARIO_INITIAL_ENTRY` соответствует обработчику `onStart` (ветка `initial`).
 */
export const SCENARIO_INITIAL_ENTRY = 'initial-event' as const;
export const SCENARIO_ON_CONNECT_ENTRY = 'on-connect-event' as const;
export const SCENARIO_MAIN_ENTRY = 'main-on-tick' as const;
export const SCENARIO_MAIN_BODY_ENTRY = 'main-fn' as const;
export const SCENARIO_ALARM_ENTRY = 'alarm-on-tick' as const;
export const SCENARIO_ALARM_BODY_ENTRY = 'alarm-eval' as const;
export const SCENARIO_MAIN_INFINITY = 'main-infinity' as const;
export const SCENARIO_ALARM_INFINITY = 'alarm-infinity' as const;
export const SCENARIO_ON_STOP_ENTRY = 'on-stop-event' as const;
export const SCENARIO_ON_DISCONNECT_ENTRY = 'on-disconnect-event' as const;

/** On disconnect trigger: Event → journal → teardown (T3) */
export const INITIAL_SCENARIO_ON_DISCONNECT_NODES: Node[] = [
  eventNode('on-disconnect-event', 40, 160, 'On disconnect', { nullableDeviceOutput: true }),
  scenarioNode('on-disc-journal', 'write-journal', 280, 160, 'Disconnect journal'),
  scenarioNode('on-disc-teardown', 'handle-disconnect', 500, 160),
];

export const INITIAL_SCENARIO_ON_DISCONNECT_EDGES: Edge[] = [
  execEdge('on-disc-e0', 'on-disconnect-event', 'on-disc-journal'),
  execEdge('on-disc-e1', 'on-disc-journal', 'on-disc-teardown'),
];

/** On stop trigger: Event → final journal → teardown stream (T1/T2) */
export const INITIAL_SCENARIO_ON_STOP_NODES: Node[] = [
  eventNode('on-stop-event', 40, 160, 'On stop'),
  scenarioNode('on-stop-journal', 'write-journal', 280, 160, 'Stop journal'),
  scenarioNode('on-stop-teardown', 'handle-disconnect', 500, 160),
];

export const INITIAL_SCENARIO_ON_STOP_EDGES: Edge[] = [
  execEdge('on-stop-e0', 'on-stop-event', 'on-stop-journal'),
  execEdge('on-stop-e1', 'on-stop-journal', 'on-stop-teardown'),
];

/** Alarm loop: onTick → sound level → journal → ∞ */
export const INITIAL_SCENARIO_ALARM_NODES: Node[] = [
  createLoopTickEventBoardNode({ id: 'alarm-on-tick', label: 'onTick', position: { x: 40, y: 180 } }),
  scenarioNode('alarm-eval', 'evaluate-sound-level', 240, 180),
  scenarioNode('alarm-journal', 'write-journal', 480, 180, 'Alarm journal'),
  createLoopRepeatBoardNode({ id: 'alarm-infinity', position: { x: 720, y: 180 } }),
];

export const INITIAL_SCENARIO_ALARM_EDGES: Edge[] = [
  execEdge('alarm-e0', 'alarm-on-tick', 'alarm-eval'),
  {
    id: 'alarm-e1',
    source: 'alarm-eval',
    sourceHandle: 'exec-out',
    target: 'alarm-journal',
    targetHandle: 'exec-in',
  },
  execEdge('alarm-e2', 'alarm-journal', 'alarm-infinity'),
];
