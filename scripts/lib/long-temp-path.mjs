/**
 * Длинный tempfile-каталог (ATF4-3 / #971).
 *
 * На Windows `os.tmpdir()` часто даёт 8.3 (`USER19~1`) → `gh --body-file`
 * не находит файл. Пишем под `scripts/cache/` (gitignore) и прогоняем
 * через `realpathSync.native`, если доступен.
 */

import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} repoRoot
 * @param {string} [prefix]
 * @returns {string} абсолютный длинный путь к созданному каталогу
 */
export function makeLongTempDir(repoRoot, prefix = 'tmp-') {
  const cache = join(repoRoot, 'scripts', 'cache');
  mkdirSync(cache, { recursive: true });
  const dir = mkdtempSync(join(cache, prefix));
  try {
    return typeof realpathSync.native === 'function'
      ? realpathSync.native(dir)
      : realpathSync(dir);
  } catch {
    return dir;
  }
}
