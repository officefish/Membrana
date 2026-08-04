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
import { relative, resolve, sep } from 'node:path';

import { runGate } from './lib/execution-trace/gate.mjs';
import { EXIT_NOT_PERFORMED, INPUT_ERRORS } from './lib/execution-trace/gate-exit-codes.mjs';
import { loadKnownPersonas } from './lib/execution-trace/personas.mjs';
import { renderReport } from './lib/execution-trace/report.mjs';
import { stubPlan, STUB_PLAN_NAMES } from './lib/execution-trace/stubs/stub-plan.mjs';
import { makeSnapshotResolver } from './lib/execution-trace/stubs/stub-ref-resolver.mjs';
import { RESPONSIBILITY_WAIVER_REASONS } from './lib/execution-trace/stubs/stub-responsibility-modes.mjs';
import { FIXTURE_NAMES, loadFixture, loadJsonlFile } from './lib/execution-trace/stubs/stub-trace-corpus.mjs';
import { planToGate } from './lib/sprint-integration/plan-to-gate.mjs';
import { readActsTrail } from './lib/sprint-cut/acts-trail-reader.mjs';
import { ACT_KINDS } from './lib/sprint-cut/act-kinds.mjs';
import { parseIso } from './lib/execution-trace/plan-reader.mjs';
import { closeProcedureRun, findUnclosedRuns, readProcedureRunTrail } from './lib/procedure-run-journal.mjs';
// Словарь прогона спринта (SPRINT_PROCEDURE_ID, лента из ratification.at) живёт в lib:
// open при ратификации и close вердиктом гейта выводят ОДИН путь из ОДНОГО поля.
// Долг скрипт-к-скрипту закрыт блоком a1 спринта sprint-dictionary-to-lib (#1681).
import { SPRINT_PROCEDURE_ID, sprintTrailRelPath } from './lib/sprint-cut/sprint-run.mjs';

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

/**
 * Закрыть прогон спринта в журнале процедур вердиктом гейта (блок sprint-producer, 03.08).
 *
 * Закрывается ТОЛЬКО существующая open-запись и только при состоявшейся проверке
 * (exit 0/1): exit 2 — «проверка не состоялась», утверждать в журнале нечего.
 * Маппинг: exit 0 → pass; exit 1 → fail, gaps = уникальные имена вердиктов
 * остановленных блоков — читатель ленты видит РОД лжи без открытия отчёта.
 * Отсутствие open-записи — не ошибка: mid-sprint прогоны гейта — рабочие замеры;
 * прогон спринта один, его открывает ратификация (`sprint:cut --ratify`).
 *
 * Шероховатости свода едут в close-запись как friction[] (симптомами; корень —
 * nullable-долг, дозаписываемый амандментом) — иначе единственная точка, где спринт
 * пишется в журнал, глотала бы трение молча.
 *
 * @param {string} repoRoot
 * @param {{plan: object, planRelPath: string, tracesRelPath: string, report: {exitCode: number, checkedBlocks: number, blocks: {verdict: string, stopped: boolean}[]}, nowIso: string, frictionSymptoms?: string[]}} input
 * @returns {{closed: boolean, reason: string, record?: object}}
 */
export function closeSprintRunFromReport(repoRoot, { plan, planRelPath, tracesRelPath, report, nowIso, frictionSymptoms }) {
  const sprintId = plan?.sprintId;
  if (typeof sprintId !== 'string' || sprintId.trim() === '') {
    return { closed: false, reason: 'план без sprintId — закрывать нечем' };
  }
  if (report.exitCode !== 0 && report.exitCode !== 1) {
    return { closed: false, reason: `exit ${report.exitCode} — проверка не состоялась, вердикта для журнала нет` };
  }
  const trailRel = sprintTrailRelPath(plan);
  const records = readProcedureRunTrail(repoRoot, trailRel);
  if (records.some((r) => r?.runPhase === 'close' && r.runId === sprintId)) {
    return { closed: false, reason: 'прогон уже закрыт — второе закрытие было бы второй правдой' };
  }
  if (!findUnclosedRuns(records, SPRINT_PROCEDURE_ID).some((r) => r.runId === sprintId)) {
    return { closed: false, reason: 'open-записи нет — прогон открывает sprint:cut --ratify, гейт без неё лишь замер' };
  }
  const stops = report.blocks.filter((b) => b.stopped);
  const record = closeProcedureRun(repoRoot, trailRel, {
    runId: sprintId,
    status: report.exitCode === 0 ? 'pass' : 'fail',
    subject:
      report.exitCode === 0
        ? `спринт ${sprintId}: гейт зелёный — блоков ${report.checkedBlocks}, все пары честны`
        : `спринт ${sprintId}: гейт остановил — ${stops.length} из ${report.checkedBlocks} блоков без честной пары`,
    at: nowIso,
    evidence: [tracesRelPath, planRelPath],
    gaps: [...new Set(stops.map((b) => b.verdict))],
    friction: frictionSymptoms?.length ? frictionSymptoms.map((symptom) => ({ symptom })) : undefined,
  });
  return { closed: true, reason: `close-запись ${record.status} в ${trailRel}`, record };
}

/** @param {readonly string[]} argv */
export function parseArgs(argv) {
  /** @type {{plan: string|null, traces: string|null, now: string|null, json: boolean, friction: string[]}} */
  const out = { plan: null, traces: null, now: null, json: false, friction: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--plan') out.plan = argv[++i] ?? null;
    else if (a === '--traces') out.traces = argv[++i] ?? null;
    else if (a === '--now') out.now = argv[++i] ?? null;
    else if (a === '--friction') { const v = argv[++i]; if (v != null) out.friction.push(v); }
    else if (a === '--json') out.json = true;
  }
  return out;
}

const USAGE = [
  'execution-gate — проверка реальности назначенной ответственности.',
  '',
  `  --plan   stub:<имя> | путь к .json    ратифицированный план нарезки (схема ${CUT_PLAN_SCHEMA})`,
  '  --traces fixture:<имя> | путь к .jsonl  лента вещдоков окна',
  '  --now    ISO-8601                     шапка отчёта и время close-записи журнала; в предикаты не попадает',
  '  --friction <симптом>                  шероховатость свода в close-запись журнала (повторяем; только симптом,',
  '                                        корень дозаписывается амандментом: procedure-run-record amend)',
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
  /** Сырой файл плана: закрытие прогона в журнале читает sprintId и ratification из НЕГО —
   * адаптированная модель гейта их не несёт. */
  let cutPlanFile = null;
  try {
    if (args.plan.startsWith('stub:')) {
      planRaw = stubPlan(args.plan.slice('stub:'.length));
    } else {
      cutPlanFile = JSON.parse(readFileSync(args.plan, 'utf8'));
      const adapted = adaptCutPlan(cutPlanFile);
      planRaw = adapted.planRaw;
      preErrors.push(...adapted.errors);
    }
  } catch (e) {
    preErrors.push({ code: INPUT_ERRORS.E_PLAN_UNREADABLE, subject: args.plan, detail: String(e.message ?? e) });
  }

  // Акты перерезки спринта (#1638): лента живёт рядом с планом — trail/<sprintId>.jsonl.
  // Читается ПЕРЕИСПОЛЬЗОВАНИЕМ readActsTrail носителя (sprint-cut-check), не второй копией.
  // Стабовый план ленты актов не имеет — дверь отзыва закрыта, и это законно: без акта
  // протухание идёт прежней дорогой. Битая лента — ошибка входа, не молчаливый пропуск.
  /** @type {{kind:string, at:number}[]} */
  const recutActs = [];
  if (planRaw !== null && !args.plan.startsWith('stub:')) {
    const sprintId = /** @type {any} */ (planRaw)?.sprintId;
    if (typeof sprintId === 'string' && sprintId.trim() !== '') {
      const trailPath = resolve(args.plan, '..', 'trail', `${sprintId}.jsonl`);
      const acts = readActsTrail(trailPath);
      if (!acts.ok) {
        for (const problem of acts.problems) {
          preErrors.push({ code: INPUT_ERRORS.E_TRACE_FIELDS_MISSING, subject: trailPath, detail: `лента актов: ${problem}` });
        }
      } else {
        for (const a of acts.acts) {
          if (a.kind !== ACT_KINDS.RECUT_ACT) continue;
          // Сверка спринта ЗАПИСИ, а не только имени файла (вопрос Дынина на разборе ядра):
          // лента названа по спринту, но чужая запись внутри файла — скопированная или
          // приблудная — без этой строки открыла бы дверь отзыва чужим актом.
          if (a.sprintId !== sprintId) continue;
          const at = parseIso(a.at);
          if (at === null) {
            preErrors.push({ code: INPUT_ERRORS.E_TRACE_TIME_INVALID, subject: trailPath, detail: `recut_act с нечитаемым at «${a.at}» — отзыв на нём строиться не может` });
            continue;
          }
          recutActs.push({ kind: a.kind, at });
        }
      }
    }
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
    recutActs,
    now: args.now,
    preErrors,
  });

  process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : renderReport(report));

  // Вердикт по настоящему плану и настоящей ленте отпечатывается в журнале процедур.
  // Стабы и фикстуры мимо: их вердикты — про зубы, не про жизнь.
  if (cutPlanFile !== null && !args.traces.startsWith('fixture:')) {
    try {
      const repoRoot = process.cwd();
      const closed = closeSprintRunFromReport(repoRoot, {
        plan: cutPlanFile,
        planRelPath: relative(repoRoot, resolve(args.plan)).split(sep).join('/'),
        tracesRelPath: relative(repoRoot, resolve(args.traces)).split(sep).join('/'),
        report,
        // --now гейта расширен: он же — время close-записи; иначе системное время CLI.
        nowIso: args.now ?? new Date().toISOString(),
        frictionSymptoms: args.friction,
      });
      process.stdout.write(`журнал: ${closed.closed ? 'прогон спринта закрыт — ' : ''}${closed.reason}\n`);
    } catch (e) {
      process.stderr.write(`журнал: close-запись не написана: ${String(e.message ?? e)}\n`);
    }
  }
  return report.exitCode;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('execution-gate.mjs')) {
  process.exit(main());
}
