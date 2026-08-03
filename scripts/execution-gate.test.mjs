/**
 * Зубы блока `execution-gate`. Живёт в `scripts/*.test.mjs` НАМЕРЕННО: корневой прогон
 * подхватывает именно этот путь, тест внутри пакета с узким `include` не побежит (AGENTS.md).
 *
 * Прогон: `node --test scripts/execution-gate.test.mjs`
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { adaptCutPlan, makeWorkTreeResolver, parseArgs } from './execution-gate.mjs';
import { runGate } from './lib/execution-trace/gate.mjs';
import { parseIso } from './lib/execution-trace/plan-reader.mjs';
import { isStale, judgeBlock, missingPairKinds, REQUIRED_PAIR_KINDS,
} from './lib/execution-trace/predicates.mjs';
import {
  ALL_INPUT_ERRORS,
  ALL_VERDICTS,
  DISQUALIFICATIONS,
  EXIT_NOT_PERFORMED,
  EXIT_NO,
  EXIT_YES,
  FINDINGS,
  INPUT_ERRORS,
  STOP_VERDICTS,
  VERDICTS,
  VERDICT_CLASS,
  resolveExitCode,
} from './lib/execution-trace/gate-exit-codes.mjs';
import { loadKnownPersonas } from './lib/execution-trace/personas.mjs';
import { BANNED_EMPTY_CLEAN_RE, assertNoEmptyCleanClaim, renderReport } from './lib/execution-trace/report.mjs';
import { TRACE_KIND_CARRIER_EXISTS, TRACE_KINDS, TRACE_KIND_ORDER, isKnownTraceKind } from './lib/execution-trace/trace-kinds.mjs';
import { acceptGateReport } from './lib/execution-trace/stubs/stub-experience-sink.mjs';
import { stubPlan } from './lib/execution-trace/stubs/stub-plan.mjs';
import { makeSnapshotResolver } from './lib/execution-trace/stubs/stub-ref-resolver.mjs';
import { RESPONSIBILITY_WAIVER_REASONS } from './lib/execution-trace/stubs/stub-responsibility-modes.mjs';
import { FIXTURE_NAMES, loadFixture } from './lib/execution-trace/stubs/stub-trace-corpus.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ZONE = resolve(HERE, 'lib/execution-trace');
const CORE_FILES = ['trace-kinds.mjs', 'gate-exit-codes.mjs', 'plan-reader.mjs', 'trace-corpus.mjs', 'predicates.mjs', 'report.mjs', 'gate.mjs'];
const KNOWN_PERSONAS = loadKnownPersonas();

/** Та же проводка, что в CLI: стаб плана + фикстура ленты + снимок адресов. */
function run(planName, fixtureName) {
  const { records, errors } = loadFixture(fixtureName);
  const report = runGate({
    planRaw: stubPlan(planName),
    traceRecords: records,
    knownPersonas: KNOWN_PERSONAS,
    allowedReasons: RESPONSIBILITY_WAIVER_REASONS,
    resolveRef: makeSnapshotResolver(),
    now: '2026-07-31T12:00:00.000Z',
    preErrors: errors,
  });
  return { report, text: renderReport(report) };
}

/**
 * Снять комментарии перед проверкой чистоты ядра: зуб судит КОД, а не прозу о запрете.
 * (Иначе строка «без `Date.now()`» в шапке модуля роняет собственный зуб.)
 */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');

const verdictOf = (report, blockId) => report.blocks.find((b) => b.blockId === blockId)?.verdict;
const toothIds = (report) => report.findings.map((f) => f.toothId);

// ── DoD: несущая пара фикстур ────────────────────────────────────────────────────────────────

test('DoD: fixture-plan-lied красная — план соврал у второго блока, код 1 (заказ аудитора)', () => {
  const { report, text } = run('plan-two-blocks', 'plan-lied');
  assert.equal(verdictOf(report, 'mfcc-core'), VERDICTS.HONEST_PAIR);
  assert.equal(verdictOf(report, 'gate-wiring'), VERDICTS.PLAN_LIED);
  assert.equal(report.exitCode, EXIT_NO);
  assert.match(text, /gate-wiring · vesnin · plan_lied/u); // имя вердикта и blockId названы
  assert.ok(report.corpusSize > 0, 'корпус непустой — иначе фикстура доказывает не то');
});

test('DoD-спутник: fixture-empty-corpus — no_corpus, код 1, строки «нарушений 0» НЕТ (запрет M5)', () => {
  const { report, text } = run('plan-two-blocks', 'empty-corpus');
  assert.equal(report.corpusSize, 0);
  assert.deepEqual([...new Set(report.blocks.map((b) => b.verdict))], [VERDICTS.NO_CORPUS]);
  assert.equal(report.exitCode, EXIT_NO);
  assert.ok(!text.includes('нарушений 0'), 'текстуальный зуб: «нарушений 0» при пустом корпусе запрещено');
  assert.doesNotMatch(text, BANNED_EMPTY_CLEAN_RE);
  assert.match(text, /следов 0/u); // итог всегда со знаменателем
  assert.match(text, /блоков проверено: 2/u);
});

test('пара фикстур: plan_lied получен ИЗ ЛЕНТЫ, а не из её отсутствия', () => {
  const lied = run('plan-two-blocks', 'plan-lied').report;
  const empty = run('plan-two-blocks', 'empty-corpus').report;
  assert.equal(verdictOf(lied, 'gate-wiring'), VERDICTS.PLAN_LIED);
  assert.equal(verdictOf(empty, 'gate-wiring'), VERDICTS.NO_CORPUS);
  assert.notEqual(verdictOf(lied, 'mfcc-core'), verdictOf(empty, 'mfcc-core'));
});

test('зуб рендера fail-closed: «нарушений 0» при пустом корпусе валит рендер, а не предупреждает', () => {
  assert.throws(() => assertNoEmptyCleanClaim('итог: нарушений 0\n', 0), /Запрет M5/u);
  assert.doesNotThrow(() => assertNoEmptyCleanClaim('итог: остановок 0 из 2 блоков\n', 3));
});

// ── Закрытый список родов и его зеркало ──────────────────────────────────────────────────────

test('enum родов: четыре, заморожен, пятый род не признаётся', () => {
  assert.equal(TRACE_KIND_ORDER.length, 4);
  assert.ok(Object.isFrozen(TRACE_KINDS) && Object.isFrozen(TRACE_KIND_ORDER));
  assert.deepEqual([...TRACE_KIND_ORDER], ['contract_signature', 'session_prep', 'context_run', 'review_pass']);
  assert.equal(isKnownTraceKind('recon_note'), false);
  assert.equal(isKnownTraceKind(TRACE_KINDS.CONTEXT_RUN), true);
});

test('дока зоны — тонкое зеркало enum: расхождение ловится машинно', () => {
  const md = readFileSync(resolve(HERE, '..', 'docs/sprint/gate/TRACE_KINDS.md'), 'utf8');
  const mirrored = new Set([...md.matchAll(/`([a-z_]+)`/gu)].map((m) => m[1]).filter((s) => isKnownTraceKind(s)));
  assert.deepEqual([...mirrored].sort(), [...TRACE_KIND_ORDER].sort(), 'зеркало разошлось с enum');
  for (const kind of TRACE_KIND_ORDER) assert.ok(md.includes(`\`${kind}\``), `${kind} не назван в доке`);
});

// ── Три кода возврата ────────────────────────────────────────────────────────────────────────

test('коды 1 и 2 РАЗДЕЛЕНЫ: «нашёл нарушение» ≠ «проверка не состоялась»', () => {
  const stop = resolveExitCode({ verdicts: [VERDICTS.PLAN_LIED], inputErrors: [], corpusSize: 3, checkedBlocks: 2 });
  const broken = resolveExitCode({ verdicts: [], inputErrors: [{ code: 'X' }], corpusSize: 3, checkedBlocks: 0 });
  assert.equal(stop, EXIT_NO);
  assert.equal(broken, EXIT_NOT_PERFORMED);
  assert.notEqual(stop, broken);
});

test('инвариант: code = 0 ⟺ нет остановок ∧ нет ошибок входа ∧ corpusSize > 0 ∧ checkedBlocks > 0', () => {
  const cases = [];
  for (const verdicts of [[], [VERDICTS.HONEST_PAIR], [VERDICTS.HONEST_PAIR, VERDICTS.REFUSED_WITH_REASON], [VERDICTS.STALE_TRACE]]) {
    for (const inputErrors of [[], [{ code: 'E' }]]) {
      for (const corpusSize of [0, 5]) {
        for (const checkedBlocks of [0, 2]) cases.push({ verdicts, inputErrors, corpusSize, checkedBlocks });
      }
    }
  }
  for (const c of cases) {
    const code = resolveExitCode(c);
    const expectZero =
      c.inputErrors.length === 0 &&
      !c.verdicts.some((v) => STOP_VERDICTS.includes(v)) &&
      c.corpusSize > 0 &&
      c.checkedBlocks > 0;
    assert.equal(code === EXIT_YES, expectZero, JSON.stringify(c));
  }
});

test('класс вердикта статичен: у каждого из девяти есть класс, остановок ровно семь', () => {
  // Замок обновлён актом 03.08 (#1641): девятый вердикт incomplete_trace, класс stop —
  // «список стал из девяти, а не открылся». Прежний замок держал восемь/шесть.
  assert.equal(ALL_VERDICTS.length, 9);
  for (const v of ALL_VERDICTS) assert.ok(VERDICT_CLASS[v] !== undefined, v);
  assert.deepEqual([...STOP_VERDICTS].sort(), ['incomplete_trace', 'no_corpus', 'plan_lied', 'stale_partial', 'stale_trace', 'unresolvable_ref', 'wrong_performer']);
  assert.equal(VERDICT_CLASS[VERDICTS.REFUSED_WITH_REASON], 'pass_not_green', 'вторая дверь — не зелёный блок');
});

// ── #1641: девятый вердикт — состав родов ──────────────────────────────────────────────────────

test('DoD #1641: блок с одним review_pass больше не неотличим от полностью честного', () => {
  // Ровно вещдок 02.08 (report-surfacing-wire): один review_pass, прогона контекста не было.
  // До 03.08: honest_pair, ноль остановок, код 0 — и в итоговой строке блок неотличим от
  // честного. Теперь — incomplete_trace, класс stop, код 1.
  const { report, text } = run('plan-two-blocks', 'incomplete-trace');
  assert.equal(verdictOf(report, 'mfcc-core'), VERDICTS.HONEST_PAIR, 'полная пара остаётся честной');
  assert.equal(verdictOf(report, 'gate-wiring'), VERDICTS.INCOMPLETE_TRACE);
  assert.equal(report.exitCode, EXIT_NO);
  assert.match(text, /gate-wiring · vesnin · incomplete_trace/u);
  assert.match(text, /отсутствует context_run/u, 'недостающий род назван поимённо');
});

test('текст honest_pair утверждает ПРОВЕРЕННОЕ: «пара полна», а не список найденных родов', () => {
  // Прежний текст печатал найденные рода как достижение, даже когда род был один, — пропуск
  // 02.08 был виден в самом тексте («1 вещдоков рода review_pass») и вердикта не менял.
  const { report } = run('plan-two-blocks', 'honest-both');
  for (const b of report.blocks) {
    assert.equal(b.verdict, VERDICTS.HONEST_PAIR);
    assert.match(b.reason, /пара полна \(context_run \+ review_pass\)/u);
  }
});

test('требуются только рода С НОСИТЕЛЕМ: contract_signature и session_prep не вменяются', () => {
  // У двух родов из четырёх носителя в дереве нет (TRACE_KIND_CARRIER_EXISTS=false) —
  // требовать неисполнимое запрещено. Каждый требуемый род обязан иметь носитель сегодня;
  // появление носителя у остальных НЕ ужесточает требование молча — только актом.
  for (const k of REQUIRED_PAIR_KINDS) {
    assert.equal(TRACE_KIND_CARRIER_EXISTS[k], true, `требуемый род ${k} обязан иметь носитель`);
  }
  assert.deepEqual([...REQUIRED_PAIR_KINDS].sort(), ['context_run', 'review_pass']);
  // Фикстура honest-both несёт contract_signature у mfcc-core — его наличие пары не заменяет,
  // а отсутствие не вменяется: блок honest_pair без единого contract_signature легален.
  const { report } = run('plan-two-blocks', 'honest-both');
  assert.equal(verdictOf(report, 'gate-wiring'), VERDICTS.HONEST_PAIR, 'блок без подписи зелен — род без носителя не требуется');
});

test('симметрия недостатка: только context_run → в reason назван review_pass (юнит judgeBlock)', () => {
  // Разбор Дынина: фикстурный кейс покрывал одно направление («только review_pass»), зеркало
  // жило лишь в чистой функции. Юнит по judgeBlock закрывает его на уровне вердикта.
  const block = { blockId: 'b', assigned: 'vesnin', mode: 'explicit_honest', from: 0, to: 100, graceMs: 0, revisionAt: 0 };
  const trace = { traceId: 't1', blockId: 'b', kind: 'context_run', subject: 'vesnin', at: 10, ref: 'x', relatesToSprint: false };
  const j = judgeBlock(block, [trace], { resolveRef: () => true });
  assert.equal(j.verdict, VERDICTS.INCOMPLETE_TRACE);
  assert.match(j.reason, /отсутствует review_pass/u);
});

test('лестница доказана: plan_lied ПОБЕЖДАЕТ incomplete_trace — следов нет вовсе', () => {
  // Блок и «соврал планом», и «пары нет»: вердикт обязан назвать более раннюю ступень —
  // отсутствие следов исполнителя, а не состав того, чего нет.
  const block = { blockId: 'b', assigned: 'vesnin', mode: 'explicit_honest', from: 0, to: 100, graceMs: 0, revisionAt: 0 };
  const alien = { traceId: 't2', blockId: 'other', kind: 'review_pass', subject: 'vesnin', at: 10, ref: 'x', relatesToSprint: false };
  const j = judgeBlock(block, [alien], { resolveRef: () => true });
  assert.equal(j.verdict, VERDICTS.PLAN_LIED);
});

test('missingPairKinds: пустой список ⟺ пара полна; недостающее названо, а не посчитано', () => {
  const t = (kind) => ({ kind });
  assert.deepEqual(missingPairKinds([t('context_run'), t('review_pass')]), []);
  assert.deepEqual(missingPairKinds([t('review_pass')]), ['context_run']);
  assert.deepEqual(missingPairKinds([t('context_run')]), ['review_pass']);
  assert.deepEqual(missingPairKinds([]), ['context_run', 'review_pass']);
  // Рода без носителя присутствием пары не заменяют:
  assert.deepEqual(missingPairKinds([t('contract_signature'), t('session_prep')]), ['context_run', 'review_pass']);
});

// ── Вердикты по фикстурам: каждый из восьми достижим ───────────────────────────────────────────

test('«не тот исполнитель» ≠ «следа нет»: три разных вердикта на трёх фикстурах', () => {
  assert.equal(verdictOf(run('plan-two-blocks', 'wrong-performer').report, 'gate-wiring'), VERDICTS.WRONG_PERFORMER);
  assert.equal(verdictOf(run('plan-two-blocks', 'stale-trace').report, 'gate-wiring'), VERDICTS.STALE_TRACE);
  assert.equal(verdictOf(run('plan-two-blocks', 'unresolvable-ref').report, 'gate-wiring'), VERDICTS.UNRESOLVABLE_REF);
});

test('honest-both: единственная зелёная фикстура, код 0, находок нет', () => {
  const { report } = run('plan-two-blocks', 'honest-both');
  assert.deepEqual([...new Set(report.blocks.map((b) => b.verdict))], [VERDICTS.HONEST_PAIR]);
  assert.deepEqual(report.findings, []);
  assert.equal(report.exitCode, EXIT_YES);
});

test('покрытие: все восемь закрытых вердиктов достижимы на фикстурах зоны', () => {
  const seen = new Set();
  for (const fixture of FIXTURE_NAMES) {
    for (const plan of ['plan-two-blocks', 'plan-refused']) {
      for (const b of run(plan, fixture).report.blocks) seen.add(b.verdict);
    }
  }
  assert.deepEqual([...seen].sort(), [...ALL_VERDICTS].sort(), 'вердикт без фикстуры = необоснованное слово');
});

test('протухание относительно РЕВИЗИИ ПРЕДМЕТА: календарного TTL нет', () => {
  const zoneText = CORE_FILES.map((f) => readFileSync(resolve(ZONE, f), 'utf8')).join('\n');
  assert.doesNotMatch(zoneText, /TTL_(DAYS|MS)|MAX_AGE|staleAfterDays/u, 'календарный TTL — число, которого владелец не называл');
  const { report } = run('plan-two-blocks', 'stale-trace');
  assert.match(report.blocks.find((b) => b.blockId === 'gate-wiring').reason, /старше ревизии предмета/u);
});

// ── Ошибки входа: вердиктов нет вовсе ────────────────────────────────────────────────────────

test('род вне списка → E_TRACE_KIND_UNKNOWN, код 2, вердиктов НЕТ', () => {
  const { report, text } = run('plan-two-blocks', 'unknown-kind');
  assert.equal(report.exitCode, EXIT_NOT_PERFORMED);
  assert.deepEqual(report.blocks, []);
  assert.equal(report.checkedBlocks, 0);
  assert.ok(report.inputErrors.some((e) => e.code === INPUT_ERRORS.E_TRACE_KIND_UNKNOWN));
  assert.match(text, /ПРОВЕРКА НЕ СОСТОЯЛАСЬ/u);
});

test('персона вне реестра голосов → ошибка входа, а не «неизвестный исполнитель»', () => {
  const traces = run('plan-two-blocks', 'unknown-persona').report;
  assert.equal(traces.exitCode, EXIT_NOT_PERFORMED);
  assert.ok(traces.inputErrors.some((e) => e.code === INPUT_ERRORS.E_PERSONA_UNKNOWN));

  const plan = run('plan-unknown-persona', 'honest-both').report;
  assert.equal(plan.exitCode, EXIT_NOT_PERFORMED);
  assert.ok(plan.inputErrors.some((e) => e.code === INPUT_ERRORS.E_PERSONA_UNKNOWN));
});

test('неретифицированный план — не план; план без revisionAt не даёт считать всё свежим', () => {
  const notRatified = run('plan-not-ratified', 'honest-both').report;
  assert.equal(notRatified.exitCode, EXIT_NOT_PERFORMED);
  assert.ok(notRatified.inputErrors.some((e) => e.code === INPUT_ERRORS.E_PLAN_NOT_RATIFIED));

  const noRevision = run('plan-no-revision', 'honest-both').report;
  assert.equal(noRevision.exitCode, EXIT_NOT_PERFORMED);
  assert.ok(noRevision.inputErrors.some((e) => e.code === INPUT_ERRORS.E_PLAN_NO_REVISION));
});

// ── Вторая дверь (M7) и закрытый список причин владельца ─────────────────────────────────────

test('вторая дверь: причина из закрытых четырёх → refused_with_reason, код 0, но блок не зелёный', () => {
  const { report, text } = run('plan-refused', 'plan-lied');
  assert.equal(verdictOf(report, 'gate-wiring'), VERDICTS.REFUSED_WITH_REASON);
  assert.equal(report.exitCode, EXIT_YES);
  assert.match(text, /вторая дверь 1/u);
  assert.match(text, /зелёных 1/u); // refused в зелёные НЕ входит
  assert.ok(report.blocks.every((b) => b.reason.trim() !== ''), 'отказ легален только с причиной');
});

test('«разведка» не причина: reason вне четырёх → E_REASON_UNKNOWN, код 2 (лазейка закрыта)', () => {
  const { report } = run('plan-refused-recon', 'plan-lied');
  assert.equal(report.exitCode, EXIT_NOT_PERFORMED);
  assert.ok(report.inputErrors.some((e) => e.code === INPUT_ERRORS.E_REASON_UNKNOWN));
  assert.deepEqual([...RESPONSIBILITY_WAIVER_REASONS], ['mechanical', 'no_profile_owner', 'owner_solo', 'urgent_recovery']);
  assert.equal(RESPONSIBILITY_WAIVER_REASONS.length, 4);
});

// ── Находки: имя есть, вердикт не меняется ───────────────────────────────────────────────────

test('находки не повышаются до остановки: late-close, order-review-early, duplicate, extra-performer — код 0', () => {
  const late = run('plan-two-blocks', 'late-close');
  assert.deepEqual(toothIds(late.report), [FINDINGS.LATE_CLOSE]);
  assert.equal(late.report.exitCode, EXIT_YES);

  const order = run('plan-two-blocks', 'order-review-early');
  assert.deepEqual(toothIds(order.report), [FINDINGS.ORDER_REVIEW_EARLY]);
  assert.equal(order.report.exitCode, EXIT_YES);

  const mixed = run('plan-two-blocks', 'duplicate-and-extra');
  assert.deepEqual(toothIds(mixed.report).sort(), [FINDINGS.DUPLICATE_TRACE, FINDINGS.EXTRA_PERFORMER].sort());
  assert.equal(mixed.report.exitCode, EXIT_YES);
  for (const f of mixed.report.findings) assert.ok(f.toothId.startsWith('eg-') && f.reason !== '');
});

test('grace задаётся ПЛАНОМ: тот же поздний след с допуском 2ч перестаёт быть находкой', () => {
  const noGrace = run('plan-two-blocks', 'late-close').report;
  const grace = run('plan-grace-2h', 'late-close').report;
  assert.deepEqual(toothIds(noGrace), [FINDINGS.LATE_CLOSE]);
  assert.deepEqual(toothIds(grace), []);
  assert.equal(grace.exitCode, EXIT_YES);
});

test('дисквалификация ≠ находка: прогон до подписи убирает след из вещдоков → остановка по лестнице', () => {
  const { report, text } = run('plan-two-blocks', 'run-before-signature');
  assert.equal(verdictOf(report, 'gate-wiring'), VERDICTS.PLAN_LIED);
  assert.equal(report.exitCode, EXIT_NO);
  assert.deepEqual(report.disqualified.map((d) => d.toothId), [DISQUALIFICATIONS.RUN_BEFORE_SIGNATURE]);
  assert.match(text, /eg-run-before-signature/u);
  assert.ok(
    !toothIds(report).includes(DISQUALIFICATIONS.RUN_BEFORE_SIGNATURE),
    'дисквалификация — отдельная категория: находкой она не притворяется',
  );
});

// ── Детерминизм и чистота ядра ───────────────────────────────────────────────────────────────

test('ядро без часов и случайности: ни Date.now, ни Math.random во всей зоне', () => {
  const files = readdirSync(ZONE, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.mjs'));
  assert.ok(files.length >= 10, 'зона не прочитана');
  for (const f of files) {
    const src = stripComments(readFileSync(resolve(ZONE, f), 'utf8'));
    assert.doesNotMatch(src, /Date\.now\(/u, `${f}: время приходит параметром`);
    assert.doesNotMatch(src, /Math\.random\(/u, `${f}: случайность запрещена`);
  }
});

test('предикатное ядро без fs, сети, git и gh — разрешение ref инъектируется', () => {
  for (const f of CORE_FILES) {
    const src = stripComments(readFileSync(resolve(ZONE, f), 'utf8'));
    assert.doesNotMatch(src, /from 'node:(fs|child_process|http|https|net)'/u, `${f}: ядро не трогает диск и сеть`);
    assert.doesNotMatch(src, /execSync|spawnSync|\bfetch\(/u, `${f}: ни git/gh, ни сети`);
  }
});

test('детерминизм: два прогона одного входа дают побайтово равный отчёт', () => {
  const a = run('plan-two-blocks', 'duplicate-and-extra').text;
  const b = run('plan-two-blocks', 'duplicate-and-extra').text;
  assert.equal(a, b);
});

test('--now живёт только в шапке: смена часа не меняет ни один вердикт', () => {
  const { records } = loadFixture('plan-lied');
  const base = {
    planRaw: stubPlan('plan-two-blocks'),
    traceRecords: records,
    knownPersonas: KNOWN_PERSONAS,
    allowedReasons: RESPONSIBILITY_WAIVER_REASONS,
    resolveRef: makeSnapshotResolver(),
  };
  const early = runGate({ ...base, now: '2026-07-30T00:00:00.000Z' });
  const later = runGate({ ...base, now: '2027-01-01T00:00:00.000Z' });
  assert.deepEqual(early.blocks.map((b) => b.verdict), later.blocks.map((b) => b.verdict));
  assert.equal(early.exitCode, later.exitCode);
});

// ── Шов B→C и CLI ────────────────────────────────────────────────────────────────────────────

test('шов B→C: GateReport сериализуем и самодостаточен на каждой фикстуре', () => {
  for (const fixture of FIXTURE_NAMES) {
    const { report } = run('plan-two-blocks', fixture);
    const accepted = acceptGateReport(report);
    assert.ok(accepted.ok, `${fixture}: ${accepted.problems.join('; ')}`);
    assert.equal(Object.keys(accepted.stopped).length, report.checkedBlocks);
  }
});

test('отчёт всегда со знаменателем: corpusSize и checkedBlocks в тексте каждой фикстуры', () => {
  for (const fixture of FIXTURE_NAMES) {
    const { report, text } = run('plan-two-blocks', fixture);
    assert.match(text, new RegExp(`следов ${report.corpusSize}`, 'u'), fixture);
    assert.match(text, new RegExp(`блоков проверено: ${report.checkedBlocks}`, 'u'), fixture);
    assert.match(text, /код возврата: [012]\n/u, fixture);
  }
});

test('CLI: аргументы разбираются, стаб плана и фикстура выбираются префиксом', () => {
  const a = parseArgs(['--plan', 'stub:plan-two-blocks', '--traces', 'fixture:plan-lied', '--now', 'X', '--json']);
  assert.deepEqual(a, { plan: 'stub:plan-two-blocks', traces: 'fixture:plan-lied', now: 'X', json: true });
  assert.deepEqual(parseArgs([]), { plan: null, traces: null, now: null, json: false });
});

// ── Шов A→B: настоящий план нарезки доезжает до гейта (31.07) ────────────────────────────────

test('шов A→B: план схемы sprint-cut/1 приводится ко входу гейта', () => {
  const plan = {
    schema: 'sprint-cut/1',
    sprintId: 'seam-check',
    mode: 'explicit-honest',
    window: { from: '2026-07-31T05:00:00Z', to: '2026-07-31T15:00:00Z' },
    blocks: [{ blockId: 'one-block', persona: 'dynin', context: 'dynin', revisionAt: '2026-07-31T05:00:00Z' }],
  };
  const { planRaw, errors } = adaptCutPlan(plan);
  assert.deepEqual(errors, [], 'чистый план ошибок шва не рождает');
  assert.equal(planRaw.planId, 'seam-check', 'sprintId → planId');
  assert.equal(planRaw.blocks[0].assigned, 'dynin', 'persona → assigned');
  assert.equal(planRaw.blocks[0].mode, 'explicit_honest', 'литерал режима нормализован');
  // Ратификации в теле нет → ratified false. Адаптер её НЕ выдумывает.
  assert.equal(planRaw.ratified, false);
});

test('шов A→B: файл без схемы — ошибка входа, а не «наверное родной формы»', () => {
  // Ровно форма стаба Phase 2. Пропусти её CLI молча — и рукописный документ во внутренней
  // модели гейта стал бы законным входом, включая ratified: true, поставленный рукой.
  const stubShaped = { planId: 'hand-made', ratified: true, blocks: [{ blockId: 'x', assigned: 'dynin' }] };
  const { planRaw, errors } = adaptCutPlan(stubShaped);
  assert.equal(planRaw, null);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, INPUT_ERRORS.E_PLAN_UNREADABLE);
  assert.match(errors[0].detail, /schema=\(нет\)/u);
});

test('шов A→B: находка шва поднимается ошибкой входа — проверка не состоялась', () => {
  // context ≠ persona: контракт §G5 говорит, что такой план из области гейта выходит.
  const plan = {
    schema: 'sprint-cut/1',
    sprintId: 'seam-context',
    window: { from: '2026-07-31T05:00:00Z', to: '2026-07-31T15:00:00Z' },
    blocks: [{ blockId: 'one-block', persona: 'dynin', context: 'ozhegov', revisionAt: '2026-07-31T05:00:00Z' }],
  };
  const { errors } = adaptCutPlan(plan);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].subject, 'one-block', 'ошибка адресована блоку, а не «плану вообще»');
  assert.match(errors[0].detail, /ia-context-differs/u, 'имя находки шва не потеряно');
  assert.ok(ALL_INPUT_ERRORS.includes(errors[0].code), 'код из закрытого списка, свой не заведён');
});

test('резолвер дерева: файл да, чужой путь и ссылка со схемой — нет', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const resolveRef = makeWorkTreeResolver(root);
  assert.equal(resolveRef('scripts/execution-gate.mjs'), true);
  assert.equal(resolveRef('scripts/нет-такого-файла.mjs'), false);
  assert.equal(resolveRef('../../../etc/passwd'), false, 'наружу дерева не выпускаем');
  // URL не хуже файла — он просто не проверяем этим резолвером; тихое «да» было бы
  // ложным зелёным ровно того рода, против которого гейт построен.
  assert.equal(resolveRef('https://github.com/officefish/Membrana/pull/1467'), false);
  assert.equal(resolveRef(''), false);
});

// ── Восьмой вердикт: частичное протухание (акт владельца 01.08, Issue #1566) ──────────
// До него stale_trace ловил только «протухли ВСЕ»; уцелел хоть один след — протухшие молча
// выпадали из evidenceRefs, а блок выходил honest_pair. Так три ребёнка перерезки получили
// зелёное на разборе вещи, которой в той форме не существовало.

test('частичное протухание: блок с одним старым и одним свежим следом → stale_partial', () => {
  const { report } = run('plan-two-blocks', 'stale-partial');
  const gate = report.blocks.find((b) => b.blockId === 'gate-wiring');
  assert.equal(gate.verdict, 'stale_partial');
  assert.match(gate.reason, /судили другую вещь/u);
  assert.match(gate.reason, /1 из 2/u, 'причина обязана назвать, сколько вещдоков протухло из скольких');
});

test('частичное протухание соседа не красит: чистый блок остаётся honest_pair', () => {
  const { report } = run('plan-two-blocks', 'stale-partial');
  assert.equal(report.blocks.find((b) => b.blockId === 'mfcc-core').verdict, 'honest_pair');
});

test('stale_partial ≠ stale_trace: «всё протухло» и «часть» — разные состояния', () => {
  assert.equal(run('plan-two-blocks', 'stale-trace').report.blocks.find((b) => b.blockId === 'gate-wiring').verdict, 'stale_trace');
  assert.equal(run('plan-two-blocks', 'stale-partial').report.blocks.find((b) => b.blockId === 'gate-wiring').verdict, 'stale_partial');
});

test('stale_partial — остановка, а не находка: класс статичен', () => {
  assert.equal(VERDICT_CLASS[VERDICTS.STALE_PARTIAL], 'stop');
});

// ── Смешанные смещения ISO: гейт сравнивает МОМЕНТЫ, а не строки ──────────────────────
// Ревью PR #1604 выставило это как P1 «off-by-timezone в isStale». Проверено: дефекта нет —
// plan-reader.parseIso прогоняет и revisionAt, и at следа через Date.parse, в предикаты
// приходит эпоха. Тест закрепляет свойство, чтобы оно не пропало при рефакторинге: соседний
// контур (sprint:experience) на таком же сравнении ЛЕКСИКОГРАФИЧЕСКИ и правда врёт, и разница
// между двумя контурами держится ровно на этой нормализации.

test('смешанные смещения: след позже ревизии считается свежим, хотя строкой он «меньше»', () => {
  const rev = '2026-08-01T15:04:23+03:00'; // = 12:04:23Z
  const at = '2026-08-01T13:00:00Z'; // на 56 минут ПОЗЖЕ ревизии
  assert.equal(at < rev, true, 'предпосылка теста: строкой сравнение даёт обратный ответ');
  assert.equal(isStale({ at: parseIso(at) }, { revisionAt: parseIso(rev) }), false, 'гейт обязан сравнивать моменты');
});

test('смешанные смещения: след раньше ревизии остаётся протухшим', () => {
  const rev = '2026-08-01T15:04:23+03:00';
  const at = '2026-08-01T11:00:00Z'; // раньше 12:04:23Z
  assert.equal(isStale({ at: parseIso(at) }, { revisionAt: parseIso(rev) }), true);
});

// ── #1638: отзыв протухшего следа актом перерезки ─────────────────────────────────────────────
//
// Тупик: revisionAt сдвинут перерезкой (правильно) → старый след протух (правильно) → контекст
// прогнан заново, свежая пара полна — а stale_partial вставал всё равно, и очистить его можно
// было только изъятием строки руками. Вещдок разведки 03.08: изъятая строка v1 не существует
// даже в git-истории — ленту почистили до коммита. Дверь: дисквалификация поимённо, не изъятие.

const REV = Date.parse('2026-07-30T08:00:00.000Z');
const supersedeBlock = { blockId: 'b', assigned: 'vesnin', mode: 'explicit_honest', from: Date.parse('2026-07-30T06:00:00.000Z'), to: Date.parse('2026-07-31T06:00:00.000Z'), graceMs: 0, revisionAt: REV };
const tr = (traceId, kind, atIso) => ({ traceId, blockId: 'b', kind, subject: 'vesnin', at: Date.parse(atIso), ref: 'x', relatesToSprint: false });
const STALE_RUN = tr('t-old-run', 'context_run', '2026-07-30T07:00:00.000Z');
const FRESH_RUN = tr('t-new-run', 'context_run', '2026-07-30T09:00:00.000Z');
const FRESH_REVIEW = tr('t-new-review', 'review_pass', '2026-07-30T09:30:00.000Z');
const ACT_BETWEEN = { kind: 'recut_act', at: Date.parse('2026-07-30T07:30:00.000Z') }; // след ≤ акт ≤ ревизия

test('DoD #1638: тупик закрыт — акт между следом и ревизией + свежая пара → honest_pair', () => {
  const j = judgeBlock(supersedeBlock, [STALE_RUN, FRESH_RUN, FRESH_REVIEW], { resolveRef: () => true, recutActs: [ACT_BETWEEN] });
  assert.equal(j.verdict, VERDICTS.HONEST_PAIR);
  assert.equal(j.disqualified.length, 1, 'отзыв поимённый, а не молчаливый');
  assert.equal(j.disqualified[0].toothId, DISQUALIFICATIONS.SUPERSEDED_BY_RECUT);
  assert.equal(j.disqualified[0].traceId, 't-old-run');
  assert.match(j.disqualified[0].reason, /дисквалифицирован актом перерезки \(не изъят\)/u);
});

test('#1638: без акта — прежний stale_partial, вещдок #1566 не ослаблен', () => {
  const j = judgeBlock(supersedeBlock, [STALE_RUN, FRESH_RUN, FRESH_REVIEW], { resolveRef: () => true, recutActs: [] });
  assert.equal(j.verdict, VERDICTS.STALE_PARTIAL);
  // И ctx без поля recutActs вовсе — то же самое: дверь по умолчанию закрыта.
  const noCtx = judgeBlock(supersedeBlock, [STALE_RUN, FRESH_RUN, FRESH_REVIEW], { resolveRef: () => true });
  assert.equal(noCtx.verdict, VERDICTS.STALE_PARTIAL);
});

test('#1638: перерезал и НЕ перепрогнал — прежний stale_trace, дверь открывает только перепрогон', () => {
  const j = judgeBlock(supersedeBlock, [STALE_RUN], { resolveRef: () => true, recutActs: [ACT_BETWEEN] });
  assert.equal(j.verdict, VERDICTS.STALE_TRACE);
  assert.equal(j.disqualified.length, 0, 'без свежих следов отзыв не срабатывает вовсе');
});

test('#1638: после отзыва состав судится полной строгостью — свежий один род → incomplete_trace', () => {
  // Дверь не лазейка мимо вчерашнего #1641: отозвали протухший, но свежий след один — пары нет.
  const j = judgeBlock(supersedeBlock, [STALE_RUN, FRESH_REVIEW], { resolveRef: () => true, recutActs: [ACT_BETWEEN] });
  assert.equal(j.verdict, VERDICTS.INCOMPLETE_TRACE);
  assert.equal(j.disqualified[0]?.toothId, DISQUALIFICATIONS.SUPERSEDED_BY_RECUT);
});

test('#1638: временнАя граница — акт ДО протухшего следа или ПОСЛЕ ревизии не отзывает', () => {
  // Требование резчика: голый факт «в ленте есть recut_act» легализовал бы старый акт на весь
  // спринт. Акт обязан лежать между следом и ревизией — судить именно тот контракт.
  const actBefore = { kind: 'recut_act', at: Date.parse('2026-07-30T06:30:00.000Z') }; // раньше следа 07:00
  const actAfter = { kind: 'recut_act', at: Date.parse('2026-07-30T09:45:00.000Z') }; // позже ревизии 08:00
  for (const act of [actBefore, actAfter]) {
    const j = judgeBlock(supersedeBlock, [STALE_RUN, FRESH_RUN, FRESH_REVIEW], { resolveRef: () => true, recutActs: [act] });
    assert.equal(j.verdict, VERDICTS.STALE_PARTIAL, `акт at=${act.at} не в окне [след, ревизия]`);
    assert.equal(j.disqualified.length, 0);
  }
});

test('#1638: чужой блок — акт вне временнОго окна ЕГО следа и ревизии дверь не открывает', () => {
  // Акты не несут blockId (они про план целиком) — блочность держит временнАя сверка: у блока
  // с прежней ревизией и давним протуханием окно [след, ревизия] другое, и акт свежей
  // перерезки соседа в него не попадает.
  const otherBlock = { ...supersedeBlock, blockId: 'y', revisionAt: Date.parse('2026-07-30T06:30:00.000Z') };
  const oldStale = { ...tr('t-y-old', 'context_run', '2026-07-30T06:10:00.000Z'), blockId: 'y' };
  const yFreshRun = { ...tr('t-y-run', 'context_run', '2026-07-30T09:00:00.000Z'), blockId: 'y' };
  const yFreshReview = { ...tr('t-y-review', 'review_pass', '2026-07-30T09:30:00.000Z'), blockId: 'y' };
  const j = judgeBlock(otherBlock, [oldStale, yFreshRun, yFreshReview], { resolveRef: () => true, recutActs: [ACT_BETWEEN] });
  assert.equal(j.verdict, VERDICTS.STALE_PARTIAL, 'акт соседа (07:30) позже ревизии y (06:30) — не отзывает');
});

test('#1638: интеграция через runGate — recutActs доезжает до вердикта', () => {
  const { records } = loadFixture('stale-partial');
  const report = runGate({
    planRaw: stubPlan('plan-two-blocks'),
    traceRecords: records,
    knownPersonas: KNOWN_PERSONAS,
    allowedReasons: RESPONSIBILITY_WAIVER_REASONS,
    resolveRef: makeSnapshotResolver(),
    // Протухший след gate-wiring в фикстуре — 07:00Z, ревизия 08:00Z: акт 07:30 между ними.
    recutActs: [{ kind: 'recut_act', at: Date.parse('2026-07-30T07:30:00.000Z') }],
    now: '2026-07-31T12:00:00.000Z',
    preErrors: [],
  });
  const gw = report.blocks.find((b) => b.blockId === 'gate-wiring');
  // Свежий след в фикстуре один (review_pass) — после отзыва состав неполон: НЕ зелёный.
  assert.equal(gw.verdict, VERDICTS.INCOMPLETE_TRACE);
  assert.equal(gw.disqualified?.[0]?.toothId ?? report.blocks.find((b) => b.blockId === 'gate-wiring').disqualified[0].toothId, DISQUALIFICATIONS.SUPERSEDED_BY_RECUT);
});
