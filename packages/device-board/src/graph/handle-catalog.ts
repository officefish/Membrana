import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardPinKind, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import { D0_SCENARIO_NODE_CATALOG, D0_SIGNAL_NODE_CATALOG } from './d0-node-catalog.js';

export interface ResolvedHandle {
  readonly pinKind: BoardPinKind;
  readonly socketType?: BoardSocketPin['socketType'];
}

function findPin(
  pins: readonly BoardSocketPin[] | undefined,
  handleId: string,
): BoardSocketPin | undefined {
  return pins?.find((pin) => pin.name === handleId);
}

function resolveFromCatalog(
  data: BoardFlowNodeData,
  handleId: string,
  role: 'source' | 'target',
): ResolvedHandle | null {
  if (data.layer === 'signal' && typeof data.pluginId === 'string') {
    const template = D0_SIGNAL_NODE_CATALOG[data.pluginId];
    if (template === undefined) {
      return null;
    }
    const pins = role === 'source' ? template.outputs : template.inputs;
    const pin = findPin(pins, handleId);
    if (pin === undefined) {
      return null;
    }
    return { pinKind: pin.kind, socketType: pin.socketType };
  }

  if (data.layer === 'scenario' && typeof data.blockKind === 'string') {
    const template = D0_SCENARIO_NODE_CATALOG[data.blockKind];
    if (template === undefined) {
      return null;
    }
    const pins = role === 'source' ? template.outputs : template.inputs;
    const pin = findPin(pins, handleId);
    if (pin === undefined) {
      return null;
    }
    return { pinKind: pin.kind, socketType: pin.socketType };
  }

  return null;
}

/** Разрешает handle → exec/data + SocketType по ноде и id handle. */
export function resolveHandle(
  nodes: readonly Node[],
  nodeId: string,
  handleId: string,
  role: 'source' | 'target',
): ResolvedHandle | null {
  const node = nodes.find((item) => item.id === nodeId);
  if (node === undefined || !isBoardFlowNodeData(node.data)) {
    return null;
  }

  const pins = role === 'source' ? node.data.outputs : node.data.inputs;
  const inlinePin = findPin(pins, handleId);
  if (inlinePin !== undefined) {
    return { pinKind: inlinePin.kind, socketType: inlinePin.socketType };
  }

  return resolveFromCatalog(node.data, handleId, role);
}
