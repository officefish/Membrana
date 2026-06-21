import type { ScenarioFunctionSubgraph } from '@membrana/core';
import {
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
  normalizeScenarioFunctionPins,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
import type { ScenarioFunctionPin } from '@membrana/core';

export interface SerializeScenarioFunctionInput {
  readonly id: string;
  readonly name: string;
  readonly entry: string;
  readonly description?: string;
  readonly inputPins?: readonly ScenarioFunctionPin[];
  readonly outputPins?: readonly ScenarioFunctionPin[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
}

/** XYFlow function canvas → `ScenarioFunctionSubgraph`. */
export function serializeScenarioFunction(input: SerializeScenarioFunctionInput): ScenarioFunctionSubgraph {
  const subgraph = serializeScenarioSubgraph(input.entry, input.nodes, input.edges);
  const defaultInput = [createDefaultFunctionExecInputPin()];
  const defaultOutput = [createDefaultFunctionExecOutputPin()];
  return {
    id: input.id,
    name: input.name,
    entry: subgraph.entry,
    nodes: subgraph.nodes,
    edges: subgraph.edges,
    inputPins: normalizeScenarioFunctionPins(input.inputPins, defaultInput),
    outputPins: normalizeScenarioFunctionPins(input.outputPins, defaultOutput),
    ...(input.description !== undefined && input.description.trim().length > 0
      ? { description: input.description.trim() }
      : {}),
  };
}
