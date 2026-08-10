#!/usr/bin/env node
/**
 * vitest-smoke-list — CLI яруса `smoke` корпуса vitest: показать состав, переписать каталог,
 * проверить каталог на расхождение с графом (блок b1 спринта `vitest-two-tier-gate`).
 *
 * Тонкий: весь разбор графа и отбор живут в `lib/vitest-workspace.mjs` — там же обоснование
 * признака и порога. Идиома соседа `tests-container.mjs` над `lib/tests-container.mjs`;
 * второй потребитель ядра — провод мердж-гейта `vitest-gate.mjs`.
 *
 * Использование:
 *   node scripts/vitest-smoke-list.mjs            # показать состав
 *   node scripts/vitest-smoke-list.mjs --json
 *   node scripts/vitest-smoke-list.mjs --write    # переписать tests/vitest-smoke.catalog.json
 *   node scripts/vitest-smoke-list.mjs --check    # каталог в дереве == вычисленному?
 *
 * Exit: 0 — согласовано · 1 — расхождение каталога с графом (`--check`) · 2 — ошибка входа.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CATALOG_REL, computeSelection, renderCatalog } from './lib/vitest-workspace.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parse(argv) {
  const out = { json: false, write: false, check: false, help: false };
  for (const a of argv) {
    if (a === '--json') out.json = true;
    else if (a === '--write') out.write = true;
    else if (a === '--check') out.check = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`vitest-smoke-list: неизвестный аргумент «${a}»`);
  }
  return out;
}

function main() {
  let cli;
  try {
    cli = parse(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
    return;
  }
  if (cli.help) {
    console.log('Usage: node scripts/vitest-smoke-list.mjs [--json|--write|--check]');
    return;
  }

  const computed = computeSelection(repoRoot);
  if (!computed.ok) {
    for (const p of computed.problems) console.error(`vitest-smoke-list: ${p}`);
    process.exitCode = 2;
    return;
  }
  const catalog = renderCatalog(computed.selection);
  const body = `${JSON.stringify(catalog, null, 2)}\n`;

  if (cli.write) {
    writeFileSync(join(repoRoot, CATALOG_REL), body, 'utf8');
    console.error(`vitest-smoke-list: ${CATALOG_REL} переписан — smoke ${catalog.smoke.length} из ${catalog.corpusSize}`);
    return;
  }
  if (cli.check) {
    const path = join(repoRoot, CATALOG_REL);
    if (!existsSync(path)) {
      console.error(`vitest-smoke-list: ${CATALOG_REL} отсутствует — гейту не на что опереться`);
      process.exitCode = 1;
      return;
    }
    if (readFileSync(path, 'utf8') !== body) {
      console.error(`vitest-smoke-list: ${CATALOG_REL} разошёлся с графом воркспейса — «yarn vitest:smoke-list --write» и в PR`);
      process.exitCode = 1;
      return;
    }
    console.error(`vitest-smoke-list: каталог согласован с графом — smoke ${catalog.smoke.length} из ${catalog.corpusSize}`);
    return;
  }
  if (cli.json) {
    console.log(JSON.stringify(catalog, null, 2));
    return;
  }
  console.log(`порог фан-ина: ${catalog.threshold} · корпус: ${catalog.corpusSize} пакетов со скриптом test`);
  console.log(`smoke (${catalog.smoke.length}): ${catalog.smoke.join(', ')}`);
  if (catalog.withoutTests.length) {
    console.log(`выше порога, но тестов нет: ${catalog.withoutTests.join(', ')}`);
  }
}

if (process.argv[1]?.endsWith('vitest-smoke-list.mjs')) main();
