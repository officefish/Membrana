import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildQueue, formatQueue } from './lib/review-oversized-queue.mjs';

// Первые зубы прибора очереди oversized (блок e2 спринта review-honesty, 05.08).
// До них у прибора не было НИ ОДНОГО теста: снятие с очереди — предикат, судящий чужую
// работу, и он держался на глазах. Фикстуры — минимальные коммиты формы `describeCommit`.

const commit = (pr, code, { docs = 0, sha = `sha-${pr}` } = {}) => ({
  pr: pr === null ? null : String(pr),
  sha,
  subject: `feat: работа (#${pr})`,
  date: '2026-08-05',
  files: [
    { path: 'scripts/thing.mjs', changedLines: code },
    ...(docs > 0 ? [{ path: 'docs/thing.md', changedLines: docs }] : []),
  ],
});

test('снятие по commit-status убирает PR из очереди наравне с артефактом', () => {
  const commits = [commit(101, 900), commit(102, 900), commit(103, 900)];
  const r = buildQueue(commits, { reviewed: ['101'], statusReviewed: ['102'] });
  assert.deepEqual(r.queue.map((c) => c.pr), ['103'], 'сняты и по артефакту, и по общему следу');
  assert.equal(r.dropped.reviewed, 2, 'снятых всего — двое');
  assert.equal(r.dropped.byStatus, 1, 'на общем следе держится один');
});

test('снятие по статусу НЕ считается host-local слепотой — след виден любому клону', () => {
  const commits = [commit(201, 900), commit(202, 900)];
  // Оба сняты, но артефакт в стволе не отслеживается ни у одного (trackedReviewed пуст).
  const r = buildQueue(commits, { reviewed: ['201'], statusReviewed: ['202'], trackedReviewed: [] });
  assert.equal(r.hostLocalReviewed, 1, 'слеп только тот, что держится на host-local артефакте');
});

test('порт не подключён (trackedReviewed=null) — о слепоте прибор НЕ судит', () => {
  const r = buildQueue([commit(301, 900)], { reviewed: ['301'] });
  assert.equal(r.hostLocalReviewed, null, 'null ≠ 0: «не знаю» и «слепоты нет» — разные утверждения');
});

test('офлайн-путь: пустые списки статусов оставляют поведение прежним', () => {
  const commits = [commit(401, 900), commit(402, 900)];
  const withStatus = buildQueue(commits, { reviewed: ['401'], statusReviewed: [], statusFailure: [] });
  const without = buildQueue(commits, { reviewed: ['401'] });
  assert.deepEqual(withStatus.queue.map((c) => c.pr), without.queue.map((c) => c.pr));
  assert.equal(withStatus.dropped.byStatus, 0);
});

test('failure НЕ снимает с очереди: вердикт не зачтён — предмет не рассмотрен', () => {
  const r = buildQueue([commit(501, 900)], { reviewed: [], statusReviewed: [], statusFailure: ['501'] });
  assert.deepEqual(r.queue.map((c) => c.pr), ['501'], 'PR остаётся в очереди');
  assert.deepEqual(r.statusFailurePrs, ['501'], 'но прибор о нём знает и назовёт вслух');
});

test('отчёт называет общий след и failure-PR отдельными строками', () => {
  const commits = [commit(601, 900), commit(602, 900), commit(603, 900)];
  const r = buildQueue(commits, { reviewed: ['601'], statusReviewed: ['602'], statusFailure: ['603'], trackedReviewed: [] });
  const text = formatQueue(r).join('\n');
  assert.match(text, /по общему следу — commit-status/u);
  assert.match(text, /review\/teamlead=failure/u);
  assert.ok(text.includes('#603'), 'требующий руки назван поимённо');
});

test('дробь host-local считает ОДНО множество: числитель не больше снятых', () => {
  const commits = [commit(701, 900), commit(702, 900)];
  const r = buildQueue(commits, { reviewed: ['701', '702', '999'], trackedReviewed: [] });
  assert.equal(r.dropped.reviewed, 2, '999 в выборке коммитов нет — снятыми числятся двое');
  assert.ok(r.hostLocalReviewed <= r.dropped.reviewed, 'числитель приведён к фактически снятым');
});
