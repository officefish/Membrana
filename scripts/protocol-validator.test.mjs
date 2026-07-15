import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  countRoleReplies,
  parseVotingTable,
  validateProtocol,
} from './lib/protocol-validator.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('countRoleReplies: [Роль]: и [Роль — Имя]: формы', () => {
  const md = '[Teamlead]: раз\n[Структурщик — Ozhegov]: два\n[Математик]: три\nтекст [не роль]: мимо';
  const c = countRoleReplies(md);
  assert.equal(c.Teamlead, 1);
  assert.equal(c.Структурщик, 1);
  assert.equal(c.Математик, 1);
  assert.equal(c.Музыкант, 0);
});

test('живой консилиум-протокол 14.07 проходит канон (регресс-фикстура)', () => {
  for (const rel of [
    'docs/seanses/quality-control-contour-2026-07-14.md',
    'docs/seanses/cowork-sprint-format-2026-07-14.md',
  ]) {
    const res = validateProtocol(read(rel), { kind: 'consilium', minReplies: 20 });
    assert.ok(res.ok, `${rel}: ${res.problems.join('; ')}`);
  }
});

test('невалидный консилиум: роль молчит + мало реплик + нет итога', () => {
  const md = '# Метаданные\n| Поле | Значение |\n[Teamlead]: одна реплика\n[Структурщик]: вторая';
  const res = validateProtocol(md, { kind: 'consilium', minReplies: 20 });
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => /Математик/.test(p)));
  assert.ok(res.problems.some((p) => /минимума/.test(p)));
  assert.ok(res.problems.some((p) => /итог/i.test(p)));
});

test('parseVotingTable: балл считается и сверяется', () => {
  const md = [
    '| Роль | Балл /10 |',
    '| Teamlead | 7 |',
    '| Структурщик | 7 |',
    '| Математик | 6 |',
    '| Музыкант | 5 |',
    '| Верстальщик | 7 |',
    '**Средний балл:** 6.4',
  ].join('\n');
  const v = parseVotingTable(md);
  assert.equal(v.scores.length, 5);
  assert.equal(v.declared, 6.4);
  assert.ok(Math.abs(v.average - 6.4) < 0.01);
});

test('живой insight-review 14.07 проходит канон (регресс-фикстура)', () => {
  const res = validateProtocol(read('docs/insights/insight-office-panel-qa-section/REVIEW.md'), {
    kind: 'insight-review',
  });
  assert.ok(res.ok, res.problems.join('; '));
});

test('insight-review ловит расхождение среднего балла', () => {
  const md = [
    '| Поле | Значение |',
    '[Teamlead]: a', '[Структурщик]: b', '[Математик]: c', '[Музыкант]: d', '[Верстальщик]: e',
    '| Роль | /10 |',
    '| Teamlead | 9 |', '| Структурщик | 9 |', '| Математик | 9 |', '| Музыкант | 9 |', '| Верстальщик | 9 |',
    '**Средний балл:** 3.0',
    'Рекомендуемый статус: adopted',
  ].join('\n');
  const res = validateProtocol(md, { kind: 'insight-review' });
  assert.equal(res.ok, false);
  assert.ok(res.problems.some((p) => /не сходится/.test(p)));
});
