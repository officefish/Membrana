import type { ScenarioGraphNode } from '@membrana/core';

const SUBGRAPH_REF_SEPARATOR = '::';

/** Кодирует ссылку subgraph-блока → function id в `label` JSON-ноды. */
export function encodeSubgraphRef(displayLabel: string, functionId: string): string {
  return `${displayLabel}${SUBGRAPH_REF_SEPARATOR}${functionId}`;
}

/** Извлекает function id из scenario-ноды subgraph-блока. */
export function parseSubgraphFunctionId(node: ScenarioGraphNode): string | null {
  if (node.blockKind !== 'subgraph') {
    return null;
  }
  const label = node.label ?? '';
  const separatorIndex = label.lastIndexOf(SUBGRAPH_REF_SEPARATOR);
  if (separatorIndex === -1) {
    return label.length > 0 ? label : null;
  }
  return label.slice(separatorIndex + SUBGRAPH_REF_SEPARATOR.length);
}

/** Отображаемое имя из закодированного `label` subgraph-блока (`Name::fn-id` → `Name`). */
export function parseEncodedSubgraphRefLabel(encodedLabel: string): string {
  const separatorIndex = encodedLabel.lastIndexOf(SUBGRAPH_REF_SEPARATOR);
  if (separatorIndex === -1) {
    return encodedLabel;
  }
  return encodedLabel.slice(0, separatorIndex);
}

/** Отображаемое имя subgraph-блока. */
export function parseSubgraphDisplayLabel(node: ScenarioGraphNode): string {
  if (node.blockKind !== 'subgraph') {
    return node.label ?? node.id;
  }
  return parseEncodedSubgraphRefLabel(node.label ?? node.id);
}
