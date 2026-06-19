import type { ScenarioVariableType } from '@membrana/core';

/** Tailwind-класс заливки индикатора типа в списке переменных. */
export function variableTypeIndicatorClass(type: ScenarioVariableType): string {
  if (type === 'DeviceRef' || type === 'MicrophoneRef' || type === 'ServerRef') {
    return 'bg-sky-400';
  }
  if (type === 'DateTime') {
    return 'bg-error';
  }
  if (type === 'Integer') {
    return 'bg-success';
  }
  return 'bg-neutral';
}
