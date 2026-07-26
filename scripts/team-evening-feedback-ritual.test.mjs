import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEveningFeedbackUserMessage,
  DAY_DOC_INPUTS,
  EVENING_FEEDBACK_PROCEDURE_ID,
  parseTeamEveningFeedbackCli,
  resolveEveningFeedbackOutputPath,
  runEveningFeedbackLlm,
} from './lib/team-evening-feedback-ritual.mjs';
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
