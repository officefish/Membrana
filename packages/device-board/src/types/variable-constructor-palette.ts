import type { ScenarioVariableType } from '@membrana/core';

/** Категория типов в модалке «+» конструктора переменных. */
export interface VariableConstructorCategory {
  readonly id: 'objects' | 'values';
  readonly title: string;
  readonly types: readonly ScenarioVariableType[];
}

/** Каталог типов переменных по категориям (sidebar «Конструктор переменных»). */
export const VARIABLE_CONSTRUCTOR_CATEGORIES: readonly VariableConstructorCategory[] = [
  {
    id: 'objects',
    title: 'Объекты',
    types: [
      'DeviceRef',
      'MicrophoneRef',
      'ServerRef',
      'JournalRef',
      'AudioStreamRef',
      'AudioSampleRef',
      'FftFrameRef',
    ],
  },
  {
    id: 'values',
    title: 'Значения',
    types: ['DateTime', 'Integer', 'String'],
  },
] as const;
