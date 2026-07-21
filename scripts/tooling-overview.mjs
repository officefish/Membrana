#!/usr/bin/env node
/**
 * yarn tooling:overview — инвентарь агентского тулинга ИЗ ИСТОЧНИКА (#554 TF-6).
 *
 * По умолчанию: только stdout (живой ответ «что уже есть?» — не коммитить как AGENTS).
 * S2 (#794): `--report` дополнительно пишет `scripts/registry/SCRIPTS_LIST.md`
 * тем же SoT-снимком, что `yarn scripts:registry --report`.
 *
 * Usage: yarn tooling:overview [--json] [--report [file]]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildToolingOverview,
  extractLibExports,
  parseToolingOverviewCli,
  selectAgentScripts,
  TOOLING_OVERVIEW_HELP,
} from './lib/tooling-overview.mjs';
import { writeScriptsRegistryReport } from './scripts-registry.mjs';

const cwd = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = parseToolingOverviewCli(process.argv.slice(2));

if (cli.help) {
  console.log(TOOLING_OVERVIEW_HELP);
  process.exitCode = 0;
} else {
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

  if (cli.report) {
    try {
      const written = writeScriptsRegistryReport(cwd, {
        report: cli.report,
        source: 'yarn tooling:overview --report',
      });
      console.error(`Реестр: ${written.reportRel}`);
    } catch (e) {
      console.error('tooling:overview --report ERR:', e?.message ?? e);
      process.exitCode = 1;
    }
  }

  if (process.exitCode) {
    /* skip stdout on report failure */
  } else if (cli.json) {
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
}
