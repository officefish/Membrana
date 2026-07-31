#!/usr/bin/env node
/**
 * execution-gate — проверка, что ответственность РЕАЛЬНА, по ходу работы.
 *
 * Для каждого блока ратифицированного плана: существует ли след исполнения ТОГО ЖЕ исполнителя,
 * рода из закрытого списка четырёх, с разрешимой ссылкой, внутри окна блока и не протухший.
 * Нет следа → ОСТАНОВКА, а не жалоба.
 *
 * Использование:
 *   yarn sprint:gate --plan <файл.json> --traces <файл.jsonl> [--now <ISO>] [--json]
 *   node scripts/execution-gate.mjs --plan stub:plan-two-blocks --traces fixture:plan-lied
 *
 * Коды возврата: 0 — проверка сказала «да» · 1 — проверка сказала «нет» ·
 * 2 — проверка НЕ СОСТОЯЛАСЬ (ошибка входа). Слить 1 и 2 нельзя: это класс, на котором
 * 30.07 был пойман `meeting:audit`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { runGate } from './lib/execution-trace/gate.mjs';
import { EXIT_NOT_PERFORMED, INPUT_ERRORS } from './lib/execution-trace/gate-exit-codes.mjs';
import { loadKnownPersonas } from './lib/execution-trace/personas.mjs';
import { renderReport } from './lib/execution-trace/report.mjs';
import { stubPlan, STUB_PLAN_NAMES } from './lib/execution-trace/stubs/stub-plan.mjs';
import { makeSnapshotResolver } from './lib/execution-trace/stubs/stub-ref-resolver.mjs';
import { RESPONSIBILITY_WAIVER_REASONS } from './lib/execution-trace/stubs/stub-responsibility-modes.mjs';
import { FIXTURE_NAMES, loadFixture, loadJsonlFile } from './lib/execution-trace/stubs/stub-trace-corpus.mjs';
import { planToGate } from './lib/sprint-integration/plan-to-gate.mjs';

/**
 * Схема плана нарезки — ЕДИНСТВЕННАЯ форма, которую шов умеет приводить ко входу гейта.
 *
 * Внутренняя модель `readPlan` (`planId`, `ratified`, `assigned`) — не формат обмена: её
 * форму задал стаб Phase 2, и стаб сам себя предупреждал, что доживший до прода стаб есть
 * дефект интеграции. Он дожил: адаптер `planToGate` был написан и оттестирован, но CLI
 * читал файл сырым — и потому НИ ОДИН настоящий ратифицированный план гейтом не читался,
 * отдавая `planId не строка` + `ratified !== true` + персону «(пусто)» на каждом блоке.
 *
 * Поэтому файл обязан назвать схему. Файл без неё не «наверное родной формы»: молчаливый
 * пропуск вернул бы ровно ту дыру, где рукописный документ во внутренней форме гейта
 * выглядит законным входом. Стабы проходят мимо адаптера — они уже внутренняя модель
 * по построению, и 91 зуб Phase 2 остаётся на своём.
 */
const CUT_PLAN_SCHEMA = 'sprint-cut/1';

/**
 * Привести прочитанный ФАЙЛ плана ко входу гейта.
 *
 * Находки шва (`context ≠ persona`, режим вне двух) поднимаются ошибками входа, а не
 * оговорками: контракт интерфейса (§G5) говорит, что такой план из области текущего гейта
 * ВЫХОДИТ. Ошибка входа означает «проверка не состоялась» — честнее, чем вердикт по плану,
 * половину которого шов понял по-своему. Код берётся из закрытого списка, свой не заводится.
 *
 * @param {unknown} raw
 * @returns {{planRaw: object|null, errors: {code:string,subject:string,detail:string}[]}}
 */
export function adaptCutPlan(raw) {
  const schema = /** @type {any} */ (raw)?.schema;
  if (schema !== CUT_PLAN_SCHEMA) {
    return {
      planRaw: null,
      errors: [{
        code: INPUT_ERRORS.E_PLAN_UNREADABLE,
        subject: 'plan',
        detail: `schema=${schema === undefined ? '(нет)' : String(schema)} — гейт читает файл только схемы «${CUT_PLAN_SCHEMA}»`,
      }],
    };
  }
  const { planRaw, findings } = planToGate(/** @type {object} */ (raw));
  return {
    planRaw,
    errors: findings.map((f) => ({
      code: INPUT_ERRORS.E_PLAN_UNREADABLE,
      subject: f.blockId ?? 'plan',
      detail: `${f.toothId}: ${f.reason}`,
    })),
  };
}

/**
 * Разрешение адреса вещдока в ПРОДЕ — файл рабочего дерева.
 *
 * Снимок-резолвер (`makeSnapshotResolver`) детерминирует зубы Phase 2 и обязан остаться на
 * фикстурах: вердикт зуба не должен зависеть от состояния дерева. Но на настоящей ленте он
 * же — второй доживший стаб: любой реальный путь мимо восьми замороженных адресов
 * объявляется неразрешимым, и честный вещдок получает вердикт «адреса нет».
 *
 * ЧЕСТНЫЙ ПРЕДЕЛ: разрешается только файл внутри дерева. Ссылка со схемой (PR, URL, запись
 * внешней системы) НЕ разрешается — не потому, что она хуже, а потому что проверять её
 * этот резолвер не умеет; вердикт `unresolvable_ref` тут правдив, а тихое «да» было бы
 * ровно тем ложным зелёным, против которого гейт и построен.
 *
 * @param {string} root
 * @returns {(ref: string) => boolean}
 */
export function makeWorkTreeResolver(root) {
  const base = resolve(root);
  return (ref) => {
    if (typeof ref !== 'string' || ref.trim() === '') return false;
    if (/^[a-z][a-z0-9+.-]*:/iu.test(ref)) return false;
    const abs = resolve(base, ref);
    if (abs !== base && !abs.startsWith(base + sep)) return false;
    return existsSync(abs);
  };
}

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
  `  --plan   stub:<имя> | путь к .json    ратифицированный план нарезки (схема ${CUT_PLAN_SCHEMA})`,
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
    if (args.plan.startsWith('stub:')) {
      planRaw = stubPlan(args.plan.slice('stub:'.length));
    } else {
      const adapted = adaptCutPlan(JSON.parse(readFileSync(args.plan, 'utf8')));
      planRaw = adapted.planRaw;
      preErrors.push(...adapted.errors);
    }
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
    // Резолвер выбирает ЛЕНТА, а не план: адреса живут в следах. Фикстура — замороженный
    // снимок (зуб не зависит от дерева), настоящая лента — дерево.
    resolveRef: args.traces.startsWith('fixture:')
      ? makeSnapshotResolver()
      : makeWorkTreeResolver(process.cwd()),
    now: args.now,
    preErrors,
  });

  process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : renderReport(report));
  return report.exitCode;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('execution-gate.mjs')) {
  process.exit(main());
}
