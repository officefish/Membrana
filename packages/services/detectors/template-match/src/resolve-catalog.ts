import { FREE_V1_NON_DRONE_TEMPLATES, type PatternTemplate } from '@membrana/trends-detector-service';

import { DRONE_TEMPLATE_KEY_PREFIX } from './constants.js';

/**
 * Catalog for template-match: curated DRONE* templates + system non-drone scenes (no bootstrap DRONE).
 */
export function resolveTemplateMatchCatalog(
  curatedDroneTemplates: readonly PatternTemplate[],
): PatternTemplate[] {
  return [...curatedDroneTemplates, ...FREE_V1_NON_DRONE_TEMPLATES];
}

export function isDroneTemplateKey(key: string, prefix = DRONE_TEMPLATE_KEY_PREFIX): boolean {
  return key.startsWith(prefix);
}
