import type { UserCaseValidationError } from './types.js';
import type { ValidationWireGraph } from './validation-graph.js';

/**
 * Pure link integrity for a serialized subgraph (missing endpoints, handles).
 * Socket compatibility is checked in graph `validatePreRun` (needs React Flow pins).
 */
export function validateBlockLinks(
  subgraph: ValidationWireGraph,
  pathPrefix: string,
): readonly UserCaseValidationError[] {
  const issues: UserCaseValidationError[] = [];
  if (subgraph.nodes.length === 0 && subgraph.edges.length === 0) {
    return issues;
  }

  const nodeIds = new Set(subgraph.nodes.map((node) => node.id));

  if (
    subgraph.entry !== undefined &&
    subgraph.nodes.length > 0 &&
    !nodeIds.has(subgraph.entry)
  ) {
    issues.push({
      code: 'subgraph-entry-missing',
      message: `Точка входа «${subgraph.entry}» не найдена среди нод`,
      blockId: subgraph.entry,
      path: `${pathPrefix}/entry`,
    });
  }

  for (const edge of subgraph.edges) {
    const edgePath = `${pathPrefix}/edges/${edge.source}-${edge.target}-${edge.kind}`;
    if (!nodeIds.has(edge.source)) {
      issues.push({
        code: 'block-missing-source',
        message: `Ребро ссылается на отсутствующий source «${edge.source}»`,
        blockId: edge.source,
        path: edgePath,
      });
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({
        code: 'block-missing-target',
        message: `Ребро ссылается на отсутствующий target «${edge.target}»`,
        blockId: edge.target,
        path: edgePath,
      });
    }
    if (edge.kind === 'data' && (edge.sourceHandle.length === 0 || edge.targetHandle.length === 0)) {
      issues.push({
        code: 'data-edge-missing-handle',
        message: `Data-ребро ${edge.source} → ${edge.target} без sourceHandle/targetHandle`,
        blockId: edge.target,
        pinId: edge.targetHandle || edge.sourceHandle,
        path: edgePath,
      });
    }
  }

  return issues;
}
