import type { PatternTemplate } from './types.js';

const DRONE_KEY_PREFIX = 'DRONE';

/** Whether a template win should mark journal rows as detection events. */
export function templateCountsAsDetection(template: PatternTemplate): boolean {
  if (template.countsAsDetection !== undefined) {
    return template.countsAsDetection;
  }
  return template.key.startsWith(DRONE_KEY_PREFIX);
}
