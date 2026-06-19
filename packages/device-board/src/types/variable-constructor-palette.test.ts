import { describe, expect, it } from 'vitest';

import { variableTypeIndicatorClass } from '../graph/variable-type-indicator.js';
import { VARIABLE_CONSTRUCTOR_CATEGORIES } from './variable-constructor-palette.js';

describe('variable-constructor-palette', () => {
  it('lists object and value categories with all scenario variable types', () => {
    expect(VARIABLE_CONSTRUCTOR_CATEGORIES.map((c) => c.title)).toEqual(['Объекты', 'Значения']);
    const types = VARIABLE_CONSTRUCTOR_CATEGORIES.flatMap((c) => c.types);
    expect([...types].sort()).toEqual(
      ['DateTime', 'DeviceRef', 'Integer', 'MicrophoneRef', 'ServerRef'].sort(),
    );
  });
});

describe('variableTypeIndicatorClass', () => {
  it('maps refs to sky, DateTime to error, Integer to success', () => {
    expect(variableTypeIndicatorClass('DeviceRef')).toContain('sky');
    expect(variableTypeIndicatorClass('DateTime')).toContain('error');
    expect(variableTypeIndicatorClass('Integer')).toContain('success');
  });
});
