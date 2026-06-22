import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function hasMonorepoRoot(dir: string): boolean {
  const packageJsonPath = join(dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || !('workspaces' in parsed)) {
      return false;
    }
    return existsSync(join(dir, 'AGENTS.md'));
  } catch {
    return false;
  }
}

/** Walk up from `startDir` to locate Membrana monorepo root. */
export function findMonorepoRoot(startDir: string = process.cwd()): string {
  let current = resolve(startDir);
  while (true) {
    if (hasMonorepoRoot(current)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(startDir);
    }
    current = parent;
  }
}

/** Resolve repo root from explicit path, env, or monorepo discovery. */
export function resolveRepoRoot(explicit?: string): string {
  if (explicit) {
    return resolve(explicit);
  }
  if (process.env.RAG_REPO_ROOT?.trim()) {
    return resolve(process.env.RAG_REPO_ROOT.trim());
  }
  return findMonorepoRoot(process.cwd());
}
