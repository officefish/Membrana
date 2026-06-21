import type { ScenarioSubgraph, ScenarioVariable, ScenarioVariableValue } from '@membrana/core';

import { resolveNodeOutput, type ResolveInputContext } from './resolve-input.js';

export interface FunctionCallResolveInput {
  readonly parentSubgraph: ScenarioSubgraph;
  readonly blockNodeId: string;
  readonly variables: readonly ScenarioVariable[];
  readonly baseContext: ResolveInputContext | undefined;
}

/**
 * Augments resolve context for exec inside a user function:
 * `function-input` pins pull values from parent branch edges into the block.
 *
 * Editor pin definitions: `graph/function-pin-ops.ts`.
 * Exec chain traversal: `exec-successor.ts`.
 */
export function augmentResolveContextForFunctionCall(
  input: FunctionCallResolveInput,
): ResolveInputContext {
  const { parentSubgraph, blockNodeId, variables, baseContext } = input;
  const base = baseContext ?? {};

  const resolveFunctionInputPin = (pinId: string): ScenarioVariableValue | null => {
    const inbound = parentSubgraph.edges.find(
      (edge) =>
        edge.kind === 'data' && edge.target === blockNodeId && edge.targetHandle === pinId,
    );
    if (inbound === undefined) {
      return null;
    }
    const sourceNode = parentSubgraph.nodes.find((node) => node.id === inbound.source);
    if (sourceNode === undefined || inbound.sourceHandle === undefined) {
      return null;
    }
    return resolveNodeOutput(
      parentSubgraph,
      variables,
      sourceNode,
      inbound.sourceHandle,
      base,
      new Set(),
    );
  };

  return {
    ...base,
    resolveFunctionInputPin,
  };
}
