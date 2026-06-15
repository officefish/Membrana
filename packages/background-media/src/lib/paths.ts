import { join } from 'node:path';

export function getPackageRootDir(): string {
  return join(__dirname, '..', '..');
}

export function getPackageJsonPath(): string {
  return join(getPackageRootDir(), 'package.json');
}
