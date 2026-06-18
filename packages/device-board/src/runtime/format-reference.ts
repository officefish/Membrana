import type { ScenarioReferenceValue } from '@membrana/core';

/** Человекочитаемое представление ссылки для узла Print (без Web Audio). */
export function formatReferenceForPrint(value: ScenarioReferenceValue | null): string {
  if (value === null) {
    return 'null';
  }
  const handle = value.handle ?? 'null';
  const status = value.valid ? 'valid' : 'invalid';
  return `${value.kind}(${handle}, ${status})`;
}
