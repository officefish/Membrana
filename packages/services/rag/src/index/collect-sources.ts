import { glob } from 'glob';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { INDEX_GLOB_PATTERNS, shouldExcludeIndexPath } from './paths.js';

export interface SourceFileRef {
  /** Repo-relative POSIX path */
  relativePath: string;
  absolutePath: string;
  mtimeMs: number;
}

export async function collectSourceFiles(repoRoot: string): Promise<SourceFileRef[]> {
  const cwd = resolve(repoRoot);
  const seen = new Map<string, SourceFileRef>();

  for (const pattern of INDEX_GLOB_PATTERNS) {
    const matches = await glob(pattern, {
      cwd,
      nodir: true,
      posix: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.generated.ts', '**/*.test.ts'],
    });

    for (const match of matches) {
      const relativePath = match.replace(/\\/g, '/');
      if (shouldExcludeIndexPath(relativePath)) {
        continue;
      }
      const absolutePath = resolve(cwd, relativePath);
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        continue;
      }
      seen.set(relativePath, {
        relativePath,
        absolutePath,
        mtimeMs: fileStat.mtimeMs,
      });
    }
  }

  return [...seen.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
