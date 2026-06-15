import { SYSTEM_TEMPLATES, type PatternTemplate } from '@membrana/trends-detector-service';

import { DRONE_TEMPLATE_KEY_PREFIX } from './constants.js';

/**
 * Catalog for template-match: curated DRONE* templates + system non-drone scenes (no bootstrap DRONE).
 */
export function resolveTemplateMatchCatalog(
  curatedDroneTemplates: readonly PatternTemplate[],
): PatternTemplate[] {
  const nonDroneSystem = SYSTEM_TEMPLATES.filter((t) => !t.key.startsWith(DRONE_TEMPLATE_KEY_PREFIX));
  return [...curatedDroneTemplates, ...nonDroneSystem];
}

export function isDroneTemplateKey(key: string, prefix = DRONE_TEMPLATE_KEY_PREFIX): boolean {
  return key.startsWith(prefix);
}
