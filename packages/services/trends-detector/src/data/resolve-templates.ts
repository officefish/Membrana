import type { PatternTemplate } from '../types.js';
import { SYSTEM_TEMPLATES } from './system-templates.js';

export function isUserTemplateKey(key: string): boolean {
  return key.startsWith('user:');
}

export function getSystemTemplate(key: string): PatternTemplate | undefined {
  return SYSTEM_TEMPLATES.find((t) => t.key === key);
}

export function getTemplateFromCatalog(
  key: string,
  userTemplates: readonly PatternTemplate[] = [],
): PatternTemplate | undefined {
  const system = getSystemTemplate(key);
  if (system) return system;
  return userTemplates.find((t) => t.key === key);
}

export function resolveEnabledTemplates(keys: readonly string[]): PatternTemplate[] {
  const set = new Set(keys);
  return SYSTEM_TEMPLATES.filter((t) => set.has(t.key));
}

export function resolveTemplates(
  enabledKeys: readonly string[],
  userTemplates: readonly PatternTemplate[] = [],
): PatternTemplate[] {
  const userByKey = new Map(userTemplates.map((t) => [t.key, t]));
  const resolved: PatternTemplate[] = [];

  for (const key of enabledKeys) {
    if (isUserTemplateKey(key)) {
      const user = userByKey.get(key);
      if (user) resolved.push(user);
      continue;
    }
    const system = SYSTEM_TEMPLATES.find((t) => t.key === key);
    if (system) resolved.push(system);
  }

  return resolved;
}
