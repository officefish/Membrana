/**
 * Тонкая обёртка README↔registry над предикатом групповой валидности (M4D / #1063).
 *
 * Единственный носитель сравнения — `computeReadmeMatchesRegistry` из task-validity.mjs.
 * Своей логики сравнения здесь нет (проверяемо: подмена/удаление предиката ломает check).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadRegistry, TASKS_README_REL } from './task-registry.mjs';
import {
  computeReadmeMatchesRegistry,
  extractActiveIdsFromReadme,
  groupReadmeDrift,
} from './task-validity.mjs';

/**
 * @param {object[]} cards
 * @param {string} readmeText
 * @returns {{ missing: string[], extra: string[] }}
 */
export function listReadmeActiveDrift(cards, readmeText) {
  const fromReadme = extractActiveIdsFromReadme(readmeText);
  if (fromReadme == null) return { missing: [], extra: [] };
  const active = new Set(
    (cards ?? []).filter((c) => c?.status === 'active' && c?.id).map((c) => String(c.id)),
  );
  const readme = new Set(fromReadme);
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const extra = [];
  for (const id of active) {
    if (!readme.has(id)) missing.push(id);
  }
  for (const id of readme) {
    if (!active.has(id)) extra.push(id);
  }
  missing.sort();
  extra.sort();
  return { missing, extra };
}

/**
 * @param {object[]} cards
 * @param {string} readmeText
 * @param {{ computeReadmeMatchesRegistry?: typeof computeReadmeMatchesRegistry }} [deps]
 * @returns {{
 *   ok: boolean,
 *   matches: boolean | 'unknown',
 *   findings: import('./task-validity.mjs').ValidityFinding[],
 *   missing: string[],
 *   extra: string[],
 * }}
 */
export function checkReadmeAgainstRegistry(cards, readmeText, deps = {}) {
  const compute = deps.computeReadmeMatchesRegistry ?? computeReadmeMatchesRegistry;
  const matches = compute(cards, readmeText);
  const findings = groupReadmeDrift(matches);
  const { missing, extra } = listReadmeActiveDrift(cards, readmeText);
  return {
    ok: matches === true,
    matches,
    findings,
    missing,
    extra,
  };
}

/**
 * CLI-прогон: читает registry + README с диска.
 *
 * @param {{
 *   cwd?: string,
 *   load?: typeof loadRegistry,
 *   readReadme?: (cwd: string) => string,
 *   computeReadmeMatchesRegistry?: typeof computeReadmeMatchesRegistry,
 * }} [deps]
 * @returns {{ code: number, report: string }}
 */
export function runSyncReadmeCheck(deps = {}) {
  const cwd = deps.cwd ?? process.cwd();
  const load = deps.load ?? loadRegistry;
  const readReadme =
    deps.readReadme ??
    ((dir) => readFileSync(join(dir, TASKS_README_REL), 'utf8'));

  let readmeText;
  try {
    readmeText = readReadme(cwd);
  } catch (err) {
    const msg = `task:sync-readme --check: не прочитать ${TASKS_README_REL}: ${
      err instanceof Error ? err.message : err
    }`;
    return { code: 1, report: msg };
  }

  const registry = load(cwd);
  const cards = Array.isArray(registry?.tasks) ? registry.tasks : [];
  const result = checkReadmeAgainstRegistry(cards, readmeText, {
    computeReadmeMatchesRegistry: deps.computeReadmeMatchesRegistry,
  });

  if (result.ok) {
    return { code: 0, report: 'task:sync-readme --check: OK (active README ↔ registry)' };
  }

  const lines = ['task:sync-readme --check: FAIL — README↔registry drift'];
  for (const f of result.findings) {
    lines.push(`  [${f.level}] ${f.code}: ${f.message}`);
  }
  if (result.matches === 'unknown') {
    lines.push('  секция «## Активные задачи» не найдена или не разобрана');
  }
  if (result.missing.length) {
    lines.push(`  в README нет (есть в registry active): ${result.missing.join(', ')}`);
  }
  if (result.extra.length) {
    lines.push(`  в README лишние (нет в registry active): ${result.extra.join(', ')}`);
  }
  lines.push('  чинит человек: правка README / registry вручную (хук не автофиксит)');
  lines.push('  карантин синка: TASKS_README_SYNC_FORCE=1 yarn task:sync-readme — только осознанно');
  return { code: 1, report: lines.join('\n') };
}
