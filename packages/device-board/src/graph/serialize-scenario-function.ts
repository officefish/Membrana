import type { ScenarioFunctionSubgraph } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

export interface SerializeScenarioFunctionInput {
  readonly id: string;
  readonly name: string;
  readonly entry: string;
  readonly inputPins?: readonly string[];
  readonly outputPins?: readonly string[];
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
}

/** XYFlow function canvas → `ScenarioFunctionSubgraph`. */
export function serializeScenarioFunction(input: SerializeScenarioFunctionInput): ScenarioFunctionSubgraph {
  const subgraph = serializeScenarioSubgraph(input.entry, input.nodes, input.edges);
  return {
    id: input.id,
    name: input.name,
    entry: subgraph.entry,
    nodes: subgraph.nodes,
    edges: subgraph.edges,
    inputPins: input.inputPins ?? ['exec-in'],
    outputPins: input.outputPins ?? ['exec-out'],
  };
}
