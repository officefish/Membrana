#!/usr/bin/env node
/**
 * yarn verify:task-writes — зуб «у задач одного пакета не пересекаются файлы записи» (#2660).
 *
 * Соседний зуб `verify:build-order` (#2451) судит, ОБЪЯВЛЕН ли порядок сборки; этот —
 * не пишут ли две задачи одного пакета, идущие параллельно, в один файл (buildinfo `tsc`,
 * `outDir`), и не накрывают ли `outputs` одной задачи в `turbo.json` файл другой.
 * Обоснование и границы — в `scripts/lib/task-write-targets.mjs`; здесь обход ФС и печать.
 *
 * Читает только исходные манифесты: package.json пакетов, их tsconfig*.json, turbo.json.
 * Артефакты сборки (dist, *.tsbuildinfo, node_modules) не читает.
 *
 * Usage:
 *   node scripts/verify-task-write-targets.mjs
 *   node scripts/verify-task-write-targets.mjs --json
 *
 * Exit: 0 — пересечений нет · 1 — есть находки · 2 — ошибка входа.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyKnownDebt, packageWriteConflicts, parseJsonc } from './lib/task-write-targets.mjs';
import { readWorkspaces } from './verify-build-order-deps.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TURBO_JSON = join(ROOT, 'turbo.json');

/**
 * Известный долг — второй шаг #2660 (решение владельца 18.11: сначала 34 пакета без смены
 * поведения, приложения — отдельным шагом после CI).
 *
 * У этих приложений `typecheck` = `tsc -b` — та же команда, что в начале `build`, и обе
 * пишут `.tsbuildinfo.app`/`.node` одновременно. Лечение (`tsc -p … --noEmit
 * --tsBuildInfoFile …` на каждый проект) МЕНЯЕТ поведение: `-p` не пересобирает соседей по
 * ссылкам, а читает их готовый dist. Поэтому — отдельным PR, после зелёного CI первого шага.
 * Находки по ним печатаются как долг и зуб не красят; другие пакеты и другие пары задач
 * исключение не накрывает. Шаг 2 сделан — строку снять: исключение без находок зуб считает
 * устаревшим и красит.
 */
export const KNOWN_DEBT = Object.freeze(
  ['apps/cabinet', 'apps/client', 'apps/panel', 'apps/demos/Research-Tree'].map((dir) =>
    Object.freeze({
      dir,
      tasks: ['build', 'typecheck'],
      reason: 'typecheck = tsc -b, как в build: общий buildinfo приложения; второй шаг #2660',
      issue: 'https://github.com/officefish/Membrana/issues/2660',
    }),
  ),
);

function configReader(abs) {
  return (rel) => {
    const file = join(abs, rel);
    if (!existsSync(file)) return null;
    return parseJsonc(readFileSync(file, 'utf8'));
  };
}

export function collectFindings(root = ROOT) {
  const turboFile = join(root, 'turbo.json');
  if (!existsSync(turboFile)) throw new Error(`предмет зуба потерян: нет ${turboFile}`);
  const turbo = JSON.parse(readFileSync(turboFile, 'utf8'));
  if (!turbo.tasks) throw new Error('в turbo.json нет раздела tasks — судить нечего');
  const workspaces = readWorkspaces(root);
  const findings = [];
  for (const ws of workspaces) {
    for (const f of packageWriteConflicts(ws.pkg, turbo.tasks, configReader(ws.abs))) {
      findings.push({ pkg: ws.name, dir: ws.dir, ...f });
    }
  }
  return { packages: workspaces.length, ...applyKnownDebt(findings, KNOWN_DEBT) };
}

function main(argv) {
  const asJson = argv.includes('--json');
  if (!existsSync(TURBO_JSON)) throw new Error(`предмет зуба потерян: нет ${TURBO_JSON}`);
  const { packages, active: findings, exempted, stale } = collectFindings();
  const ok = findings.length === 0 && stale.length === 0;
  if (asJson) {
    console.log(JSON.stringify({ ok, packages, findings, exempted, stale }, null, 2));
    return ok ? 0 : 1;
  }
  const debtDirs = [...new Set(exempted.map((f) => f.dir))];
  if (debtDirs.length > 0) {
    console.log(`  известный долг (не красит, #2660 шаг 2): ${debtDirs.join(', ')}`);
  }
  for (const d of stale) {
    console.error(`  ✗ исключение устарело: ${d.dir} (${d.tasks.join('/')}) находок больше нет — снять строку из KNOWN_DEBT`);
  }
  if (ok) {
    console.log(`verify:task-writes — ✓ ${packages} пакет(ов): параллельные задачи пишут в разные файлы`);
  } else if (findings.length > 0) {
    for (const f of findings) {
      if (f.kind === 'overlap') {
        console.error(`  ✗ ${f.pkg} (${f.dir}): «${f.a}» и «${f.b}» оба пишут ${f.path}`);
      } else {
        console.error(
          `  ✗ ${f.pkg} (${f.dir}): turbo outputs «${f.glob}» задачи «${f.a}» накрывают ${f.path} задачи «${f.b}»`,
        );
      }
    }
    console.error('  почему это важно (#2660): turbo гонит эти задачи параллельно. Кто финишировал');
    console.error('  последним, тот и оставил файл; buildinfo от `--noEmit` говорит «ничего не выпущено»,');
    console.error('  и зависимый `tsc -b` перевыпускает dist пакета под ногами у читающих соседей.');
    console.error('  лекарство: свой файл записи у каждой задачи (`tsc --noEmit --tsBuildInfoFile');
    console.error('  ./.tsbuildinfo.typecheck`) и outputs в turbo.json — только на свои файлы.');
  }
  return ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('verify-task-write-targets.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`verify:task-writes — ошибка входа: ${error?.message ?? error}`);
    process.exit(2);
  }
}
