import type { ScenarioVariableType } from '@membrana/core';
import { isReferenceSocketType } from '@membrana/core';

/** Tailwind-класс заливки индикатора типа в списке переменных. */
export function variableTypeIndicatorClass(type: ScenarioVariableType): string {
  if (isReferenceSocketType(type)) {
    return 'bg-sky-400';
  }
  if (type === 'DateTime') {
    return 'bg-error';
  }
  if (type === 'Integer') {
    return 'bg-blue-900';
  }
  if (type === 'String') {
    return 'bg-orange-500';
  }
  if (type === 'RecordingPolicy') {
    return 'bg-teal-600';
  }
  return 'bg-neutral';
}
