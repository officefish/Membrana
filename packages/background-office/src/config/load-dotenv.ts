import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Подмешивает переменные из файлов `.env` в `process.env` до валидации zod.
 * Порядок: корень репозитория (при `yarn office:dev` из корня), затем
 * `packages/background-office/.env` (перекрывает совпадающие ключи).
 * Если команда запущена из каталога пакета, достаточно локального `.env`.
 */
export function loadDotenvFiles(): void {
  const cwd = process.cwd();
  const rootEnv = resolve(cwd, '.env');
  const officeEnv = resolve(cwd, 'packages', 'background-office', '.env');

  if (existsSync(rootEnv)) {
    config({ path: rootEnv });
  }
  if (existsSync(officeEnv)) {
    config({ path: officeEnv, override: true });
  }
}
