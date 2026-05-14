import { join } from 'node:path';

/** Resolved at runtime from compiled `dist/lib/paths.js` → package root. */
export function getPackageRootDir(): string {
  return join(__dirname, '..', '..');
}

export function getPromptsDir(): string {
  return join(getPackageRootDir(), 'prompts');
}

export function getPackageJsonPath(): string {
  return join(getPackageRootDir(), 'package.json');
}
