import {
  createScenarioVariable,
  isReferenceSocketType,
  type ScenarioGraphNode,
  type ScenarioSubgraph,
  type ScenarioVariable,
  type ScenarioVariableType,
} from '@membrana/core';

/** Слот ссылочной переменной в экспорте ветки (без runtime-значения). */
export interface ReferenceVariableSlot {
  readonly exportVariableId: string;
  readonly type: ScenarioVariableType;
  readonly nameHint: string;
}

/** Собирает слоты ссылочных переменных, используемых в ветке. */
export function collectReferenceVariableSlots(
  referencedVariableIds: readonly string[],
  variables: readonly ScenarioVariable[],
): readonly ReferenceVariableSlot[] {
  const slots: ReferenceVariableSlot[] = [];
  for (const exportVariableId of referencedVariableIds) {
    const variable = variables.find((item) => item.id === exportVariableId);
    if (variable === undefined || !isReferenceSocketType(variable.type)) {
      continue;
    }
    slots.push({
      exportVariableId,
      type: variable.type,
      nameHint: variable.name,
    });
  }
  return slots;
}

/** Value-переменные документа для переноса в экспорт ветки. */
export function exportValueVariables(variables: readonly ScenarioVariable[]): ScenarioVariable[] {
  return variables.filter((variable) => !isReferenceSocketType(variable.type));
}

/** Подставляет local id переменных в variable-get/set узлах subgraph. */
export function remapSubgraphVariableIds(
  subgraph: ScenarioSubgraph,
  mapping: Readonly<Record<string, string>>,
): ScenarioSubgraph {
  const nodes = subgraph.nodes.map((node): ScenarioGraphNode => {
    if (node.nodeKind !== 'variable-get' && node.nodeKind !== 'variable-set') {
      return node;
    }
    const variableId = node.variableId;
    if (variableId === undefined) {
      return node;
    }
    const localId = mapping[variableId];
    if (localId === undefined) {
      return node;
    }
    return { ...node, variableId: localId };
  });
  return { ...subgraph, nodes };
}

/**
 * Автоподбор local variable id по nameHint + type.
 * Возвращает только однозначные совпадения.
 */
export function suggestReferenceVariableMapping(
  slots: readonly ReferenceVariableSlot[],
  localVariables: readonly ScenarioVariable[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const slot of slots) {
    const matches = localVariables.filter(
      (variable) => variable.type === slot.type && variable.name === slot.nameHint,
    );
    if (matches.length === 1) {
      mapping[slot.exportVariableId] = matches[0]!.id;
    }
  }
  return mapping;
}

export function isReferenceMappingComplete(
  slots: readonly ReferenceVariableSlot[],
  mapping: Readonly<Record<string, string>>,
): boolean {
  return slots.every((slot) => {
    const localId = mapping[slot.exportVariableId];
    return typeof localId === 'string' && localId.length > 0;
  });
}

/** Добавляет value-переменные из импорта, если имени ещё нет в документе. */
export function mergeImportedValueVariables(
  current: readonly ScenarioVariable[],
  imported: readonly ScenarioVariable[],
): ScenarioVariable[] {
  const names = new Set(current.map((variable) => `${variable.type}:${variable.name}`));
  const merged = [...current];
  for (const variable of imported) {
    if (isReferenceSocketType(variable.type)) {
      continue;
    }
    const key = `${variable.type}:${variable.name}`;
    if (names.has(key)) {
      continue;
    }
    names.add(key);
    merged.push({
      ...createScenarioVariable(variable.id, variable.name, variable.type),
      value: variable.value,
    });
  }
  return merged;
}
