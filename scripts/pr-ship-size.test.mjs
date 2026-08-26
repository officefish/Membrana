// #2020: порог размера PR — дверь ДО создания PR, а не сообщение после мерджа.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  OVERSIZED_CHANGED_LINES,
  SIZE_REASON_MARKER,
  appendSizeReason,
  changedLinesForShip,
  oversizedShipProblem,
  sizeReasonLine,
} from './lib/pr-ship-size.mjs';

test('#2020 порог не скопирован: носитель мерки один — OVERSIZED_CHANGED_LINES', async () => {
  const { OVERSIZED_CHANGED_LINES: origin } = await import('./lib/day-work-diff.mjs');
  assert.equal(OVERSIZED_CHANGED_LINES, origin, 'две копии числа разъедутся молча');
  assert.equal(origin, 400);
});

test('#2020 ПОРЧА: PR на 500 строк без причины — отказ ДО создания PR', () => {
  const problem = oversizedShipProblem({ changedLines: 500, reason: null, mergeOnly: false, execute: true });
  assert.match(problem, /500 изменённых строк против порога 400/u);
  assert.match(problem, /PR НЕ создан/u);
  assert.match(problem, /--size-reason/u, 'отказ обязан назвать выход, а не только запретить');
  assert.match(problem, /нарезать/u, 'первый выход — нарезка, а не обход');
});

test('#2020 с названной причиной тот же PR проходит', () => {
  assert.equal(
    oversizedShipProblem({ changedLines: 500, reason: 'пересадка класса по всему дереву', mergeOnly: false, execute: true }),
    null,
  );
});

test('#2020 пустая причина не считается причиной (пробелы — не объяснение)', () => {
  assert.ok(oversizedShipProblem({ changedLines: 500, reason: '   ', mergeOnly: false, execute: true }));
});

test('#2020 под порогом — молчание; ровно порог — ещё не превышение', () => {
  assert.equal(oversizedShipProblem({ changedLines: 399, reason: null, mergeOnly: false, execute: true }), null);
  assert.equal(oversizedShipProblem({ changedLines: 400, reason: null, mergeOnly: false, execute: true }), null);
  assert.ok(oversizedShipProblem({ changedLines: 401, reason: null, mergeOnly: false, execute: true }));
});

test('#2020 merge-only и dry-run не судятся: PR уже есть либо ничего не делается', () => {
  assert.equal(oversizedShipProblem({ changedLines: 900, reason: null, mergeOnly: true, execute: true }), null);
  assert.equal(oversizedShipProblem({ changedLines: 900, reason: null, mergeOnly: false, execute: false }), null);
});

test('#2020 считаем закоммиченное И индекс: шаг commit ещё впереди', () => {
  const calls = [];
  const run = (args) => {
    calls.push(args.join(' '));
    return args.includes('--cached')
      ? ' 2 files changed, 30 insertions(+), 10 deletions(-)'
      : ' 5 files changed, 300 insertions(+), 60 deletions(-)';
  };
  assert.equal(changedLinesForShip({ base: 'main', run }), 400);
  assert.ok(calls.some((c) => c.includes('origin/main...HEAD')));
  assert.ok(calls.some((c) => c.includes('--cached')));
});

test('#2020 git недоступен — счёт нулевой, дверь не запирается инструментальной ошибкой', () => {
  const run = () => {
    throw new Error('not a git repo');
  };
  assert.equal(changedLinesForShip({ run }), 0);
});

test('#2020 причина уезжает в тело PR: с числом, порогом и объяснением', () => {
  const line = sizeReasonLine({ changedLines: 512, reason: 'генерированный lockfile' });
  assert.ok(line.startsWith(SIZE_REASON_MARKER));
  assert.match(line, /512/u);
  assert.match(line, /порог 400/u);
  assert.match(line, /генерированный lockfile/u);

  assert.equal(appendSizeReason('Closes #1', line), `Closes #1\n\n${line}`);
  assert.equal(appendSizeReason('', line), line, 'пустое тело — причина становится телом');
  assert.equal(appendSizeReason('Closes #1', ''), 'Closes #1', 'без причины тело не портится');
});
