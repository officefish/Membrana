#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const studioDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(studioDir, '../..');
const tscJs = resolve(repoRoot, 'node_modules/typescript/bin/tsc');

rmSync(resolve(studioDir, 'dist'), { recursive: true, force: true });
rmSync(resolve(studioDir, 'tsconfig.tsbuildinfo'), { force: true });

const result = spawnSync(process.execPath, [tscJs, '-p', 'tsconfig.json'], {
  cwd: studioDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
