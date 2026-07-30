#!/usr/bin/env node
/**
 * yarn resolutions:check — живой ли каждый ключ `resolutions` (#1493 Ф2).
 *
 * Отвечает на вопрос, который на глаз не решается: покрывает ли запись хоть один
 * настоящий запрос, и встала ли целевая версия. Read-only: ничего не ставит и не правит.
 *
 * Exit: 0 — все ключи работают · 1 — есть мёртвые или невставшие · 2 — инструментальная.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkResolutions, summarize } from './lib/resolutions-liveness.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const pkgPath = join(root, 'package.json');
  const lockPath = join(root, 'yarn.lock');
  if (!existsSync(pkgPath) || !existsSync(lockPath)) {
    console.error('resolutions:check — нет package.json или yarn.lock рядом с корнем');
    return 2;
  }
  const resolutions = JSON.parse(readFileSync(pkgPath, 'utf8')).resolutions ?? {};
  if (Object.keys(resolutions).length === 0) {
    console.log('resolutions:check — ✓ записей нет, проверять нечего');
    return 0;
  }
  const rows = checkResolutions(resolutions, readFileSync(lockPath, 'utf8'));
  const report = summarize(rows);

  if (report.state === 'чисто') {
    console.log(`resolutions:check — ✓ ${report.total} ключ(ей) работают: ${report.advice}`);
    return 0;
  }
  console.error(`resolutions:check — находок: ${report.dead.length + report.stuck.length} из ${report.total}`);
  for (const r of report.dead) console.error(`  ✗ мёртвый  ${r.key} → ${r.target} — ${r.reason}`);
  for (const r of report.stuck) console.error(`  ⚠ не встал ${r.key} → ${r.target} — ${r.reason}`);
  console.error(`\nремонт: ${report.advice}`);
  return 1;
}

if (process.argv[1]?.endsWith('resolutions-check.mjs')) process.exit(main());
