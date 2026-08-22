#!/usr/bin/env node
/**
 * require:install-state — ранний отказ там, где кусает.
 *
 * Ставится ПЕРЕД локальными судьями (`yarn test`, `yarn typecheck`): свежее дерево без
 * установки делает их фикцией, а узнаёт об этом человек сегодня только на пуше — то есть
 * в конце (`.githooks/pre-push`, строки 30–39; хук честен и здесь не дублируется — он о
 * другом моменте).
 *
 * Класс пойман 22.08 двумя сессиями: локальные vitest/tsc упирались в разрешение
 * workspace-пакетов, а обход одолженным бинарём соседнего дерева давал ЗЕЛЁНЫЙ на
 * нерезолвящихся пакетах.
 *
 * ГРАНИЦА ЧЕСТНАЯ. Перекрывается путь `yarn <судья>`. Прямой запуск чужого бинаря
 * (`node ../Membrana/node_modules/vitest/vitest.mjs …`) сюда НЕ попадает: у vitest 19 пакетных
 * конфигов и нет корневого — закрыть тот путь значит тронуть все 19 либо завести общий
 * workspace-конфиг, то есть сменить способ запуска тестов во всём репо. Названо записью, а не
 * сделано вид, что дыра закрыта (решение владельца 22.08).
 *
 * Usage:
 *   node scripts/require-install-state.mjs --verb test
 *   ALLOW_NO_INSTALL=1 yarn test     # обход, который будет НАЗВАН
 *
 * Exit: 0 — можно судить (или обход назван) · 1 — судья был бы фикцией.
 */
import { existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { judgeInstallState, refusalMessage } from './lib/install-state.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Наблюдение о дереве — вся работа с ФС здесь, суждение выносит ядро. */
export function observeTree(root = repoRoot, io = { exists: existsSync, real: realpathSync }) {
  const modules = join(root, 'node_modules');
  const modulesDir = io.exists(modules);
  let modulesRealRoot = null;
  if (modulesDir) {
    try {
      modulesRealRoot = dirname(io.real(modules));
    } catch {
      modulesRealRoot = null;
    }
  }
  return {
    modulesDir,
    stateFile: io.exists(join(modules, '.yarn-state.yml')),
    modulesRealRoot,
    treeRoot: root,
  };
}

function main(argv) {
  const verbIdx = argv.indexOf('--verb');
  const verb = verbIdx === -1 ? null : argv[verbIdx + 1] ?? null;
  const decision = judgeInstallState(observeTree());
  if (decision.state === 'installed') return 0;

  if (process.env.ALLOW_NO_INSTALL === '1') {
    // Обход не запрещён — он ОБЪЯВЛЕН: молчаливый обход и был бы тем же ложным зелёным.
    console.error(
      `⚠ install-state: ${decision.why} — прогон идёт по ALLOW_NO_INSTALL=1.\n` +
        '  Результат этого судьи НЕ является свидетельством о дереве.',
    );
    return 0;
  }

  console.error(refusalMessage({ ...decision, verb: verb ?? undefined, treeRoot: repoRoot }));
  return 1;
}

if (process.argv[1] && process.argv[1].endsWith('require-install-state.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
