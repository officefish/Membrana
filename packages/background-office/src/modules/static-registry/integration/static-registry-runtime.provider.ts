import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { StaticRegistryReadPort } from '../static-registry-read.port';
import { StaticRegistryIndexReadAdapter } from './static-registry-index-read.adapter';

export const STATIC_REGISTRY_RELATIVE_PATH = 'docs/evidence/registry.jsonl';

export class StaticRegistryBootstrapError extends Error {
  constructor(readonly codes: readonly string[]) {
    super(`Static registry bootstrap failed: ${codes.join(', ')}`);
    this.name = 'StaticRegistryBootstrapError';
  }
}

export async function createStaticRegistryReadPortFromText(
  registryJsonl: string,
): Promise<StaticRegistryReadPort> {
  const [core, registry] = await Promise.all([
    import('@membrana/core'),
    import('@membrana/static-registry-service'),
  ]);
  const { parseStaticRegistryJsonl } = core;
  const { createIndexFromSnapshot } = registry;
  const parsed = parseStaticRegistryJsonl(registryJsonl);
  if (!parsed.ok) {
    throw new StaticRegistryBootstrapError(parsed.errors.map((error) => error.code));
  }
  return new StaticRegistryIndexReadAdapter(createIndexFromSnapshot(parsed.value));
}

export function createStaticRegistryReadPortFromRepository(
  repositoryRoot: string,
): Promise<StaticRegistryReadPort> {
  const registryPath = resolve(repositoryRoot, STATIC_REGISTRY_RELATIVE_PATH);
  return createStaticRegistryReadPortFromText(readFileSync(registryPath, 'utf8'));
}
