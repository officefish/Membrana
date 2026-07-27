#!/usr/bin/env node
// Прогон тестов `scripts/**` по открытию дерева (#1263) — вместо строки из 210 путей
// в package.json, которая была файлом-перекрёстком и дала четыре конфликта 26.07.
//
// Usage:
//   node scripts/test-scripts-run.mjs                 # всё
//   node scripts/test-scripts-run.mjs --group security
//   node scripts/test-scripts-run.mjs --list          # только перечислить, не запускать
//
// Ядро плана (группы, исключения) — scripts/lib/test-scripts-plan.mjs, чистое и покрыто тестом.
import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planTestRun } from './lib/test-scripts-plan.mjs';
import { discoverTestFiles as discoverCatalogTests, loadTestCatalog } from './lib/tests-container.mjs';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPTS_DIR, '..');

export function discoverTestFiles(dir = SCRIPTS_DIR) {
  if (dir !== SCRIPTS_DIR) {
    // Back-compat for focused tests that used to pass a nested directory: keep the signature
    // but route normal execution through the catalog-backed discovery.
    return discoverCatalogTests(REPO_ROOT).filter((f) => f.startsWith(relative(REPO_ROOT, dir).split('\\').join('/')));
  }
  return discoverCatalogTests(REPO_ROOT);
}

function parse(argv) {
  const o = { group: null, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--group') {
      const v = argv[i + 1];
      if (!v || v.startsWith('-')) throw new Error('test:scripts: --group требует значение');
      o.group = v;
      i += 1;
    } else if (argv[i] === '--list') o.list = true;
    else throw new Error(`test:scripts: неизвестный аргумент «${argv[i]}»`);
  }
  return o;
}

function main() {
  let cli;
  try {
    cli = parse(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
    return;
  }

  let plan;
  try {
    const catalog = loadTestCatalog(REPO_ROOT);
    plan = planTestRun({ files: discoverTestFiles(), group: cli.group, catalog });
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
    return;
  }

  for (const { file, reason } of plan.skipped) {
    console.error(`test:scripts — пропущен ${file}: ${reason}`);
  }
  console.error(
    `test:scripts: ${plan.run.length} файл(ов)${plan.group ? ` в группе ${plan.group}` : ''}` +
      `${plan.skipped.length ? `, исключено ${plan.skipped.length}` : ''}`,
  );

  if (cli.list) {
    for (const f of plan.run) console.log(f);
    return;
  }
  if (plan.run.length === 0) {
    // Пустой прогон не выдаём за успех: пустая группа — почти наверняка опечатка.
    console.error('test:scripts: нечего запускать — проверь --group');
    process.exitCode = 1;
    return;
  }

  const run = spawnSync(process.execPath, ['--test', ...plan.run], { stdio: 'inherit', cwd: REPO_ROOT });
  process.exitCode = run.status ?? 1;
}

if (process.argv[1]?.endsWith('test-scripts-run.mjs')) main();
