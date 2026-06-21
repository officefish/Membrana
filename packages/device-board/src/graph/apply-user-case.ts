import type {
  DeviceKind,
  DeviceScenarioDocument,
  ScenarioFunctionSubgraph,
  ScenarioGraphNode,
  ScenarioSubgraph,
  ScenarioVariable,
} from '@membrana/core';

import {
  collectReferenceVariableSlots,
  exportValueVariables,
  isReferenceMappingComplete,
  mergeImportedValueVariables,
  remapSubgraphVariableIds,
  suggestReferenceVariableMapping,
  type ReferenceVariableSlot,
} from './reference-variable-slots.js';
import { hydrateBoardFromDocument, type HydratedBoardState } from './hydrate-board-from-document.js';

export interface PrepareUserCaseApplyInput {
  readonly userCaseDocument: DeviceScenarioDocument;
  readonly localDeviceKind: DeviceKind;
  readonly localVariables: readonly ScenarioVariable[];
}

export interface PrepareUserCaseApplySuccess {
  readonly ok: true;
  readonly slots: readonly ReferenceVariableSlot[];
  readonly suggestedMapping: Record<string, string>;
  readonly mappingComplete: boolean;
}

export interface PrepareUserCaseApplyFailure {
  readonly ok: false;
  readonly message: string;
}

export type PrepareUserCaseApplyResult =
  | PrepareUserCaseApplySuccess
  | PrepareUserCaseApplyFailure;

export interface ApplyUserCaseDocumentInput {
  readonly userCaseDocument: DeviceScenarioDocument;
  readonly currentDocument: DeviceScenarioDocument;
  readonly localVariables: readonly ScenarioVariable[];
  readonly mapping: Readonly<Record<string, string>>;
}

export interface ApplyUserCaseDocumentSuccess {
  readonly ok: true;
  readonly document: DeviceScenarioDocument;
  readonly state: HydratedBoardState;
}

export interface ApplyUserCaseDocumentFailure {
  readonly ok: false;
  readonly message: string;
}

export type ApplyUserCaseDocumentResult =
  | ApplyUserCaseDocumentSuccess
  | ApplyUserCaseDocumentFailure;

function collectReferencedVariableIds(nodes: readonly ScenarioGraphNode[]): readonly string[] {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (node.nodeKind !== 'variable-get' && node.nodeKind !== 'variable-set') {
      continue;
    }
    if (typeof node.variableId === 'string' && node.variableId.length > 0) {
      ids.add(node.variableId);
    }
  }
  return [...ids];
}

/** Слоты ссылочных переменных UserCase document (все ветки + functions). */
export function collectUserCaseReferenceSlots(
  document: DeviceScenarioDocument,
): readonly ReferenceVariableSlot[] {
  const referencedIds = new Set<string>();
  const scenario = document.scenario;
  const subgraphs: readonly (ScenarioSubgraph | undefined)[] = [
    scenario.initial,
    scenario.onConnect,
    scenario.loops.main,
    scenario.loops.alarm,
    scenario.triggers.onStop,
    scenario.triggers.onDisconnect,
  ];
  for (const subgraph of subgraphs) {
    if (subgraph === undefined) {
      continue;
    }
    for (const id of collectReferencedVariableIds(subgraph.nodes)) {
      referencedIds.add(id);
    }
  }
  for (const fn of scenario.functions) {
    for (const id of collectReferencedVariableIds(fn.nodes)) {
      referencedIds.add(id);
    }
  }
  return collectReferenceVariableSlots([...referencedIds], scenario.variables);
}

function remapSubgraph(
  subgraph: ScenarioSubgraph,
  mapping: Readonly<Record<string, string>>,
): ScenarioSubgraph {
  return remapSubgraphVariableIds(subgraph, mapping);
}

function remapFunction(
  fn: ScenarioFunctionSubgraph,
  mapping: Readonly<Record<string, string>>,
): ScenarioFunctionSubgraph {
  const remapped = remapSubgraphVariableIds(
    { entry: fn.entry, nodes: fn.nodes, edges: fn.edges },
    mapping,
  );
  return {
    ...fn,
    nodes: remapped.nodes,
    edges: remapped.edges,
  };
}

function remapUserCaseScenario(
  document: DeviceScenarioDocument,
  mapping: Readonly<Record<string, string>>,
  variables: readonly ScenarioVariable[],
): DeviceScenarioDocument {
  const scenario = document.scenario;
  return {
    ...document,
    scenario: {
      ...scenario,
      initial: remapSubgraph(scenario.initial, mapping),
      onConnect: remapSubgraph(scenario.onConnect, mapping),
      loops: {
        main: remapSubgraph(scenario.loops.main, mapping),
        alarm: remapSubgraph(scenario.loops.alarm, mapping),
      },
      triggers: {
        ...scenario.triggers,
        onStop: remapSubgraph(scenario.triggers.onStop, mapping),
        onDisconnect: remapSubgraph(scenario.triggers.onDisconnect, mapping),
      },
      functions: scenario.functions.map((fn) => remapFunction(fn, mapping)),
      variables: [...variables],
    },
  };
}

/** Проверка deviceKind + автоподбор ref-mapping перед apply-all. */
export function prepareUserCaseApply(
  input: PrepareUserCaseApplyInput,
): PrepareUserCaseApplyResult {
  if (input.userCaseDocument.deviceKind !== input.localDeviceKind) {
    return {
      ok: false,
      message: `UserCase для «${input.userCaseDocument.deviceKind}», на доске — «${input.localDeviceKind}»`,
    };
  }
  const slots = collectUserCaseReferenceSlots(input.userCaseDocument);
  const suggestedMapping = suggestReferenceVariableMapping(slots, input.localVariables);
  return {
    ok: true,
    slots,
    suggestedMapping,
    mappingComplete: isReferenceMappingComplete(slots, suggestedMapping),
  };
}

/**
 * Apply-all UserCase: scenario из UserCase, signal layer из текущего документа.
 * Ref-mapping для JournalRef / DeviceRef и merge value-переменных.
 */
export function applyUserCaseDocument(
  input: ApplyUserCaseDocumentInput,
): ApplyUserCaseDocumentResult {
  if (input.userCaseDocument.deviceKind !== input.currentDocument.deviceKind) {
    return {
      ok: false,
      message: `UserCase для «${input.userCaseDocument.deviceKind}», на доске — «${input.currentDocument.deviceKind}»`,
    };
  }

  const slots = collectUserCaseReferenceSlots(input.userCaseDocument);
  if (!isReferenceMappingComplete(slots, input.mapping)) {
    return { ok: false, message: 'Сопоставьте все ссылочные переменные перед применением UserCase' };
  }

  const mergedVariables = mergeImportedValueVariables(
    input.localVariables,
    exportValueVariables(input.userCaseDocument.scenario.variables),
  );

  const remapped = remapUserCaseScenario(
    input.userCaseDocument,
    input.mapping,
    mergedVariables,
  );

  const document: DeviceScenarioDocument = {
    ...remapped,
    deviceKind: input.currentDocument.deviceKind,
    signalGraph: input.currentDocument.signalGraph,
  };

  return {
    ok: true,
    document,
    state: hydrateBoardFromDocument(document),
  };
}
