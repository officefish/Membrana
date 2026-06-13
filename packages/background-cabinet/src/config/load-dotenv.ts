import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Корневой `.env`, затем `packages/background-cabinet/.env` (перекрывает ключи).
 */
export function loadDotenvFiles(): void {
  const cwd = process.cwd();
  const rootEnv = resolve(cwd, '.env');
  const cabinetEnvFromRoot = resolve(cwd, 'packages', 'background-cabinet', '.env');
  const cabinetEnvLocal = resolve(cwd, '.env');

  if (existsSync(rootEnv)) {
    config({ path: rootEnv });
  }
  if (existsSync(cabinetEnvFromRoot)) {
    config({ path: cabinetEnvFromRoot, override: true });
  } else if (cabinetEnvLocal !== rootEnv && existsSync(cabinetEnvLocal)) {
    config({ path: cabinetEnvLocal, override: true });
  }
}
