import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  classifyChecks,
  classifyPrWait,
  explainNoChecks,
  readCheckpoint,
  writeCheckpoint,
  clearCheckpoint,
  classifyGhFailure,
  ghRetryBudget,
  ghBackoffMs,
} from './pr-wait.mjs';

test('пустой rollup — none, не green (корень #643: no checks ≠ зелено)', () => {
  assert.equal(classifyChecks([]).state, 'none');
  assert.equal(classifyChecks(null).state, 'none');
  assert.equal(classifyChecks(undefined).state, 'none');
});

test('ВЕЩДОК #1461: review/teamlead=pending не держит ci-wait — иначе самоссылка', () => {
  // Живой тупик 29.07: ship упал на гейте, оставив pending; повторный --merge-only
  // ждал статус, который выставляет шаг ПОСЛЕ ожидания. Пятнадцать минут тишины.
  const r = classifyChecks([
    { name: 'Lint, typecheck, test, build', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'Turbo unit tests', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'scan', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'optional-review', status: 'COMPLETED', conclusion: 'SKIPPED' },
    { context: 'review/teamlead', state: 'PENDING' },
  ]);
  assert.equal(r.state, 'green');
  assert.equal(r.ok, 4);
  assert.equal(r.total, 4);
  assert.deepEqual(r.pending, []);
  assert.deepEqual(r.selfManaged, ['review/teamlead']);
});

test('review/teamlead=success тоже вне счёта CI — считаем сборку, не ревью', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { context: 'review/teamlead', state: 'SUCCESS' },
  ]);
  assert.equal(r.state, 'green');
  assert.equal(r.total, 1);
  assert.deepEqual(r.selfManaged, ['review/teamlead']);
});

test('красный CI не маскируется отсечением самоссылки', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'COMPLETED', conclusion: 'FAILURE' },
    { context: 'review/teamlead', state: 'PENDING' },
  ]);
  assert.equal(r.state, 'red');
});

test('только самоссылка и ни одной проверки CI — none, не green', () => {
  const r = classifyChecks([{ context: 'review/teamlead', state: 'PENDING' }]);
  assert.equal(r.state, 'none');
  assert.equal(r.total, 0);
  assert.deepEqual(r.selfManaged, ['review/teamlead']);
});

test('незавершённый CheckRun — running', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'IN_PROGRESS', conclusion: '' },
    { name: 'lint', status: 'COMPLETED', conclusion: 'SUCCESS' },
  ]);
  assert.equal(r.state, 'running');
  assert.deepEqual(r.pending, ['CI']);
});

test('все success/skipped/neutral — green', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'optional', status: 'COMPLETED', conclusion: 'SKIPPED' },
    { name: 'info', status: 'COMPLETED', conclusion: 'NEUTRAL' },
  ]);
  assert.equal(r.state, 'green');
  assert.equal(r.ok, 3);
});

test('смесь success + failure — red', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'test', status: 'COMPLETED', conclusion: 'FAILURE' },
  ]);
  assert.equal(r.state, 'red');
  assert.deepEqual(r.failing, ['test: FAILURE']);
});

test('red приоритетнее running: упавший чек не станет зелёным от ожидания', () => {
  const r = classifyChecks([
    { name: 'test', status: 'COMPLETED', conclusion: 'TIMED_OUT' },
    { name: 'build', status: 'QUEUED', conclusion: '' },
  ]);
  assert.equal(r.state, 'red');
});

test('StatusContext (state вместо status/conclusion) классифицируется', () => {
  assert.equal(classifyChecks([{ context: 'dc', state: 'SUCCESS' }]).state, 'green');
  assert.equal(classifyChecks([{ context: 'dc', state: 'PENDING' }]).state, 'running');
  assert.equal(classifyChecks([{ context: 'dc', state: 'ERROR' }]).state, 'red');
});

test('неизвестный вердикт не считается успехом', () => {
  const r = classifyChecks([{ name: 'x', status: 'COMPLETED', conclusion: 'MYSTERY' }]);
  assert.equal(r.state, 'running');
});

test('explainNoChecks при CONFLICTING называет причину и действие (#643 п.2)', () => {
  const msg = explainNoChecks({ mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' });
  assert.match(msg, /конфликтует/);
  assert.match(msg, /CI не запускается/);
  assert.match(msg, /разрешить конфликт/);
});

test('explainNoChecks без конфликта: none — это НЕ зелено', () => {
  const msg = explainNoChecks({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' });
  assert.match(msg, /НЕ зелено/);
});

test('#724: CI green + REVIEW_REQUIRED → approval (не green/red/none)', () => {
  const rollup = [{ name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' }];
  const r = classifyPrWait({ rollup, reviewDecision: 'REVIEW_REQUIRED' });
  assert.equal(r.state, 'approval');
  assert.equal(r.reviewDecision, 'REVIEW_REQUIRED');
});

test('#724: CI green + CHANGES_REQUESTED → approval', () => {
  const r = classifyPrWait({
    rollup: [{ name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' }],
    reviewDecision: 'CHANGES_REQUESTED',
  });
  assert.equal(r.state, 'approval');
});

test('#724: CI red важнее review — остаётся red', () => {
  const r = classifyPrWait({
    rollup: [{ name: 'CI', status: 'COMPLETED', conclusion: 'FAILURE' }],
    reviewDecision: 'REVIEW_REQUIRED',
  });
  assert.equal(r.state, 'red');
});

test('#724: CI green + APPROVED → green', () => {
  const r = classifyPrWait({
    rollup: [{ name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' }],
    reviewDecision: 'APPROVED',
  });
  assert.equal(r.state, 'green');
});

test('#724: checkpoint write/read/clear для --resume', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pr-wait-cp-'));
  try {
    const path = writeCheckpoint(
      { number: '999', deadlineMs: Date.now() + 60_000, timeoutMin: 15, intervalSec: 20 },
      dir,
    );
    assert.ok(path.includes('pr-wait-999.json'));
    const cp = readCheckpoint('999', dir);
    assert.equal(cp.number, '999');
    assert.equal(cp.timeoutMin, 15);
    clearCheckpoint('999', dir);
    assert.equal(readCheckpoint('999', dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- #1261: транзиент сети ≠ «нет PR» ------------------------------------------------------
// Эпизоды 26.07: PR #1243 и #1253 — три подряд ETIMEDOUT/TLS-таймаута убивали ожидание,
// merge НЕ выполнялся, и спасало только ручное --merge-only.

test('classifyGhFailure: сетевые транзиенты отделены от отсутствия PR и auth', () => {
  assert.equal(classifyGhFailure('spawnSync C:\Windows\system32\cmd.exe ETIMEDOUT'), 'network');
  assert.equal(
    classifyGhFailure('Post "https://api.github.com/graphql": net/http: TLS handshake timeout'),
    'network',
  );
  assert.equal(classifyGhFailure('error: ECONNRESET'), 'network');
  assert.equal(classifyGhFailure('HTTP 503 Bad Gateway'), 'network');
  assert.equal(classifyGhFailure('no pull requests found for branch "feat/x"'), 'notfound');
  assert.equal(classifyGhFailure('Could not resolve to a PullRequest with the number of 999'), 'notfound');
  assert.equal(classifyGhFailure('gh auth login required'), 'auth');
  assert.equal(classifyGhFailure('HTTP 401: Bad credentials'), 'auth');
  assert.equal(classifyGhFailure('Command failed: gh pr view 1253 --json number'), 'unknown');
});

test('classifyGhFailure смотрит ВЕСЬ текст: причина лежит в stderr, а не в первой строке', () => {
  const multi = 'Command failed: gh pr view 1253 --json state\nerror connecting: ETIMEDOUT';
  assert.equal(classifyGhFailure(multi), 'network');
  // Именно так выглядел лог 26.07 — печаталась только первая строка, класс был не виден.
  assert.equal(classifyGhFailure(multi.split('\n')[0]), 'unknown');
});

test('ghRetryBudget: сеть терпим долго, «нет PR / нет auth» — сразу', () => {
  assert.ok(ghRetryBudget('network') >= 8, 'три попытки при таймаутах — корень #1243');
  assert.equal(ghRetryBudget('notfound'), 1);
  assert.equal(ghRetryBudget('auth'), 1);
  assert.ok(ghRetryBudget('unknown') > 1 && ghRetryBudget('unknown') < ghRetryBudget('network'));
});

test('ghBackoffMs: экспонента от интервала с потолком, первая пауза = интервал', () => {
  assert.equal(ghBackoffMs(1, 10), 10_000);
  assert.equal(ghBackoffMs(2, 10), 20_000);
  assert.equal(ghBackoffMs(3, 10), 40_000);
  assert.equal(ghBackoffMs(99, 10), 120_000, 'потолок обязателен, иначе ожидание уходит в часы');
  assert.equal(ghBackoffMs(1, 0), 1000, 'нулевой интервал не должен давать нулевую паузу');
});

// ─── сверка ролапа с ОБЪЯВЛЕННЫМ множеством (долг #ci-wait-sees-unregistered-checks, #1764) ───
//
// Дефект: ролап несёт то, что GitHub УЖЕ зарегистрировал, а задания появляются асинхронно.
// Замер 07.08 — `checks=1/1 state=green` при четырёх фактических проверках. Втроём за утро.
// Таблица случаев по разбору Дынина: пусто · частично · полно · красный · только-self · дубль.

const REQUIRED = ['scan', 'Lint, typecheck, test, build', 'review/teamlead'];
const ok = (name) => ({ name, status: 'COMPLETED', conclusion: 'SUCCESS' });

test('неполный ролап при отсутствии красного и ждущих — incomplete, а НЕ green', () => {
  const r = classifyChecks([ok('scan')], REQUIRED);
  assert.equal(r.state, 'incomplete', 'зелёный по неполному множеству — чинимый дефект');
  assert.deepEqual(r.missing, ['Lint, typecheck, test, build']);
  assert.equal(r.verified, true);
});

test('incomplete — отдельный род, не running: «идёт» и «неизвестно, стартовало ли» различны', () => {
  const incomplete = classifyChecks([ok('scan')], REQUIRED);
  const running = classifyChecks([{ name: 'scan', status: 'IN_PROGRESS' }, ok('Lint, typecheck, test, build')], REQUIRED);
  assert.equal(incomplete.state, 'incomplete');
  assert.equal(running.state, 'running');
  assert.notEqual(incomplete.state, running.state);
});

test('полный ролап — green', () => {
  const r = classifyChecks([ok('scan'), ok('Lint, typecheck, test, build')], REQUIRED);
  assert.equal(r.state, 'green');
  assert.deepEqual(r.missing, []);
});

test('самоуправляемый вычитается из ОЖИДАЕМОГО, иначе вечный incomplete вместо ложного green', () => {
  // review/teamlead стоит в обязательных И отсекается из наблюдаемых — ловушка Дынина.
  const r = classifyChecks([ok('scan'), ok('Lint, typecheck, test, build')], REQUIRED);
  assert.equal(r.state, 'green', 'review/teamlead ставит гейт ПОСЛЕ этого ожидания');
  assert.ok(!r.missing.includes('review/teamlead'));
});

test('красный побеждает неполноту — порядок родов несущий', () => {
  const r = classifyChecks([{ name: 'scan', status: 'COMPLETED', conclusion: 'FAILURE' }], REQUIRED);
  assert.equal(r.state, 'red');
});

test('ждущие побеждают неполноту: сперва дождаться того, что уже идёт', () => {
  const r = classifyChecks([{ name: 'scan', status: 'IN_PROGRESS' }], REQUIRED);
  assert.equal(r.state, 'running');
});

test('только самоуправляемый в ролапе — не green: обязательных не видно вовсе', () => {
  const r = classifyChecks([ok('review/teamlead')], REQUIRED);
  assert.equal(r.state, 'none', 'после отсечения self-managed элементов не осталось');
  assert.deepEqual(r.missing, ['scan', 'Lint, typecheck, test, build']);
});

test('имя берётся и из name, и из context: check-runs и statuses кладут его по-разному', () => {
  const r = classifyChecks(
    [{ context: 'scan', state: 'SUCCESS' }, { name: 'Lint, typecheck, test, build', state: 'SUCCESS' }],
    REQUIRED,
  );
  assert.equal(r.state, 'green', 'statuses кладут имя в context — иначе ложный incomplete');
});

test('сравнение строгое по регистру: GitHub регистрозависим для имён проверок', () => {
  const r = classifyChecks([ok('SCAN'), ok('Lint, typecheck, test, build')], REQUIRED);
  assert.equal(r.state, 'incomplete', 'мягкое сравнение зачло бы чужое задание за обязательное');
  assert.deepEqual(r.missing, ['scan']);
});

test('запятые и пробелы в имени значимы — «Lint, typecheck, test, build» сверяется целиком', () => {
  const r = classifyChecks([ok('scan'), ok('Lint typecheck test build')], REQUIRED);
  assert.equal(r.state, 'incomplete');
  assert.deepEqual(r.missing, ['Lint, typecheck, test, build']);
});

test('без объявленного множества сверка НЕ состоялась — verified=false, поведение прежнее', () => {
  const r = classifyChecks([ok('scan')]);
  assert.equal(r.state, 'green', 'обратная совместимость: без ожидаемого ведём себя как раньше');
  assert.equal(r.verified, false, 'но об этом обязаны сказать вслух, а не деградировать молча');
  assert.deepEqual(r.missing, []);
});

test('classifyPrWait пробрасывает ожидаемое множество, а не теряет его', () => {
  const r = classifyPrWait({ rollup: [ok('scan')], reviewDecision: 'APPROVED', expected: REQUIRED });
  assert.equal(r.state, 'incomplete', 'approval не маскирует неполноту CI');
  assert.deepEqual(r.missing, ['Lint, typecheck, test, build']);
});
