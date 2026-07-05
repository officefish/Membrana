import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CANON_SOURCES } from './canon-sources.js';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(pkgDir, '..', '..');

describe('comms-studio leaf invariant (CC1)', () => {
  it('пакет не зависит от продуктовых @membrana/* (leaf-zero, сток не исток)', () => {
    const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => d.startsWith('@membrana/'))).toEqual([]);
  });

  it('все объявленные источники канона существуют в рабочей копии (fs-read резолвится)', () => {
    const missing = CANON_SOURCES.filter((src) => !existsSync(resolve(repoRoot, src)));
    expect(missing).toEqual([]);
  });
});
