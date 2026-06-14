import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Корневой `.env`, затем `packages/background-media/.env` (перекрывает ключи).
 */
export function loadDotenvFiles(): void {
  const cwd = process.cwd();
  const rootEnv = resolve(cwd, '.env');
  const mediaEnvFromRoot = resolve(cwd, 'packages', 'background-media', '.env');
  const mediaEnvLocal = resolve(cwd, '.env');

  if (existsSync(rootEnv)) {
    config({ path: rootEnv });
  }
  if (existsSync(mediaEnvFromRoot)) {
    config({ path: mediaEnvFromRoot, override: true });
  } else if (mediaEnvLocal !== rootEnv && existsSync(mediaEnvLocal)) {
    config({ path: mediaEnvLocal, override: true });
  }
}
