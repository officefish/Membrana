import birdsJson from '../../templates/BIRDS.json' with { type: 'json' };
import gunshotJson from '../../templates/GUNSHOT.json' with { type: 'json' };
import machineHumJson from '../../templates/MACHINE_HUM.json' with { type: 'json' };
import silenceJson from '../../templates/SILENCE.json' with { type: 'json' };
import speechJson from '../../templates/SPEECH.json' with { type: 'json' };
import windJson from '../../templates/WIND.json' with { type: 'json' };

import type { PatternTemplate } from '../types.js';

export const FREE_V1_CATALOG_VERSION = 'free_v1' as const;

export const FREE_V1_NON_DRONE_TEMPLATES: readonly PatternTemplate[] = [
  ...(silenceJson as PatternTemplate[]),
  ...(windJson as PatternTemplate[]),
  ...(birdsJson as PatternTemplate[]),
  ...(speechJson as PatternTemplate[]),
  ...(machineHumJson as PatternTemplate[]),
  ...(gunshotJson as PatternTemplate[]),
];
