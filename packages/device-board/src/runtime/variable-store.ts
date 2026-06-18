import type { ScenarioReferenceValue, ScenarioVariable } from '@membrana/core';

import { applyVariableSetValue } from './reference-validity.js';

/** In-memory хранилище переменных сценария (document-scope, mutable во время exec). */
export class ScenarioVariableStore {
  private variables: ScenarioVariable[];

  constructor(initial: readonly ScenarioVariable[] = []) {
    this.variables = initial.map((item) => ({
      ...item,
      value: item.value === null ? null : { ...item.value },
    }));
  }

  /** Текущий снимок всех переменных (для resolveInput). */
  getAll(): readonly ScenarioVariable[] {
    return this.variables;
  }

  /** Значение переменной по id; `null` если не задана. */
  getValue(id: string): ScenarioReferenceValue | null {
    const variable = this.variables.find((item) => item.id === id);
    return variable?.value ?? null;
  }

  /**
   * Записывает значение из dataflow (variable-set).
   * Семантика validity — `applyVariableSetValue`.
   */
  setValue(id: string, incoming: ScenarioReferenceValue | null): void {
    const index = this.variables.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Unknown scenario variable: ${id}`);
    }
    this.variables[index] = applyVariableSetValue(this.variables[index], incoming);
  }

  /** Сброс к document-scope значениям (при load). */
  reset(initial: readonly ScenarioVariable[]): void {
    this.variables = initial.map((item) => ({
      ...item,
      value: item.value === null ? null : { ...item.value },
    }));
  }

  /** Иммутабельный снимок для персиста/UI. */
  snapshot(): readonly ScenarioVariable[] {
    return this.variables.map((item) => ({
      ...item,
      value: item.value === null ? null : { ...item.value },
    }));
  }
}
