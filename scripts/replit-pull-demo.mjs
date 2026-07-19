/**
 * replit-pull-demo — забрать работу Replit-агента и слить в apps/demos.
 *
 * Тянет ветку replit/<slug> (куда агент запушил демо, построенное внутри
 * apps/demos/<demoName>/), переносит папку в рабочее дерево, регистрирует воркспейс в
 * package.json (apps/demos/* тут НЕ вайлдкард) и оставляет застейдженным на ревью — не
 * коммитит и не мёржит за тебя.
 *
 *   yarn replit:pull-demo <slug> [demoName]        # demoName по умолчанию = slug
 *   yarn replit:pull-demo <slug> MyDemo --branch replit/custom
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  validateSlug,
  taskBranchName,
  demoWorkspacePath,
  registerWorkspace,
  flagValue,
  positionalArgs,
} from './lib/replit-bridge.mjs';

const VALUE_FLAGS = ['--branch'];

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
  console.log(`Usage: yarn replit:pull-demo <slug> [demoName] [--branch <ref>]

Тянет ветку с работой агента, переносит apps/demos/<demoName>/ в рабочее дерево,
регистрирует воркспейс. Оставляет застейдженным — ревью/коммит/PR за тобой.`);
  process.exitCode = 0;
} else {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

function git(args, repoRoot) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function main() {
  const repoRoot = process.cwd();
  const positional = positionalArgs(argv, VALUE_FLAGS);
  const slug = validateSlug(positional[0] ?? '', 'slug');
  const demoName = validateSlug(positional[1] ?? slug, 'demo');
  const branch = flagValue(argv, '--branch') ?? taskBranchName(slug);
  const demoPath = demoWorkspacePath(demoName);

  try {
    git(['fetch', 'origin', `${branch}:refs/remotes/origin/${branch}`, '--quiet'], repoRoot);
  } catch (e) {
    console.error(`Не удалось получить ветку origin/${branch}:`, e.stderr?.toString?.() || e.message);
    console.error('Проверь, что агент запушил ветку, и её имя.');
    process.exitCode = 1;
    return;
  }

  const ref = `origin/${branch}`;

  try {
    git(['cat-file', '-e', `${ref}:${demoPath}/package.json`], repoRoot);
  } catch {
    console.error(`На ветке ${ref} нет ${demoPath}/package.json.`);
    console.error('Похоже, агент построил не туда или не запушил. Смотри git ls-tree ' + ref);
    process.exitCode = 1;
    return;
  }

  git(['checkout', ref, '--', demoPath], repoRoot);
  const filesCount = git(['ls-files', '--', demoPath], repoRoot).split(/\r?\n/u).filter(Boolean).length;

  const pkgPath = resolve(repoRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const { pkg: nextPkg, changed } = registerWorkspace(pkg, demoName);
  if (changed) {
    writeFileSync(pkgPath, `${JSON.stringify(nextPkg, null, 2)}\n`, 'utf8');
    git(['add', '--', 'package.json'], repoRoot);
  }

  console.error(`Забрано в ${demoPath}/ (${filesCount} файлов, застейджено).`);
  console.error(`   Воркспейс: ${changed ? 'зарегистрирован в package.json' : 'уже был/вайлдкард — не трогал'}`);
  console.error('');
  console.error('Дальше — на твоей стороне (ничего не коммичу за тебя):');
  console.error('   1) git status / просмотреть перенесённое');
  console.error('   2) yarn install  (подтянуть зависимости демо)');
  console.error(`   3) yarn workspace @membrana/${demoName.toLowerCase()}-demo build  (или turbo)`);
  console.error(`   4) code-review → коммит поимённо → PR`);
  process.exitCode = 0;
}
