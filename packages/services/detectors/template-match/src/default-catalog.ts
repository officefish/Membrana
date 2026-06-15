import curatedDroneTemplatesJson from './data/curated-drone-templates.json' with { type: 'json' };
import type { PatternTemplate } from '@membrana/trends-detector-service';

import { resolveTemplateMatchCatalog } from './resolve-catalog.js';

/** Default curated drone templates shipped with the package (regenerate via yarn templates:build-from-dataset). */
export const DEFAULT_CURATED_DRONE_TEMPLATES = curatedDroneTemplatesJson as PatternTemplate[];

export function createDefaultTemplateMatchCatalog(): PatternTemplate[] {
  return resolveTemplateMatchCatalog(DEFAULT_CURATED_DRONE_TEMPLATES);
}
