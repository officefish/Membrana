import {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  type ScenarioCollectorConfig,
} from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import {
  COLLECT_BATCH_OUT_HANDLE,
  COLLECT_EVENT_OUT_HANDLE,
} from './collect-node-shared.js';

export const COLLECT_SAMPLES_NODE_KIND = 'collect-samples' as const;

/** Data-вход RecorderRef singleton. */
export const COLLECT_SAMPLES_RECORDER_HANDLE = 'recorder' as const;

/** Data-вход AudioSampleRef за exec-тик. */
export const COLLECT_SAMPLES_SAMPLE_HANDLE = 'sample' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины CollectSamples: exec + recorder + sample in; exec + event + batches out. */
export function collectSamplesNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: COLLECT_SAMPLES_RECORDER_HANDLE,
        kind: 'data',
        socketType: 'RecorderRef',
      },
      {
        name: COLLECT_SAMPLES_SAMPLE_HANDLE,
        kind: 'data',
        socketType: 'AudioSampleRef',
      },
    ],
    outputs: [
      EXEC_OUT,
      { name: COLLECT_EVENT_OUT_HANDLE, kind: 'event' },
      {
        name: COLLECT_BATCH_OUT_HANDLE,
        kind: 'data',
        socketType: 'AudioSampleRefList',
      },
    ],
  };
}

export interface CreateCollectSamplesBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly collectorConfig?: Partial<ScenarioCollectorConfig>;
}

let collectSamplesSeq = 0;

/** Фабрика узла CollectSamples. */
export function createCollectSamplesBoardNode(
  options: CreateCollectSamplesBoardNodeOptions = {},
): Node {
  collectSamplesSeq += 1;
  const id = options.id ?? `node-collect-samples-${Date.now().toString(36)}-${collectSamplesSeq}`;
  const { inputs, outputs } = collectSamplesNodePins();
  const data: BoardFlowNodeData = {
    label: 'CollectSamples',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: COLLECT_SAMPLES_NODE_KIND,
    inputs,
    outputs,
    collectorConfig: {
      ...DEFAULT_SCENARIO_COLLECTOR_CONFIG,
      ...options.collectorConfig,
    },
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — CollectSamples. */
export function isCollectSamplesNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) && node.data.nodeKind === COLLECT_SAMPLES_NODE_KIND
  );
}
