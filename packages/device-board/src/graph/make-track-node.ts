import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

export const MAKE_TRACK_NODE_KIND = 'make-track' as const;

/** @deprecated Сериализованные сценарии v0.5; runtime принимает для миграции. */
export const LEGACY_MAKE_TRACK_NODE_KIND = 'new-track' as const;

/** Data-вход RecorderRef (метод singleton-сессии). */
export const MAKE_TRACK_RECORDER_HANDLE = 'recorder' as const;

/** Data-вход batch AudioSampleRef[] от CollectSamples. */
export const MAKE_TRACK_SAMPLES_HANDLE = 'samples' as const;

/** Data-выход TrackRef. */
export const MAKE_TRACK_OUT_HANDLE = 'track' as const;

const EXEC_IN: BoardSocketPin = { name: 'exec-in', kind: 'exec' };
const EXEC_OUT: BoardSocketPin = { name: 'exec-out', kind: 'exec' };

/** Пины MakeTrack: exec + recorder + sample batch in → track out. */
export function makeTrackNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [
      EXEC_IN,
      {
        name: MAKE_TRACK_RECORDER_HANDLE,
        kind: 'data',
        socketType: 'RecorderRef',
      },
      {
        name: MAKE_TRACK_SAMPLES_HANDLE,
        kind: 'data',
        socketType: 'AudioSampleRefList',
      },
    ],
    outputs: [
      EXEC_OUT,
      {
        name: MAKE_TRACK_OUT_HANDLE,
        kind: 'data',
        socketType: 'TrackRef',
      },
    ],
  };
}

export interface CreateMakeTrackBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

let makeTrackSeq = 0;

/** Узел MakeTrack — метод RecorderRef: batch сэмплов → TrackRef. */
export function createMakeTrackBoardNode(options: CreateMakeTrackBoardNodeOptions = {}): Node {
  makeTrackSeq += 1;
  const id = options.id ?? `node-make-track-${Date.now().toString(36)}-${makeTrackSeq}`;
  const { inputs, outputs } = makeTrackNodePins();
  const data: BoardFlowNodeData = {
    label: 'MakeTrack',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: MAKE_TRACK_NODE_KIND,
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

/** True, если узел — MakeTrack (включая legacy `new-track`). */
export function isMakeTrackNode(node: Node): boolean {
  return (
    isBoardFlowNodeData(node.data) &&
    (node.data.nodeKind === MAKE_TRACK_NODE_KIND ||
      (node.data.nodeKind as string) === LEGACY_MAKE_TRACK_NODE_KIND)
  );
}

/** True, если nodeKind — MakeTrack (включая legacy). */
export function isMakeTrackNodeKind(
  kind: string | undefined,
): kind is typeof MAKE_TRACK_NODE_KIND | typeof LEGACY_MAKE_TRACK_NODE_KIND {
  return kind === MAKE_TRACK_NODE_KIND || kind === LEGACY_MAKE_TRACK_NODE_KIND;
}
