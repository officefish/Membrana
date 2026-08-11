#!/usr/bin/env node
/**
 * yarn workflow:examples [--json]
 *
 * Стадия 1 марафона workflow-examples-marathon: машинный baseline + coverage.
 * Живые источники читаются заново каждым прогоном (числа — не ручной канон):
 * мастерские — discoverContainers (те же, что у Mintlify-генератора), процедуры —
 * docs/procedures/registry.json. Записи — docs/workflows/examples.jsonl.
 *
 * Exit: 0 — записи валидны (дыры coverage — видимое требование, не отказ);
 * 1 — невалидные записи или битые строки; 2 — кривые аргументы.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverContainers } from './lib/tooling-atlas.mjs';
import {
  EXAMPLES_REL,
  buildExamplesCoverage,
  exampleProblems,
  parseExamplesText,
  renderExamplesCoverage,
} from './lib/workflow-examples.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Живой baseline: те же источники, что у Mintlify-раздела Workflow.
 * @param {string} cwd
 * @returns {{ workshops: string[], procedures: string[] }}
 */
export function readLiveBaseline(cwd) {
  const workshops = discoverContainers(cwd)
    .filter((item) => item.kind === 'workshop')
    .map((item) => item.home)
    .sort();
  const registry = JSON.parse(
    readFileSync(join(cwd, 'docs', 'procedures', 'registry.json'), 'utf8'),
  );
  const procedures = registry.procedures.map((p) => p.id).sort();
  return { workshops, procedures };
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, log?: (s: string) => void }} [deps]
 * @returns {number}
 */
export function runWorkflowExamples(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const log = deps.log ?? console.log;
  const json = argv.includes('--json');
  const unknown = argv.filter((a) => a !== '--json' && a !== '--help' && a !== '-h');
  if (unknown.length > 0) {
    console.error(`workflow:examples: неизвестные аргументы: ${unknown.join(', ')}`);
    return 2;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    log(`Usage: yarn workflow:examples [--json]

  Baseline читается заново из живых источников; записи — ${EXAMPLES_REL}.
  Контракт записи и DoD — docs/workflows/README.md (марафон workflow-examples-marathon).`);
    return 0;
  }

  const baseline = readLiveBaseline(cwd);
  const abs = join(cwd, EXAMPLES_REL);
  const text = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  const { records, problems } = parseExamplesText(text);

  const ctx = {
    workshops: new Set(baseline.workshops),
    procedures: new Set(baseline.procedures),
    sourceExists: (rel) => existsSync(join(cwd, rel)),
  };
  records.forEach((rec, i) => {
    problems.push(...exampleProblems(rec, ctx, `запись ${i + 1} (${rec?.objectId ?? '—'})`));
  });

  const cov = buildExamplesCoverage(baseline, records);

  if (json) {
    log(JSON.stringify({ baseline: cov.baseline, covered: cov.covered, rows: cov.rows, problems }, null, 2));
  } else {
    log(`workflow:examples — записей ${records.length} (${EXAMPLES_REL})`);
    for (const line of renderExamplesCoverage(cov)) log(line);
    if (problems.length > 0) {
      log('');
      log('## Невалидные записи');
      for (const p of problems) log(`- ${p}`);
    }
  }
  return problems.length > 0 ? 1 : 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/workflow-examples.mjs')) {
  process.exitCode = runWorkflowExamples(process.argv.slice(2));
}
