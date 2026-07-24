#!/usr/bin/env node
/**
 * yarn tasks:decompose — декомпозиция активного реестра задач по оси.
 *
 * Read-only. Живёт в соседнем контуре docs/audit/tasks (V2 wins: не verb
 * мастерской docs/tasks). Ось — `--by` (default category); параметры осей —
 * в `scripts/tasks-decompose.config.json` (норма Р5). Одна ось за прогон.
 * «ВНЕ КАТЕГОРИЙ» — на любую ось. Скилл: `.cursor/skills/membrana-tasks-decompose/SKILL.md`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { execFileSync } from 'node:child_process';

import {
  AXES,
  collectByAxes,
  compileAxis,
  decomposeByAxis,
  formatTable,
  renderReport,
  resolveAxis,
} from './lib/tasks-decompose.mjs';
import { listActive, loadRegistry } from './lib/task-registry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`yarn tasks:decompose

  Раскладывает active-карточки реестра по одной оси и печатает таблицу.
  Контур: docs/audit/tasks (не verb мастерской docs/tasks — V2 wins / g0).

  --by <ось>        ось: ${AXES.join('|')} (default category)
  --config <path>   свой конфиг (default scripts/tasks-decompose.config.json)
  --examples <n>    сколько id-примеров в строке таблицы (default 3; 0 — без примеров)
  --full            после таблицы — полный список id по каждой группе
  --json            машинный вывод вместо таблицы
  --report <file>   записать markdown-отчёт (Meta + таблица + полные списки) в файл;
                    канонический путь — docs/audit/tasks/registry/TASKS_DECOMPOSE_LIST.md

  Одна ось за прогон: два --by или CSV — отказ. Ось health отложена (M4B).
  Параметры осей — в конфиге, не в коде. «ВНЕ КАТЕГОРИЙ» ≠ ошибка прогона,
  это находка: нет значения по оси / конфиг отстал — дополни паттерны.`);
    return;
  }

  const configPath = arg('--config', join(repoRoot, 'scripts', 'tasks-decompose.config.json'));
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  let axis;
  try {
    axis = resolveAxis(collectByAxes(process.argv.slice(2)), {
      defaultAxis: config.defaultAxis ?? 'category',
    });
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exitCode = 2;
    return;
  }

  let axisSpec;
  try {
    axisSpec = compileAxis(config, axis);
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exitCode = 2;
    return;
  }

  const active = listActive(loadRegistry());
  const result = decomposeByAxis(active, axisSpec);

  const reportPath = arg('--report', null);
  if (reportPath) {
    let headSha = 'n/a';
    try {
      headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: repoRoot }).trim();
    } catch {
      /* вне git — Meta без SHA */
    }
    const meta = {
      Date: new Date().toISOString().slice(0, 10),
      'Head SHA': headSha,
      Source: `yarn tasks:decompose --by ${axis} --report`,
      Axis: axis,
      Config: configPath.replace(/\\/g, '/').split('/').slice(-2).join('/'),
      Active: String(result.total),
    };
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(reportPath, renderReport(result, meta));
    console.log(`Реестр: ${reportPath}`);
  }

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          axis: result.axis,
          total: result.total,
          buckets: result.buckets.map((b) => ({
            name: b.name,
            count: b.tasks.length,
            ids: b.tasks.map((t) => t.id),
          })),
          unassigned: result.unassigned.map((t) => t.id),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`tasks:decompose — axis=${axis}, active: ${result.total}, групп: ${result.buckets.length}\n`);
  // NaN-гард (ревью 21.07): `--examples abc` иначе тихо гасил бы примеры.
  const examplesRaw = Number(arg('--examples', '3'));
  console.log(formatTable(result, { examples: Number.isFinite(examplesRaw) ? examplesRaw : 3 }));

  if (process.argv.includes('--full')) {
    for (const b of result.buckets) {
      console.log(`\n## ${b.name} (${b.tasks.length})`);
      for (const t of b.tasks) console.log(`  • ${t.id}${t.size ? ` [${t.size}]` : ''} — ${t.title ?? ''}`);
    }
  }

  if (result.unassigned.length > 0) {
    console.log(`\n⚠ вне категорий (${result.unassigned.length}) — нет значения по оси / дополни конфиг:`);
    for (const t of result.unassigned) console.log(`  • ${t.id} — ${t.title ?? ''}`);
  }
}

main();
