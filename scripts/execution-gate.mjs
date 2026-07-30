#!/usr/bin/env node
/**
 * execution-gate — проверка, что ответственность РЕАЛЬНА, по ходу работы.
 *
 * Для каждого блока ратифицированного плана: существует ли след исполнения ТОГО ЖЕ исполнителя,
 * рода из закрытого списка четырёх, с разрешимой ссылкой, внутри окна блока и не протухший.
 * Нет следа → ОСТАНОВКА, а не жалоба.
 *
 * Использование (Phase 2 — только через node, провода в package.json вносятся на интеграции):
 *   node scripts/execution-gate.mjs --plan stub:plan-two-blocks --traces fixture:plan-lied
 *   node scripts/execution-gate.mjs --plan <файл.json> --traces <файл.jsonl> [--now <ISO>] [--json]
 *
 * Коды возврата: 0 — проверка сказала «да» · 1 — проверка сказала «нет» ·
 * 2 — проверка НЕ СОСТОЯЛАСЬ (ошибка входа). Слить 1 и 2 нельзя: это класс, на котором
 * 30.07 был пойман `meeting:audit`.
 */

import { readFileSync } from 'node:fs';

import { runGate } from './lib/execution-trace/gate.mjs';
import { EXIT_NOT_PERFORMED, INPUT_ERRORS } from './lib/execution-trace/gate-exit-codes.mjs';
import { loadKnownPersonas } from './lib/execution-trace/personas.mjs';
import { renderReport } from './lib/execution-trace/report.mjs';
import { stubPlan, STUB_PLAN_NAMES } from './lib/execution-trace/stubs/stub-plan.mjs';
import { makeSnapshotResolver } from './lib/execution-trace/stubs/stub-ref-resolver.mjs';
import { RESPONSIBILITY_WAIVER_REASONS } from './lib/execution-trace/stubs/stub-responsibility-modes.mjs';
import { FIXTURE_NAMES, loadFixture, loadJsonlFile } from './lib/execution-trace/stubs/stub-trace-corpus.mjs';

/** @param {readonly string[]} argv */
export function parseArgs(argv) {
  /** @type {{plan: string|null, traces: string|null, now: string|null, json: boolean}} */
  const out = { plan: null, traces: null, now: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--plan') out.plan = argv[++i] ?? null;
    else if (a === '--traces') out.traces = argv[++i] ?? null;
    else if (a === '--now') out.now = argv[++i] ?? null;
    else if (a === '--json') out.json = true;
  }
  return out;
}

const USAGE = [
  'execution-gate — проверка реальности назначенной ответственности.',
  '',
  '  --plan   stub:<имя> | путь к .json    план нарезки (ратифицированный)',
  '  --traces fixture:<имя> | путь к .jsonl  лента вещдоков окна',
  '  --now    ISO-8601                     только шапка отчёта, в предикаты не попадает',
  '  --json                                вывести GateReport как JSON',
  '',
  `  стабы плана:  ${STUB_PLAN_NAMES.join(', ')}`,
  `  фикстуры:     ${FIXTURE_NAMES.join(', ')}`,
].join('\n');

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.plan === null || args.traces === null) {
    process.stderr.write(`${USAGE}\n`);
    return EXIT_NOT_PERFORMED;
  }

  /** @type {{code:string,subject:string,detail:string}[]} */
  const preErrors = [];
  let planRaw = null;
  try {
    planRaw = args.plan.startsWith('stub:')
      ? stubPlan(args.plan.slice('stub:'.length))
      : JSON.parse(readFileSync(args.plan, 'utf8'));
  } catch (e) {
    preErrors.push({ code: INPUT_ERRORS.E_PLAN_UNREADABLE, subject: args.plan, detail: String(e.message ?? e) });
  }

  /** @type {unknown[]} */
  let records = [];
  try {
    const loaded = args.traces.startsWith('fixture:')
      ? loadFixture(args.traces.slice('fixture:'.length))
      : loadJsonlFile(args.traces);
    records = loaded.records;
    preErrors.push(...loaded.errors);
  } catch (e) {
    preErrors.push({
      code: INPUT_ERRORS.E_TRACE_FIELDS_MISSING,
      subject: args.traces,
      detail: `лента не читается: ${String(e.message ?? e)}`,
    });
  }

  const report = runGate({
    planRaw,
    traceRecords: records,
    knownPersonas: loadKnownPersonas(),
    allowedReasons: RESPONSIBILITY_WAIVER_REASONS,
    resolveRef: makeSnapshotResolver(),
    now: args.now,
    preErrors,
  });

  process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : renderReport(report));
  return report.exitCode;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('execution-gate.mjs')) {
  process.exit(main());
}
