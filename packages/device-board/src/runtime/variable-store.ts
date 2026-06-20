import type { ScenarioVariable, ScenarioVariableValue } from '@membrana/core';
import { isScenarioReferenceValue } from '@membrana/core';

import { applyVariableSetValue } from './reference-validity.js';

function cloneVariableValue(value: ScenarioVariableValue): ScenarioVariableValue {
  if (isScenarioReferenceValue(value)) {
    return { ...value };
  }
  return { ...value };
}

function cloneVariable(variable: ScenarioVariable): ScenarioVariable {
  return {
    ...variable,
    value: variable.value === null ? null : cloneVariableValue(variable.value),
  };
}

/** In-memory хранилище переменных сценария (document-scope, mutable во время exec). */
export class ScenarioVariableStore {
  private variables: ScenarioVariable[];

  constructor(initial: readonly ScenarioVariable[] = []) {
    this.variables = initial.map(cloneVariable);
  }

  /** Текущий снимок всех переменных (для resolveInput). */
  getAll(): readonly ScenarioVariable[] {
    return this.variables;
  }

  /** Значение переменной по id; `null` если не задана. */
  getValue(id: string): ScenarioVariableValue | null {
    const variable = this.variables.find((item) => item.id === id);
    return variable?.value ?? null;
  }

  /**
   * Записывает значение из dataflow (variable-set).
   * Семантика — `applyVariableSetValue`.
   */
  setValue(id: string, incoming: ScenarioVariableValue | null): void {
    const index = this.variables.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Unknown scenario variable: ${id}`);
    }
    const current = this.variables[index];
    if (current === undefined) {
      throw new Error(`Unknown scenario variable: ${id}`);
    }
    this.variables[index] = applyVariableSetValue(current, incoming);
  }

  /** Сброс к document-scope значениям (при load). */
  reset(initial: readonly ScenarioVariable[]): void {
    this.variables = initial.map(cloneVariable);
  }

  /** Иммутабельный снимок для персиста/UI. */
  snapshot(): readonly ScenarioVariable[] {
    return this.variables.map(cloneVariable);
  }
}
