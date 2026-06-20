import type { ScenarioFunctionSubgraph, ScenarioGraphNode } from '@membrana/core';

import type { PreRunValidationIssue } from './validate-pre-run.js';
import { parseSubgraphFunctionId } from './subgraph-ref.js';

export interface SubgraphNodesRef {
  readonly path: string;
  readonly nodes: readonly ScenarioGraphNode[];
}

/** Проверяет depth ≤ 1 и ссылки subgraph → function. */
export function validateFunctionDepth(
  functions: readonly ScenarioFunctionSubgraph[],
  subgraphs: readonly SubgraphNodesRef[],
): readonly PreRunValidationIssue[] {
  const issues: PreRunValidationIssue[] = [];
  const functionIds = new Set(functions.map((fn) => fn.id));

  for (const fn of functions) {
    if (fn.nodes.some((node) => node.blockKind === 'subgraph')) {
      issues.push({
        code: 'function-nested-subgraph',
        message: `Функция «${fn.name}» не может содержать subgraph-блоки (depth ≤ 1)`,
        path: `scenario.functions.${fn.id}`,
      });
    }
  }

  for (const { path, nodes } of subgraphs) {
    for (const node of nodes) {
      if (node.blockKind !== 'subgraph') {
        continue;
      }
      const functionId = parseSubgraphFunctionId(node);
      if (functionId === null || !functionIds.has(functionId)) {
        issues.push({
          code: 'subgraph-ref-missing',
          message: `Subgraph-блок «${node.id}» ссылается на неизвестную функцию «${functionId ?? '?'}»`,
          path: `${path}/${node.id}`,
        });
      }
    }
  }

  return issues;
}
