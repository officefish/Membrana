export type SoundClass =
  | 'drone'
  | 'silence'
  | 'wind'
  | 'birds'
  | 'speech'
  | 'machine-hum'
  | 'gunshot'
  | 'unknown';

export const SOUND_CLASSES: readonly SoundClass[] = [
  'drone',
  'silence',
  'wind',
  'birds',
  'speech',
  'machine-hum',
  'gunshot',
  'unknown',
];

export function isSoundClass(value: unknown): value is SoundClass {
  return typeof value === 'string' && SOUND_CLASSES.includes(value as SoundClass);
}
