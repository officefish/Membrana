import assert from 'node:assert/strict';
import test from 'node:test';

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildEveningFeedbackUserMessage,
  collectGateMagistral,
  DAY_DOC_INPUTS,
  EVENING_FEEDBACK_PROCEDURE_ID,
  parseTeamEveningFeedbackCli,
  resolveEveningFeedbackOutputPath,
  runEveningFeedbackLlm,
} from './lib/team-evening-feedback-ritual.mjs';
import { collectDoneLedgerBlock, parseGitLogNumstat, prOfSubject, sinceDayOf } from './lib/review-done-ledger-port.mjs';
import { collectDecisionsLedger, daysOfWindow } from './lib/decisions-ledger-port.mjs';
import {
  loadProcedureDefaults,
  loadProcedureRegistry,
} from './lib/llm-procedure-registry.mjs';

test('parseTeamEveningFeedbackCli defaults', () => {
  const cli = parseTeamEveningFeedbackCli([]);
  assert.equal(cli.help, false);
  assert.equal(cli.saveAs, 'team-evening-feedback');
  assert.equal(cli.noRag, false);
  assert.equal(cli.noSave, false);
  assert.equal(cli.dryRun, false);
});

test('parseTeamEveningFeedbackCli flags', () => {
  const cli = parseTeamEveningFeedbackCli([
    '--no-rag',
    '--no-save',
    '--dry-run',
    '--save-as',
    'w0-hotfix',
    'extra focus',
  ]);
  assert.equal(cli.noRag, true);
  assert.equal(cli.noSave, true);
  assert.equal(cli.dryRun, true);
  assert.equal(cli.saveAs, 'w0-hotfix');
  assert.equal(cli.focusNote, 'extra focus');
});

test('resolveEveningFeedbackOutputPath default slug and date', () => {
  const p = resolveEveningFeedbackOutputPath({
    saveAs: 'team-evening-feedback',
    date: new Date('2026-06-23T12:00:00.000Z'),
    cwd: '/repo',
  });
  assert.match(p.replace(/\\/g, '/'), /docs\/seanses\/team-evening-feedback-2026-06-23\.md$/);
});

test('buildEveningFeedbackUserMessage includes regulation prompt and git', () => {
  const msg = buildEveningFeedbackUserMessage({
    regulation: 'REG',
    prompt: 'PROMPT',
    virtualTeam: 'VT',
    dayDocs: 'DOCS',
    gitSummary: 'GIT',
    ragBlock: 'RAG',
    date: new Date('2026-06-23T12:00:00.000Z'),
  });
  assert.match(msg, /REG/);
  assert.match(msg, /PROMPT/);
  assert.match(msg, /VT/);
  assert.match(msg, /DOCS/);
  assert.match(msg, /GIT/);
  assert.match(msg, /RAG/);
  assert.match(msg, /2026-06-23/);
});

test('DAY_DOC_INPUTS covers ritual documents', () => {
  const rels = DAY_DOC_INPUTS.map((d) => d.rel);
  assert.ok(rels.includes('docs/MAIN_DAY_ISSUE.md'));
  assert.ok(rels.includes('docs/DAILY_CODE_REVIEW.md'));
  // Конвейер владельца (18.07): рефлексия работает НА сухих фактах аудитора.
  // Без этого входа она их не видит — 18.07 не назвала разрез областей ни разу.
  assert.ok(rels.includes('docs/DAILY_AUDIT.md'));
});

test('хроника подаётся в рефлексию РАНЬШЕ code-review: сначала что было, потом как написано', () => {
  const rels = DAY_DOC_INPUTS.map((d) => d.rel);
  assert.ok(rels.indexOf('docs/DAILY_AUDIT.md') < rels.indexOf('docs/DAILY_CODE_REVIEW.md'));
});

// --- Канал процедуры (#1210): цепочка вместо прямого Anthropic ---------------------------
// Инъекции вместо сети: оба пути (фолбэк и исчерпание) проверяются детерминированно.

/** @returns {{ calls: Array<{ path: string; body: string; meta?: object }>, write: Function }} */
function recordingWrite() {
  const calls = [];
  return { calls, write: (opts) => calls.push(opts) };
}

test('канал team-evening-feedback зарегистрирован и у него есть цепочка с фолбэком', () => {
  const reg = loadProcedureRegistry();
  const record = reg.procedures.find((p) => p.id === EVENING_FEEDBACK_PROCEDURE_ID);
  assert.ok(record, 'процедуры team-evening-feedback нет в реестре каналов');
  assert.equal(record.entryMjs, 'scripts/team-evening-feedback.mjs');
  assert.equal(record.meters, true);

  const chain = loadProcedureDefaults()[EVENING_FEEDBACK_PROCEDURE_ID]?.chain;
  assert.ok(Array.isArray(chain) && chain.length >= 2, 'цепочка без фолбэка = одно звено');
  assert.equal(chain[0].provider, 'anthropic');
  // Первое звено исчерпано до 01.08 — без второго звена шаг молчит (вечер 25.07).
  assert.ok(chain.slice(1).some((s) => s.provider !== 'anthropic'));
});

test('фолбэк: ответило второе звено → протокол записан с провенансом звена', async () => {
  const { calls, write } = recordingWrite();
  const attempts = [];
  const run = await runEveningFeedbackLlm({
    prompt: 'P',
    outputPath: 'docs/seanses/x.md',
    saveAs: 'team-evening-feedback',
    invoke: async ({ procedureId, onAttempt }) => {
      assert.equal(procedureId, EVENING_FEEDBACK_PROCEDURE_ID);
      onAttempt({ provider: 'anthropic', model: 'm1', attemptIndex: 0, ok: false, errorClass: 'rate_limit' });
      onAttempt({ provider: 'xai', model: 'grok-4.5', attemptIndex: 1, ok: true });
      return { ok: true, text: 'ПРОТОКОЛ', provider: 'xai', model: 'grok-4.5', source: 'default', attempts: 2 };
    },
    write,
    log: (line) => attempts.push(line),
  });

  assert.equal(run.exitCode, 0);
  assert.equal(run.wrote, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body, 'ПРОТОКОЛ');
  assert.equal(calls[0].meta.llmProvider, 'xai');
  assert.equal(calls[0].meta.llmModel, 'grok-4.5');
  assert.equal(calls[0].meta.llmSource, 'default');
  // Обе попытки названы в логе — иначе диагноз канала невозможен.
  assert.ok(attempts.some((l) => /anthropic\/m1 failed: rate_limit/.test(l)));
  assert.ok(attempts.some((l) => /xai\/grok-4\.5/.test(l)));
});

test('цепочка исчерпана: честная единица И файл НЕ записан', async () => {
  const { calls, write } = recordingWrite();
  const lines = [];
  const run = await runEveningFeedbackLlm({
    prompt: 'P',
    outputPath: 'docs/seanses/x.md',
    invoke: async ({ onAttempt }) => {
      onAttempt({ provider: 'anthropic', model: 'm1', attemptIndex: 0, ok: false, errorClass: 'rate_limit' });
      return { ok: false, attempts: 4, errorClass: 'rate_limit' };
    },
    write,
    log: (line) => lines.push(line),
  });

  assert.equal(run.exitCode, 1);
  assert.equal(run.wrote, false);
  assert.equal(calls.length, 0, 'пустой протокол выдал бы себя за состоявшийся ритуал');
  assert.ok(lines.some((l) => /цепочка исчерпана/.test(l)));
});

test('звено ответило пустым телом — тоже единица без файла', async () => {
  const { calls, write } = recordingWrite();
  const run = await runEveningFeedbackLlm({
    prompt: 'P',
    outputPath: 'docs/seanses/x.md',
    invoke: async () => ({ ok: true, text: '   \n', provider: 'deepseek', model: 'deepseek-chat', source: 'default' }),
    write,
  });
  assert.equal(run.exitCode, 1);
  assert.equal(run.wrote, false);
  assert.equal(calls.length, 0);
});

test('--no-save: тело отдано, файл не записан, код честный ноль', async () => {
  const { calls, write } = recordingWrite();
  let emitted = '';
  const run = await runEveningFeedbackLlm({
    prompt: 'P',
    outputPath: 'docs/seanses/x.md',
    noSave: true,
    invoke: async () => ({ ok: true, text: 'ПРОТОКОЛ', provider: 'xai', model: 'grok-4.5', source: 'default' }),
    write,
    emit: (b) => { emitted = b; },
  });
  assert.equal(run.exitCode, 0);
  assert.equal(run.wrote, false);
  assert.equal(calls.length, 0);
  assert.equal(emitted, 'ПРОТОКОЛ');
});

// --- b3 ritual-reads-done-work (И8): вечер читает сделанное и свежесть посылок фактом ----------

const GIT_LOG_FIXTURE = [
  '794930f6dab6705c7ed792477d2ed3dba7c62fb9\t2026-09-28\tfeat(sample-library): библиотека Studio листается страницами по 40 (#2505)',
  '',
  '1000\t165\tapps/membrana-studio/src/library/Page.tsx',
  '78\t0\tapps/membrana-studio/src/library/Page.test.tsx',
  'fd15fc5f00000000000000000000000000000000\t2026-09-27\tfeat(sample-library): окно «перенести все» в набор (#2489)',
  '',
  '2400\t168\tapps/cabinet/src/components/sample-library/MoveAllToCollectionDialog.tsx',
  '895a2ce2d080207ceb6f98309f11345037596e2c\t2026-09-27\tfeat(media): массовый вывоз проб из буфера в набор одной дверью (#2488)',
  '',
  '1300\t40\tpackages/background-media/src/modules/samples/move-batch.ts',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\t2026-09-28\tfix(review): хозяин ревью (#2503)',
  '',
  '300\t73\tscripts/lib/review-lead.mjs',
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\t2026-09-28\tchore(ritual): артефакты вечера 27.09 (#2500)',
  '',
  '1700\t91\tdocs/seanses/team-evening-feedback-2026-09-27.md',
  '',
].join('\n');

const ISSUES_FIXTURE = JSON.stringify([
  { number: 2492, title: 'Две подписи moveSamplesBatch в #2488 и #2489', body: '', createdAt: '2026-09-27T12:07:37Z', state: 'OPEN' },
  { number: 2493, title: 'Набор причин чеканится дважды', body: 'Адреса (#2488, голова 135e406b)', createdAt: '2026-09-27T12:08:33Z', state: 'OPEN' },
  { number: 2494, title: 'Одиночный перенос не считает место', body: 'подтверждено и на ветке #2488', createdAt: '2026-09-27T12:09:09Z', state: 'OPEN' },
  { number: 2497, title: '745 строк продублированы', body: 'PR #2489 завёл окно двумя носителями', createdAt: '2026-09-27T14:12:01Z', state: 'OPEN' },
  { number: 2501, title: 'про ритуальный PR', body: 'см. #2500', createdAt: '2026-09-28T10:22:33Z', state: 'CLOSED' },
  { number: 2509, title: 'путь хуков', body: 'ничего про PR', createdAt: '2026-09-28T17:12:28Z', state: 'OPEN' },
]);

/** Инъекция процессов: git отвечает фикстурой, gh — по сценарию. */
function fakeRun({ ghOk = true } = {}) {
  const calls = [];
  const run = (cmd, args) => {
    calls.push([cmd, ...args].join(' '));
    if (cmd === 'git' && args[0] === 'rev-parse') return { ok: true, stdout: 'abc\n' };
    if (cmd === 'git' && args[0] === 'log') return { ok: true, stdout: GIT_LOG_FIXTURE };
    if (cmd === 'gh') return ghOk ? { ok: true, stdout: ISSUES_FIXTURE } : { ok: false, stdout: '', error: new Error('gh: HTTP 401 (unauthorized)') };
    return { ok: false, stdout: '', error: new Error(`неожиданная команда ${cmd}`) };
  };
  return { run, calls };
}

test('b3: книга сделанного — #2488 заведён билетами #2492 #2493 #2494, #2489 — #2492 #2497, #2505 — не заведён', () => {
  const { run, calls } = fakeRun();
  const res = collectDoneLedgerBlock({ cwd: '/repo', today: '2026-09-29', run });
  assert.equal(res.ok, true);
  assert.equal(res.oversized, 3, '#2503 (373 строки) и docs-only #2500 в книгу не входят');
  assert.equal(res.ticketed, 2);
  assert.match(res.block, /\*\*#2488\*\* \(2026-09-27 · 1340 строк\)[^\n]*\n {2}→ разбор заведён билетами: #2492 \(2026-09-27, OPEN\), #2493 \(2026-09-27, OPEN\), #2494 \(2026-09-27, OPEN\)/u);
  assert.match(res.block, /\*\*#2489\*\*[^\n]*\n {2}→ разбор заведён билетами: #2492 \(2026-09-27, OPEN\), #2497 \(2026-09-27, OPEN\)/u);
  assert.match(res.block, /\*\*#2505\*\*[^\n]*\n {2}→ разбор не заведён/u);
  assert.doesNotMatch(res.block, /#2503/u);
  assert.doesNotMatch(res.block, /\*\*#2500\*\*/u);
  assert.match(res.block, /docs-only oversized не показаны: 1/u);
  // Окно — неделя от дня прогона; ствол — origin/main, раз он есть.
  assert.ok(calls.some((c) => c.includes('--since=2026-09-22') && c.endsWith('origin/main')));
  assert.ok(calls.some((c) => c.startsWith('gh issue list') && c.includes('created:>=2026-09-22')));
});

test('b3 ПОРЧА: gh недоступен → блок говорит об этом словами и НЕ пишет «разбор не заведён»', () => {
  const { run } = fakeRun({ ghOk: false });
  const res = collectDoneLedgerBlock({ cwd: '/repo', today: '2026-09-29', run });
  assert.equal(res.ok, false);
  assert.match(res.reason, /gh issue list: gh: HTTP 401/u);
  assert.match(res.block, /книга сделанного недоступна/u);
  assert.match(res.block, /#2488[^\n]*→ билеты не опрошены/u);
  assert.doesNotMatch(res.block, /разбор не заведён/u);
  assert.doesNotMatch(res.block, /разбор заведён/u);
});

test('b3 порт: разбор git log --numstat, природа и номер PR из последней скобки', () => {
  const rows = parseGitLogNumstat(GIT_LOG_FIXTURE);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => [r.pr, r.changedLines, r.nature, r.oversized]), [
    [2505, 1243, 'code', true],
    [2489, 2568, 'code', true],
    [2488, 1340, 'code', true],
    [2503, 373, 'code', false],
    [2500, 1791, 'docs', true],
  ]);
  assert.equal(prOfSubject('feat(cowork): … (#1499) (#1515)'), 1515);
  assert.equal(prOfSubject('без номера'), null);
  assert.equal(sinceDayOf('2026-09-29', 7), '2026-09-22');
  assert.equal(sinceDayOf('2026-10-03', 7), '2026-09-26');
});

test('b3: книга сделанного стоит в промпте ДО документов дня, после магистрали', () => {
  const msg = buildEveningFeedbackUserMessage({
    regulation: 'REG', prompt: 'PROMPT', virtualTeam: 'VT', dayDocs: 'DOCS', gitSummary: 'GIT',
    magistralBlock: 'MAGISTRAL', doneWorkBlock: 'DONE-LEDGER', freshnessNotice: 'FRESH',
    date: new Date('2026-09-29T18:00:00.000Z'),
  });
  assert.ok(msg.indexOf('MAGISTRAL') < msg.indexOf('DONE-LEDGER'));
  assert.ok(msg.indexOf('DONE-LEDGER') < msg.indexOf('## Свежесть входов'));
  assert.ok(msg.indexOf('DONE-LEDGER') < msg.indexOf('## Документы дня'));
  // Без блока — ничего не подставляется и ничего не ломается.
  assert.doesNotMatch(buildEveningFeedbackUserMessage({ regulation: 'R', prompt: 'P', virtualTeam: 'V', dayDocs: 'D', gitSummary: 'G' }), /DONE-LEDGER/u);
});

test('b3: блок гейта несёт строку свежести посылок предикатом probe (живой случай: //date застрял, sources[0] и гейт сегодня)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'evening-freshness-'));
  mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
  writeFileSync(join(dir, 'docs/tasks/morning-gates-state.json'), JSON.stringify({ magistral: 'three-roads-experiment', magistralAuthor: 'human', day: '2026-09-29' }));
  writeFileSync(join(dir, 'docs/tasks/main-day-assertions.json'), JSON.stringify({
    '//date': 'Перечеканено 24.09 под cabinet-registration-rollout …',
    assertions: [],
    sources: [{ claim: 'Владелец 29.09: three-roads-experiment', origin: 'owner-choice@chat/magistral-29-09', date: '2026-09-29', author: 'human' }],
  }));
  const gate = collectGateMagistral({ cwd: dir, day: '2026-09-29' });
  assert.equal(gate.fresh, true);
  assert.equal(gate.freshness.verdict, 'aligned');
  assert.match(gate.block, /свежесть посылок: aligned — вещдок дня перечеканен сегодня \(2026-09-29\)/u);
  assert.match(gate.block, /судить ТОЛЬКО по этой строке/u);
  assert.doesNotMatch(gate.block, /Перечеканено 24\.09/u);

  // Порча: источник вчерашний → gate_newer, и это сказано словами.
  writeFileSync(join(dir, 'docs/tasks/main-day-assertions.json'), JSON.stringify({ assertions: [], sources: [{ claim: 'x', date: '2026-09-28', author: 'human' }] }));
  const stale = collectGateMagistral({ cwd: dir, day: '2026-09-29' });
  assert.equal(stale.freshness.verdict, 'gate_newer');
  assert.match(stale.block, /перечеканка НЕ сделана/u);

  // Вещдока нет → не судится, а не «aligned».
  const empty = mkdtempSync(join(tmpdir(), 'evening-freshness-empty-'));
  mkdirSync(join(empty, 'docs', 'tasks'), { recursive: true });
  writeFileSync(join(empty, 'docs/tasks/morning-gates-state.json'), JSON.stringify({ magistral: 'm', day: '2026-09-29' }));
  const none = collectGateMagistral({ cwd: empty, day: '2026-09-29' });
  assert.equal(none.freshness, null);
  assert.match(none.block, /вещдок дня недоступен/u);
});

// ---------------------------------------------------------------------------------------------
// b2 ritual-reads-decisions: вечер читает решённое — ратифицированные решения планов нарезки и
// закрытые прогоны спринтов со сверкой карточек. Фикстуры — живой случай 29.09.

function decisionsFixture({ brokenPlan = false, noRegistry = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'evening-decisions-'));
  mkdirSync(join(dir, 'docs/sprint/cut/trail'), { recursive: true });
  mkdirSync(join(dir, 'docs/sprint/cut/fixtures'), { recursive: true });
  mkdirSync(join(dir, 'docs/procedure-runs/trail'), { recursive: true });
  mkdirSync(join(dir, 'docs/tasks'), { recursive: true });
  writeFileSync(join(dir, 'docs/sprint/cut/sample-library-paging-a11y.json'), JSON.stringify({
    schema: 'sprint-cut/1', sprintId: 'sample-library-paging-a11y', cutBy: 'rodchenko', blocks: [],
    '//decisions': 'Три решения: (1) aria-current с индикатора СНЯТЬ, индикатор становится role=status aria-live=polite; (2) правило фокуса; (3) стрелок не заводить.',
    ratification: { by: 'owner', at: '2026-09-29T15:13:04+03:00', digest: 'd' },
  }));
  writeFileSync(join(dir, 'docs/sprint/cut/ritual-reads-done-work.json'), JSON.stringify({
    schema: 'sprint-cut/1', sprintId: 'ritual-reads-done-work', cutBy: 'ozhegov', blocks: [],
    '//why': 'заметка резчика, не решение',
    ratification: { by: 'owner', at: '2026-09-29T15:19:14+03:00', digest: 'e' },
  }));
  writeFileSync(join(dir, 'docs/sprint/cut/unratified.json'), JSON.stringify({
    sprintId: 'unratified', '//decisions': 'НЕ РАТИФИЦИРОВАНО — в блок попасть не должно',
  }));
  // Каталоги-соседи планами не являются: файл в fixtures/ не читается как план.
  writeFileSync(join(dir, 'docs/sprint/cut/fixtures/ghost.json'), JSON.stringify({
    sprintId: 'ghost', '//decisions': 'ПРИЗРАК ИЗ FIXTURES', ratification: { by: 'owner', at: '2026-09-29T10:00:00Z' },
  }));
  if (brokenPlan) writeFileSync(join(dir, 'docs/sprint/cut/broken.json'), '{ не json');
  writeFileSync(join(dir, 'docs/procedure-runs/trail/2026-09-29.jsonl'), [
    JSON.stringify({ schema: 'procedure-run-journal@2', sequence: 1, runId: 'batch-collection-run-contour', procedureId: 'membrana-local-sprint', status: 'started', at: '2026-09-29T15:00:00+03:00', runPhase: 'open' }),
    JSON.stringify({ schema: 'procedure-run-journal@1', sequence: 2, runId: 'batch-collection-run-contour', procedureId: 'membrana-local-sprint', status: 'pass', at: '2026-09-29T16:22:00+03:00', runPhase: 'close', subject: 'спринт batch-collection-run-contour: гейт зелёный' }),
    JSON.stringify({ schema: 'procedure-run-journal@1', sequence: 2, runId: 'ritual-day-2026-09-29', procedureId: 'ritual-day', status: 'pass', at: '2026-09-29T11:26:16Z', runPhase: 'close' }),
  ].join('\n') + '\n');
  // Лента за пределами окна не читается вовсе (день 15.09 при окне с 22.09).
  writeFileSync(join(dir, 'docs/procedure-runs/trail/2026-09-15.jsonl'), JSON.stringify({ runId: 'ancient', procedureId: 'membrana-local-sprint', status: 'pass', at: '2026-09-15T10:00:00Z', runPhase: 'close' }) + '\n');
  if (!noRegistry) {
    writeFileSync(join(dir, 'docs/tasks/registry.json'), JSON.stringify({ tasks: [
      { id: 'batch-collection-run-contour', status: 'active', size: 'L' },
      { id: 'batch-collection-run-contour-a1', status: 'active', size: 'S', parentEpic: 'batch-collection-run-contour' },
      { id: 'sample-library-paging-a11y', status: 'active', size: 'M' },
    ] }));
  }
  return dir;
}

test('b2: ведомость решённого на живом случае 29.09 — aria-current снят, batch закрыт и не архивирован; призраки не читаются', () => {
  const dir = decisionsFixture();
  const res = collectDecisionsLedger({ cwd: dir, today: '2026-09-29' });
  assert.equal(res.ok, true);
  assert.equal(res.sinceDay, '2026-09-22');
  assert.deepEqual(res.decisions.map((d) => [d.sprintId, d.key]), [['sample-library-paging-a11y', '//decisions']]);
  assert.match(res.block, /aria-current с индикатора СНЯТЬ/u);
  assert.match(res.block, /docs\/sprint\/cut\/sample-library-paging-a11y\.json#\/\/decisions/u);
  assert.doesNotMatch(res.block, /НЕ РАТИФИЦИРОВАНО/u, 'план без ратификации — не решение');
  assert.doesNotMatch(res.block, /ПРИЗРАК/u, 'fixtures/ — не планы');
  assert.doesNotMatch(res.block, /ancient/u, 'лента вне окна не читается');
  assert.deepEqual(res.closedSprints.map((c) => [c.sprintId, c.card, c.phasesActive, c.stale]), [['batch-collection-run-contour', 'active', 1, true]]);
  assert.match(res.block, /\*\*batch-collection-run-contour\*\* — прогон закрыт 2026-09-29 \(гейт pass\); карточка НЕ архивирована \(active, фаз active 1\/1\) — долг закрытия/u);
  assert.doesNotMatch(res.block, /ritual-day-2026-09-29/u, 'чужая процедура — не спринт');
});

test('b2 ПОРЧА: битый план и отсутствующий реестр — словами в блоке, не исключением и не пустотой', () => {
  const dir = decisionsFixture({ brokenPlan: true, noRegistry: true });
  const res = collectDecisionsLedger({ cwd: dir, today: '2026-09-29' });
  assert.equal(res.ok, false);
  assert.equal(res.unreadable.length, 2);
  assert.match(res.block, /Не прочитано \(2\): docs\/sprint\/cut\/broken\.json: /u);
  assert.match(res.block, /docs\/tasks\/registry\.json: [^\n]*состояние карточек не сверено/u);
  // Решение из читаемого плана всё равно на месте: одна порча не гасит всю ведомость.
  assert.match(res.block, /aria-current с индикатора СНЯТЬ/u);
  // Без реестра карточка «absent» — сказано словом, а не подделано под архив.
  assert.match(res.block, /batch-collection-run-contour[^\n]*карточки в реестре нет/u);
});

test('b2: окно ведомости — семь дней; ратификация за окном не входит', () => {
  const dir = decisionsFixture();
  const res = collectDecisionsLedger({ cwd: dir, today: '2026-10-07' });
  assert.equal(res.decisions.length, 0);
  assert.equal(res.closedSprints.length, 0);
  assert.match(res.block, /за окно ратифицированных решений нет/u);
  assert.deepEqual(daysOfWindow('2026-09-28', '2026-10-01'), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']);
});

test('b2: блок «Решённое» стоит в промпте ПОСЛЕ книги сделанного и ДО свежести входов и документов дня', () => {
  const msg = buildEveningFeedbackUserMessage({
    regulation: 'REG', prompt: 'PROMPT', virtualTeam: 'VT', dayDocs: 'DOCS', gitSummary: 'GIT',
    magistralBlock: 'MAGISTRAL', doneWorkBlock: 'DONE-LEDGER', decisionsBlock: 'DECISIONS-LEDGER', freshnessNotice: 'FRESH',
    date: new Date('2026-09-30T18:00:00.000Z'),
  });
  assert.ok(msg.indexOf('DONE-LEDGER') < msg.indexOf('DECISIONS-LEDGER'));
  assert.ok(msg.indexOf('DECISIONS-LEDGER') < msg.indexOf('## Свежесть входов'));
  assert.ok(msg.indexOf('DECISIONS-LEDGER') < msg.indexOf('## Документы дня'));
  assert.doesNotMatch(buildEveningFeedbackUserMessage({ regulation: 'R', prompt: 'P', virtualTeam: 'V', dayDocs: 'D', gitSummary: 'G' }), /DECISIONS-LEDGER/u);
});
