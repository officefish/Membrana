import type { SoundClass } from '@membrana/core';

export const FREE_V1_DRONE_FIRST_MIN_GAP = 25;

export const FREE_V1_CLASS_MIN_CONFIDENCE: Readonly<
  Partial<Record<SoundClass, number>>
> = {
  drone: 57,
  silence: 96,
  wind: 86,
  birds: 85,
  speech: 87,
  'machine-hum': 79,
  gunshot: 79,
};
