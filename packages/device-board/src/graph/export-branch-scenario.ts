import type { DeviceKind, ScenarioSubgraph, ScenarioVariable } from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import { BRANCH_SCENARIO_TITLE, BRANCH_TAB_LABEL, type ScenarioBranchTab } from '../types/board-ui.js';
import { isBoardFlowNodeData } from './board-node-data.js';
import {
  SCENARIO_ALARM_ENTRY,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
  SCENARIO_ON_CONNECT_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './initial-board-state.js';
import { serializeScenarioSubgraph } from './serialize-scenario-subgraph.js';

/** JSON-артефакт экспорта одной ветки scenario graph (для отладки и обмена). */
export interface BranchScenarioExport {
  readonly exportKind: 'branch-scenario';
  readonly branch: ScenarioBranchTab;
  readonly branchLabel: string;
  readonly scenarioTitle: string;
  readonly deviceKind: DeviceKind;
  readonly subgraph: ScenarioSubgraph;
  readonly function?: {
    readonly id: string;
    readonly name: string;
  };
  /** Все переменные документа (document-scope, общие для всех веток). */
  readonly variables: readonly ScenarioVariable[];
  /** Id переменных, на которые ссылаются variable-get/set в этой ветке. */
  readonly referencedVariableIds: readonly string[];
  readonly exportedAt: string;
}

export interface BuildBranchScenarioExportInput {
  readonly deviceKind: DeviceKind;
  readonly branch: ScenarioBranchTab;
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly variables: readonly ScenarioVariable[];
  readonly functionMeta?: {
    readonly id: string;
    readonly name: string;
    readonly entry: string;
  };
}

function branchEntry(branch: ScenarioBranchTab, functionEntry?: string): string {
  switch (branch) {
    case 'initial':
      return SCENARIO_INITIAL_ENTRY;
    case 'onConnect':
      return SCENARIO_ON_CONNECT_ENTRY;
    case 'main':
      return SCENARIO_MAIN_ENTRY;
    case 'alarm':
      return SCENARIO_ALARM_ENTRY;
    case 'onStop':
      return SCENARIO_ON_STOP_ENTRY;
    case 'onDisconnect':
      return SCENARIO_ON_DISCONNECT_ENTRY;
    case 'function':
      if (functionEntry === undefined) {
        throw new Error('BranchScenarioExport: function branch requires entry');
      }
      return functionEntry;
  }
}

function collectReferencedVariableIds(nodes: readonly Node[]): readonly string[] {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!isBoardFlowNodeData(node.data) || node.data.layer !== 'scenario') {
      continue;
    }
    const nodeKind = node.data.nodeKind;
    if (nodeKind !== 'variable-get' && nodeKind !== 'variable-set') {
      continue;
    }
    if (typeof node.data.variableId === 'string') {
      ids.add(node.data.variableId);
    }
  }
  return [...ids];
}

/** Сериализует активную ветку scenario graph в компактный JSON для отладки. */
export function buildBranchScenarioExport(input: BuildBranchScenarioExportInput): BranchScenarioExport {
  const entry = branchEntry(input.branch, input.functionMeta?.entry);
  const subgraph = serializeScenarioSubgraph(entry, input.nodes, input.edges);

  return {
    exportKind: 'branch-scenario',
    branch: input.branch,
    branchLabel: BRANCH_TAB_LABEL[input.branch],
    scenarioTitle: BRANCH_SCENARIO_TITLE[input.branch],
    deviceKind: input.deviceKind,
    subgraph,
    ...(input.branch === 'function' && input.functionMeta !== undefined
      ? { function: { id: input.functionMeta.id, name: input.functionMeta.name } }
      : {}),
    variables: input.variables,
    referencedVariableIds: collectReferencedVariableIds(input.nodes),
    exportedAt: new Date().toISOString(),
  };
}

/** Имя файла для скачивания экспорта ветки. */
export function branchScenarioExportFilename(deviceKind: DeviceKind, branch: ScenarioBranchTab): string {
  return `device-scenario-${deviceKind}-${branch}.json`;
}
