import type { Edge, Node } from '@xyflow/react';

import { D0_SCENARIO_NODE_CATALOG, D0_SIGNAL_NODE_CATALOG } from './d0-node-catalog.js';

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
    animated: true,
  },
];

/** Initial branch: mic → stream → journal */
export const INITIAL_SCENARIO_INITIAL_NODES: Node[] = [
  scenarioNode('initial-entry', 'select-microphone', 80, 140),
  scenarioNode('initial-stream', 'start-stream', 300, 140),
  scenarioNode('initial-journal', 'write-journal', 520, 140),
];

export const INITIAL_SCENARIO_INITIAL_EDGES: Edge[] = [
  {
    id: 'initial-e1',
    source: 'initial-entry',
    sourceHandle: 'exec-out',
    target: 'initial-stream',
    targetHandle: 'exec-in',
    animated: true,
  },
  {
    id: 'initial-e2',
    source: 'initial-stream',
    sourceHandle: 'exec-out',
    target: 'initial-journal',
    targetHandle: 'exec-in',
    animated: true,
  },
];

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
    animated: true,
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

/** Main loop: subgraph(fn) → journal → loop */
export const INITIAL_SCENARIO_MAIN_NODES: Node[] = [
  scenarioNode('main-fn', 'subgraph', 80, 160, DEMO_FUNCTION_CAPTURE_DETECT_NAME, DEMO_FUNCTION_CAPTURE_DETECT_ID),
  scenarioNode('main-journal', 'write-journal', 360, 160),
];

export const INITIAL_SCENARIO_MAIN_EDGES: Edge[] = [
  {
    id: 'main-e1',
    source: 'main-fn',
    sourceHandle: 'exec-out',
    target: 'main-journal',
    targetHandle: 'exec-in',
    animated: true,
  },
  {
    id: 'main-e2',
    source: 'main-journal',
    sourceHandle: 'exec-out',
    target: 'main-fn',
    targetHandle: 'exec-in',
    animated: true,
  },
];

export const SCENARIO_INITIAL_ENTRY = 'initial-entry' as const;
export const SCENARIO_MAIN_ENTRY = 'main-fn' as const;
export const SCENARIO_ALARM_ENTRY = 'alarm-eval' as const;
export const SCENARIO_ON_STOP_ENTRY = 'on-stop-journal' as const;
export const SCENARIO_ON_DISCONNECT_ENTRY = 'on-disc-journal' as const;

/** On disconnect trigger: journal → teardown (T3) */
export const INITIAL_SCENARIO_ON_DISCONNECT_NODES: Node[] = [
  scenarioNode('on-disc-journal', 'write-journal', 80, 160, 'Disconnect journal'),
  scenarioNode('on-disc-teardown', 'handle-disconnect', 320, 160),
];

export const INITIAL_SCENARIO_ON_DISCONNECT_EDGES: Edge[] = [
  {
    id: 'on-disc-e1',
    source: 'on-disc-journal',
    sourceHandle: 'exec-out',
    target: 'on-disc-teardown',
    targetHandle: 'exec-in',
    animated: true,
  },
];

/** On stop trigger: final journal → teardown stream (T1/T2) */
export const INITIAL_SCENARIO_ON_STOP_NODES: Node[] = [
  scenarioNode('on-stop-journal', 'write-journal', 80, 160, 'Stop journal'),
  scenarioNode('on-stop-teardown', 'handle-disconnect', 320, 160),
];

export const INITIAL_SCENARIO_ON_STOP_EDGES: Edge[] = [
  {
    id: 'on-stop-e1',
    source: 'on-stop-journal',
    sourceHandle: 'exec-out',
    target: 'on-stop-teardown',
    targetHandle: 'exec-in',
    animated: true,
  },
];

/** Alarm loop: sound level → journal → loop until quiet */
export const INITIAL_SCENARIO_ALARM_NODES: Node[] = [
  scenarioNode('alarm-eval', 'evaluate-sound-level', 80, 180),
  scenarioNode('alarm-journal', 'write-journal', 320, 180, 'Alarm journal'),
];

export const INITIAL_SCENARIO_ALARM_EDGES: Edge[] = [
  {
    id: 'alarm-e1',
    source: 'alarm-eval',
    sourceHandle: 'exec-out',
    target: 'alarm-journal',
    targetHandle: 'exec-in',
    animated: true,
  },
  {
    id: 'alarm-e2',
    source: 'alarm-journal',
    sourceHandle: 'exec-out',
    target: 'alarm-eval',
    targetHandle: 'exec-in',
    animated: true,
  },
];
