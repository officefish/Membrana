import { describe, expect, it } from 'vitest';

import { variableTypeIndicatorClass } from '../graph/variable-type-indicator.js';
import { VARIABLE_CONSTRUCTOR_CATEGORIES } from './variable-constructor-palette.js';

describe('variable-constructor-palette', () => {
  it('lists object and value categories with all scenario variable types', () => {
    expect(VARIABLE_CONSTRUCTOR_CATEGORIES.map((c) => c.title)).toEqual(['Объекты', 'Значения']);
    const types = VARIABLE_CONSTRUCTOR_CATEGORIES.flatMap((c) => c.types);
    expect([...types].sort()).toEqual(
      [
        'AudioSampleRef',
        'AudioStreamRef',
        'DateTime',
        'DeviceRef',
        'FftFrameRef',
        'Integer',
        'JournalRef',
        'String',
        'MicrophoneRef',
        'ServerRef',
      ].sort(),
    );
  });
});

describe('variableTypeIndicatorClass', () => {
  it('maps value types: Integer blue-900, String orange, DateTime error, RecordingPolicy teal', () => {
    expect(variableTypeIndicatorClass('DeviceRef')).toContain('sky');
    expect(variableTypeIndicatorClass('DateTime')).toContain('error');
    expect(variableTypeIndicatorClass('Integer')).toContain('blue-900');
    expect(variableTypeIndicatorClass('String')).toContain('orange');
    expect(variableTypeIndicatorClass('RecordingPolicy')).toContain('teal');
  });
});
