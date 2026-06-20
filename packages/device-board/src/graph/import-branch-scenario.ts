import {
  isDeviceKind,
  type DeviceKind,
  type ScenarioSubgraph,
  type ScenarioVariable,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import type { ScenarioBranchTab } from '../types/board-ui.js';
import type { BranchScenarioExport } from './export-branch-scenario.js';
import {
  collectReferenceVariableSlots,
  isReferenceMappingComplete,
  mergeImportedValueVariables,
  remapSubgraphVariableIds,
  type ReferenceVariableSlot,
} from './reference-variable-slots.js';
import { deserializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
import { syncVariableNodeLabels } from './sync-variable-node-labels.js';
import { syncVariableNodePins } from './variable-node.js';

export interface ParseBranchScenarioExportSuccess {
  readonly ok: true;
  readonly export: BranchScenarioExport;
  readonly referenceVariableSlots: readonly ReferenceVariableSlot[];
}

export interface ParseBranchScenarioExportFailure {
  readonly ok: false;
  readonly message: string;
}

export type ParseBranchScenarioExportResult =
  | ParseBranchScenarioExportSuccess
  | ParseBranchScenarioExportFailure;

export interface ApplyBranchScenarioImportInput {
  readonly targetBranch: ScenarioBranchTab;
  readonly deviceKind: DeviceKind;
  readonly export: BranchScenarioExport;
  readonly referenceVariableSlots: readonly ReferenceVariableSlot[];
  readonly localVariables: readonly ScenarioVariable[];
  readonly mapping: Readonly<Record<string, string>>;
}

export interface ApplyBranchScenarioImportSuccess {
  readonly ok: true;
  readonly nodes: Node[];
  readonly edges: Edge[];
  readonly variables: readonly ScenarioVariable[];
}

export interface ApplyBranchScenarioImportFailure {
  readonly ok: false;
  readonly message: string;
}

export type ApplyBranchScenarioImportResult =
  | ApplyBranchScenarioImportSuccess
  | ApplyBranchScenarioImportFailure;

function isBranchScenarioExport(raw: unknown): raw is BranchScenarioExport {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const record = raw as Record<string, unknown>;
  return record.exportKind === 'branch-scenario' && typeof record.subgraph === 'object';
}

function resolveReferenceSlots(exportPayload: BranchScenarioExport): readonly ReferenceVariableSlot[] {
  if (exportPayload.referenceVariableSlots !== undefined) {
    return exportPayload.referenceVariableSlots;
  }
  const referencedIds = exportPayload.referencedVariableIds ?? [];
  const legacyVariables = exportPayload.variables ?? [];
  return collectReferenceVariableSlots(referencedIds, legacyVariables);
}

/** Парсит JSON экспорта ветки (`exportKind: branch-scenario`). */
export function parseBranchScenarioExportJson(json: string): ParseBranchScenarioExportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, message: 'Некорректный JSON' };
  }

  if (!isBranchScenarioExport(raw)) {
    return { ok: false, message: 'Файл не является экспортом ветки (branch-scenario)' };
  }

  if (!isDeviceKind(raw.deviceKind)) {
    return { ok: false, message: 'Неизвестный deviceKind в экспорте ветки' };
  }

  const subgraph = raw.subgraph;
  if (typeof subgraph.entry !== 'string' || !Array.isArray(subgraph.nodes) || !Array.isArray(subgraph.edges)) {
    return { ok: false, message: 'Некорректный subgraph в экспорте ветки' };
  }

  return {
    ok: true,
    export: raw,
    referenceVariableSlots: resolveReferenceSlots(raw),
  };
}

function validateMapping(
  slots: readonly ReferenceVariableSlot[],
  localVariables: readonly ScenarioVariable[],
  mapping: Readonly<Record<string, string>>,
): string | null {
  const variableById = new Map(localVariables.map((variable) => [variable.id, variable]));
  for (const slot of slots) {
    const localId = mapping[slot.exportVariableId];
    if (localId === undefined || localId === '') {
      return `Не задано сопоставление для ${slot.nameHint} (${slot.type})`;
    }
    const existing = variableById.get(localId);
    if (existing === undefined) {
      return `Локальная переменная не найдена для ${slot.nameHint}`;
    }
    if (existing.type !== slot.type) {
      return `Тип ${existing.name} (${existing.type}) не совпадает с ${slot.type}`;
    }
  }
  return null;
}

function hydrateBranchCanvas(
  subgraph: ScenarioSubgraph,
  variables: readonly ScenarioVariable[],
): { nodes: Node[]; edges: Edge[] } {
  const { nodes: deserializedNodes, edges } = deserializeScenarioSubgraph(subgraph, variables);
  let nodes = syncVariableNodePins(deserializedNodes, variables);
  for (const variable of variables) {
    nodes = syncVariableNodeLabels(nodes, variable.id, variable.name);
  }
  return { nodes, edges };
}

/**
 * Применяет импорт ветки в текущий документ: remap ссылочных переменных + гидратация канваса.
 */
export function applyBranchScenarioImport(
  input: ApplyBranchScenarioImportInput,
): ApplyBranchScenarioImportResult {
  const { export: exportPayload, referenceVariableSlots, mapping } = input;

  if (exportPayload.branch !== input.targetBranch) {
    return {
      ok: false,
      message: `Экспорт для ветки «${exportPayload.branch}», откройте соответствующую вкладку перед импортом`,
    };
  }

  if (!isReferenceMappingComplete(referenceVariableSlots, mapping)) {
    return { ok: false, message: 'Сопоставьте все ссылочные переменные перед импортом' };
  }

  const mappingError = validateMapping(referenceVariableSlots, input.localVariables, mapping);
  if (mappingError !== null) {
    return { ok: false, message: mappingError };
  }

  const mergedVariables = mergeImportedValueVariables(
    input.localVariables,
    exportPayload.variables ?? [],
  );

  const remappedSubgraph = remapSubgraphVariableIds(exportPayload.subgraph, mapping);
  const { nodes, edges } = hydrateBranchCanvas(remappedSubgraph, mergedVariables);

  return {
    ok: true,
    nodes,
    edges,
    variables: mergedVariables,
  };
}

/** True, если JSON — экспорт ветки, а не полного документа. */
export function isBranchScenarioExportJson(json: string): boolean {
  return parseBranchScenarioExportJson(json).ok;
}
