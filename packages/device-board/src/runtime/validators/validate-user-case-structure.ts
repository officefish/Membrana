import {
  MAX_SCENARIO_FUNCTION_PINS_PER_SIDE,
  isScenarioFunctionPinCountValid,
  type DeviceScenarioDocument,
  type ScenarioSubgraph,
} from '@membrana/core';

import type { UserCaseValidationError } from './types.js';
import type { ValidationScenarioNode } from './validation-graph.js';

function pushEntryIssue(
  issues: UserCaseValidationError[],
  subgraph: ScenarioSubgraph,
  pathPrefix: string,
): void {
  if (subgraph.nodes.length === 0) {
    return;
  }
  if (!subgraph.nodes.some((node) => node.id === subgraph.entry)) {
    issues.push({
      code: 'subgraph-entry-missing',
      message: `Точка входа «${subgraph.entry}» не найдена среди нод`,
      blockId: subgraph.entry,
      path: `${pathPrefix}/entry`,
    });
  }
}

/**
 * Document-level structural checks (variables, functions, comment groups).
 */
export function validateUserCaseStructure(
  document: DeviceScenarioDocument,
): readonly UserCaseValidationError[] {
  const issues: UserCaseValidationError[] = [];
  const variableIds = new Set(document.scenario.variables.map((variable) => variable.id));

  for (const subgraph of [
    { path: 'scenario.initial', value: document.scenario.initial },
    { path: 'scenario.onConnect', value: document.scenario.onConnect },
    { path: 'scenario.loops.main', value: document.scenario.loops.main },
    { path: 'scenario.loops.alarm', value: document.scenario.loops.alarm },
    { path: 'scenario.triggers.onStop', value: document.scenario.triggers.onStop },
    { path: 'scenario.triggers.onDisconnect', value: document.scenario.triggers.onDisconnect },
  ]) {
    pushEntryIssue(issues, subgraph.value, subgraph.path);
  }

  const functionIds = new Set<string>();
  for (const fn of document.scenario.functions) {
    if (functionIds.has(fn.id)) {
      issues.push({
        code: 'function-duplicate-id',
        message: `Дублирующийся id функции «${fn.id}»`,
        path: `scenario.functions.${fn.id}`,
      });
    }
    functionIds.add(fn.id);

    const inputCount = fn.inputPins.length;
    const outputCount = fn.outputPins.length;
    if (!isScenarioFunctionPinCountValid(inputCount) || !isScenarioFunctionPinCountValid(outputCount)) {
      issues.push({
        code: 'function-pin-limit',
        message: `Функция «${fn.name}»: не более ${MAX_SCENARIO_FUNCTION_PINS_PER_SIDE} pins на Input и Output`,
        path: `scenario.functions.${fn.id}`,
      });
    }
    pushEntryIssue(issues, fn, `scenario.functions.${fn.id}`);
  }

  const allNodeIds = new Set<string>();
  const collectNodeIds = (subgraph: { nodes: readonly ValidationScenarioNode[] }): void => {
    for (const node of subgraph.nodes) {
      allNodeIds.add(node.id);
      if (
        (node.nodeKind === 'variable-get' || node.nodeKind === 'variable-set') &&
        node.variableId !== undefined &&
        !variableIds.has(node.variableId)
      ) {
        issues.push({
          code: 'variable-missing',
          message: `Узел «${node.id}» ссылается на неизвестную переменную «${node.variableId}»`,
          blockId: node.id,
          path: `scenario.variables/${node.variableId}`,
        });
      }
    }
  };

  collectNodeIds(document.signalGraph);
  collectNodeIds(document.scenario.initial);
  collectNodeIds(document.scenario.onConnect);
  collectNodeIds(document.scenario.loops.main);
  collectNodeIds(document.scenario.loops.alarm);
  collectNodeIds(document.scenario.triggers.onStop);
  collectNodeIds(document.scenario.triggers.onDisconnect);
  for (const fn of document.scenario.functions) {
    collectNodeIds(fn);
  }

  for (const group of document.scenario.commentGroups) {
    for (const nodeId of group.nodeIds) {
      if (!allNodeIds.has(nodeId)) {
        issues.push({
          code: 'comment-group-orphan-node',
          message: `Группа «${group.title}» ссылается на отсутствующий узел «${nodeId}»`,
          blockId: nodeId,
          path: `scenario.commentGroups.${group.id}`,
        });
      }
    }
  }

  return issues;
}
