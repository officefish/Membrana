/**
 * Карта кодов возврата ритуальных цепочек (#622).
 * Артефакт: docs/tasks/ritual-exit-codes.json
 *
 * Гард: ненулевой код шага вечерней цепочки обязан быть в карте как failure|finding.
 * Недокументированный код = дефект карты или скрытая семантика (тот класс, что
 * вскрыл findingExitCodes на живом прогоне 18.07).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const RITUAL_EXIT_CODES_REL = 'docs/tasks/ritual-exit-codes.json';
export const EVENING_MANIFEST_REL = 'docs/tasks/evening-ritual-steps.json';

/** @typedef {'ok'|'failure'|'finding'|'undefined'} ExitBucket */
/** @typedef {{ bucket: ExitBucket, meaning: string }} CodeEntry */

/**
 * @returns {object}
 */
export function loadRitualExitCodesMap(mapPath = resolve(root, RITUAL_EXIT_CODES_REL)) {
  if (!existsSync(mapPath)) {
    throw new Error(`ritual-exit-codes: карта не найдена: ${RITUAL_EXIT_CODES_REL}`);
  }
  return JSON.parse(readFileSync(mapPath, 'utf8'));
}

/**
 * @param {object} map
 * @param {string} chainId
 * @param {string} stepId
 * @returns {{ script: string, codes: Record<string, CodeEntry>, findingExitCodes?: number[] }|null}
 */
export function getStepMap(map, chainId, stepId) {
  return map?.chains?.[chainId]?.steps?.[stepId] ?? null;
}

/**
 * Классификация кода по карте. null = код не документирован.
 * @param {object} map
 * @param {string} chainId
 * @param {string} stepId
 * @param {number|null} exitCode
 * @returns {CodeEntry|null}
 */
export function classifyExitCode(map, chainId, stepId, exitCode) {
  if (exitCode == null || !Number.isInteger(exitCode)) return null;
  const step = getStepMap(map, chainId, stepId);
  if (!step?.codes) return null;
  return step.codes[String(exitCode)] ?? null;
}

/**
 * Гард: ненулевой код обязан быть в карте (failure|finding).
 * exit 0 всегда допустим (даже если в карте нет — ok подразумевается).
 * @throws {Error} с полем undocumented=true
 */
export function assertDocumentedExitCode(map, chainId, stepId, exitCode) {
  if (exitCode == null || exitCode === 0) return { ok: true };
  const entry = classifyExitCode(map, chainId, stepId, exitCode);
  if (entry && (entry.bucket === 'failure' || entry.bucket === 'finding')) {
    return { ok: true, entry };
  }
  const step = getStepMap(map, chainId, stepId);
  const known = step?.codes ? Object.keys(step.codes).join(', ') : '(шага нет в карте)';
  const err = new Error(
    `ritual-exit-codes: недокументированный exit ${exitCode} у ${chainId}/${stepId}. ` +
      `Известные коды: ${known}. Обнови docs/tasks/ritual-exit-codes.json (#622).`,
  );
  err.undocumented = true;
  err.exitCode = exitCode;
  err.stepId = stepId;
  throw err;
}

/**
 * findingExitCodes в манифесте вечера ⊆ finding-кодам карты и наоборот для объявленных.
 * @returns {{ ok: boolean, mismatches: string[] }}
 */
export function reconcileEveningFindings(map, manifestPath = resolve(root, EVENING_MANIFEST_REL)) {
  const mismatches = [];
  const evening = map?.chains?.evening?.steps ?? {};
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const byId = new Map((manifest.steps ?? []).map((s) => [s.id, s]));

  for (const [stepId, stepMap] of Object.entries(evening)) {
    const mapFindings = new Set(
      Object.entries(stepMap.codes ?? {})
        .filter(([, e]) => e.bucket === 'finding')
        .map(([c]) => Number(c)),
    );
    const declared = new Set(stepMap.findingExitCodes ?? []);
    const manifestFindings = new Set(byId.get(stepId)?.findingExitCodes ?? []);

    for (const c of mapFindings) {
      if (!declared.has(c)) mismatches.push(`${stepId}: карта finding ${c} не в step.findingExitCodes`);
      if (!manifestFindings.has(c)) {
        mismatches.push(`${stepId}: карта finding ${c} не в evening-ritual-steps.json`);
      }
    }
    for (const c of manifestFindings) {
      if (!mapFindings.has(c)) {
        mismatches.push(`${stepId}: манифест findingExitCodes ${c} нет в карте как finding`);
      }
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}

/**
 * Полнота: каждый шаг манифеста вечера есть в карте; orphan-шагов карты нет.
 */
export function checkEveningCoverage(map, manifestPath = resolve(root, EVENING_MANIFEST_REL)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const mapIds = new Set(Object.keys(map?.chains?.evening?.steps ?? {}));
  const manifestIds = new Set((manifest.steps ?? []).map((s) => s.id));
  const missingInMap = [...manifestIds].filter((id) => !mapIds.has(id));
  const orphansInMap = [...mapIds].filter((id) => !manifestIds.has(id));
  return {
    ok: missingInMap.length === 0 && orphansInMap.length === 0,
    missingInMap,
    orphansInMap,
  };
}
