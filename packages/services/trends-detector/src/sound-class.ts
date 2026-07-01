import type { SoundClass } from '@membrana/core';

const EXACT_CLASS_BY_TEMPLATE_KEY: Readonly<Record<string, SoundClass>> = {
  SILENCE: 'silence',
  QUIET: 'silence',
  WIND: 'wind',
  BIRDS: 'birds',
  SPEECH: 'speech',
  VOICE: 'speech',
  MACHINE_HUM: 'machine-hum',
  TRAFFIC: 'machine-hum',
  GUNSHOT: 'gunshot',
  UNKNOWN: 'unknown',
};

export function soundClassFromTemplateKey(key: string): SoundClass {
  if (key.startsWith('DRONE')) return 'drone';
  return EXACT_CLASS_BY_TEMPLATE_KEY[key.toUpperCase()] ?? 'unknown';
}
