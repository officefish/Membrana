#!/usr/bin/env node
/**
 * `yarn scripts:orphans` — прямой ответ мастерской скриптов: бесхозные есть или нет.
 *
 * Глагол `audit` мастерской (`scripts/workshop.manifest.json`). Ответ ВСЕГДА со статусом и
 * знаменателем: молчаливый пустой список читается как «чисто», хотя может значить «обход не
 * нашёл ни одного носителя» — §4 такое молчание запрещает прямо.
 *
 * Коды возврата: 0 — бесхозных нет · 1 — есть. Второе сегодня ожидаемо: §4 остаётся заявкой,
 * `scripts/` домом ещё не считается (см. RECONCILE_M3), и правдивый ответ — «почти всё
 * сиротское». Красный тут говорит о состоянии дома, а не о поломке прибора.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readRegistry, REGISTRY_STATES } from './lib/namespace-registry.mjs';
import { ORPHANS_STATUS, orphans } from './lib/scripts-workshop.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main(argv) {
  const includeTests = !argv.includes('--no-tests');
  const asJson = argv.includes('--json');

  const registry = readRegistry(repoRoot);
  const namespaces = registry.state === REGISTRY_STATES.OK ? registry.namespaces : [];
  const result = orphans(repoRoot, { includeTests, namespaces });

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ ...result, registryState: registry.state }, null, 2)}\n`);
    return result.status === ORPHANS_STATUS.CLEAN ? 0 : 1;
  }

  const lines = [`scripts:orphans · знаменатель ${result.denominator}${includeTests ? ' (инструменты ∪ тесты)' : ' (без тестов)'}`];
  if (registry.state !== REGISTRY_STATES.OK) {
    // Реестр недоступен → членство по правилам не проверялось вовсе. Промолчать здесь
    // значит выдать «сирота» там, где на деле «не спрашивали».
    lines.push(`⚠ реестр неймспейсов: ${registry.state} — членство по правилам НЕ проверялось: ${registry.problems.join('; ')}`);
  } else if (registry.namespaces.length === 0) {
    lines.push('⚠ правил членства ноль — сиротство ниже означает «правила ещё нет», а не «место потеряно»');
  }
  lines.push(
    result.status === ORPHANS_STATUS.CLEAN
      ? `✓ бесхозных нет · проверено ${result.denominator}`
      : `✖ бесхозных ${result.counted} из ${result.denominator}`,
  );
  for (const p of result.orphans.slice(0, 20)) lines.push(`    ${p}`);
  if (result.orphans.length > 20) lines.push(`    … и ещё ${result.orphans.length - 20} (полный список — \`--json\`)`);

  process.stdout.write(`${lines.join('\n')}\n`);
  return result.status === ORPHANS_STATUS.CLEAN ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('scripts-orphans.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
