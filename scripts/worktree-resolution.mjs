#!/usr/bin/env node
/**
 * `yarn worktree:resolve [--tree <путь>] [--json]` — отвечает на один вопрос:
 * **достоверен ли в этом дереве МЕЖПАКЕТНЫЙ typecheck?**
 *
 * Блок 1 спринта `worktree-foreign-resolution-probe` (#1647). Ядро построено 03.08 и цело
 * (`scripts/lib/worktree-resolution.mjs`, 17 зубов) — здесь только ПРОВОД: git, файловая
 * система, печать. Всё суждение остаётся в ядре (условие резчика): второй копии предиката
 * тут нет и быть не должно.
 *
 * ЗАЧЕМ ПРОВОД. Ядро больше четырёх суток нельзя было позвать — файла и глагола не
 * существовало. Цена измерена 08.08: разбирая это же иссью, исполнитель написал одноразовую
 * проверку (звать было нечем), она сравнила пути по префиксу строки и объявила
 * `…/Membrana-tooling/packages/core` «своим» для дерева `…/Membrana` — вышло «чужих 0» там,
 * где чужих все 37. В ядре эта ловушка закрыта сегментной проверкой. Класс сработал на том,
 * кто пришёл его чинить.
 *
 * Exit: 0 — резолюция своя · 1 — есть чужая (СОСТОЯНИЕ дерева, не сбой глагола) ·
 *       2 — замер не состоялся (нет git, нет node_modules, порт недоступен).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { attributeForeign, formatAttribution } from './lib/worktree-identity.mjs';
import {
  RESOLUTION_STATES,
  classifyResolution,
  formatResolution,
} from './lib/worktree-resolution.mjs';

const SCOPE_DIR = '@membrana';

export function parseArgs(argv) {
  const out = { tree: null, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--tree') out.tree = argv[++i] ?? null;
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return out;
}

/** Корень рабочего дерева. Спрашиваем git, а не считаем от __dirname: глагол зовут из любого места. */
function treeRootOf(cwd) {
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd, encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out === '' ? null : realpathSync(out);
  } catch {
    return null;
  }
}

/**
 * Перечень рабочих деревьев с ветками — наблюдение для ядра опознания. Порт спрашивает git;
 * решать, кому принадлежит путь, будет ядро.
 *
 * Недоступный git даёт пустой перечень: тогда чужие пакеты честно назовутся неопознанными,
 * а не припишутся кому попало.
 */
export function collectTrees(cwd) {
  let raw;
  try {
    raw = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd, encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return [];
  }
  const trees = [];
  let current = null;
  for (const line of String(raw).split('\n')) {
    if (line.startsWith('worktree ')) {
      const root = line.slice('worktree '.length).trim();
      current = { root, name: path.basename(root), branch: null };
      trees.push(current);
    } else if (line.startsWith('branch ') && current) {
      current.branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//u, '');
    } else if (line.startsWith('detached') && current) {
      current.branch = '(detached)';
    }
  }
  return trees;
}

/**
 * Пакеты воркспейса с РАЗЫМЕНОВАННЫМИ путями — наблюдение для ядра.
 *
 * `realPath: null` у битой ссылки: ядро считает такие отдельно и не выдаёт за чужие.
 * Отсутствие каталога — не пустой список, а `null`: «нечего мерить» и «всё своё» обязаны
 * различаться, иначе `absent` превратится в тихое зелёное.
 */
export function collectPackages(treeRoot) {
  const dir = path.join(treeRoot, 'node_modules', SCOPE_DIR);
  let names;
  try {
    if (!statSync(dir).isDirectory()) return null;
    names = readdirSync(dir);
  } catch {
    return null;
  }
  return names.map((name) => {
    try {
      return { name, realPath: realpathSync(path.join(dir, name)) };
    } catch {
      return { name, realPath: null };
    }
  });
}

function main(argv, cwd = process.cwd()) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (e) {
    console.error(`worktree:resolve — ошибка входа: ${e.message}`);
    return 2;
  }
  if (cli.help) {
    console.log('Usage: yarn worktree:resolve [--tree <путь>] [--json]');
    console.log('\nОтвечает: own | foreign | absent — достоверен ли здесь МЕЖПАКЕТНЫЙ typecheck.');
    console.log('Однопакетная правка проверяется в своём дереве честно; сквозная проверка — CI.');
    return 0;
  }

  const treeRoot = cli.tree ? path.resolve(cli.tree) : treeRootOf(cwd);
  if (!treeRoot) {
    console.error('worktree:resolve — замер НЕ состоялся: корень дерева не определился (git недоступен?). «Не знаю» не значит «всё своё»');
    return 2;
  }

  const packages = collectPackages(treeRoot);
  if (packages === null) {
    // Каталога нет вовсе — у ядра для этого своё слово, и оно должно прозвучать.
    const verdict = classifyResolution(treeRoot, []);
    console.log(`worktree:resolve — ${path.basename(treeRoot)}`);
    console.log(formatResolution(verdict));
    return 2;
  }

  const verdict = classifyResolution(treeRoot, packages);
  // Опознание владельца — только при чужой резолюции: на своём дереве добавлять нечего,
  // и лишняя строка размыла бы вердикт ядра.
  const attribution = verdict.state === RESOLUTION_STATES.FOREIGN
    ? attributeForeign(packages, treeRoot, collectTrees(cwd))
    : { owners: [], unknown: [] };

  if (cli.json) {
    process.stdout.write(`${JSON.stringify({ tree: treeRoot, ...verdict, attribution }, null, 2)}\n`);
  } else {
    console.log(`worktree:resolve — ${path.basename(treeRoot)}`);
    console.log(formatResolution(verdict));
    for (const line of formatAttribution(attribution)) console.log(line);
  }
  if (verdict.state === RESOLUTION_STATES.ABSENT) return 2;
  return verdict.state === RESOLUTION_STATES.FOREIGN ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}

export { main };
