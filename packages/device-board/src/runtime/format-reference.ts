import type { ScenarioVariableValue } from '@membrana/core';
import { isScenarioReferenceValue } from '@membrana/core';

/** Человекочитаемое представление значения dataflow для узла Print. */
export function formatVariableValueForPrint(value: ScenarioVariableValue | null): string {
  if (value === null) {
    return 'null';
  }
  if (value.kind === 'DateTime') {
    return `DateTime(${value.iso})`;
  }
  if (isScenarioReferenceValue(value)) {
    const handle = value.handle ?? 'null';
    const status = value.valid ? 'valid' : 'invalid';
    return `${value.kind}(${handle}, ${status})`;
  }
  return 'unknown';
}

/** @deprecated Используйте `formatVariableValueForPrint`. */
export function formatReferenceForPrint(value: ScenarioVariableValue | null): string {
  return formatVariableValueForPrint(value);
}
