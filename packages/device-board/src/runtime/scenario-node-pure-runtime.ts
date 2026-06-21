import { resolveScenarioGraphNodePure, type ScenarioGraphNode } from '@membrana/core';

/**
 * Pure / constructor-always-pure nodes прозрачны для exec-walk:
 * не исполняются на exec-цепочке, только data-pull downstream.
 */
export function isExecTransparentPureNode(node: ScenarioGraphNode): boolean {
  return resolveScenarioGraphNodePure(node);
}
