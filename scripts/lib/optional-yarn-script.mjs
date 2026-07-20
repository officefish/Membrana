/**
 * Soft-skip для optional yarn-скриптов (#725 C).
 * Нет ключа в package.json → warn, exit 0 (не hard-fail ритуала).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} scriptName — например `night:land-reports`
 * @param {string} [packageJsonPath]
 * @returns {boolean}
 */
export function yarnScriptExists(scriptName, packageJsonPath) {
  const path = packageJsonPath || join(process.cwd(), 'package.json');
  if (!existsSync(path)) return false;
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    return Boolean(pkg.scripts && pkg.scripts[scriptName]);
  } catch {
    return false;
  }
}

/**
 * @param {string} scriptName
 * @param {{packageJsonPath?: string, log?: (s: string) => void}} [opts]
 * @returns {{ok: true, exists: boolean, skipped: boolean}}
 */
export function softSkipMissingYarnScript(scriptName, opts = {}) {
  const log = opts.log || console.warn;
  const exists = yarnScriptExists(scriptName, opts.packageJsonPath);
  if (!exists) {
    log(
      `[optional-yarn] «${scriptName}» нет в package.json на этой ветке — soft-skip (не fail). ` +
        'Не звать optional night:* / ritual extras, пока скрипта нет на ветке.',
    );
    return { ok: true, exists: false, skipped: true };
  }
  return { ok: true, exists: true, skipped: false };
}
