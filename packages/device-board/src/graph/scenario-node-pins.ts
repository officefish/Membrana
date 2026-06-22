import type { ScenarioNodeKind, ScenarioVariable } from '@membrana/core';
import type { Node } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import { deviceGlobalNodePins } from './device-global-node.js';
import {
  eventNodePins,
  loopTickEventNodePins,
} from './event-node.js';
import { isPaletteNodeKind, paletteNodePins } from './palette-node.js';
import { stopRuntimeNodePins } from './stop-runtime-node.js';
import { pauseRuntimeNodePins } from './pause-runtime-node.js';
import { variableNodePins } from './variable-node.js';

export interface ScenarioNodePinLayout {
  readonly inputs: readonly BoardSocketPin[];
  readonly outputs: readonly BoardSocketPin[];
}

/**
 * Канонические пины v0.4-узла по `nodeKind` (и типу переменной для get/set).
 * Используется при resolve handle и подсказках соединений, если inline-пины устарели.
 */
export function scenarioNodePinsForKind(
  nodeKind: ScenarioNodeKind,
  options: {
    readonly variableType?: ScenarioVariable['type'];
    readonly eventVariant?: BoardFlowNodeData['eventVariant'];
  } = {},
): ScenarioNodePinLayout | null {
  switch (nodeKind) {
    case 'device-global':
      return deviceGlobalNodePins();
    case 'stop-runtime':
      return stopRuntimeNodePins();
    case 'pause-runtime':
      return pauseRuntimeNodePins();
    case 'event':
      if (options.eventVariant === 'loopTick') {
        return loopTickEventNodePins();
      }
      return eventNodePins({
        nullableDeviceOutput: true,
        includeServerOutput: true,
      });
    case 'variable-get':
    case 'variable-set':
      if (options.variableType === undefined) {
        return null;
      }
      return variableNodePins(nodeKind, options.variableType);
    default:
      if (isPaletteNodeKind(nodeKind)) {
        return paletteNodePins(nodeKind);
      }
      return null;
  }
}

/** Пины узла: каноническая схема nodeKind → fallback на inline data. */
export function resolveBoardNodePinLayout(
  node: Node,
  variables: readonly ScenarioVariable[] = [],
): ScenarioNodePinLayout {
  if (!isBoardFlowNodeData(node.data)) {
    return { inputs: [], outputs: [] };
  }

  const data = node.data;
  const inlineInputs = data.inputs;
  const inlineOutputs = data.outputs;

  const nodeKind = data.nodeKind;
  if (nodeKind !== undefined) {
    let variableType: ScenarioVariable['type'] | undefined;
    if (nodeKind === 'variable-get' || nodeKind === 'variable-set') {
      const variableId = data.variableId;
      if (typeof variableId === 'string') {
        variableType = variables.find((item) => item.id === variableId)?.type;
      }
    }

    const fromKind = scenarioNodePinsForKind(nodeKind, {
      variableType,
      eventVariant: data.eventVariant,
    });
    if (fromKind !== null) {
      return fromKind;
    }
  }

  return { inputs: inlineInputs ?? [], outputs: inlineOutputs ?? [] };
}

/** Data/exec pin на выходе узла по id handle. */
export function resolveBoardNodeOutputPin(
  node: Node,
  handleId: string,
  variables: readonly ScenarioVariable[] = [],
): BoardSocketPin | undefined {
  const { outputs } = resolveBoardNodePinLayout(node, variables);
  return outputs.find((pin) => pin.name === handleId);
}
