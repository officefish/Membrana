import type { Node } from '@xyflow/react';
import type { ScenarioBlockKind } from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from './d0-node-catalog.js';

export interface CreateScenarioBoardNodeOptions {
  readonly id?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly label?: string;
}

let scenarioNodeSeq = 0;

/**
 * Фабрика scenario-ноды доски из каталога блоков (MP7b RT6, палитра).
 * id уникален в рамках сессии; позиция по умолчанию — со смещением.
 */
export function createScenarioBoardNode(
  blockKind: ScenarioBlockKind,
  options: CreateScenarioBoardNodeOptions = {},
): Node {
  const template = D0_SCENARIO_NODE_CATALOG[blockKind];
  scenarioNodeSeq += 1;
  const id = options.id ?? `node-${blockKind}-${Date.now().toString(36)}-${scenarioNodeSeq}`;
  const offset = (scenarioNodeSeq % 5) * 40;
  return {
    id,
    type: 'board',
    position: options.position ?? { x: 120 + offset, y: 120 + offset },
    data: {
      label: options.label ?? template.label,
      layer: 'scenario',
      status: 'active',
      blockKind: template.blockKind,
      inputs: template.inputs,
      outputs: template.outputs,
    },
  };
}
