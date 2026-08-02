/**
 * Зубы очереди oversized на точечное ревью.
 *
 * Держат дефект: двенадцать дней «по одному в день» решалось глазом, и замер 02.08 показал
 * 168 непроревьюированных из 185. Плюс поправку резчика: смешанный PR с большой докой и малым
 * кодом обязан оставаться наверху, а не тонуть под общим объёмом.
 *
 * Прогон: `node --test scripts/lib/review-oversized-queue.test.mjs`
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OVERSIZED_CHANGED_LINES as THRESHOLD_FROM_DIFF } from './day-work-diff.mjs';
import {
  buildQueue,
  CODE_ROOTS,
  describeCommit,
  isCode,
  formatQueue,
  NATURES,
  OVERSIZED_CHANGED_LINES,
} from './review-oversized-queue.mjs';

/** Коммит-образец: список файлов задаётся парами «путь, строк». */
const commit = (pr, files, over = {}) => ({
  pr: String(pr),
  sha: `sha${pr}`,
  date: '2026-07-30',
  subject: `feat: работа #${pr}`,
  files: files.map(([path, changedLines]) => ({ path, changedLines })),
  ...over,
});

const bigCode = (pr, n) => commit(pr, [['packages/a/src/x.ts', n]]);
const bigDocs = (pr, n) => commit(pr, [['docs/archive/day.md', n]]);

// ── Мерка одна ────────────────────────────────────────────────────────────────────────────

test('порог не переобъявлен: он импортирован у носителя мерки', () => {
  // Скопированное число разъехалось бы на единицу с ревью, у которого граница строгая (> 400).
  assert.equal(OVERSIZED_CHANGED_LINES, THRESHOLD_FROM_DIFF);
});

test('ровно порог — не oversized, порог плюс один — oversized', () => {
  assert.equal(describeCommit(bigCode(1, OVERSIZED_CHANGED_LINES)).oversized, false);
  assert.equal(describeCommit(bigCode(1, OVERSIZED_CHANGED_LINES + 1)).oversized, true);
});

// ── Природа ───────────────────────────────────────────────────────────────────────────────

test('только код — code; только доки — docs; смесь — mixed', () => {
  assert.equal(describeCommit(bigCode(1, 500)).nature, NATURES.CODE);
  assert.equal(describeCommit(bigDocs(2, 500)).nature, NATURES.DOCS);
  assert.equal(
    describeCommit(commit(3, [['apps/client/src/a.ts', 100], ['docs/x.md', 400]])).nature,
    NATURES.MIXED,
  );
});

test('каждый корень кода признаётся кодом — список закрыт и проверен целиком', () => {
  for (const root of CODE_ROOTS) {
    assert.equal(describeCommit(commit(9, [[`${root}f.ts`, 500]])).nature, NATURES.CODE, root);
  }
});

test('риск считается по строкам КОДА, а не по всему диффу', () => {
  const c = describeCommit(commit(4, [['packages/a/src/x.ts', 100], ['docs/archive/y.md', 900]]));
  assert.equal(c.total, 1000);
  assert.equal(c.code, 100);
  assert.equal(Math.round(c.codeShare * 100), 10);
});

test('пустой дифф не делит на ноль', () => {
  const c = describeCommit(commit(5, []));
  assert.equal(c.codeShare, 0);
  assert.equal(c.oversized, false);
});

// ── Порядок ───────────────────────────────────────────────────────────────────────────────

test('сверху наибольший риск по коду, а не наибольший объём', () => {
  const { queue } = buildQueue([
    commit(10, [['packages/a/src/x.ts', 500], ['docs/y.md', 5000]]),
    commit(20, [['packages/a/src/x.ts', 900]]),
  ]);
  assert.deepEqual(queue.map((c) => c.pr), ['20', '10']);
});

test('при равном риске выше тот, у кого доля кода больше — поправка резчика', () => {
  // Иначе кодовое изменение под ворохом markdown тонет вниз очереди.
  const { queue } = buildQueue([
    commit(30, [['packages/a/src/x.ts', 600], ['docs/y.md', 3000]]),
    commit(40, [['packages/a/src/x.ts', 600], ['docs/y.md', 100]]),
  ]);
  assert.deepEqual(queue.map((c) => c.pr), ['40', '30']);
});

test('порядок детерминирован при полном равенстве — голова очереди не случайна', () => {
  const a = buildQueue([bigCode(50, 700), bigCode(60, 700)]).queue.map((c) => c.pr);
  const b = buildQueue([bigCode(60, 700), bigCode(50, 700)]).queue.map((c) => c.pr);
  assert.deepEqual(a, b);
});

// ── Снятие с очереди ──────────────────────────────────────────────────────────────────────

test('готовый артефакт ревью снимает элемент — и это единственное основание', () => {
  const r = buildQueue([bigCode(70, 700), bigCode(80, 700)], { reviewed: ['70'] });
  assert.deepEqual(r.queue.map((c) => c.pr), ['80']);
  assert.equal(r.dropped.reviewed, 1);
});

test('чистые доки отброшены по умолчанию, но с числом и по своей причине', () => {
  const r = buildQueue([bigDocs(90, 3000), bigCode(100, 700)]);
  assert.deepEqual(r.queue.map((c) => c.pr), ['100']);
  assert.equal(r.dropped.docs, 1);
  assert.equal(r.dropped.reviewed, 0);
});

test('доки можно вернуть в очередь явным флагом — отбрасывание не приговор', () => {
  const r = buildQueue([bigDocs(110, 3000)], { includeDocs: true });
  assert.deepEqual(r.queue.map((c) => c.pr), ['110']);
  assert.equal(r.dropped.docs, 0);
});

test('не oversized отброшены отдельной причиной, а не свалены с доками', () => {
  const r = buildQueue([bigCode(120, 10), bigDocs(130, 20)]);
  assert.deepEqual(r.dropped, { notOversized: 2, reviewed: 0, docs: 0 });
  assert.equal(r.denominator, 2);
});

// ── Отчёт ─────────────────────────────────────────────────────────────────────────────────

test('пустая очередь — утверждение, а не молчание', () => {
  const lines = formatQueue(buildQueue([]));
  assert.ok(lines.some((l) => l.includes('очередь пуста')));
  assert.ok(lines.every((l) => l.trim().length > 0));
});

test('отброшенное названо числом и причиной в КАЖДОМ прогоне', () => {
  const joined = formatQueue(buildQueue([bigDocs(140, 3000), bigCode(150, 10), bigCode(160, 700)])).join('\n');
  assert.ok(joined.includes('1 не oversized'));
  assert.ok(joined.includes('1 без изменённых строк исходного кода'));
  assert.ok(joined.includes('0 с готовым артефактом'), 'ноль печатается тоже — иначе строка врёт умолчанием');
});

test('в строке очереди есть и код, и общий объём — читатель видит долю сам', () => {
  const joined = formatQueue(buildQueue([commit(170, [['packages/a/src/x.ts', 600], ['docs/y.md', 400]])])).join('\n');
  assert.ok(joined.includes('#170'));
  assert.ok(joined.includes('код 600 из 1000'));
  assert.ok(joined.includes('60%'));
  assert.ok(joined.includes(NATURES.MIXED));
});

test('длинная очередь урезается с явным остатком, счётчик остаётся полным', () => {
  const many = Array.from({ length: 15 }, (_, i) => bigCode(200 + i, 500 + i));
  const joined = formatQueue(buildQueue(many), { limit: 3 }).join('\n');
  assert.ok(joined.includes('в очереди 15'));
  assert.ok(joined.includes('и ещё 12'));
});

// ── «Где лежит» против «что делает» ───────────────────────────────────────────────────────

test('исполняемое вне кодовых корней — код: задание движка лежит в .md', () => {
  // Разбор Дынина 02.08: docs/prompts и .github/workflows молча уходили в «архивы».
  for (const p of ['docs/prompts/X_PROMPT.md', '.github/workflows/ci.yml', '.githooks/pre-commit', 'docs/procedures/x/MANIFEST.json']) {
    assert.equal(isCode(p), true, p);
  }
});

test('markdown внутри кодового корня — НЕ код: ошибка симметрична первой', () => {
  assert.equal(isCode('packages/a/README.md'), false);
  assert.equal(isCode('apps/client/docs/note.md'), false);
});

test('исполняемое в корне репозитория признаётся кодом', () => {
  for (const p of ['Dockerfile', 'turbo.json', 'package.json']) assert.equal(isCode(p), true, p);
});

test('обычная дока остаётся докой', () => {
  assert.equal(isCode('docs/archive/day.md'), false);
  assert.equal(isCode('docs/seanses/x.md'), false);
});

test('PR с одним лишь заданием движка не считается архивным', () => {
  const c = describeCommit(commit(300, [['docs/prompts/A_PROMPT.md', 700]]));
  assert.equal(c.nature, NATURES.CODE);
  assert.equal(c.code, 700);
});

// ── Полнота порядка ───────────────────────────────────────────────────────────────────────

test('номера PR сравниваются числом, а не строкой', () => {
  const { queue } = buildQueue([bigCode(99, 700), bigCode(1099, 700)]);
  assert.deepEqual(queue.map((c) => c.pr), ['99', '1099']);
});

test('коммиты без номера PR не схлопываются: порядок задаёт sha, а не вход', () => {
  const a = { sha: 'bbb', date: '2026-07-30', subject: 'x', files: [['packages/a/x.ts', 700]].map(([path, changedLines]) => ({ path, changedLines })) };
  const b = { sha: 'aaa', date: '2026-07-30', subject: 'y', files: [['packages/a/y.ts', 700]].map(([path, changedLines]) => ({ path, changedLines })) };
  const one = buildQueue([a, b]).queue.map((c) => c.sha);
  const two = buildQueue([b, a]).queue.map((c) => c.sha);
  assert.deepEqual(one, two);
  assert.deepEqual(one, ['aaa', 'bbb']);
});

// ── Знаменатель сходится ──────────────────────────────────────────────────────────────────

test('знаменатель равен очереди плюс всё отброшенное — метрика «N из M» воспроизводима', () => {
  // Замечание Дынина 02.08: без этого зуба цифра «168 из 185» держится честным словом
  // реализации, а именно невоспроизводимые цифры и есть предмет всего дня.
  const r = buildQueue([
    bigCode(400, 700), bigCode(410, 700),   // в очередь
    bigCode(420, 700),                       // снят артефактом
    bigDocs(430, 3000),                      // чистая дока
    bigCode(440, 10), bigDocs(450, 20),      // не oversized
  ], { reviewed: ['420'] });

  const sum = r.queue.length + r.dropped.notOversized + r.dropped.reviewed + r.dropped.docs;
  assert.equal(sum, r.denominator, 'ни один вход не потерян и ни один не посчитан дважды');
  assert.deepEqual(r.dropped, { notOversized: 2, reviewed: 1, docs: 1 });
  assert.equal(r.queue.length, 2);
});

test('повтор в списке проревьюированных знаменатель не раздувает', () => {
  const r = buildQueue([bigCode(460, 700)], { reviewed: ['460', '460'] });
  assert.equal(r.denominator, 1);
  assert.equal(r.dropped.reviewed, 1);
});

test('один и тот же вход дважды считается дважды — предикат не дедуплицирует молча', () => {
  // Дедупликация входа — дело собирающего глагола: сделай её здесь молча, и знаменатель
  // разошёлся бы с числом коммитов, которое глагол напечатал.
  const c = bigCode(470, 700);
  const r = buildQueue([c, c]);
  assert.equal(r.denominator, 2);
  assert.equal(r.queue.length, 2);
});

test('числовые инварианты доли: код не больше объёма, доля в [0,1], NaN нет', () => {
  for (const c of [
    describeCommit(commit(480, [['packages/a/x.ts', 700]])),
    describeCommit(commit(490, [['docs/archive/y.md', 700]])),
    describeCommit(commit(500, [['packages/a/x.ts', 300], ['docs/y.md', 400]])),
    describeCommit(commit(510, [])),
  ]) {
    assert.ok(c.code <= c.total, 'код не больше общего объёма');
    assert.ok(c.codeShare >= 0 && c.codeShare <= 1, 'доля в отрезке');
    assert.ok(!Number.isNaN(c.codeShare), 'доли NaN не бывает');
  }
});

test('при равном риске И равной доле порядок держит номер PR, а не вход', () => {
  const a = buildQueue([bigCode(520, 700), bigCode(530, 700)]).queue.map((c) => c.pr);
  const b = buildQueue([bigCode(530, 700), bigCode(520, 700)]).queue.map((c) => c.pr);
  assert.deepEqual(a, ['520', '530']);
  assert.deepEqual(a, b);
});
