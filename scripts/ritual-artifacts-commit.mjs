#!/usr/bin/env node
/**
 * yarn ritual:artifacts-commit — автозабор артефактов ритуала (помеха №1, 28.07).
 *
 * Коммитит ПОИМЁННО только известные продукты вечерней цепочки (белый список из
 * produces[] манифеста + датированные протоколы seanses/bridge). Чужие
 * незакоммиченные файлы не трогает — их увидит leveling как находку, это его работа.
 *
 * Exit: 0 — закоммичено / забирать нечего (честный no-op); 1 — отказ (main без
 * ALLOW_MAIN_COMMIT / хук отклонил); 2 — инструментальная ошибка.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyStatus, sweepDates, whitelistFromManifest } from './lib/ritual-artifacts.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', timeout: 60_000 });

function main() {
  const date = new Date().toISOString().slice(0, 10);
  const branch = run('git', ['branch', '--show-current']).trim();
  if (branch === 'main' && process.env.ALLOW_MAIN_COMMIT !== '1') {
    console.error('ritual:artifacts-commit — отказ: HEAD == main (#1232); цепочка ритуала обязана жить на своей ветке');
    return 1;
  }
  // --manifest <path> — какой цепочке принадлежат артефакты (утро спотыкалось о
  // свои же, помеха 29.07 — близнец вечерней №1). Умолчание — вечер, как было.
  // Флаг повторяем: утро подбирает и ХВОСТ ВЕЧЕРА, читая вечерний манифест как источник,
  // а не копируя его пути к себе — копия разошлась бы, как разошёлся список воркспейсов.
  const argv = process.argv.slice(2);
  const manifestRels = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--manifest' && argv[i + 1]) manifestRels.push(argv[i + 1]);
  }
  if (manifestRels.length === 0) manifestRels.push('docs/tasks/evening-ritual-steps.json');

  // --since-yesterday — окно забора шире суток ровно на стык вечера и утра. Часть продуктов
  // вечера пишется ПОСЛЕ забора (память персон едет на ласточке, а та ждёт слова владельца),
  // и утром они уже вчерашние: без окна забор своего же хвоста не узнаёт.
  const dates = sweepDates(date, { includeYesterday: argv.includes('--since-yesterday') });

  const whitelist = [];
  for (const rel of manifestRels) {
    const manifest = JSON.parse(readFileSync(join(repoRoot, rel), 'utf8'));
    whitelist.push(...whitelistFromManifest(manifest, dates));
  }
  const { take, leave } = classifyStatus(run('git', ['status', '--porcelain']), whitelist, dates);

  if (leave.length > 0) {
    console.log(`ritual:artifacts-commit — оставлено чужим (${leave.length}): ${leave.slice(0, 5).join(', ')}${leave.length > 5 ? '…' : ''} — находка leveling, не добыча автозабора`);
  }
  if (take.length === 0) {
    console.log('ritual:artifacts-commit — артефактов к забору нет (честный no-op)');
    return 0;
  }
  try {
    run('git', ['add', '--', ...take]);
    execFileSync('git', ['commit', '-m', `chore(ritual): автозабор артефактов ритуала ${date} (счётчик чистых прогонов, помеха №1)`], { cwd: repoRoot, stdio: 'inherit' });
  } catch (e) {
    console.error(`ritual:artifacts-commit — коммит не прошёл (хук?): ${String(e.message ?? e).split('\n')[0]}`);
    console.error('  проверить git status ГЛАЗАМИ: отказ хука приходит видом успеха следующего шага (B6)');
    return 1;
  }
  console.log(`ritual:artifacts-commit — забрано поимённо: ${take.length} файл(ов)`);
  return 0;
}

if (process.argv[1]?.endsWith('ritual-artifacts-commit.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`ritual:artifacts-commit — инструментальная ошибка: ${e.message}`);
    process.exit(2);
  }
}
