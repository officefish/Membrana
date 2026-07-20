#!/usr/bin/env node
/**
 * Ангелина — прогон каскада ритуала на живом дереве. Строит снимок (git-версия + digest +
 * провенанс из заголовка), гонит через чистое ядро, печатает состояние каждого узла и
 * ВЫХОДИТ ГРОМКО (код 22) при любом блоке (`stale` или проблема провенанса). Никаких
 * `|| true`. Вердикт заседания M1.
 *
 *   node scripts/angelina.mjs [--json]
 *
 * NB: пока документы ритуала не несут заголовок провенанса `<!-- angelina {…} -->`, узлы
 * честно помечаются блоком (нет провенанса) — это не сбой Ангелины, а незавершённость
 * инструментовки (её достраивают спринты K/S/R/D).
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { orchestrateCascade, presentNode } from './lib/angelina-cascade.mjs';
import { buildSnapshot, gitFsIo } from './lib/angelina-adapter.mjs';

const EXIT_BLOCKED = 22;

/** Дневной каскад: горизонт → стендап → центральная задача. Рёбра = «потребитель читает производителя». */
export const CASCADE_DAY = {
  nodes: [
    { id: 'STRATEGY_DAY', path: 'docs/STRATEGY_DAY.md', label: 'Горизонт дня' },
    { id: 'DAILY_STANDUP', path: 'docs/DAILY_STANDUP.md', label: 'Стендап' },
    { id: 'MAIN_DAY_ISSUE', path: 'docs/MAIN_DAY_ISSUE.md', label: 'Центральная задача' },
  ],
  edges: [
    { from: 'STRATEGY_DAY', to: 'DAILY_STANDUP' },
    { from: 'STRATEGY_DAY', to: 'MAIN_DAY_ISSUE' },
    { from: 'DAILY_STANDUP', to: 'MAIN_DAY_ISSUE' },
  ],
};

function main() {
  const json = process.argv.includes('--json');
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const io = gitFsIo(repoRoot, { execFileSync, readFileSync, existsSync, join });
  const snapshot = buildSnapshot(CASCADE_DAY, io);
  const report = orchestrateCascade(CASCADE_DAY, snapshot);

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log('=== Ангелина · каскад дня ===');
    for (const id of report.order) console.log(presentNode(id, report.results[id]));
    const blocked = Object.values(report.results).filter((r) => r.blocked).length;
    console.log(
      report.ok
        ? '\nАнгелина: каскад дня чист — все документы свежи и подписаны. Можно начинать день.'
        : `\n✖ Ангелина: каскад заблокирован (${blocked} узл., первый — ${report.firstBlocked}). День НЕ начинаем на протухшем — чинить.`,
    );
  }

  process.exit(report.ok ? 0 : EXIT_BLOCKED);
}

// Прямой запуск (не импорт из теста).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
