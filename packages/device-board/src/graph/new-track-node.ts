import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

export const NEW_TRACK_NODE_KIND = 'new-track' as const;

/** Data-вход batch AudioSampleRef[] от CollectSamples. */
export const NEW_TRACK_SAMPLES_HANDLE = 'samples' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };

/** Пины NewTrack: exec-in + samples in; terminal — без выходов. */
export function newTrackNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: NEW_TRACK_SAMPLES_HANDLE,
        kind: 'data',
        socketType: 'AudioSampleRefList',
      },
    ],
    outputs: [],
  };
}

export interface CreateNewTrackBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let newTrackSeq = 0;

/** Фабрика terminal-узла NewTrack. */
export function createNewTrackBoardNode(options: CreateNewTrackBoardNodeOptions = {}): Node {
  newTrackSeq += 1;
  const id = options.id ?? `node-new-track-${Date.now().toString(36)}-${newTrackSeq}`;
  const { inputs, outputs } = newTrackNodePins();
  const data: BoardFlowNodeData = {
    label: 'NewTrack (legacy)',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: NEW_TRACK_NODE_KIND,
    inputs,
    outputs,
  };
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 0, y: 0 },
    data,
  };
}

/** True, если узел — NewTrack. */
export function isNewTrackNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === NEW_TRACK_NODE_KIND;
}
