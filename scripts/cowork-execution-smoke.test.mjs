/**
 * Интеграционный smoke Phase 4 — cowork-execution-registry.
 *
 * Исполняемые тесты семи пунктов INTERFACE_CONTRACT §5 на интеграционной ветке.
 * Импортируются РЕАЛЬНЫЕ модули трёх блоков (не стабы); фикстуры смок строит
 * свои — фикстуры блоков остаются в их тестах и в прод не тащатся.
 *
 * Пункт §5.1 (фикстурный источник → producer): тело производителя — TS-модуль
 * пакета office (`packages/background-office/src/linear-snapshot/**`); его
 * прогон «источник → снимок с полной шапкой» покрыт vitest-тестом пакета
 * `linear-snapshot.service.test.ts` (стабы Linear-ответов, сеть запрещена) и
 * гоняется scoped CI `--filter=@membrana/background-office`. Здесь смок
 * проверяет mjs-половину пункта: канон формы снимка и оба исхода предиката
 * свежести на снимке канонической формы.
 */

import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Блок lead-persona
import { SUBAGENT_KINDS, decideDelegation } from './lib/angelina-delegate.mjs';
import { isValid } from './lib/angelina-validate.mjs';
// Блок units-trace-measure
import { checkAcceptance } from './lib/trace-acceptance.mjs';
import { checkLeadPersona } from './lib/trace-lead-persona.mjs';
import { computeTeamMetrics } from './lib/measure-metrics.mjs';
import { WIP_DISCLAIMER, renderTeamMetricsReport } from './lib/measure-report.mjs';
// Блок snapshot-cold-migration
import {
  EXIT_CODES,
  SNAPSHOT_FORMAT,
  isHardCode,
  isSoftCode,
  validateSnapshot,
} from './lib/snapshot-contract.mjs';
import { checkFreshness } from './lib/snapshot-freshness.mjs';
import { ColdRecordRejectedError, appendColdRecord } from './lib/cold-writer.mjs';
import { readColdRecords } from './lib/cold-reader.mjs';
import { classifyAll, countOpenWork } from './lib/debt-classify.mjs';
import { runLegalityGate } from './lib/debt-gate.mjs';
// Адаптеры Phase 4
import { projectSnapshotToCards } from './lib/snapshot-records-to-cards.mjs';
import {
  CONTRACT_CODES,
  projectExit,
  reportOutcome,
  runAcceptanceGate,
  runLeadPersonaGate,
  toContractCode,
} from './trace-gate.mjs';

/** Фикстурный снимок канонической формы `linear-snapshot@1` (смок строит свой). */
function makeLinearSnapshot({ capturedAt, sourceRevision, records }) {
  return {
    header: {
      format: SNAPSHOT_FORMAT,
      capturedAt,
      sourceRevision,
      producedBy: 'media-NL',
      egressRegion: 'NL',
      mode: 'batch-full-pull',
      trigger: 'manual',
      recordCount: records.length,
    },
    records,
  };
}

function makeRecord(overrides = {}) {
  return {
    linearId: 'DRU-1',
    state: 'Todo',
    stateType: 'unstarted',
    assignee: null,
    delegatedAgent: null, // §1.3: до живого ключа Linear — всегда null
    parentId: null,
    blockedBy: [],
    blocking: [],
    githubIssueRefs: [],
    createdAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-18T08:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const PREV = makeLinearSnapshot({
  capturedAt: '2026-07-18T18:00:00.000Z',
  sourceRevision: 'rev-prev',
  records: [
    // контейнер + центральная под-задача одного паспорта (#101): биекция, не двойной счёт
    makeRecord({ linearId: 'DRU-10', stateType: 'started', state: 'In Progress', githubIssueRefs: [101] }),
    makeRecord({
      linearId: 'DRU-11',
      parentId: 'uuid-dru-10',
      stateType: 'started',
      state: 'In Progress',
      assignee: 'Vesnin',
      githubIssueRefs: [101],
    }),
    makeRecord({
      linearId: 'DRU-12',
      parentId: 'uuid-x',
      stateType: 'started',
      state: 'In Progress',
      assignee: 'Dynin',
      githubIssueRefs: [102],
      createdAt: '2026-07-17T09:00:00.000Z',
    }),
    makeRecord({ linearId: 'DRU-13', parentId: 'uuid-y', stateType: 'backlog', state: 'Backlog', githubIssueRefs: [103] }),
    makeRecord({ linearId: 'DRU-93', stateType: 'backlog', state: 'Backlog' }), // без паспорта — не единица счёта
  ],
});

const CURR = makeLinearSnapshot({
  capturedAt: '2026-07-19T18:00:00.000Z',
  sourceRevision: 'rev-curr',
  records: [
    makeRecord({ linearId: 'DRU-10', stateType: 'started', state: 'In Progress', githubIssueRefs: [101] }),
    makeRecord({
      linearId: 'DRU-11',
      parentId: 'uuid-dru-10',
      stateType: 'started',
      state: 'In Progress',
      assignee: 'Vesnin',
      githubIssueRefs: [101],
    }),
    makeRecord({
      linearId: 'DRU-12',
      parentId: 'uuid-x',
      stateType: 'completed',
      state: 'Done',
      assignee: 'Dynin',
      githubIssueRefs: [102],
      createdAt: '2026-07-17T09:00:00.000Z',
      completedAt: '2026-07-19T15:00:00.000Z',
    }),
    makeRecord({ linearId: 'DRU-13', parentId: 'uuid-y', stateType: 'backlog', state: 'Backlog', githubIssueRefs: [103] }),
    makeRecord({ linearId: 'DRU-93', stateType: 'backlog', state: 'Backlog' }),
  ],
});

// ---------------------------------------------------------------------------
// §5.1 — снимок канонической формы; fresh: свежий → 0, протухший → 10, exit 0 с печатью
// ---------------------------------------------------------------------------

test('§5.1: снимок linear-snapshot@1 с полной шапкой валиден по контракту', () => {
  assert.deepEqual(validateSnapshot(PREV), { ok: true, problems: [] });
  assert.deepEqual(validateSnapshot(CURR), { ok: true, problems: [] });
});

test('§5.1: fresh — свежий снимок → код 0', async () => {
  const result = await checkFreshness(CURR, () => 'rev-curr');
  assert.equal(result.code, EXIT_CODES.OK);
  assert.equal(result.fresh, true);
});

test('§5.1: fresh — протухший снимок → вердикт 10, exit 0 с печатью замечания', async () => {
  const result = await checkFreshness(CURR, () => 'rev-moved-on');
  assert.equal(result.code, EXIT_CODES.SNAPSHOT_STALE); // 10
  assert.equal(result.fresh, false);
  // Проекция адаптера на exit процесса: мягкий → exit 0 + обязательная печать.
  const printed = [];
  const exit = reportOutcome(
    { code: result.code, reason: `снимок на ${result.snapshotRevision}, источник ушёл к ${result.sourceCursor}` },
    { log: (s) => printed.push(s), error: (s) => printed.push(s) },
  );
  assert.equal(exit, 0);
  assert.equal(printed.length, 1);
  assert.match(printed[0], /код 10/u);
});

// ---------------------------------------------------------------------------
// §5.2 — адаптер (а) проецирует records[] → вид батча; отказ-I 22, отказ-II soft 12
// ---------------------------------------------------------------------------

test('§5.2: адаптер (а) — проекция records[] в единицы счёта (биекция, без двойного счёта)', () => {
  const projected = projectSnapshotToCards(CURR);
  // Шапка потребителя — строгое подмножество шапки производителя.
  assert.deepEqual(projected.header, {
    capturedAt: '2026-07-19T18:00:00.000Z',
    sourceRevision: 'rev-curr',
  });
  // 3 паспорта → 3 единицы; контейнер DRU-10 второй карточки #101 не породил.
  assert.deepEqual(projected.cards.map((c) => c.id), ['gh-101', 'gh-102', 'gh-103']);
  const unit101 = projected.cards[0];
  assert.equal(unit101.linearId, 'DRU-11'); // носитель — центральная под-задача
  assert.equal(unit101.status, 'in-progress');
  assert.equal(unit101.leadPersona, 'vesnin'); // assignee → leadPersona, нормализовано
  assert.equal(unit101.archivedAt, null); // поля у производителя нет — честный null
  assert.deepEqual(projected.dropped.noPassport, ['DRU-93']); // не единица счёта, наблюдаемо
  assert.equal(projected.collisions.length, 1);
  assert.equal(projected.collisions[0].picked, 'DRU-11');
  // Закрытая единица несёт closedAt из completedAt.
  assert.equal(projected.cards[1].status, 'closed');
  assert.equal(projected.cards[1].closedAt, '2026-07-19T15:00:00.000Z');
});

test('§5.2: отказ-I — карточка без персоны → вердикт 22, exit ≠ 0', () => {
  const projected = projectSnapshotToCards(CURR);
  const ownerless = projected.cards.find((c) => c.id === 'gh-103');
  assert.equal(ownerless.leadPersona, null);
  const single = checkLeadPersona(ownerless);
  assert.equal(single.verdict, 'hard');
  assert.equal(toContractCode('lead-persona', single), CONTRACT_CODES.LEAD_PERSONA_MISSING); // 22
  const gate = runLeadPersonaGate(projected.cards);
  assert.equal(gate.code, 22);
  assert.equal(gate.failures.length, 1);
  assert.notEqual(projectExit(gate.code).exit, 0);
  assert.equal(projectExit(gate.code).exit, 22); // exit = вердикт-коду
});

test('§5.2: отказ-II soft — приёмка не подтверждена → 12, exit 0', () => {
  const outcome = runAcceptanceGate({ taskId: 'gh-103', acceptance: null }, { mode: 'soft' });
  assert.equal(outcome.code, CONTRACT_CODES.ACCEPTANCE_UNCONFIRMED); // 12
  const printed = [];
  const exit = reportOutcome(outcome, { log: (s) => printed.push(s), error: (s) => printed.push(s) });
  assert.equal(exit, 0);
  assert.match(printed[0], /замечание \[код 12\]/u);
});

test('§5.2 (дополнение §2): отказ-II hard — ложная приёмка → 23, exit 23', () => {
  const outcome = runAcceptanceGate(
    { taskId: 'gh-102', acceptance: { acceptedBy: 'vesnin', headRev: 'a'.repeat(40) } },
    { mode: 'hard', expectedHeadRev: 'b'.repeat(40) },
  );
  assert.equal(outcome.code, CONTRACT_CODES.ACCEPTANCE_FALSE); // 23
  assert.equal(projectExit(outcome.code).exit, 23);
});

// ---------------------------------------------------------------------------
// §5.3 — computeTeamMetrics: отчёт с ревизиями ОБОИХ снимков и подписью wip
// ---------------------------------------------------------------------------

test('§5.3: батч измерения через адаптер (а) — honest-шапка обоих снимков + подпись wip', () => {
  const prev = projectSnapshotToCards(PREV);
  const curr = projectSnapshotToCards(CURR);
  const closureArtifacts = [
    {
      taskId: 'gh-102',
      closedAt: '2026-07-19T15:00:00.000Z',
      acceptance: { acceptedBy: 'vesnin', headRev: 'c'.repeat(40) },
      acceptanceHistory: [{ acceptedBy: 'vesnin', headRev: 'c'.repeat(40) }],
    },
  ];
  const result = computeTeamMetrics(prev, curr, closureArtifacts);
  assert.equal(result.header.prevRevision, 'rev-prev');
  assert.equal(result.header.currRevision, 'rev-curr');
  assert.deepEqual(result.header.artifactsCounted, ['gh-102']);
  assert.equal(result.metrics.throughput.byPersona.dynin, 1);

  const report = renderTeamMetricsReport(result);
  assert.match(report, /rev-prev/u);
  assert.match(report, /rev-curr/u);
  assert.ok(report.includes(WIP_DISCLAIMER)); // «wip = очередь намерений, не производительность»
  assert.match(report, /Намеренно неизмеримое/u);
});

// ---------------------------------------------------------------------------
// §5.4 — classifyDebt: счётчик читает только work
// ---------------------------------------------------------------------------

test('§5.4: classifyDebt на смешанном наборе — счётчик незакрытых читает только work', () => {
  const cards = [
    { id: 'w-1', githubIssue: 11, archivedAt: null }, // паспорт есть, не закрыто, работа не сделана → work
    { id: 'l-1' }, // паспорта нет → legality
    { id: 'p-1' }, // parked → owner-knowledge, счётчик не поднимает
    { id: 'a-1', archivedAt: '2026-07-01' }, // archived-pre-passport: в холоде, паспорта нет
  ];
  const entries = classifyAll(cards, {
    coldIds: new Set(['a-1']),
    closures: new Map([['w-1', {}]]), // артефакт есть, LGTM нет → workDone = false
    parked: new Map([['p-1', '2026-07-19']]),
  });
  const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
  assert.equal(byId['w-1'].debtClass, 'work');
  assert.equal(byId['l-1'].debtClass, 'legality');
  assert.equal(byId['p-1'].debtClass, 'owner-knowledge');
  assert.equal(byId['p-1'].parked, true);
  assert.equal(byId['a-1'].debtClass, 'legality'); // долг законности, НЕ долг работы
  assert.equal(countOpenWork(entries), 1); // только work; parked/legality не поднимают
});

// ---------------------------------------------------------------------------
// §5.5 — cold-writer: с honest-шапкой принята, без шапки — отвергнута
// ---------------------------------------------------------------------------

test('§5.5: cold-writer принимает запись с honest-шапкой и отвергает без неё', () => {
  const archivePath = join(mkdtempSync(join(tmpdir(), 'cowork-smoke-cold-')), 'archive.jsonl');
  const record = {
    snapshot: { capturedAt: '2026-07-19T18:00:00.000Z', headRevision: 'd'.repeat(40), source: 'office-batch' },
    card: { id: 'gh-102', title: 'закрытая единица' },
    domain: { dependsOn: [], strategicWave: null, leadPersona: 'dynin' },
  };
  const appended = appendColdRecord(archivePath, record);
  assert.equal(appended.appended, true);
  assert.equal(readColdRecords(archivePath).records.length, 1);

  assert.throws(
    () => appendColdRecord(archivePath, { card: { id: 'gh-103' }, domain: { dependsOn: [] } }),
    ColdRecordRejectedError,
  );
  assert.equal(readColdRecords(archivePath).records.length, 1); // отвергнутая не дописана
});

// ---------------------------------------------------------------------------
// §5.6 — Ангелина: делегирование долгоживущего документа → scribe; isValid обоих родов
// ---------------------------------------------------------------------------

test('§5.6: decideDelegation(долгоживущий документ) → писарь (scribe)', () => {
  const verdict = decideDelegation({
    fitsOneContext: true,
    needsParallelFactua: false,
    isLongLivedDocument: true,
  });
  assert.deepEqual(verdict, { delegate: true, kinds: [SUBAGENT_KINDS.SCRIBE] });
});

test('§5.6: isValid валидирует возвраты обоих родов (кириллические ключи — канон)', () => {
  assert.deepEqual(
    isValid({ фактура: 'facts', источник: 'docs/x.md', пробелы: [] }, SUBAGENT_KINDS.ANALYST),
    { valid: true, missing: [] },
  );
  assert.deepEqual(
    isValid({ дифф: '+line', что_открыто: '' }, SUBAGENT_KINDS.SCRIBE),
    { valid: true, missing: [] },
  );
  // Возврат без обязательного содержательного поля — отвергается наблюдаемо.
  assert.deepEqual(isValid({ источник: 'x', пробелы: [] }, SUBAGENT_KINDS.ANALYST), {
    valid: false,
    missing: ['фактура'],
  });
  assert.equal(isValid('свободный текст', SUBAGENT_KINDS.SCRIBE).valid, false);
});

// ---------------------------------------------------------------------------
// §5.7 — все коды по таблице §2; конвенция диапазонов; проекция на exit
// ---------------------------------------------------------------------------

test('§5.7: единая таблица вердикт-кодов §2 — значения и домены', () => {
  // Домен снимка и гейта законности — константы блока snapshot-cold-migration.
  assert.equal(EXIT_CODES.OK, 0);
  assert.equal(EXIT_CODES.SNAPSHOT_STALE, 10);
  assert.equal(EXIT_CODES.LEGALITY_MIGRATING, 11);
  assert.equal(EXIT_CODES.SNAPSHOT_NO_INPUT, 20);
  assert.equal(EXIT_CODES.LEGALITY_HARD, 21);
  // Домен зубов — трансляция адаптера (б); локальные 0/1 блока наружу не текут.
  assert.equal(CONTRACT_CODES.OK, 0);
  assert.equal(CONTRACT_CODES.ACCEPTANCE_UNCONFIRMED, 12);
  assert.equal(CONTRACT_CODES.LEAD_PERSONA_MISSING, 22);
  assert.equal(CONTRACT_CODES.ACCEPTANCE_FALSE, 23);
});

test('§5.7: конвенция диапазонов — 0 чисто · 1–19 мягкие · ≥20 жёсткие', () => {
  for (const soft of [10, 11, 12]) {
    assert.equal(isSoftCode(soft), true, `код ${soft} мягкий`);
    assert.equal(projectExit(soft).exit, 0, `мягкий ${soft} → exit 0`);
    assert.equal(projectExit(soft).soft, true, `мягкий ${soft} печатает замечание`);
  }
  for (const hard of [20, 21, 22, 23]) {
    assert.equal(isHardCode(hard), true, `код ${hard} жёсткий`);
    assert.equal(projectExit(hard).exit, hard, `жёсткий ${hard} → exit = коду`);
  }
  assert.deepEqual(projectExit(0), { exit: 0, soft: false });
});

test('§5.7: гейт законности отдаёт коды таблицы по режимам (11 migrating / 21 hard / 0 soft)', () => {
  const entries = [{ id: 'x-1', debtClass: 'legality', wellArchived: false, legalized: false }];
  assert.equal(runLegalityGate({ mode: 'soft', entries }).exitCode, EXIT_CODES.OK);
  assert.equal(runLegalityGate({ mode: 'migrating', entries }).exitCode, EXIT_CODES.LEGALITY_MIGRATING);
  assert.equal(runLegalityGate({ mode: 'hard', entries }).exitCode, EXIT_CODES.LEGALITY_HARD);
});

test('§5.7: загрузка отсутствующего снимка → жёсткий 20 (вход не определён)', async () => {
  const { loadSnapshot } = await import('./lib/snapshot-contract.mjs');
  const missing = loadSnapshot(join(tmpdir(), 'no-such-snapshot.json'));
  assert.equal(missing.code, EXIT_CODES.SNAPSHOT_NO_INPUT); // 20
  assert.equal(projectExit(missing.code).exit, 20);
});
