import { describe, expect, it } from 'vitest';

import { SOUND_CLASSES, isSoundClass } from './sound-class.js';

describe('SoundClass', () => {
  it('contains the seven free_v1 classes and unknown', () => {
    expect(SOUND_CLASSES).toEqual([
      'drone',
      'silence',
      'wind',
      'birds',
      'speech',
      'machine-hum',
      'gunshot',
      'unknown',
    ]);
  });

  it('rejects arbitrary template keys', () => {
    expect(isSoundClass('drone')).toBe(true);
    expect(isSoundClass('DRONE_TIGHT')).toBe(false);
  });
});
