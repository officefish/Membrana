#!/usr/bin/env node
/**
 * yarn tooling:overview — инвентарь агентского тулинга ИЗ ИСТОЧНИКА (#554 TF-6).
 *
 * Read-only. Печатает в stdout и НИЧЕГО не коммитит: закешированный в файл вывод
 * стал бы «ещё одним снимком» и протух бы ровно так же, как рукописный (11/253 на
 * 08.07). Смысл инструмента — всегда свежий ответ на «что уже есть?».
 *
 * Usage: yarn tooling:overview [--json]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { buildToolingOverview, extractLibExports, selectAgentScripts } from './lib/tooling-overview.mjs';

const cwd = process.cwd();
const asJson = process.argv.includes('--json');

const pkg = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'));
const skillsReadmePath = resolve(cwd, '.cursor/skills/README.md');
const skillsReadme = existsSync(skillsReadmePath) ? readFileSync(skillsReadmePath, 'utf8') : '';

const libDir = resolve(cwd, 'scripts/lib');
const libs = existsSync(libDir)
  ? readdirSync(libDir)
      .filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs'))
      .map((file) => ({
        file,
        exports: extractLibExports(readFileSync(resolve(libDir, file), 'utf8')),
      }))
      .filter((lib) => lib.exports.length > 0)
  : [];

const hooksDir = resolve(cwd, '.githooks');
const hooks = existsSync(hooksDir) ? readdirSync(hooksDir).sort() : [];

if (asJson) {
  console.log(
    JSON.stringify(
      { scripts: selectAgentScripts(pkg.scripts), libs, hooks, totalScripts: Object.keys(pkg.scripts).length },
      null,
      2,
    ),
  );
} else {
  console.log(buildToolingOverview({ scripts: pkg.scripts, skillsReadme, libs, hooks }));
}
