import type { Node } from '@xyflow/react';

/** Обновляет `label` на всех get/set-узлах, привязанных к `variableId`. */
export function syncVariableNodeLabels(
  nodes: readonly Node[],
  variableId: string,
  name: string,
): Node[] {
  return nodes.map((node) => {
    if (node.data?.variableId !== variableId) {
      return node;
    }
    const kind = node.data?.nodeKind;
    if (kind !== 'variable-get' && kind !== 'variable-set') {
      return node;
    }
    return {
      ...node,
      data: {
        ...node.data,
        label: name,
      },
    };
  });
}
